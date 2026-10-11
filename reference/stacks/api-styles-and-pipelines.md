# Stack pack: API Styles and Supporting Services

Loaded only when the repository uses this stack (see `stacks/README.md`). Seed content; the skill may add checks here as it learns (SKILL.md, "Keeping this skill current").

## 10. API Styles and Supporting Services

### 10.1 GraphQL

- Is authorization enforced per field and per resolver, not only at the query root?
- Are query depth, complexity, alias count, and batch size limited? Aliases and batching can multiply brute-force attempts in one request.
- Are DataLoader-style caches scoped per request so that they never share results across users?
- Are N+1 resolver patterns batched?
- Is introspection exposure consistent with policy, and are internal error details masked?
- Are schema changes backward compatible (deprecate before removal; avoid changing nullability or types in place)?

### 10.2 gRPC and protobuf

- Are deadlines set by callers and propagated to downstream calls?
- Are status codes meaningful and consistent?
- Are message size limits configured?
- Are protobuf changes wire-compatible (never reuse or renumber field numbers; reserve removed fields and names)?
- Is transport security (TLS or mTLS) and per-call authentication enforced?
- Do streaming calls handle backpressure, cancellation, and partial failure?

### 10.3 WebSockets, SSE, and long-lived connections (server side)

- Is the connection authenticated at handshake, and is access re-validated when permissions change or tokens expire?
- Is authorization checked for every channel, room, or topic subscription and every inbound message?
- Are connection counts, message sizes, and message rates bounded per user?
- Are heartbeats, idle timeouts, and load balancer timeouts aligned?
- Does fan-out work across multiple replicas (shared pub/sub or sticky routing)?
- Is slow-consumer backpressure handled without unbounded buffering?

### 10.4 Search engines and secondary indexes

- Is every search query filtered by tenant and permission?
- Can user input inject query-language syntax (query-string queries, scripts)?
- Is the index kept in sync with the source of truth, including deletes, and can it be rebuilt?
- Do mapping changes use reindexing with aliases rather than in-place breaking changes?
- Is deep pagination bounded?

### 10.5 Data pipelines, ETL, and batch jobs

- Can a run be safely re-executed for the same period without duplicating data?
- Are late-arriving and corrected records handled?
- Is upstream schema drift detected rather than silently producing nulls?
- Does a partial failure leave checkpoints that allow resumption without data loss or duplication?
- Are partition boundaries and time zones explicit?
- Are data quality checks (row counts, null rates, totals) in place for critical outputs?
- Is personal data minimized or masked in analytical stores?

------------------------------------------------------------------------

