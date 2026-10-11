#!/bin/bash
# Usage: PGHOST=/tmp/pgt PGPORT=5544 PGUSER=postgres ./run-rls.sh   (needs a scratch Postgres 15+)
set -e
DB=stockroom_rls_test
psql -v ON_ERROR_STOP=1 -q -c "drop database if exists $DB" -c "create database $DB" postgres
psql -v ON_ERROR_STOP=1 -q -d $DB -f "$(dirname "$0")/supabase-stub.sql"
psql -v ON_ERROR_STOP=1 -q -d $DB -f "$(dirname "$0")/../supabase/schema.sql"
psql -d $DB -f "$(dirname "$0")/rls-test.sql" 2>&1 | grep -E "PASS|FAIL|ERROR"
