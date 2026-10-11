# Generic rules (apply to every review, any language)

Language- and tool-neutral defects. Read this file on every review, next to `learned-rules.md`. Each rule says what to look for and what makes it a finding. The language-specific forms live in the stack packs (`stacks/`). A match is a candidate, not a finding, until you can name the input or state that triggers it (`reporting.md` Section 15).

Before reporting one of these, look at what the repository's own automation already checks (CI config, linters, security scanners) and do not repeat what it already flags.

## G1. Null and missing values

- A value that can be absent (null, undefined, none, nil, an empty result, a missing key) is used as if present: first element of a possibly-empty list, a lookup that may miss, a nullable column treated as required, a parse of stored text without a shape check, a "cannot be null" assertion on data from outside the program.
- Finding when a state a real caller reaches (not found, deleted, other tenant, empty result, expired cache) produces the absent value. Not a finding when a guard, a not-null constraint or an earlier call that throws already covers it.

## G2. Injection

- **Query languages (SQL, NoSQL, search, graph):** user text in the query structure rather than as a bound value: identifiers, keywords, sort fields, limits, raw fragments. Wildcard patterns built from user text without escaping.
- **Commands:** user text in a shell string, or in an argument position where a leading `-` changes meaning.
- **Paths and keys:** a filename, object key or path from a request joined without normalising and checking the prefix (`..`, absolute paths, encoded forms, null bytes). A cache or lock key built from user text that lets one tenant address another's.
- **Prompts:** user or document text placed in an LLM prompt that also drives tools or generates queries. The model's output is untrusted input to whatever executes it.
- **Logs and headers:** user text with newlines or control characters written to a log, a header or a redirect target.
- **Outbound requests (SSRF):** a user-supplied URL or host fetched by the server with no allowlist, no block on private and link-local ranges, redirects followed.

## G3. Unsafe output

- HTML, email, PDF or document content built from user text without escaping for that context.
- A user-controlled file served inline or with a user-chosen content type (stored script execution through uploads; SVG and HTML are the usual cases).
- A value placed in a spreadsheet export that starts with `=`, `+`, `-` or `@`.
- Error messages that echo input or internals back to a client.

## G4. Authentication, secrets and cryptography

- Hard-coded secrets, tokens, keys or connection strings; secrets in logs, errors, URLs, responses or audit records.
- Certificate or signature verification switched off. Note where the repository documents an accepted exception, and flag it anywhere else, especially on calls to third parties.
- Predictable randomness (a non-cryptographic generator, the clock) for anything a person must not guess.
- Secrets or tokens compared with an ordinary equality operator instead of a constant-time comparison.
- Weak or home-made password and token hashing; ignoring a hash function's input length limit.
- Token handling: no expiry, the "none" algorithm, wrong audience or issuer, trusting claims before verification.

## G5. Concurrency and state

- Check-then-act on shared state with no transaction, lock, unique constraint or conditional write (double spend, double booking, duplicate send).
- Mutable module-level or global state holding per-request or per-tenant data.
- Work inside a loop that should be one batched operation (one query or call per item), and the opposite: unbounded parallelism over a large list that exhausts a pool.
- Background work with no error handling, and timers, listeners or handles never released.
- A transaction or lock held while calling a slow third party.

## G6. Error handling

- An error swallowed, logged and continued past a failed write, or turned into a success response.
- A specific error status lost by a generic rethrow, or a client error turned into a server error (and the reverse).
- Messages that leak queries, stack traces, hostnames or other tenants' identifiers.
- A cleanup path that can itself fail and hide the original error; a connection, lock, file or rate-limit slot acquired and not released on the error path.

## G7. Validation and limits

- Input fields with no minimum or maximum: strings, collections, numbers, free-form objects. Respect any repository rule that sets the limits.
- Values from the URL or query used without type and format validation.
- Pagination with no cap, or a page size that can be zero, negative or not a number.
- Mass assignment: a request body copied wholesale into a write, or tenant, owner, role or privilege fields accepted from the client where the server must set them.
- Integers that exceed the language's safe range when read from a wide column.

## G8. Resource use

- Unbounded reads: no limit on a query over a growing table, a file or stream loaded fully into memory.
- Regular expressions with nested quantifiers applied to user input.
- No limit on request body size or nesting depth.
- Missing timeouts on outbound HTTP, cache, database and SDK calls.

## G9. Dependencies and supply chain

- A new dependency, a changed registry or download host in a lockfile, install scripts, a remote script piped into a shell, unpinned CI actions or container tags.
- A dependency added for something the standard library or an existing dependency already does.

## G10. Logging and privacy

- Personal, financial or medical data, credentials or tokens in logs, analytics, error trackers, URLs or audit payloads.
- Responses built from a whole stored record, which leak a column the day it is added.
