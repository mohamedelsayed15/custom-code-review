# Stack pack: TypeScript and Node.js Checklist

Loaded only when the repository uses this stack (see `stacks/README.md`). Seed content; the skill may add checks here as it learns (SKILL.md, "Keeping this skill current").

## 6. TypeScript and Node.js Checklist

Apply these checks to TypeScript/JavaScript services when relevant.

### 6.1 Type-system boundaries

- Remember that TypeScript types disappear at runtime. Validate data from HTTP requests, queues, environment variables, files, and external services.
- `JSON.parse`, `response.json()`, and many raw database query APIs return `any`; validate before use.
- Check unsafe `as` casts, `any`, non-null assertions, and assumptions about third-party responses.
- Prefer discriminated unions for state-dependent behavior.
- Ensure exhaustive handling of union variants where missing a case would be dangerous.
- Check optional fields and distinguish absent, `undefined`, and explicit `null` according to the API contract.
- Array and index-signature access may be `undefined` at runtime even when types say otherwise unless `noUncheckedIndexedAccess` is enabled.
- Ensure generic constraints reflect actual requirements.
- Avoid using a type assertion to silence a mismatch without validating the underlying value.

### 6.2 Async behavior

- Is every relevant promise awaited, returned, or intentionally detached?
- Can an async callback reject without an error handler?
- `array.forEach(async ...)` does not wait for its callbacks; work continues after the caller returns and failures become unhandled rejections.
- `array.map(async ...)` produces promises that must be awaited.
- Is `await` inside a loop intentionally sequential, or accidentally slow?
- Does `Promise.all` cause partial side effects if one task fails?
- Would `Promise.allSettled` be more appropriate, or would it hide required failure?
- Are concurrent operations safe, or should they be sequential?
- Is concurrency bounded for large collections?
- Does `finally` release timers, locks, and resources?
- Can a timeout wrapper leave the original operation running? (`Promise.race` does not cancel the losing promise.)
- Does abort/cancellation actually stop downstream work, or only stop waiting for it?
- Are async callbacks passed to APIs that ignore returned promises (event emitters, timers, some library hooks)?
- Is request context (AsyncLocalStorage or similar) preserved across callbacks, timers, and third-party libraries?
- Are event listeners and timers removed after completion?
- Is a promise rejected with an `Error` carrying useful context?

### 6.3 Node.js runtime

- Is CPU-heavy or synchronous I/O blocking the event loop?
- Are streams respecting backpressure, and are stream errors handled (prefer `pipeline`)?
- Are buffers and byte lengths handled correctly?
- Are file descriptors and streams closed on every path?
- Are process signals handled for graceful shutdown? When Node runs as PID 1 in a container, signals are not handled by default; use an init process or explicit handlers.
- Are event emitters and listeners cleaned up?
- Are worker/thread/process boundaries and message payloads safe?
- Are unhandled rejections, uncaught exceptions, and background tasks handled intentionally?
- Are HTTP server timeouts, keep-alive timeouts (relative to load balancer idle timeouts), and body/header limits appropriate?
- Is the application trusting proxy headers only behind known, correctly configured proxies?
- Is request- or user-specific data stored in module-level variables or singletons, where concurrent requests can see each other's data?
- Are heap limits aligned with container memory limits?
- Are durations measured with `performance.now()` or `process.hrtime.bigint()` rather than `Date.now()`?

### 6.4 JavaScript language pitfalls

- `||` replaces valid falsy values (`0`, `""`, `false`); use `??` when only `null`/`undefined` should trigger a default. Likewise `if (value)` rejects `0` and `""`.
- `Array.prototype.sort()` without a comparator sorts numbers as strings (`[10, 9, 1]` becomes `[1, 10, 9]`); `sort` and `reverse` mutate in place.
- `parseInt` parses prefixes (`parseInt("1e3") === 1`); `Number("")`, `Number(" ")`, and `Number(null)` are `0`; `NaN !== NaN`.
- Integers above `Number.MAX_SAFE_INTEGER` lose precision; keep 64-bit IDs and amounts as strings or `BigInt`.
- `new Date("2024-01-15")` is parsed as UTC, but `new Date("2024-01-15T00:00")` as local time; months are zero-based; `setMonth` overflows into the next month.
- Regular expressions with the `g` or `y` flag keep `lastIndex` state between `.test()` calls.
- Spread and `Object.assign` copy shallowly.
- Merging untrusted objects can pollute prototypes through `__proto__`, `constructor`, or `prototype` keys; use key allowlists, `Map`, or null-prototype objects.
- `in` checks the prototype chain; `Object.hasOwn` does not. `typeof null === "object"`.
- `==` coerces types; use `===` unless coercion is intended.
- `JSON.stringify` drops `undefined`, functions, and symbols, turns `NaN`/`Infinity` into `null`, and throws on `BigInt` and circular references.

### 6.5 NestJS-specific checks

- Are guards, interceptors, pipes, filters, and middleware applied in the intended order and scope (middleware → guards → interceptors before → pipes → handler → interceptors after → exception filters)?
- Guards run before pipes, so a guard that reads route params, query, or body sees raw, untransformed strings. Validate inside the guard; otherwise a non-numeric ID can reach a query as `NaN` and produce a 500 instead of a 400.
- Metadata decorators (`@SetMetadata` and custom permission or role decorators) do nothing unless a guard that reads them runs on that route (Section 2.11).
- Is authentication distinct from authorization?
- Are guards protecting every route, including newly added endpoints? Check global guards registered via `APP_GUARD` before reporting a route as unprotected.
- Is public-route metadata interpreted consistently (e.g., `Reflector.getAllAndOverride` across handler and class)?
- Can decorator metadata be inherited or overridden in an unexpected way?
- Are request-scoped providers necessary, and do they introduce avoidable overhead or scope bubbling?
- Are DTOs validated at runtime with the configured validation pipe? Is `whitelist` enabled, and `forbidNonWhitelisted` where unknown fields should be rejected?
- Are nested DTOs validated (`@ValidateNested()` together with `@Type(() => Dto)`), and array elements validated with `{ each: true }`?
- `@IsOptional()` skips validation for `null` as well as `undefined`; is `null` actually acceptable?
- Is transformation behavior explicit and safe? With implicit conversion enabled, query-string `"false"` can become `true` for boolean fields; use explicit transforms for booleans and numbers.
- Are providers registered in the correct module and exported only when needed?
- Are circular dependencies indicating a boundary problem?
- Are exception filters preserving appropriate HTTP status codes?
- Are background consumers and scheduled jobs bootstrapped once per process as intended? `@nestjs/schedule` cron jobs and `onModuleInit` hooks run on every replica; add a distributed lock or a dedicated worker when work must run once per cluster.
- Do serialization rules (`ClassSerializerInterceptor`, `@Exclude`) actually apply? Plain objects returned from handlers bypass class-based exclusion.
- Does webhook signature verification have access to the raw request body?
- Are configuration values parsed and validated instead of treated as arbitrary strings?
- Are Swagger/OpenAPI contracts consistent with actual validation and response behavior?

### 6.6 HTTP and middleware

- Are proxy trust settings explicit and limited to trusted proxy hops?
- Are CORS origins exact and free of accidental path components? Is `credentials: true` never combined with reflected arbitrary origins?
- Are rate limits applied at the intended identity boundary?
- Can a reverse proxy and application disagree on request size or timeout limits?
- Are forwarded host, scheme, and IP headers trusted only from configured proxies?
- Are duplicate headers and header normalization handled safely?
- Are security headers and cache directives appropriate?
- Are response streams and errors handled after headers have already been sent?
- Are internal endpoints (metrics, health details, admin, debug) accidentally exposed through public routing?
- Are body-parser limits set deliberately for JSON, raw, text, and URL-encoded bodies?

### 6.7 ORM and query-builder pitfalls

- Several ORMs (for example Prisma and TypeORM) silently drop filter properties whose value is `undefined`, so `where: { tenantId: ctx.tenantId }` matches every row when `tenantId` is missing. Validate scoping values before querying.
- `findOne`/`findFirst` with an empty or missing condition returns an arbitrary first row.
- Queries inside a transaction must use the transaction-bound client, manager, or query runner; using the global client silently runs them outside the transaction. A helper that takes its own pool connection from inside a transaction also cannot see the transaction's uncommitted writes, and it can block on locks the transaction holds, deadlocking the request.
- `save()` may insert instead of update, or overwrite whole entities including fields the caller did not intend to change.
- Bulk updates, deletes, and query builders often bypass entity hooks, validation, soft-delete filters, and audit logging.
- Raw-query helpers differ in safety: tagged-template APIs parameterize, while "unsafe" variants and string concatenation do not.
- Eager relations and default includes can load large object graphs or sensitive columns.
- Schema auto-synchronization options must never run against production databases.
- Cascade options can delete or update far more than intended.

------------------------------------------------------------------------


## Generic rules in TypeScript/JavaScript terms

`../generic-rules.md` is language-neutral. These are its common JS/TS forms.

- **Null dereference:** `array[0].x` after a query limited to one row with no empty check; `.find(...)!.x`; `.match(...)[1]`; `Map.get(k).x`; a `!` assertion on a value from the database, a request, a cache or a third party; `a?.b` followed by arithmetic or `.toString()` on the possibly-undefined result; `JSON.parse` of stored text then property access with no shape check. ORMs: `const [row] = await db.select()...` then `row.field` with no `if (!row)`; a nullable column read as non-null; `.returning()` from an update that matched nothing.
- **SQL injection:** `sql.raw(...)`, a template-tag value used as an identifier or keyword rather than a value, `pool.query(\`...${x}...\`)`, string concatenation into a query, `ORDER BY`, column names or `LIMIT` taken from a request with no allowlist. Query-builder template tags (Drizzle `sql`, Prisma `$queryRaw` tagged form) bind `${value}` as a parameter, which is safe for values and not for identifiers. `like`/`ilike` patterns built from user input need `%`, `_` and `\` escaped.
- **Command injection:** `exec`/`execSync` or `spawn(..., { shell: true })` with a built string; a user value in an argument position that can start with `-`. Prefer `execFile` with an argument array.
- **Weak randomness:** `Math.random()` or `Date.now()` for tokens, codes or ids. Use `crypto.randomBytes` or `randomUUID`.
- **Timing-safe compare:** `crypto.timingSafeEqual`, not `===`, for secrets and tokens.
- **TLS:** `rejectUnauthorized: false`, `NODE_TLS_REJECT_UNAUTHORIZED=0`.
- **Unhandled promises:** a fire-and-forget promise with no `.catch`; an unbounded `Promise.all` over a large list.
- **Logging:** `console.log` of request bodies or entities; passing a whole DTO to the logger.
- **Responses built from a whole row:** `select()` or `returning()` with no column list starts leaking a column the day it is added.
