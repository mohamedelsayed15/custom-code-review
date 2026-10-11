# Core checklist and third-party integrations (Sections 4 and 5)

Use this checklist selectively. Not every category applies to every patch. Candidate problems found here become findings only with concrete evidence (SKILL.md Sections 2.3, 3 Stage 5, and `reporting.md` Section 17).

## 4. Core Review Checklist

### 4.1 Functional correctness

- Does the implementation meet the stated acceptance criteria?
- Are conditions, comparisons, operator precedence, and boolean logic correct?
- Are empty, null, missing, zero, negative, and boundary values handled appropriately?
- Are units and representations consistent (milliseconds vs seconds, bytes vs characters, UTC vs local time)?
- Are array indexes, ranges, pagination offsets, and limits correct?
- Are return values and side effects consistent with the function's contract?
- Are errors returned, thrown, swallowed, or transformed correctly?
- Are default values applied only when intended?
- Does refactoring preserve behavior for all existing callers?
- Does the code distinguish "not found" from "found but empty" or "not authorized" where required?
- Are sorting and filtering semantics stable and deterministic?
- Can a partial update accidentally erase fields that were not supplied?
- Are serialization and deserialization symmetrical?
- Are inputs or shared objects mutated unexpectedly (arguments, cached values, module-level defaults, objects returned from memoized functions)? Does a "copy" only copy shallowly?
- Are equality checks semantically right (reference vs value equality, `NaN`, floating-point tolerance, case and Unicode normalization, `null` vs `undefined`, decimal scale)?
- Are state transitions validated against the current state, including terminal states, repeated transitions, and transitions attempted concurrently?
- Are early returns, `continue`/`break`, and `switch` fall-through correct?
- Do loops terminate, and is recursion depth bounded for untrusted or deeply nested input?
- Is required state (status, timestamp, audit record, ownership) set on every path, not only the happy path?
- Are removed or renamed fields still read somewhere (reports, exports, other services, analytics, scheduled jobs)?
- When results are merged from several sources (activity feeds, timelines, audit views, cross-table search), does an event recorded in more than one source appear only once? Does one action that two writers both record show up as two entries?

### 4.2 Numbers, money, and units

- Is money represented as integer minor units or a decimal type, never binary floating point? Is the currency stored with the amount?
- Are rounding mode and rounding point explicit (per line vs per total, half-up vs half-even) and consistent with accounting or legal requirements?
- Do currencies with 0, 2, or 3 minor-unit digits work?
- Are allocations (taxes, discounts, installments, refunds, splits) remainder-safe so that the parts sum exactly to the total?
- Can arithmetic overflow, or exceed the safe integer range of the runtime or serialization format (2^53 in JavaScript and many JSON parsers, 2^31 for 32-bit columns)?
- Are division by zero, `NaN`, `Infinity`, and negative zero handled?
- Are percentages represented consistently (0.15 vs 15)?
- Are units explicit in names or types (ms vs s, minor vs major currency units, bytes vs KiB)?
- Are negative, zero, and maximum amounts deliberately allowed or rejected?

### 4.3 Strings, text, and encoding

- Is length measured in the unit the constraint requires (bytes, UTF-16 code units, code points, or grapheme clusters)? Can truncation split a multi-byte character or emoji, producing invalid data or failing a database length limit?
- Are strings normalized (NFC/NFKC) and case-folded consistently before uniqueness checks, comparison, and lookup? Are locale-sensitive case rules relevant?
- Are emails, usernames, phone numbers, and external identifiers canonicalized the same way at write time and at lookup time?
- Can confusable characters, zero-width characters, or bidirectional control characters spoof names, bypass filters or blocklists, or hide malicious source code?
- Are encodings explicit when reading or writing bytes (UTF-8 vs Latin-1, byte-order marks)?
- Are leading/trailing whitespace and empty-after-trim strings handled?
- Are null bytes rejected where downstream systems (C libraries, file paths, PostgreSQL text) cannot store or interpret them?
- Are user-supplied values written to CSV or spreadsheet exports protected against formula injection (leading `=`, `+`, `-`, `@`)?

### 4.4 Input validation and API contracts

- Are untrusted inputs validated at the boundary?
- Are type checks sufficient at runtime, rather than relying only on static types?
- Are strings normalized consistently before validation and lookup?
- Are numeric values checked for finiteness, range, and integer requirements?
- Are request body, query, path, and header limits appropriate?
- Are unknown fields rejected or safely ignored according to the contract?
- Are enum values and state transitions validated?
- Are API status codes and error shapes consistent?
- Are pagination parameters bounded to avoid expensive or unbounded requests?
- Are date/time formats and time zones explicit?
- Are backward compatibility and versioning considered for public API changes?
- Can malformed input cause crashes, excessive allocation, or unexpectedly expensive work?
- Do HTTP methods keep their semantics (`GET` without side effects; `PUT` and `DELETE` idempotent)?
- Are optimistic-concurrency controls (`ETag`/`If-Match`, version columns) used where concurrent edits can overwrite each other?
- Do bulk endpoints define partial-failure semantics, apply per-item authorization and validation, and cap batch size?
- Is the change backward compatible for API clients you do not control? Watch for removed or renamed fields, type changes, optional fields becoming required, new enum values older clients cannot parse, changed default ordering, changed error codes, and changed nullability.
- Are payload size, nesting depth, and array length bounded before parsing or processing?
- Are duplicate keys, repeated query parameters (`?id=1&id=2`), and parameter arrays handled deliberately?
- Are file names, content types, and `Content-Disposition` values in responses sanitized?
- Does any header, cookie, or token carry data that grows with the user, such as permissions, roles, or group, tenant, or feature memberships? Proxies and servers cap header size (commonly 8–16 KB) and browsers cap each cookie at about 4 KB. Past the cap, a proxy rejects the request with `431` or `400` before the application can log it, and the users who hit it first are the ones with the most access. Prefer encodings whose size is fixed, or a reference that the server resolves.
- Is user-facing text that the server generates (errors, notifications, generated documents, activity entries) localized per request where the product requires it? If pre-rendered prose is stored instead of structured facts, it cannot later be localized, redacted for a particular viewer, or corrected.

### 4.5 Authentication, authorization, and identity

- Is authentication performed before protected data or side effects are accessed?
- Is authorization checked for the specific resource and action, not merely for a logged-in identity?
- Can a caller change a resource ID to access another user's or tenant's data (IDOR/BOLA)?
- Are tenant and branch filters applied to every relevant read, update, delete, and aggregate?
- Are permissions derived from a trusted source?
- Can a request supply or override `userId`, `companyId`, role, permission, subscription, ownership, price, status, or verification fields (mass assignment through generic create/update DTOs)?
- Can an `undefined` or `null` identity or filter value turn a scoped query into an unscoped one? Several ORMs silently drop a filter whose value is `undefined` (see the ORM's stack pack, for example Section 6.7 in `stacks/typescript-node.md`).
- Are internal service credentials validated for issuer, audience, expiry, and intended service where applicable?
- Are API keys scoped, revocable, stored hashed, and compared safely?
- Are public/API-key and application/session authentication paths kept distinct where required?
- Are authorization checks repeated where trust boundaries demand them?
- Can caching or background processing reuse one identity's privileges for another identity?
- Does logout, revocation, or permission change take effect within the intended window?
- Are administrative or impersonation paths audited?
- Are error messages and timing behavior leaking sensitive account information?
- Are cookie-authenticated, state-changing endpoints protected against CSRF (SameSite policy, CSRF tokens, origin checks)? Do those checks accept the real deployment topology? An app and an API on sibling subdomains are `same-site` but not `same-origin`, so a check that accepts only `Sec-Fetch-Site: same-origin` rejects every legitimate request.
- Can an actor who manages users, roles, or API keys grant privileges they do not hold, assign the highest role, or change their own role or permissions?
- When a role, plan, or membership changes (downgrade, transfer, removal from a group), are the grants derived from it recomputed for the new role? Watch for grants that are carried over and simply relabeled.
- Are session cookies `HttpOnly`, `Secure`, and appropriately `SameSite`, and is the session identifier rotated on login and privilege change?
- Are JWTs verified with an explicit algorithm allowlist (rejecting `none` and algorithm confusion)? Can `kid`, `jku`, or `x5u` headers make the server select an attacker-controlled key? Is clock-skew tolerance bounded?
- Do OAuth/OIDC flows validate `state`, use PKCE where applicable, match `redirect_uri` exactly, and verify ID token signature, issuer, audience, nonce, and expiry?
- Are refresh tokens rotated, and is reuse detected?
- Are login, password reset, OTP, and invitation endpoints rate-limited and resistant to enumeration and brute force? Are reset and invitation tokens single-use, short-lived, high-entropy, and stored hashed?
- Are multi-step workflows enforced server-side so that a client cannot skip verification, payment, or approval steps?
- Does any authorization decision rely on data the client can influence (headers, hidden fields, claims not issued by a trusted party)?
- Do authorization failures default to deny?

Do not assume that an opaque ID, UUID, client-hidden action, or gateway route is authorization.

### 4.6 Injection, secrets, and sensitive data

- Are SQL queries parameterized for values?
- Are dynamic identifiers, sort fields, or SQL fragments selected from a strict allowlist?
- Are shell commands built without unsafe interpolation?
- Are HTML (including emails and server-rendered templates), URL, LDAP, NoSQL, and other context-specific outputs escaped appropriately?
- Can user input reach a template engine as template source rather than data (server-side template injection)?
- Can user-controlled URLs, hostnames, or webhook targets make the server reach internal services (SSRF)? Check private, loopback, and link-local ranges (including IPv6 and cloud metadata endpoints), redirects to internal hosts, alternate IP encodings, and DNS rebinding between validation and connection.
- Is untrusted data deserialized with unsafe mechanisms (full YAML loaders, `pickle`, Java native serialization, libraries that revive functions or classes)?
- Are XML parsers configured to disable external entities and DTD processing (XXE)?
- Can CR/LF in user input inject HTTP headers, log lines, or email headers?
- Are archive extractions protected against path traversal (zip slip), symlinks, and decompression bombs?
- Are secrets excluded from source control, responses, exceptions, logs, traces, and metrics?
- Are credentials and tokens redacted without logging entire request headers?
- Are passwords hashed with an appropriate password-hashing algorithm and safe parameters?
- Are cryptographic algorithms, key sizes, nonce/IV handling, and randomness appropriate? Are tokens, OTPs, and secret identifiers generated from a cryptographically secure source?
- Are signed tokens verified rather than merely decoded?
- Are redirects and file paths protected against open redirects and traversal?
- Are uploads constrained by size, type, storage location, and content validation?
- Is personally identifiable or medical/financial data exposed only to authorized users?
- Is sensitive data retained only as long as required?
- Are TLS and certificate-validation settings preserved in production?
- Does error handling avoid returning SQL, stack traces, internal hostnames, or secret values?
- Does the diff add secrets anywhere, including fixtures, example configs, notebooks, and recorded HTTP cassettes? A committed secret must be rotated, not just deleted; it remains in history.
- Do validation regexes anchor both ends and avoid catastrophic backtracking?

### 4.7 Business logic and abuse cases

- Can a caller submit negative, zero, fractional, or extremely large quantities, prices, durations, or counts to gain an advantage?
- Does the server trust client-computed totals, prices, discounts, eligibility, or timestamps?
- Can single-use benefits (coupons, trials, referral credits, invitations, votes) be reused through retries, concurrency, multiple accounts, or case and Unicode variants?
- Can a request be replayed to repeat a side effect?
- Can limits (quotas, rate limits, seat counts, booking capacity) be exceeded by parallel requests or by splitting work across endpoints?
- Can a user act on a resource after losing access to it (cancelled subscription, removed from team, deactivated account, revoked API key)?
- Can sequential or guessable identifiers be used to enumerate resources, users, or business volume?
- Can a cheap, unauthenticated, or low-privilege request trigger expensive work (emails, SMS, AI calls, exports, report generation) without throttling?

### 4.8 Privacy and compliance

- Is collection of personal data limited to what the feature needs?
- Does personal or sensitive data appear in URLs or query strings, which end up in proxy logs, access logs, and referrers?
- Is personal data sent to third parties (error trackers, analytics, AI providers, email and SMS services) only where permitted, and minimized?
- Does deletion or anonymization propagate to replicas, caches, search indexes, warehouses, exports, queues, and backups according to policy?
- Are retention periods implemented, not just documented?
- Are access to and changes of sensitive records audited (who, what, when) without logging the sensitive values themselves?
- Do new data flows respect consent, opt-out, and data-residency requirements, including the regions where providers store data?
- Are exports, reports, and downloads scoped to the requester's permissions?
- Does field-name-based redaction also cover sensitive values embedded in free text (messages, notes, generated descriptions, event payloads)? Does it wrongly blank unrelated fields that share a generic name such as `total`, `value`, or `before`/`after`?

### 4.9 Data integrity and database behavior

- Do database constraints enforce critical invariants?
- Are uniqueness assumptions enforced with unique constraints or indexes?
- Could joins multiply rows and produce duplicate grants, totals, or response entries?
- Are `NULL` semantics handled correctly?
- Are foreign keys and delete/update behaviors appropriate? Could a cascade remove far more data than intended?
- Are writes scoped to the correct tenant?
- Are transactions used when multiple writes must succeed or fail together?
- Is transaction scope kept short? Are external calls (HTTP, queue publish, email) made while a transaction holds locks and a pool connection? Is the external effect consistent if the transaction rolls back?
- Are locks acquired in a consistent order?
- Can two concurrent requests violate an invariant despite each request appearing valid alone?
- Is a read-modify-write sequence vulnerable to lost updates?
- Are counters, balances, quotas, inventory, and appointment slots updated atomically?
- Are conflict handling and upsert semantics correct?
- Could a retry create duplicates?
- Are timestamps stored and compared consistently?
- Are migrations safe for existing production data and large tables (lock duration, table rewrites, constraint validation; the database's stack pack has specifics, for example Section 7.2 in `stacks/sql-postgres.md`)?
- Can the application version and migration version coexist during rolling deployment?
- Are indexes appropriate for actual predicates, joins, ordering, and uniqueness requirements?
- Does a new index or constraint impose significant lock or write overhead?
- Can a query scan or return a huge number of rows unexpectedly?
- Are pagination ordering and cursor semantics stable?
- Are soft-deleted records excluded consistently, and do they conflict with unique constraints for new rows?
- Are database errors classified correctly, rather than all being treated as retryable?
- Can reads from replicas return stale data immediately after a write (read-after-write consistency)?
- Can an `UPDATE` or `DELETE` run with a missing, empty, or overly broad predicate?
- Are uniqueness rules case-insensitive or normalization-aware where users expect them (emails, usernames, slugs)?
- Can identifiers or sequences exhaust their type (32-bit integer keys)?
- Are derived stores (search indexes, caches, read models, warehouses) kept consistent with the source of truth, and can they be rebuilt?
- Are data backfills batched, resumable, throttled, idempotent, and verified?

### 4.10 Concurrency and distributed systems

- Can two requests execute the same operation simultaneously?
- Is idempotency needed for retried HTTP requests, message delivery, payments, or jobs?
- Is the idempotency key scoped, persisted, and protected by a uniqueness constraint? Does a repeated key with a different payload get rejected?
- Is there a race between checking state and changing it?
- Is an in-memory lock incorrectly relied on across multiple processes or replicas?
- Are distributed locks released safely and protected against stale owners (fencing tokens where the protected resource can see a stale holder)?
- Can a lease expire while work is still running?
- Are queue consumers safe under at-least-once delivery?
- Is a message acknowledged only after required processing is complete?
- Can a process crash between a database commit and message publication?
- Is an outbox/inbox or equivalent pattern needed to avoid lost or duplicate events?
- Are retries bounded and use backoff/jitter where appropriate?
- Are poison messages isolated or dead-lettered?
- Can one failed item block an entire batch?
- Are ordering assumptions explicit?
- Are timeout and cancellation paths safe?
- Can an old job overwrite newer state?
- Are cache invalidation and event ordering handled correctly?
- Is exactly-once behavior claimed without a mechanism that actually provides it?
- Are clocks on different machines compared as if they were synchronized?
- Can scheduled work across many tenants or replicas fire at the same instant and create a thundering herd?
- Does work intended to run once per cluster (startup tasks, cron jobs, migrations) actually run once, rather than once per replica?
- Are filesystem check-then-use sequences safe (TOCTOU)?
- Can a callback, webhook, or event arrive before the record it refers to is committed or visible on the replica being read?

Treat "the client will not retry" and "this code only runs once" as unsafe assumptions unless enforced.

### 4.11 Error handling and resilience

- Are expected operational errors handled distinctly from programming defects?
- Are exceptions swallowed or logged without a useful response?
- Does a catch block accidentally turn failure into success?
- Are cleanup actions performed in `finally` or equivalent when needed?
- Can cleanup itself mask the original failure?
- Is the original error preserved as a cause when wrapping, so root causes and stack traces are not lost?
- Are downstream calls given suitable timeouts?
- Are timeouts propagated through nested operations, with inner budgets shorter than outer ones?
- Are retries restricted to transient failures and safe operations?
- Is retry amplification possible across multiple layers (client, gateway, service, SDK, database driver)?
- Are circuit breakers, concurrency limits, or bulkheads warranted for fragile dependencies?
- Does a failed dependency leave partially updated state? Does the caller know that only part of the work was committed?
- Are fallback values safe and semantically correct?
- Does graceful shutdown stop accepting work, drain or safely abandon in-flight work, and close resources?
- Are database clients, sockets, timers, listeners, and file handles released?
- Can unhandled rejections or background exceptions terminate the process?
- Are failure responses stable enough for clients to act on them?
- Do wrappers catch errors and return sentinel values (`0`, `null`, `false`, an empty list) that callers treat as valid results?
- Does a required step that runs after commit (cache invalidation, a version bump, an event publish) have a recovery path if it fails? If it only logs, or throws to a caller whose write is already committed, the change takes effect late or never. A revocation that never reaches cached sessions is an example.

### 4.12 Performance and resource use

- Is algorithmic complexity appropriate for realistic input sizes?
- Is work accidentally repeated inside loops?
- Are N+1 database or service queries introduced?
- Are queries fetching unused columns or excessive rows?
- Is pagination applied before expensive materialization where possible?
- Are indexes aligned with query predicates and sort order?
- Are large payloads, buffers, arrays, or object graphs duplicated unnecessarily?
- Can unbounded caches, queues, maps, listeners, or in-memory collections grow indefinitely?
- Are streaming APIs used for large files or data sets where appropriate?
- Are timeouts, connection pools, and concurrency limits configured realistically?
- Can a regular expression or parser exhibit catastrophic behavior on untrusted input?
- Is expensive synchronous work blocking an event loop or request thread?
- Is CPU-heavy work appropriate for a worker thread, separate process, or external worker?
- Are compression, serialization, and logging costs proportionate?
- Is caching correct with respect to invalidation, authorization, and freshness?
- Can one request fan out into an unbounded number of downstream calls, queries, or messages (amplification)?
- Are expensive endpoints protected by authentication, rate limits, or caching before they do the work?
- Does the change materially increase operating cost (paid API calls, AI tokens, SMS, egress, log and metric volume, storage) without limits or monitoring?
- Is a performance claim supported by profiling, query plans, or a credible workload?
- Does optimization make code materially more complex without evidence of benefit?

Do not flag O(n) merely because it is O(n). Explain the input size, call frequency, and consequence.

### 4.13 Caching and session state

- Is the cache key unique across tenant, user, resource, locale, API version, and relevant permissions?
- Can one user's response be served to another user?
- Are TTL and invalidation semantics correct?
- Can stale authorization data persist beyond the accepted revocation window?
- Is cache-aside logic safe during concurrent misses (stampede protection where load warrants it)?
- Are negative results cached intentionally?
- Can a cache outage overload the database?
- Is cache data treated as untrusted or stale when appropriate?
- Are serialized values versioned or safely handled across deployments?
- Can cache entries grow without bounds?
- Are secrets or unnecessary personal data stored in the cache?
- Does expiration cleanup rely on assumptions about key eviction that are not guaranteed?
- Are cached objects mutated after retrieval, corrupting the value for later readers?
- Are authenticated or personalized HTTP responses marked `Cache-Control: private` or `no-store`, with correct `Vary` headers, so shared caches, CDNs, and proxies cannot serve them to other users?
- In layered caches (process memory, then a shared cache, then the database), does every layer have its own expiry or invalidation? A process-local copy with no TTL masks the shared cache's TTL, so changes never arrive until the process restarts.
- Does request coalescing (single-flight, reusing an in-flight promise) key on every parameter that affects the result, including freshness options? Otherwise a forced reload can be handed a stale cached result.
- Can version counters or stamps used for invalidation reset? If a missing key is read as `0`, or a counter is recreated at `1` after eviction or expiry, it can equal a stale stamp and hide a change.

### 4.14 Queues, events, and background jobs

- Is the message schema validated?
- Are event names, versions, and payload contracts compatible with consumers?
- Are handlers idempotent?
- Is acknowledgement/rejection behavior correct?
- Are retries and dead-letter behavior configured and observable?
- Is concurrency bounded?
- Are long-running jobs resumable or safely restartable?
- Are scheduled jobs protected against overlapping execution where necessary?
- Are locks and leases safe across replicas?
- Can a job run after its underlying resource has been deleted or changed?
- Does the job re-check authorization and current state at execution time rather than trusting what was true at enqueue time?
- Are event publication and database writes consistent?
- Are duplicate, delayed, reordered, or malformed messages handled?
- Is the job's tenant context explicit and validated?
- Are failed jobs observable without leaking sensitive payloads?
- Do scheduled jobs that missed runs (downtime, deploys) catch up, skip, or double-run as intended?

### 4.15 Time, dates, and scheduling

- Are timestamps represented with a clear time zone?
- Are UTC instants distinguished from local wall-clock times?
- Are daylight-saving transitions relevant? Are local times that do not exist or that occur twice handled?
- Are date-only values accidentally parsed as instants, shifting the date across time zones?
- Are interval boundaries inclusive or exclusive by design? Are day ranges half-open (`[start, nextStart)`) rather than ending at `23:59:59`, which misses sub-second timestamps?
- Can adjacent time intervals be incorrectly considered overlapping?
- Are duration units consistent?
- Is month and year arithmetic safe at month ends and leap days (January 31 plus one month, February 29 anniversaries)?
- Are "today", "end of day", billing periods, and business days computed in the tenant's or user's time zone rather than the server's?
- Are recurrence rules explicit about time zone and daylight-saving behavior?
- Are cron expressions interpreted in the expected time zone?
- Are database and application clocks assumed to be perfectly synchronized?
- Are durations measured with a monotonic clock rather than wall-clock time?
- Are week-based formats correct (ISO week-year vs calendar year; `YYYY` vs `yyyy` in some formatting libraries)?
- Are expiry and timeout comparisons robust at boundary instants?
- Are tests deterministic rather than depending on the current time?
- Do missing timestamps become the epoch (`new Date(null)` is 1970-01-01) or zero, and then sort or display as real values?

### 4.16 Files, I/O, and object storage

- Are files written atomically (write to a temporary file, then rename) where readers may observe partial writes?
- Are temporary files and directories created securely and cleaned up on every path?
- Does the code rely on local filesystem persistence in an ephemeral container or across replicas?
- Are uploaded files stored outside any served directory, or in object storage that is private by default?
- Are signed URLs short-lived and scoped to a single object and operation?
- Is content type determined from the content rather than a client-supplied header or extension? Can HTML or SVG uploads be served inline from a trusted domain?
- Are large files streamed rather than loaded into memory?
- Are paths built with path-joining functions and validated against a base directory after resolution (including symlinks)?
- Are bucket policies, object ACLs, and file permissions least-privilege?
- Are object keys namespaced by tenant, and can a caller choose a key that overwrites another tenant's object?

### 4.17 Feature flags, rollout, and compatibility

- Does the code behave correctly with the flag on, off, and changing mid-request or mid-workflow?
- Is the default safe if the flag service is unavailable?
- Is the flag evaluated with the right context (tenant, user, percentage) and consistently across services?
- Is there a kill switch for risky behavior, and a plan to remove the flag afterward?
- Can old and new application versions, API clients that cannot be forced to upgrade, old cached values, and old queued messages coexist with the change?
- Do schema, event, and API contract changes follow expand-and-contract (add, migrate readers and writers, then remove) rather than renaming or removing in one step?
- Is rollback possible after the new version has written data in a new shape?
- Are identifiers that are persisted or in flight kept stable? This covers enum values stored by ordinal, positional or bit encodings, numeric codes, and IDs carried in tokens or messages. Reordering, inserting in the middle, or reusing a retired value silently changes the meaning of existing rows, tokens, and messages. Assign new values append-only and keep retired values reserved.
- When the change adds a permission, gate, or required setting to existing functionality, does the same rollout grant it to current users and set it in every environment? Otherwise people silently lose access they had.

### 4.18 Maintainability and design

- Does the code have a clear responsibility?
- Is business logic hidden inside transport, persistence, or framework glue?
- Are abstractions useful, or do they add indirection without reducing complexity?
- Is the same business rule implemented differently in multiple places?
- Are invariants named and enforced in one understandable location?
- Are types precise enough to prevent invalid states?
- Are unsafe casts, `any`, non-null assertions, or broad exception catches hiding uncertainty?
- Are dependencies explicit rather than imported through hidden global state?
- Are side effects obvious from function contracts?
- Is configuration validated at startup?
- Are public contracts and domain concepts named consistently?
- Can the code be tested without excessive mocking or elaborate setup?
- Does the change make the simplest correct path easy to understand?
- Is backward compatibility considered for exports, event schemas, database fields, and API responses?
- Are comments explaining why rather than restating what the code does?
- Do comments, docstrings, and names still describe what the code does? A comment that promises cleanup or protection whose code was commented out or removed leads readers to assume a guarantee that no longer exists.
- Does the change move an invariant from an enforced mechanism (constraint, trigger, type, test) to a convention (comment, warning header, reviewer discipline)? Point out the weaker guarantee and suggest a test or check that restores it.
- Is the mechanism's complexity proportionate to the requirement? Count the failure modes it introduces: caches, version counters, sync steps, generated copies, encoding conventions. If several findings cluster in one mechanism, or a simpler representation meets the same requirement with fewer moving parts, raise a design finding that names the failure modes it would remove. Do not frame it as a preference. When the efficiency gain is small, readability for future maintainers and the ability to debug from logs are legitimate criteria.

Do not demand abstraction for its own sake. Prefer clear, direct code over speculative generality.

### 4.19 Observability and operations

- Are important failures visible through logs, metrics, traces, or alerts?
- Are logs structured and useful for diagnosis?
- Are correlation/request IDs propagated across service boundaries, queues, and outbound provider calls?
- Are high-cardinality values avoided as metric labels?
- Are secrets and sensitive payloads redacted?
- Are expected client errors separated from operational failures?
- Are retries, queue depth, latency, error rates, saturation, and timeouts observable where relevant?
- Are health checks meaningful and appropriately scoped?
- Can startup fail clearly when required configuration is invalid?
- Does shutdown flush telemetry and close resources safely?
- Are new environment variables documented and validated?
- Are deployment and rollback steps compatible with the change?
- Can logs or traces leak authorization headers, session IDs, or full database records?
- Are new failure modes covered by actionable alerts and runbooks (Section 11.10)?
- Are audit events for security-relevant actions emitted separately from debug logging?

### 4.20 Configuration, dependencies, and supply chain

- Are defaults safe for production?
- Are missing or malformed environment variables detected early?
- Are environment variables parsed correctly from strings (`"false"` and `"0"` are truthy strings in many languages)?
- Are development-only flags disabled in production?
- Are new dependencies necessary, maintained, and appropriately constrained?
- Does each new dependency exist under exactly that name from the expected publisher? Watch for typosquatting and package names hallucinated by code generators that attackers may register.
- Does a new dependency run install scripts or pull a large transitive tree for a small feature?
- Is the license compatible with the project's distribution model?
- Do dependency upgrades introduce breaking changes, changed defaults, or security concerns?
- Are lockfiles updated consistently, and does the lockfile change only in expected ways (no new registries or unexplained packages)?
- Are container images, runtime versions, and build steps compatible?
- Are permissions and network exposure least-privilege?
- Are secrets supplied through an appropriate secret mechanism (Section 11.5)?
- Can rolling deployment run old and new application versions simultaneously?
- Is rollback possible after a schema or event-contract change?
- Are resource limits and health checks suitable?
- Are startup migrations safe with multiple replicas?

### 4.21 Tests and test quality

- Are success, failure, boundary, and authorization cases represented?
- Do tests use realistic constraints and schemas?
- Are integration tests needed for transactions, database constraints, queues, middleware, or provider contracts?
- Are concurrency-sensitive properties tested deterministically?
- Are time-dependent tests controlled with a fake clock or fixed timestamps?
- Are mocks concealing a mismatch with actual framework, database, or provider behavior? Does the test mostly verify its own mocks?
- Are assertions specific enough to catch regressions? Would the test fail if the fix were reverted?
- Can asynchronous work continue after the test ends?
- Are tests order-dependent or sharing mutable global state?
- Does the test suite verify externally observable behavior?
- Are migrations and rollback/forward compatibility covered where relevant?
- Are tests for security boundaries negative as well as positive (other tenant, other user, revoked access)?
- Did the patch weaken tests: deleted or loosened assertions, added `skip`/`only`/`xit`, increased timeouts, broadened mocks, regenerated snapshots without inspection, or lowered coverage thresholds?
- Are tests flaky because of timing, ordering, randomness, network access, or shared state?
- Is test data realistic (Unicode, large values, multiple tenants, pre-existing rows) and free of real personal data and secrets?

### 4.22 Documentation and developer experience

- Are changed contracts documented where users or other developers depend on them?
- Are new configuration variables and required setup steps documented? Do sample configuration files (`.env.example`, config templates) gain new required variables and lose removed ones, so a fresh setup still boots?
- Are examples consistent with actual runtime behavior?
- Are migration, rollout, and recovery steps documented when needed?
- Are comments, diagrams, and runbooks updated if they became misleading?
- Does documentation avoid embedding real credentials or private data?

### 4.23 Change hygiene

- Debugging leftovers: stray print/console logging, `debugger` statements, verbose logging of payloads, commented-out code, temporary endpoints, hardcoded `localhost` URLs, test credentials, or `TODO`s without a tracking reference.
- New lint or type-check suppressions (`eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `# noqa`, `# type: ignore`, `//nolint`, `@SuppressWarnings`) without justification.
- Unrelated changes bundled into the patch that make review or rollback harder, including churn from a formatter or codemod run over whole directories.
- Hand edits to generated files that will be overwritten.
- Large binaries, data dumps, or build outputs committed by mistake.
- Hardcoded environment-, tenant-, or customer-specific values.

Report hygiene items only when they create real risk, violate a project rule, or would ship to production.

### 4.24 AI and LLM features in the code under review

- Is untrusted content (user input, retrieved documents, emails, web pages, tool results) kept separate from instructions, and is the design robust to prompt injection through that content?
- Is model output treated as untrusted before it is executed, used in queries or shell commands, passed as tool arguments, stored, or returned to clients for rendering?
- Are tools and agent actions least-privilege, scoped to the current user and tenant, and gated by confirmation for destructive or external actions?
- Are token usage, cost, request rate, and output length bounded per user and per tenant?
- Is personal or confidential data sent to model providers only where permitted, and are prompts and outputs logged without leaking it?
- Are timeouts, streaming interruptions, refusals, rate limits, and malformed structured output handled?
- Are model identifiers and parameters configured deliberately, and is behavior covered by evaluations or deterministic tests with recorded responses?

------------------------------------------------------------------------

## 5. Third-Party Integrations Checklist

Apply to any code that calls, receives calls from, or synchronizes data with an external provider (payments, identity, email, SMS, storage, CRMs, ERPs, shipping, maps, AI APIs, partner APIs).

### 5.1 Outbound API calls

- Does every call have connect, read, and overall timeouts, and a maximum response size?
- Are retries limited to transient failures and to idempotent operations, or protected by a provider idempotency key? Are they bounded with backoff and jitter, and does the total retry budget fit inside the caller's own timeout?
- Is "the request failed" distinguished from "the outcome is unknown" (timeout or connection reset after the request was sent)? Unknown outcomes need reconciliation, not a blind retry or a premature failure state.
- Are provider rate limits, quotas, `429` responses, and `Retry-After` honored? Can one tenant exhaust a shared quota for all tenants?
- Is the response validated rather than trusted? Handle missing fields, `null`, new enum values, type changes, empty lists, HTML error pages instead of JSON, and `200` responses that carry an error body.
- Is provider pagination followed to completion with a safety bound, and are expiring cursors handled?
- Is the provider API version pinned, and are deprecations tracked?
- Are provider errors mapped to internal errors without leaking provider details, credentials, or raw payloads to clients?
- Can a slow or failing provider exhaust worker threads, connection pools, or queue consumers (circuit breaker, bulkhead, concurrency limit)?
- Is the call made inside a database transaction (Section 4.9)?
- Are provider request IDs logged so incidents can be traced with the provider's support?
- In multi-tenant systems, is each call made with the correct tenant's credentials and account identifiers, with no possibility of crossing tenants?

### 5.2 Inbound webhooks and callbacks

- Is the signature verified over the raw request body bytes before parsing, using a constant-time comparison? Is secret rotation supported (more than one active secret)?
- Is the signing secret selected for the account or tenant the event claims to belong to, rather than one global secret that any account's events can satisfy?
- Is replay prevented with a timestamp tolerance and event-ID deduplication backed by a unique constraint?
- Is handling idempotent under duplicate delivery?
- Is out-of-order delivery handled (for example "succeeded" arriving before "created", or an update older than the stored state)? Compare provider versions or timestamps, or re-fetch the object from the provider.
- Is the event persisted durably before a `2xx` response is returned, with heavy processing done asynchronously?
- Do response codes make the provider retry transient failures but not permanent ones?
- For sensitive state changes, does the handler re-fetch the authoritative object from the provider API instead of trusting the payload alone?
- Are unknown event types ignored safely and logged?
- Is the endpoint exempt from session authentication and CSRF but not from signature verification, and are payload size and request rate bounded?

### 5.3 Payments, billing, and financial providers

- Are idempotency keys used for charges, refunds, transfers, and payouts, derived from a stable internal operation ID rather than generated fresh on each retry?
- Are amounts sent in the unit the provider expects for each currency (including zero-decimal currencies)?
- Is the order of operations crash-safe: record intent, call the provider, record the result, and reconcile anything left pending?
- Is client-side payment confirmation treated as untrusted until verified server-side via API or webhook?
- Are partial refunds, failed captures, disputes, chargebacks, and expired authorizations represented in the state machine?
- Is raw card or bank data kept out of the system (tokens only), with logs and errors free of payment details?
- Are test and live credentials strictly separated, with live keys never present outside production?
- Is there a reconciliation process comparing the internal ledger with provider records?

### 5.4 Email, SMS, and notification providers

- Are messages sent after the triggering transaction commits (outbox or post-commit hook) so that rollbacks and retries do not send duplicates or messages about data that does not exist?
- Are recipients scoped to the correct tenant, and are unsubscribes, opt-outs, bounces, and complaints respected?
- Is user content escaped in HTML templates, and are header fields protected against CR/LF injection?
- Are OTP and verification endpoints protected against SMS pumping and toll fraud (rate limits per phone number, IP, account, and destination country)?
- Are message bodies and provider logs free of unnecessary personal data and secrets (such as full reset links in logs)?
- Are times in messages rendered in the recipient's time zone?
- Is provider failure handled (queueing, retry, fallback provider, or visible failure)?

### 5.5 OAuth, API keys, and connected third-party accounts

- Are stored third-party access and refresh tokens encrypted at rest and requested with minimal scopes?
- Are expired and revoked tokens handled, and can two workers refreshing the same token concurrently invalidate each other? Serialize refreshes where the provider rotates refresh tokens.
- Do account-connection flows validate `state` and use PKCE, and is the connected account bound to the user and tenant who initiated the flow?
- Does disconnecting revoke tokens at the provider and delete stored credentials?
- Can credentials be rotated without downtime?

### 5.6 SDKs and client libraries

- Do SDK defaults for timeouts and retries combine badly with the application's own retries?
- Is SDK configuration global (a process-wide API key or account), causing cross-tenant use in multi-tenant code?
- Does the SDK log request or response bodies containing secrets or personal data?
- Is the SDK version pinned, and were breaking changes reviewed on upgrade?

### 5.7 Data synchronization and reconciliation

- Are incremental sync cursors or watermarks correct at boundaries (inclusive vs exclusive, equal timestamps, clock skew, records updated during the sync)?
- Are deletions on either side propagated?
- Is there a full resync path, and is the source of truth for conflicting changes defined?
- Are field mappings lossless where required, with explicit handling for unknown enum values and time-zone conversions?
- Are sync jobs idempotent and resumable after partial failure?

### 5.8 Testing and environments

- Are integrations covered by contract tests or recorded fixtures, with fixtures scrubbed of secrets and personal data?
- Do CI tests avoid calling real providers?
- Are known differences between sandbox and production behavior accounted for?
- Does the system behave sensibly when an integration is not configured in a given environment?
