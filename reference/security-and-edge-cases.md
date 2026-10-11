# Security method and edge-case matrix (Sections 13 and 14)

Use Section 13 for changes that affect trust boundaries. Use Section 14 to generate candidate edge cases for each significant changed unit.

## 13. Security Review Method

For changes that affect trust boundaries, perform a deliberate threat-oriented pass.

### Identify assets

Examples include customer data, medical records, credentials, session state, financial balances, permissions, infrastructure access, signing keys, and availability.

### Identify actors and trust boundaries

Distinguish anonymous users, authenticated users, administrators, API-key clients, internal services, queue producers, webhook senders, CI contributors, and external dependencies.

### Trace attacker-controlled data

Follow headers, query parameters, body fields, path IDs, files, messages, webhook payloads, third-party responses, and CI inputs into queries, filesystem operations, commands, templates, outbound requests, logs, and authorization decisions.

### Challenge security assumptions

Ask:

- Can the caller choose the identity or tenant?
- Can a trusted internal header be spoofed from outside?
- Is a token validated for the correct purpose and audience?
- Can a stale permission or cache entry remain effective?
- Can a low-privilege user invoke an administrative operation through another route?
- Can a retry or race bypass a one-time check?
- Does a failure default to allow instead of deny?
- Can an error or log reveal sensitive information?
- Can user-controlled input make the server send requests, read files, or execute code?
- Can an ID, URL, file key, or search query point at another tenant's data?
- Can an untrusted contribution reach CI secrets or deployment credentials?

### Run an abuse-case pass

For each new capability, ask how a malicious user, a curious user, a compromised account, a malicious tenant, and an automated script would misuse it (Section 4.7).

### Check for variants

When the patch fixes a vulnerability, search for the same pattern elsewhere and report unfixed variants as follow-ups.

Report a security finding only when the trust boundary and plausible impact are clear. If the impact depends on deployment configuration, state that condition.

------------------------------------------------------------------------

## 14. Edge-Case Discovery Matrix

Use this matrix to generate candidate edge cases for each significant changed unit. Pick the dimensions that apply, ask what the code does in each case, and keep only the cases that reveal a concrete defect (SKILL.md Section 3, Stage 5). Most probes should end in silent confidence, not comments.

| Dimension | Probes |
|---|---|
| Presence | missing, `undefined`, `null`, empty string, whitespace-only, empty object, empty array, explicitly null vs absent |
| Size | zero, one, two, many, exactly at the limit, limit ± 1, maximum allowed, beyond maximum, extremely large |
| Numbers | negative, zero, negative zero, fractional, very large, beyond safe integer range, `NaN`, `Infinity`, numeric strings, exponent notation, leading zeros, locale formats such as `1,5` |
| Text | Unicode, emoji, combining marks, bidi and zero-width characters, very long strings, surrounding whitespace, case variants, SQL/shell/template metacharacters, CR/LF, null bytes |
| Collections | duplicates, unsorted, single element, deeply nested, cyclic, mixed types, order-sensitive input |
| Identity | anonymous, expired session, revoked token or API key, other user, other tenant, other branch, admin, impersonation, service account, deleted or suspended user, role changed mid-session, account holding every role, permission, and membership, actor modifying their own account |
| Resource state | not found, already exists, soft-deleted, archived, locked, each lifecycle state, terminal state, partially created, owned by another tenant, expired or evicted and then written again |
| Time | boundary instants, month end, leap day, DST transitions, tenant vs server time zone, far past and future, clock skew, expiry exactly now, date-only values |
| Concurrency and ordering | identical requests at once, conflicting requests, retry after timeout, duplicate delivery, out-of-order events, event before its record exists, crash between steps |
| Dependencies | slow, timeout, error, partial or malformed response, success after the caller gave up, rate limited, cache down, queue down, replica lag, provider outage |
| Scale | one tenant with huge data, many tenants, large payloads, high request rate, long-running operation, full disk, pool exhaustion |
| Environment | multiple replicas, cold start, rolling deploy with mixed versions, rollback, missing or malformed configuration, different server locale or time zone |
| Compatibility | clients you cannot force to upgrade, old queued messages, old cached values, rows that predate the change, new data read by the old version |

For security-sensitive units, combine dimensions: other tenant × bulk endpoint, revoked token × cached permissions, duplicate delivery × external side effect, retry × payment provider, mixed versions × changed event schema.
