#!/usr/bin/env python3
"""Run one SQL file through psql without putting a connection string on argv.

Local hosts are accepted. A hosted database is accepted only when all of these
are set:

  KYA_ALLOW_DEV_DATABASE=yes
  KYA_DEV_PROJECT_REF=<new project ref>
  KYA_PRODUCTION_PROJECT_REF=<production project ref>

The host must be exactly db.<dev ref>.supabase.co. The production ref must be
different. Pooler hosts are refused.

A file under supabase/migrations also requires KYA_APPLY_MIGRATION=yes.
A file named kya_03c_concurrent*.sql also requires KYA_ALLOW_DEV_WRITE=yes.

Stdout and stderr are scrubbed of URLs, the password, and the host. This
script does not open a database connection itself; psql does.
"""

import os
import re
import subprocess
import sys
from urllib.parse import unquote, urlparse

LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}
REF = re.compile(r"^[a-z0-9]{20}$")
URL_RE = re.compile(r"postgres(?:ql)?://\S+", re.IGNORECASE)


def fail(message):
    print(message, file=sys.stderr)
    raise SystemExit(1)


def scrub(text, host, user, password):
    cleaned = URL_RE.sub("[redacted-url]", text)
    if password:
        cleaned = cleaned.replace(password, "[redacted]")
    if host:
        cleaned = cleaned.replace(host, "[database-host]")
    if user and user != "postgres":
        cleaned = cleaned.replace(user, "[database-user]")
    return cleaned


def connection():
    url = os.environ.get("KYA_TEST_DATABASE_URL", "")
    if url:
        parsed = urlparse(url)
        if parsed.scheme not in {"postgres", "postgresql"}:
            fail("Refusing a non-PostgreSQL connection.")
        host = (parsed.hostname or "").lower()
        port = str(parsed.port or 5432)
        user = unquote(parsed.username or "")
        password = unquote(parsed.password or "")
        database = unquote((parsed.path or "/postgres").lstrip("/"))
        if not host or not user or not database:
            fail("The connection URL is missing a host, user, or database.")
        return host, port, user, password, database

    host = os.environ.get("PGHOST", "").lower()
    port = os.environ.get("PGPORT", "5432")
    user = os.environ.get("PGUSER", "")
    password = os.environ.get("PGPASSWORD", "")
    database = os.environ.get("PGDATABASE", "")
    if not host or not user or not database:
        fail(
            "Set PGHOST, PGUSER, and PGDATABASE, or KYA_TEST_DATABASE_URL. "
            "Refusing to choose a database."
        )
    return host, port, user, password, database


def allow(host):
    if host in LOCAL_HOSTS:
        return
    if os.environ.get("KYA_ALLOW_DEV_DATABASE") != "yes":
        fail(
            "Refusing a non-local database. Hosted development requires "
            "KYA_ALLOW_DEV_DATABASE=yes."
        )
    dev = os.environ.get("KYA_DEV_PROJECT_REF", "")
    prod = os.environ.get("KYA_PRODUCTION_PROJECT_REF", "")
    if REF.fullmatch(dev) is None or REF.fullmatch(prod) is None:
        fail(
            "Hosted development requires KYA_DEV_PROJECT_REF and "
            "KYA_PRODUCTION_PROJECT_REF. Each must be a 20-character project ref."
        )
    if dev == prod:
        fail(
            "Refusing because the development project ref matches the "
            "production project ref."
        )
    if host != "db.%s.supabase.co" % dev:
        fail(
            "Refusing because the host is not the direct connection for the "
            "configured development project."
        )
    if prod in host:
        fail("Refusing because the host contains the production project ref.")


def main():
    args = sys.argv[1:]
    tuples = False
    if args and args[0] == "--tuples":
        tuples = True
        args = args[1:]
    if len(args) != 1:
        fail("Usage: kya_psql.py [--tuples] file.sql")

    path = os.path.abspath(args[0])
    if not os.path.isfile(path):
        fail("SQL file not found.")
    if "%smigrations%s" % (os.sep, os.sep) in path and os.environ.get(
        "KYA_APPLY_MIGRATION"
    ) != "yes":
        fail("Refusing to apply a migration without KYA_APPLY_MIGRATION=yes.")
    if os.path.basename(path).startswith("kya_03c_concurrent") and os.environ.get(
        "KYA_ALLOW_DEV_WRITE"
    ) != "yes":
        fail("Refusing a concurrent write without KYA_ALLOW_DEV_WRITE=yes.")

    host, port, user, password, database = connection()
    allow(host)
    if host not in LOCAL_HOSTS and user != "postgres":
        fail("Hosted development tests must connect as postgres.")

    env = os.environ.copy()
    for key in (
        "KYA_TEST_DATABASE_URL",
        "PGHOST",
        "PGPORT",
        "PGUSER",
        "PGPASSWORD",
        "PGDATABASE",
    ):
        env.pop(key, None)
    env["PGHOST"] = host
    env["PGPORT"] = port
    env["PGUSER"] = user
    env["PGDATABASE"] = database
    if password:
        env["PGPASSWORD"] = password
    env["PGSSLMODE"] = "prefer" if host in LOCAL_HOSTS else "require"

    cmd = ["psql", "-X", "-q", "-v", "ON_ERROR_STOP=1", "-f", path]
    if tuples:
        cmd[1:1] = ["-t", "-A"]
    result = subprocess.run(
        cmd,
        env=env,
        input=b"",
        capture_output=True,
    )
    sys.stdout.write(scrub(result.stdout.decode("utf-8", "replace"), host, user, password))
    sys.stderr.write(scrub(result.stderr.decode("utf-8", "replace"), host, user, password))
    raise SystemExit(result.returncode)


if __name__ == "__main__":
    main()
