"""Isolated transport doubles. No live provider, payment, image upload or health claim."""

import json
from urllib.error import HTTPError, URLError

import pytest
from glam_api.integrations.providers import Fashn, GoogleMaps, OpenAI, OpenMeteo, Replicate
from glam_api.integrations.runtime import (
    HttpTransport,
    IntegrationError,
    ProviderConfig,
    State,
    readiness,
)
from pydantic import SecretStr


class Double:
    def __init__(self, result=None, error=None):
        self.result = result or {}
        self.error = error
        self.calls = []

    def send(self, method, url, headers, body=None):
        self.calls.append((method, url, headers, body))
        if self.error:
            raise self.error
        return self.result


def config(**kwargs):
    return ProviderConfig(
        values={
            name: SecretStr("test-fixture-not-a-real-key")
            for name in [
                "OPENAI_API_KEY",
                "FASHN_API_KEY",
                "GOOGLE_MAPS_API_KEY",
                "REPLICATE_API_TOKEN",
            ]
        },
        openai_model="test-model",
        fashn_model="test-model",
        private_image_origins=("https://private.example",),
        **kwargs,
    )


def sample():
    return {
        "findings": [
            {
                "key": k,
                "estimate": None,
                "certainty": "unavailable",
                "uncertainty": "Test-only observation: lighting insufficient.",
            }
            for k in ["face-shape", "eyes", "brows", "lips", "undertone"]
        ],
        "directions": [],
    }


def response(output):
    return {
        "status": "completed",
        "output": [
            {
                "type": "message",
                "content": [
                    {"type": "output_text", "text": json.dumps(output)},
                ],
            }
        ],
    }


def test_absent_credentials_are_not_connected_and_sensitive_values_are_not_reported(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    rows = readiness(ProviderConfig())
    assert all(r.state == State.NOT_CONFIGURED for r in rows)
    assert not any(r.configured for r in rows)
    public = json.dumps([r.public() for r in readiness(config())])
    assert "test-fixture-not-a-real-key" not in public
    assert "G0" in public and "commercial activation" in public
    assert "test-fixture-not-a-real-key" not in repr(config())


def test_health_requires_authenticated_valid_response_and_does_not_imply_model_qualification():
    assert OpenAI(ProviderConfig(), Double()).health().state == State.NOT_CONFIGURED
    assert OpenAI(config(), Double({"data": []})).health().state == State.CONNECTED
    assert OpenAI(config(), Double({"wrong": []})).health().state == State.DEGRADED
    broken = Double(error=RuntimeError("secret-filled upstream exception"))
    result = OpenAI(config(), broken).health()
    assert result.state == State.DEGRADED
    assert "secret-filled" not in json.dumps(result.public())


@pytest.mark.parametrize("canonical", [None, "", "canonical-fixture"])
def test_managed_openai_secret_alias_preserves_canonical_priority_and_stays_private(
    monkeypatch, canonical
):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    if canonical is not None:
        monkeypatch.setenv("OPENAI_API_KEY", canonical)
    monkeypatch.setenv("GLAM_OPENAI_API_KEY", "alias-fixture")
    monkeypatch.setenv("GLAM_OPENAI_MODEL", "qualified-test-model")
    cfg = ProviderConfig.from_environment()
    assert cfg.secret("OPENAI_API_KEY") == (canonical or "alias-fixture")
    double = Double({"data": []})
    adapter = OpenAI(cfg, double)
    assert adapter.health().state == State.CONNECTED
    assert double.calls[0][2]["Authorization"] == "Bearer " + (canonical or "alias-fixture")
    public = repr(cfg) + json.dumps([r.public() for r in readiness(cfg)])
    assert "alias-fixture" not in public and "canonical-fixture" not in public


def test_analysis_consent_before_call_structured_schema_store_false_and_no_sensitive_schema():
    double = Double(response(sample()))
    adapter = OpenAI(config(), double)
    with pytest.raises(IntegrationError, match="consent_required"):
        adapter.analyze(b"\xff\xd8\xff test", "image/jpeg", [], consent=False)
    assert double.calls == []
    result = adapter.analyze(b"\xff\xd8\xff test", "image/jpeg", ["Hair & grooming"], consent=True)
    assert all(f.estimate is None for f in result.findings)
    method, url, headers, body = double.calls[0]
    assert method == "POST" and url == "https://api.openai.com/v1/responses"
    assert headers["Authorization"].startswith("Bearer ")
    assert body["store"] is False
    assert body["text"]["format"]["strict"] is True
    assert "religion" not in json.dumps(body["text"]["format"]["schema"])


@pytest.mark.parametrize(
    "mutate",
    [
        lambda r: r.update(religion="forbidden"),
        lambda r: r["findings"][0].update(estimate="unsupported"),
        lambda r: r["findings"][0].update(certainty="certain"),
        lambda r: r["findings"][0].update(key="eyes"),
        lambda r: r["findings"][0].update(beauty_score=99),
    ],
)
def test_analysis_rejects_untrusted_or_unsupported_fields(mutate):
    value = sample()
    mutate(value)
    adapter = OpenAI(config(), Double(response(value)))
    with pytest.raises(IntegrationError, match="schema_rejected"):
        adapter.analyze(b"\xff\xd8\xff test", "image/jpeg", [], consent=True)


def test_analysis_refusal_or_incomplete_output_is_not_a_result():
    adapter = OpenAI(config(), Double({"status": "incomplete", "output": []}))
    with pytest.raises(IntegrationError, match="not_completed"):
        adapter.analyze(b"\xff\xd8\xff test", "image/jpeg", [], consent=True)


def test_fashn_requires_private_origins_consent_pinned_model_and_safe_ids():
    double = Double({"id": "test-prediction"})
    adapter = Fashn(config(), double)
    with pytest.raises(IntegrationError, match="origin_rejected"):
        adapter.start(
            "https://tracker.example/a.jpg", "https://private.example/b.jpg", consent=True
        )
    assert double.calls == []
    adapter.start("https://private.example/a.jpg", "https://private.example/b.jpg", consent=True)
    assert double.calls[0][3]["model_name"] == "test-model"
    with pytest.raises(IntegrationError, match="invalid_prediction"):
        adapter.status("../other-user")
    with pytest.raises(IntegrationError, match="consent_required"):
        adapter.start(
            "https://private.example/a.jpg", "https://private.example/b.jpg", consent=False
        )


def test_replicate_workflow_must_be_pinned_and_explicitly_consented():
    adapter = Replicate(config(), Double())
    with pytest.raises(IntegrationError, match="pinned_workflow"):
        adapter.start("latest", {}, consent=True)
    with pytest.raises(IntegrationError, match="consent_required"):
        adapter.start("a" * 64, {}, consent=False)


def test_maps_candidates_are_not_merchant_inventory_and_probe_needs_approval():
    double = Double({"places": [{"id": "test-place"}]})
    adapter = GoogleMaps(config(), double)
    assert adapter.health().state == State.NOT_CONFIGURED
    assert double.calls == []
    assert adapter.search("Cape Town", "ZA") == [{"id": "test-place"}]
    assert "OPENAI_API_KEY" not in str(double.calls[0][3])
    assert "photo" not in str(double.calls[0][3])
    assert double.calls[0][2]["X-Goog-FieldMask"].startswith("places.id")


def test_weather_requires_entitlement_and_never_fabricates_seasonal_fallback():
    double = Double()
    adapter = OpenMeteo(config(), double)
    with pytest.raises(IntegrationError, match="license_not_approved"):
        adapter.forecast(-33.9, 18.4, "2026-12-01", "2026-12-03", "Africa/Johannesburg")
    assert double.calls == []
    adapter = OpenMeteo(config(weather_license_approved=True), Double(error=URLError("secret")))
    with pytest.raises(IntegrationError, match="provider_unavailable"):
        adapter.forecast(-33.9, 18.4, "2026-12-01", "2026-12-03", "Africa/Johannesburg")
    with pytest.raises(IntegrationError, match="invalid_weather"):
        adapter.forecast(-33.9, 18.4, "2026-12-04", "2026-12-03", "bad/timezone")


@pytest.mark.parametrize(
    "method,status,expected", [("GET", 429, 3), ("POST", 429, 1), ("GET", 401, 1), ("GET", 503, 3)]
)
def test_only_safe_reads_retry_and_failures_do_not_expose_remote_body(
    monkeypatch, method, status, expected
):
    calls = []

    class Opener:
        def open(self, req, timeout):
            calls.append(req)
            raise HTTPError(req.full_url, status, "SECRET BODY", {}, None)

    monkeypatch.setattr("urllib.request.build_opener", lambda *a: Opener())
    with pytest.raises(IntegrationError) as error:
        HttpTransport(sleep=lambda delay: None).send(method, "https://api.openai.com/v1/test", {})
    assert len(calls) == expected
    assert "SECRET" not in str(error.value)


def test_redirects_are_rejected_before_credentials_leave_the_origin(monkeypatch):
    def opener(*handlers):
        handler = next(h for h in handlers if hasattr(h, "redirect_request"))
        with pytest.raises(IntegrationError, match="redirect_rejected"):
            handler.redirect_request(None, None, 302, "", {}, "https://attacker.example")
        raise IntegrationError("provider_redirect_rejected")

    monkeypatch.setattr("urllib.request.build_opener", opener)
    with pytest.raises(IntegrationError, match="redirect_rejected"):
        HttpTransport().send("GET", "https://api.openai.com/v1/test", {})


def test_notification_health_is_read_only_and_does_not_send_messages():
    from glam_api.integrations.providers import Resend, Twilio

    double = Double({"data": []})
    settings = ProviderConfig(values={"RESEND_API_KEY": SecretStr("fixture")})
    assert Resend(settings, double).health().state == State.CONNECTED
    assert double.calls[0][0] == "GET" and double.calls[0][3] is None
    assert Twilio(ProviderConfig(), Double()).health().state == State.NOT_CONFIGURED
    sid = "AC" + "a" * 32
    settings = ProviderConfig(
        values={"TWILIO_ACCOUNT_SID": SecretStr(sid), "TWILIO_AUTH_TOKEN": SecretStr("fixture")}
    )
    double = Double({"sid": sid, "status": "active"})
    assert Twilio(settings, double).health().state == State.CONNECTED
    assert double.calls[0][0] == "GET" and double.calls[0][3] is None
    assert double.calls[0][2]["Authorization"].startswith("Basic ")


def test_advisor_uses_only_explicit_brief_and_refuses_missing_consent():
    value = {
        "message": "TEST ONLY: what is your event budget?",
        "uncertainty": "Budget unknown",
        "directions": [],
    }
    double = Double(response(value))
    adapter = OpenAI(config(), double)
    with pytest.raises(IntegrationError, match="consent_required"):
        adapter.advise(["TEST birthday outfit"], consent=False)
    assert not double.calls
    assert adapter.advise(["TEST birthday outfit"], consent=True).directions == []
    body = double.calls[0][3]
    assert body["store"] is False
    assert "input_image" not in json.dumps(body)
    assert body["input"][0]["content"][0]["text"] == "TEST birthday outfit"


@pytest.mark.parametrize(
    "result",
    [
        None,
        [],
        {"status": "completed", "output": None},
        {"status": "completed", "output": [None]},
        {
            "status": "completed",
            "output": [
                {"type": "message", "content": [{"type": "refusal", "refusal": "fixture refusal"}]}
            ],
        },
        {
            "status": "completed",
            "output": [{"type": "message", "content": [{"type": "output_text", "text": None}]}],
        },
    ],
)
def test_openai_advice_rejects_refusal_and_malformed_protocol(result):
    class Malformed:
        def send(self, *args):
            return result

    with pytest.raises(IntegrationError):
        OpenAI(config(), Malformed()).advise(["Test styling brief"], consent=True)


def test_openai_model_probe_checks_exact_qualified_model_and_never_advises():
    good = Double({"id": "test-model"})
    assert OpenAI(config(), good).model_health().state == State.CONNECTED
    assert good.calls[0][0:2] == ("GET", "https://api.openai.com/v1/models/test-model")
    assert (
        OpenAI(config(), Double({"id": "different-model"})).model_health().state == State.DEGRADED
    )
    cfg = config()
    cfg.openai_model = "https://attacker.example"
    invalid = Double()
    assert OpenAI(cfg, invalid).model_health().state == State.NOT_CONFIGURED
    assert not invalid.calls
