# Stack pack: SQL and PostgreSQL Checklist

Loaded only when the repository uses this stack (see `stacks/README.md`). Seed content; the skill may add checks here as it learns (SKILL.md, "Keeping this skill current").

## 7. SQL and PostgreSQL Checklist

### 7.1 Queries, transactions, and types

- Verify query parameterization and safe handling of dynamic SQL.
- Inspect the actual query predicates and joins; do not infer performance from ORM syntax alone.
- Check whether a join is one-to-one, one-to-many, or many-to-many and whether duplication is intended.
- Verify uniqueness constraints for identities, idempotency keys, and business invariants. Case-insensitive uniqueness needs `citext` or a unique index on a normalized expression; soft-delete tables usually need partial unique indexes (`WHERE deleted_at IS NULL`).
- Confirm that transactions cover all writes that must be atomic.
- Check isolation-level assumptions and whether concurrent transactions can violate invariants. `SERIALIZABLE` requires retrying serialization failures.
- Look for lost updates, write skew, duplicate inserts, and check-then-act races.
- Use row locks, optimistic concurrency, constraints, or atomic SQL updates where appropriate. For work queues in tables, `FOR UPDATE SKIP LOCKED` avoids contention.
- Confirm tenant scoping on every query path, including raw SQL, aggregates, and reporting queries. If row-level security is used, confirm it is enabled for new tables and enforced for the application role.
- Check `NULL`, `COALESCE`, three-valued logic, and outer-join behavior. `NOT IN` with a subquery that can return `NULL` matches nothing; prefer `NOT EXISTS`.
- Inspect pagination for stable ordering and safe maximum limits. `LIMIT`/`OFFSET` without a deterministic `ORDER BY` returns unstable pages, and large offsets scan and discard rows; prefer keyset pagination for large sets.
- `ON CONFLICT (columns)` requires a matching unique index or constraint and fails without one. A bare `ON CONFLICT DO NOTHING` on a table with no unique constraint never fires, so it reads like a deduplication guard while inserting duplicates. Prefer an explicit conflict target, so a missing index fails loudly. `DO NOTHING` returns no row for conflicting input.
- Invariants enforced by row-level triggers do not cover `TRUNCATE`, which needs a statement-level trigger. Triggers are also skipped when disabled, for example under `session_replication_role = replica`.
- Handle an empty array in `IN (...)` or `= ANY($1)` explicitly, and avoid very large parameter lists (the protocol caps one statement at 65,535 bind parameters).
- Use `timestamptz` for instants; `timestamp without time zone` is interpreted in the session or driver time zone.
- Use `numeric` or integer minor units for money; avoid `float`, `double precision`, and the `money` type for financial logic.
- Drivers may return `bigint` and `numeric` as strings (node-postgres does by default); converting them to floating-point numbers can lose precision.
- `now()` and `CURRENT_TIMESTAMP` return the transaction start time, not the statement time.
- Sequences are not transactional; gaps are normal and must not be relied on. Check 32-bit key exhaustion on high-volume tables.
- Check indexes against filters, joins, ordering, and uniqueness requirements.
- Verify foreign-key and cascade semantics.
- With PgBouncer in transaction-pooling mode, session-level features (advisory locks, `SET`, `LISTEN/NOTIFY`, temporary tables, and prepared statements on older versions) do not behave as on a direct connection.
- Consider lock contention, deadlocks, connection pool saturation, and transaction duration. Total connections across replicas and workers must stay below `max_connections` (Section 11.9).
- Do not retry a transaction or operation without understanding whether it may have partially committed or caused external side effects.
- Use query plans or measurements before making strong performance claims.

### 7.2 Migration and DDL hazards

- Consider lock duration and table size for every DDL change, and set `lock_timeout` (and a sensible `statement_timeout`) so a migration waiting for a lock does not queue all other traffic behind it.
- `CREATE INDEX` without `CONCURRENTLY` blocks writes on large tables. `CONCURRENTLY` cannot run inside a transaction block (many migration tools wrap migrations in one), and a failed concurrent build leaves an invalid index to drop.
- Adding a foreign key or `CHECK` constraint validates the whole table under lock; add it `NOT VALID`, then `VALIDATE CONSTRAINT` separately.
- `SET NOT NULL` scans the table; on PostgreSQL 12+ an already validated `CHECK (col IS NOT NULL)` constraint lets it skip the scan.
- Changing a column type usually rewrites the table and its indexes.
- Adding a column with a volatile default rewrites the table; non-volatile defaults are cheap on PostgreSQL 11+.
- Renaming or dropping columns and tables breaks the version of the application that is still running; use expand-and-contract.
- Large data updates belong in batched, resumable backfills, not a single migration transaction.
- Ensure migration scripts are safe for existing data (including values that violate a new constraint) and meet repeatability expectations. A new unique index or constraint fails if existing rows violate it. The migration needs a deduplication step before the constraint, with a defined rule for which row survives, and it should report how many rows it removed.
- Are down migrations accurate, or is the migration explicitly forward-only with a documented recovery path?
- Do startup-time migrations run once even when several replicas start simultaneously?

### 7.3 Migration tooling, schema-as-code, and seeds

- Was the migration created the way the project's tool expects, for example generated from the declarative schema along with its snapshot and journal or manifest entry? Hand-written migrations that lack this metadata break the snapshot chain, and the next generation re-proposes changes that already exist, often as non-idempotent DDL that fails the whole migration run.
- Is every schema change also declared in the ORM models or schema files, including indexes and constraints added in raw SQL? Otherwise the next generated migration drops or duplicates it.
- Is the migration registered with the tool so that it actually runs? An unregistered file never runs. A migration applied by hand, outside the tool, will run again later, so it must be idempotent.
- Do constraint and index names follow the generator's naming convention? Different names cause a later generated migration to drop and recreate them.
- Do generated statements need hardening for environments in different states (`IF NOT EXISTS`, guarded constraint creation)? Follow the idiom the project already uses.
- To verify, run the generator offline after the change. It should report no pending schema changes.
- Do seed and fixture scripts stay idempotent when rerun? Look for commented-out cleanup steps, conflict clauses with no matching constraint, and inserts that join through tables that themselves accumulate duplicates; each of these multiplies rows on every run. Check that production guards really stop the script in production.

------------------------------------------------------------------------

