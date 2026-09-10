"""Content hasher for the smart test cache (single source of truth).

Computes a deterministic SHA-256 over the *content* of every file in a test
scope so ``scripts/test-smart.ps1`` / ``scripts/test-smart.sh`` can skip a
suite when nothing it depends on changed. Stdlib only — no new dependencies.

Scopes:
    server  -> server/app, server/tests, server/pytest.ini,
               server/requirements.txt, sql + python version
    website -> website/src, website/package.json, website/package-lock.json,
               website/vite.config.js (+ vitest configs if present) + node version
    worker  -> services/whatsapp-worker + go version

Usage:
    python scripts/lib/test-hash.py <server|website|worker>
    -> prints lowercase hex digest to stdout, exit 0.
    -> exit 2 on invalid scope.

Determinism rules (Windows/Linux parity):
    - Relative POSIX paths, sorted byte-wise.
    - CRLF normalized to LF for text files only (by extension).
    - Excludes: node_modules, __pycache__, .pytest_cache, .cache, dist,
      build, .venv, .git, coverage, vendor, target, *.db, *.pyc, .env*.
"""

from __future__ import annotations

import hashlib
import os
import subprocess
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

SCOPE_INPUTS: dict[str, list[str]] = {
    "server": [
        "server/app",
        "server/tests",
        "server/pytest.ini",
        "server/requirements.txt",
        "sql",
    ],
    "website": [
        "website/src",
        "website/package.json",
        "website/package-lock.json",
        "website/vite.config.js",
        "website/vitest.config.js",
        "website/vitest.workspace.js",
    ],
    "worker": [
        "services/whatsapp-worker",
    ],
}

EXCLUDED_DIRS = {
    "node_modules",
    "__pycache__",
    ".pytest_cache",
    ".cache",
    "dist",
    "build",
    ".venv",
    ".git",
    "coverage",
    ".next",
    "vendor",
    "target",
}

EXCLUDED_SUFFIXES = (".db", ".pyc", ".log")
EXCLUDED_BASENAMES = {".env", ".env.prod"}

TEXT_EXTENSIONS = {
    ".py", ".js", ".jsx", ".ts", ".tsx", ".json", ".txt", ".ini",
    ".cfg", ".toml", ".yml", ".yaml", ".go", ".mod", ".sum",
    ".css", ".html", ".md", ".sh", ".ps1", ".sql",
}


def _is_excluded(rel_posix: str) -> bool:
    parts = rel_posix.split("/")
    if any(p in EXCLUDED_DIRS for p in parts):
        return True
    base = parts[-1]
    if base in EXCLUDED_BASENAMES or base.startswith(".env."):
        return True
    if base.endswith(EXCLUDED_SUFFIXES):
        return True
    return False


def _git_files(root: str) -> list[str] | None:
    """Return git-tracked + untracked files (excluding ignored), or None."""
    try:
        out = subprocess.run(
            ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
            cwd=root,
            capture_output=True,
            timeout=30,
        )
        if out.returncode != 0:
            return None
        raw = out.stdout.split(b"\0")
        files = []
        for entry in raw:
            if not entry:
                continue
            try:
                rel = entry.decode("utf-8")
            except UnicodeDecodeError:
                continue
            rel_posix = rel.replace(os.sep, "/")
            if not _is_excluded(rel_posix):
                files.append(rel_posix)
        return files
    except Exception:
        return None


def _walk_files(root: str) -> list[str]:
    collected = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = sorted(d for d in dirnames if d not in EXCLUDED_DIRS)
        for name in filenames:
            full = os.path.join(dirpath, name)
            rel = os.path.relpath(full, root).replace(os.sep, "/")
            if not _is_excluded(rel):
                collected.append(rel)
    return collected


def _scope_contains(rel_posix: str, patterns: list[str]) -> bool:
    for pat in patterns:
        if rel_posix == pat or rel_posix.startswith(pat.rstrip("/") + "/"):
            return True
    return False


def _read_canonical(root: str, rel_posix: str) -> bytes:
    full = os.path.join(root, *rel_posix.split("/"))
    with open(full, "rb") as fh:
        data = fh.read()
    _, ext = os.path.splitext(rel_posix)
    if ext.lower() in TEXT_EXTENSIONS:
        data = data.replace(b"\r\n", b"\n").replace(b"\r", b"\n")
    return data


def _toolchain_markers(scope: str) -> list[bytes]:
    markers: list[bytes] = [f"python:{sys.version.split()[0]}".encode()]
    if scope in ("website", "worker"):
        for cmd in (["node", "--version"], ["go", "version"]):
            label = " ".join(cmd).encode()
            try:
                out = subprocess.run(
                    cmd, capture_output=True, timeout=15
                )
                if out.returncode == 0:
                    markers.append(label + b"=" + out.stdout.strip().splitlines()[0][:80])
                else:
                    markers.append(label + b"=unknown")
            except Exception:
                markers.append(label + b"=unknown")
    return markers


def hash_scope(scope: str, root: str = REPO_ROOT) -> str:
    if scope not in SCOPE_INPUTS:
        raise ValueError(f"Unknown scope: {scope}")
    patterns = SCOPE_INPUTS[scope]

    all_files = _git_files(root)
    if all_files is None:
        all_files = _walk_files(root)

    in_scope = sorted(f for f in all_files if _scope_contains(f, patterns))

    digest = hashlib.sha256()
    digest.update(f"scope:{scope}\0".encode())
    for marker in _toolchain_markers(scope):
        digest.update(marker + b"\0")
    for rel in in_scope:
        full = os.path.join(root, *rel.split("/"))
        if not os.path.isfile(full):
            continue
        try:
            data = _read_canonical(root, rel)
        except OSError:
            # Deleted between listing and read -> hash the deletion itself.
            digest.update(f"missing:{rel}\0".encode())
            continue
        digest.update(f"{rel}\0{len(data)}\0".encode())
        digest.update(data)
        digest.update(b"\0")
    digest.update(f"count:{len(in_scope)}\0".encode())
    return digest.hexdigest()


def main(argv: list[str]) -> int:
    if len(argv) != 2 or argv[1] not in SCOPE_INPUTS:
        print("usage: test-hash.py <server|website|worker>", file=sys.stderr)
        return 2
    print(hash_scope(argv[1]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
