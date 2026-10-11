"""Tests for the fail-closed 11.6 release gate."""
import importlib.util
import json
import unittest
from pathlib import Path
from unittest.mock import patch

SOURCE = Path(__file__).resolve().parents[1] / "v011-readiness.py"
spec = importlib.util.spec_from_file_location("v011_readiness", SOURCE)
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)
SHA = "a" * 40


def complete():
    return {
        "candidateSha": SHA,
        "decision": "GO",
        "approvedBy": "Responsible operator",
        "approvedAt": "2026-10-10T20:00:00-03:00",
        "gates": [
            {"id": name, "status": "PASS", "evidenceRef": "internal-review://record",
             "verifiedBy": "Tester", "verifiedAt": "2026-10-10"}
            for name in gate.REQUIRED
        ],
    }


class ReadinessGateTests(unittest.TestCase):
    def test_template_remains_no_go(self):
        template = json.loads((SOURCE.parents[2] / "docs/v0.11/11.6_ACCEPTANCE_TEMPLATE.json").read_text())
        self.assertTrue(gate.decide(template, SHA))

    def test_only_documented_gates_are_allowed(self):
        doc = complete()
        doc["gates"] = doc["gates"][:-1]
        self.assertTrue(any("exactly" in x for x in gate.decide(doc, SHA)))

    def test_sha_mismatch_blocks_release(self):
        self.assertTrue(any("candidateSha" in x for x in gate.decide(complete(), "b"*40)))

    def test_missing_evidence_or_owner_blocks(self):
        doc = complete()
        doc["gates"][0]["evidenceRef"] = ""
        doc["approvedBy"] = ""
        failures = gate.decide(doc, SHA)
        self.assertTrue(any("missing evidence" in x for x in failures))
        self.assertTrue(any("release owner" in x for x in failures))

    def test_complete_local_attestation_only_passes_structure(self):
        self.assertEqual(gate.decide(complete(), SHA), [])
        with patch.object(gate.subprocess, "check_output", return_value=json.dumps({
            "headSha": "b"*40, "status": "completed", "conclusion": "success",
            "jobs": [{"name": name, "status": "completed", "conclusion": "success"}
                     for name in gate.CI_JOBS],
        })):
            self.assertTrue(gate.gh_verify("owner/repo", SHA, "123"))

    def test_requires_every_required_green_ci_job(self):
        with patch.object(gate.subprocess, "check_output", return_value=json.dumps({
            "headSha": SHA, "status": "completed", "conclusion": "success",
            "jobs": [{"name": gate.CI_JOBS[0], "status": "completed", "conclusion": "success"}],
        })):
            failures = gate.gh_verify("owner/repo", SHA, "123")
        self.assertEqual(len(failures), 2)


if __name__ == "__main__":
    unittest.main()
