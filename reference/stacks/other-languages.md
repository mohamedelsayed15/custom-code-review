# Stack pack: Other Backend Languages Quick Reference

Loaded only when the repository uses this stack (see `stacks/README.md`). Seed content; the skill may add checks here as it learns (SKILL.md, "Keeping this skill current").

## 12. Other Backend Languages Quick Reference

Apply when the change is in these languages. The project's own tooling and conventions come first.

### Python

- Mutable default arguments are shared across calls; closures in loops capture variables late.
- Bare `except:` also catches `KeyboardInterrupt` and `SystemExit`; broad `except Exception` can hide defects.
- Naive and aware `datetime` objects must not be mixed; use aware UTC instants.
- Use `Decimal` for money.
- `yaml.load` without a safe loader, `pickle`, and `eval` on untrusted data allow code execution; `subprocess` with `shell=True` and interpolated input allows command injection.
- Blocking calls inside `async` functions stall the event loop.
- `is` compares identity, not equality.

### Go

- Check every returned `error`; discards must be deliberate.
- A nil pointer stored in an interface is not a nil interface.
- Maps are not safe for concurrent use.
- Loop variables were shared across iterations before Go 1.22; check the module's Go version when closures or goroutines capture them.
- Every goroutine needs an exit path; propagate `context.Context` for cancellation and deadlines.
- `defer` inside a loop runs at function exit, not per iteration.
- The default HTTP client has no timeout; always close response bodies.

### Java and Kotlin (JVM)

- `equals` and `hashCode` must agree; mutable objects used as map keys break lookups.
- `BigDecimal.equals` compares scale (`2.0` vs `2.00`); use `compareTo` for numeric equality.
- Spring `@Transactional` does not apply to self-invocation or to methods the proxy cannot intercept.
- Lazy-loaded associations accessed outside a session fail or cause N+1 queries.
- `SimpleDateFormat` is not thread-safe; in its patterns `YYYY` is week-year and `yyyy` is year.
- Kotlin `!!` and Java platform types can hide nulls; checked exceptions swallowed in lambdas lose failures.

### C# and .NET

- `async void` cannot be awaited and its exceptions crash or escape handling (except event handlers).
- Blocking on async code (`.Result`, `.Wait()`) can deadlock or starve the thread pool.
- Creating `HttpClient` per request exhausts sockets; use `IHttpClientFactory` or a shared instance.
- EF Core: watch change-tracking scope, N+1 from lazy loading, and queries that unexpectedly load whole tables.
- Prefer `DateTimeOffset` or UTC `DateTime`; `DateTime.Kind` mismatches shift times.
- Use `decimal` for money; dispose `IDisposable` resources with `using`.

### Rust

- `unwrap`/`expect` in production paths turn recoverable errors into panics.
- `unsafe` blocks need documented invariants that the surrounding code upholds.
- Integer overflow wraps silently in release builds unless checked or saturating arithmetic is used.
- Blocking calls in async runtimes stall executor threads; use `spawn_blocking`.
- Holding a lock across `.await` can deadlock or serialize work unexpectedly.

### C and C++

- Check bounds on every buffer read and write; prefer bounded functions and containers.
- Watch for use-after-free, double free, dangling references, and iterator invalidation.
- Signed overflow is undefined behavior; mixed signed/unsigned comparisons misbehave.
- Check every return value of system and library calls.
- Format strings must never be user-controlled.
