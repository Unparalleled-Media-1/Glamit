"""Failure-diagnostic redaction only; not installed-device evidence."""

import importlib.util
from pathlib import Path


def parser():
    spec = importlib.util.spec_from_file_location(
        "native_failure_capture", Path("tests/native_device/capture-failure.py")
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.json_labels


def test_native_failure_labels_do_not_emit_password_nodes():
    labels = parser()(
        {
            "children": [
                {"attributes": {"text": "must not appear", "password": "true"}},
                {"password": True, "label": "also private"},
                {"attributes": {"text": "Settings fixture label", "password": "false"}},
            ]
        }
    )
    assert labels == ["Settings fixture label"]


def test_native_failure_label_values_are_bounded():
    assert len(parser()({"attributes": {"text": "x" * 10000}})[0]) == 120


def test_enrollment_overlay_handler_only_accepts_exact_launcher_dialog():
    import xml.etree.ElementTree as ET

    spec = importlib.util.spec_from_file_location(
        "native_enrollment", Path("tests/native_device/android-enroll.py")
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    for label, allowed in [
        ("Quickstep isn't responding", True),
        ("GLAM Beauty isn't responding", False),
        ("Settings isn't responding", False),
    ]:
        nodes = list(
            ET.fromstring(f'<hierarchy><node text="{label}"/><node text="Wait"/></hierarchy>').iter(
                "node"
            )
        )
        assert (module.launcher_wait(nodes) is not None) is allowed
