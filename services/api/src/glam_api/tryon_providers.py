"""Try-on provider contract and the deterministic, test-only provider.

No real provider is wired here: FASHN/Replicate are bake-off candidates, not approved, and the
existing adapters cannot fetch results. Production selection fails closed until one qualifies.
"""

import hashlib
import io
import os
from dataclasses import dataclass

from PIL import Image, ImageDraw


class ProviderRejected(Exception):
    """Definite refusal before any billable work (e.g. moderation). Safe to release credits."""

    def __init__(self, code="provider_rejected", moderation=False):
        super().__init__(code)
        self.code = code
        self.moderation = moderation


class ProviderAmbiguous(Exception):
    """Outcome unknown (timeout, lost response). Never redispatched; never charged to the user."""


class ProviderFailed(Exception):
    """Provider definitively reported failure after accepting the work."""

    def __init__(self, code="provider_failed", billed_cost_micros=None, currency=None):
        super().__init__(code)
        self.code = code
        self.billed_cost_micros = billed_cost_micros
        self.currency = currency


@dataclass(frozen=True)
class ProviderOutput:
    image: bytes
    billed_cost_micros: int | None = None
    currency: str | None = None


class TryOnProvider:
    name: str
    model_version: str
    synthetic: bool = False

    def submit(self, source_png: bytes, garments: list[dict], scope: str, *, consent: bool) -> str:
        raise NotImplementedError

    def poll(self, provider_job_id: str) -> ProviderOutput | None:
        """Return None while pending; raise ProviderFailed for definite failure."""
        raise NotImplementedError


class DeterministicTestProvider(TryOnProvider):
    """Local test double: output is visibly labelled and is NOT a real try-on."""

    name = "deterministic_test"
    model_version = "deterministic-test-1"
    synthetic = True
    LABEL = "TEST OUTPUT - NOT A REAL TRY-ON"

    def __init__(self, mode="success", pending_polls=0):
        if os.environ.get("GLAM_DEPLOYMENT_ENV") == "production":
            raise RuntimeError("The deterministic test provider cannot run in production")
        self.mode = mode
        self.pending_polls = pending_polls
        self.submits = 0
        self.polls = 0
        self.cancelled: list[str] = []
        self.seen_source_hashes: list[str] = []

    def submit(self, source_png, garments, scope, *, consent):
        if consent is not True:
            raise ProviderRejected("consent_required")
        self.submits += 1
        self.seen_source_hashes.append(hashlib.sha256(source_png).hexdigest())
        if self.mode == "reject":
            raise ProviderRejected("moderation", moderation=True)
        if self.mode == "submit_ambiguous":
            raise ProviderAmbiguous("lost_response")
        return "test-" + hashlib.sha256(source_png + scope.encode()).hexdigest()[:16]

    def poll(self, provider_job_id):
        self.polls += 1
        if self.mode == "poll_ambiguous" or self.mode == "never_ready":
            if self.mode == "never_ready":
                return None
            raise ProviderAmbiguous("poll_unavailable")
        if self.polls <= self.pending_polls:
            return None
        if self.mode == "fail":
            raise ProviderFailed("generation_failed", billed_cost_micros=0, currency="USD")
        if self.mode == "not_image":
            return ProviderOutput(b"not an image")
        if self.mode == "oversize":
            return ProviderOutput(b"\x89PNG" + b"0" * (10 * 1024 * 1024))
        return ProviderOutput(self.render(provider_job_id), billed_cost_micros=0, currency="USD")

    def render(self, seed):
        value = int(hashlib.sha256(seed.encode()).hexdigest()[:6], 16)
        image = Image.new("RGB", (512, 768), (value >> 16, (value >> 8) & 255, value & 255))
        ImageDraw.Draw(image).text((16, 16), self.LABEL, fill="white")
        out = io.BytesIO()
        image.save(out, format="PNG")
        return out.getvalue()
