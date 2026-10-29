#!/bin/sh
# Run the transactional KYA-03C identity tests.
# Does not apply migrations. Connection details stay in the environment.
# See docs/KYA_03C_MIGRATION.md before pointing this at any database.
set -eu

root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
exec python3 "$root/supabase/tests/kya_psql.py" "$root/supabase/tests/kya_03c_identity.sql"
