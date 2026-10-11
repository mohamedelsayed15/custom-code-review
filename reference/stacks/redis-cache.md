# Stack pack: Redis/Valkey and Cache Checklist

Loaded only when the repository uses this stack (see `stacks/README.md`). Seed content; the skill may add checks here as it learns (SKILL.md, "Keeping this skill current").

## 8. Redis/Valkey and Cache Checklist

- Are keys namespaced by environment and tenant where needed?
- Can keys collide between users, companies, or feature areas?
- Is TTL intentional and bounded?
- Are multi-command updates vulnerable to interleaving?
- Does the operation require Lua, a transaction, or another atomic primitive? (`INCR` followed by `EXPIRE` is not atomic; a crash between them leaves a key without TTL.)
- Is a lock safe under expiry, process pauses, and multiple replicas? Does it use a unique owner token, compare-and-delete release, and fencing where the protected resource can observe a stale holder?
- Are counters and rate limits correct under concurrency?
- Can key cardinality or value size grow unexpectedly?
- Are blocking or O(N) commands avoided on large keyspaces in production (`KEYS`, `FLUSHALL`, whole-collection reads of huge sets and hashes)? Use `SCAN` variants.
- In cluster mode, do multi-key commands, transactions, and scripts keep their keys in the same hash slot (hash tags)?
- Are large permission/session payloads duplicated unnecessarily?
- Are eviction policies compatible with correctness requirements? Locks, rate-limit counters, idempotency records, and version counters used for invalidation must not be silently evicted.
- Do writes to a missing key create it (`HSET`, `INCR`, `SADD`, `LPUSH`)? Updating a record that may have expired or been deleted can resurrect a partial record, often with no TTL. Check existence and write atomically, for example in a Lua script.
- A TTL applies to the whole key: `EXPIRE` on a hash removes every field, not just one. Per-field expiry needs a separate key, or hash-field expiry (`HEXPIRE`, Redis 7.4+) where the server supports it.
- Values are stored as strings. A client that stringifies values stores `null`, `undefined`, and booleans as `"null"`, `"undefined"`, and `"false"`, which are truthy when read back.
- Does the application tolerate cache loss or restart?
- Can a cache miss storm overwhelm PostgreSQL?
- Is cached authorization state invalidated or expired according to the security policy?
- Are cache values versioned if multiple application versions may run concurrently?
- Are Pub/Sub messages acceptable to lose when no subscriber is connected? If not, use Streams with consumer groups, acknowledgement, and handling of pending entries.
- Are client connections shared and reused rather than created per request?
- Are sensitive data and tokens stored only when justified?

A cache should not silently become the only durable source of truth unless that is an explicit architecture decision.

------------------------------------------------------------------------

