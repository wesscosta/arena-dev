"""scripts/arena.sh install: a classroom .env never keeps the published example secrets."""
import os
import re
import shutil
import stat
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]


class ArenaInstallTest(unittest.TestCase):
    def setUp(self):
        self.workdir = Path(tempfile.mkdtemp())
        (self.workdir / "scripts").mkdir()
        shutil.copy(ROOT / "scripts" / "arena.sh", self.workdir / "scripts" / "arena.sh")
        shutil.copy(ROOT / ".env.example", self.workdir / ".env.example")

    def tearDown(self):
        shutil.rmtree(self.workdir)

    def run_arena(self, *args):
        return subprocess.run(
            ["bash", str(self.workdir / "scripts" / "arena.sh"), *args],
            cwd=self.workdir, capture_output=True, text=True, check=False,
        )

    def env(self):
        values = {}
        for line in (self.workdir / ".env").read_text().splitlines():
            if "=" in line and not line.startswith("#"):
                key, value = line.split("=", 1)
                values[key] = value
        return values

    def test_install_generates_private_random_secrets(self):
        result = self.run_arena("install", "--no-start")
        self.assertEqual(result.returncode, 0, result.stderr)
        values = self.env()
        for key in ("POSTGRES_PASSWORD", "APP_TEACHER_PASSWORD", "APP_INTEGRATIONS_CREDENTIAL_ENCRYPTION_KEY"):
            self.assertTrue(values[key], key)
            self.assertNotIn(values[key], ("arena123", "troque-esta-senha", "arena-dev-change-me"))
        self.assertGreaterEqual(len(values["APP_TEACHER_PASSWORD"]), 12)
        self.assertIn(values["APP_TEACHER_PASSWORD"], result.stderr, "teacher password shown once")
        mode = stat.S_IMODE(os.stat(self.workdir / ".env").st_mode)
        self.assertEqual(mode, 0o600)

    def test_second_install_keeps_existing_env(self):
        self.run_arena("install", "--no-start")
        first = (self.workdir / ".env").read_text()
        self.run_arena("install", "--no-start")
        self.assertEqual((self.workdir / ".env").read_text(), first)

    def test_example_secrets_are_refused(self):
        shutil.copy(self.workdir / ".env.example", self.workdir / ".env")
        result = self.run_arena("install", "--no-start")
        self.assertNotEqual(result.returncode, 0)
        self.assertTrue(re.search(r"senhas inseguras", result.stderr))


if __name__ == "__main__":
    unittest.main()


class ArenaComposeProfileTest(unittest.TestCase):
    """Child scripts run plain `docker compose`; COMPOSE_FILE keeps them on the classroom profile."""

    def test_https_profile_is_exported_to_docker(self):
        workdir = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, workdir)
        (workdir / "scripts").mkdir()
        (workdir / "bin").mkdir()
        shutil.copy(ROOT / "scripts" / "arena.sh", workdir / "scripts" / "arena.sh")
        fake_docker = workdir / "bin" / "docker"
        fake_docker.write_text('#!/usr/bin/env bash\nprintf "%s" "$COMPOSE_FILE"\n')
        fake_docker.chmod(0o755)
        env = {**os.environ, "PATH": f"{workdir / 'bin'}:{os.environ['PATH']}"}
        result = subprocess.run(
            ["bash", str(workdir / "scripts" / "arena.sh"), "https-ca", str(workdir / "ca.crt")],
            cwd=workdir, capture_output=True, text=True, check=False, env=env,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(
            (workdir / "ca.crt").read_text(),
            "compose.yaml:compose.classroom.yaml:compose.https.yaml",
        )
