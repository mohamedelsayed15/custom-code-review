# DevOps, infrastructure, and CI/CD checklist (Section 11)

Read this when the change touches containers, deployment configuration, infrastructure as code, pipelines, secrets handling, scripts, or the rollout of a schema or contract change.

## 11. DevOps, Infrastructure, and CI/CD Checklist

### 11.1 Containers

- Does the image run as a non-root user, from a minimal base image pinned to a version or digest rather than `latest`?
- Are secrets kept out of image layers, `ARG`/`ENV` instructions, and build context? Does `.dockerignore` exclude `.env` files, keys, and `.git`? Use build-time secret mounts when secrets are needed during build.
- Does a multi-stage build keep compilers and build tools out of the runtime image?
- Are signals forwarded and zombie processes reaped (exec-form entrypoint, init process)? Wrapping the app in a package-manager script or shell can swallow signals.
- Is the health check meaningful and cheap?

### 11.2 Kubernetes and orchestration

- Are liveness and readiness probes distinct? Liveness must not depend on downstream services, or a dependency outage restarts every pod.
- Are resource requests and limits set, and are memory limits consistent with runtime heap settings?
- Is the security context restrictive (non-root, read-only root filesystem where possible, dropped capabilities, no privilege escalation)?
- Are service-account permissions least-privilege, and is token automounting disabled where unused?
- Are network policies restricting traffic as intended?
- Do singleton workloads (schedulers, migrations, leader-only work) run once rather than on every replica?
- Is the termination grace period long enough for in-flight work, with a `preStop` delay where load balancers need time to stop routing?
- Are pod disruption budgets, anti-affinity, and rollout strategy appropriate for availability needs?
- Are secrets mounted from a secret store rather than written into manifests?

### 11.3 Infrastructure as code

- Does the change expose services publicly (`0.0.0.0/0` ingress, public buckets, public IPs, open management ports) unintentionally?
- Are IAM policies least-privilege, without wildcard actions or resources?
- Are encryption at rest, backups, deletion protection, and access logging enabled for stateful resources?
- Does the plan replace or destroy a stateful resource (database, volume, bucket, queue) as a side effect of a renamed resource or changed immutable attribute? Review the plan output, not only the code.
- Are secrets kept out of state files, variables, and outputs where possible, and is remote state encrypted with locking enabled?
- Are provider and module versions pinned?
- Do environments stay consistent where they should, with differences made explicit?
- Is drift between code and real infrastructure accounted for?

### 11.4 Networking, TLS, and DNS

- Are TLS versions and cipher settings current, with certificate renewal automated and expiry monitored?
- Is service-to-service traffic authenticated and encrypted where the threat model requires it?
- Are load balancer idle timeouts longer than upstream keep-alive behavior expects (mismatches cause intermittent `502`/`504` errors), and are request timeouts consistent across proxy, gateway, and application?
- Are DNS TTLs lowered ahead of migrations and cutovers?
- Is egress restricted where outbound access is not needed?
- Are internal-only services kept off public networks?

### 11.5 Secrets management

- Are secrets stored in a dedicated secret manager or encrypted store, scoped per environment, and accessible only to the services that need them?
- Can secrets be rotated without downtime, and is rotation actually scheduled?
- Are secrets kept out of command-line arguments (visible in process listings), CI logs, error reports, crash dumps, and environment dumps?
- Is break-glass access audited?

### 11.6 CI/CD pipelines

- Do workflows triggered by untrusted contributions run with secrets or write permissions (for example `pull_request_target` workflows that check out and execute pull-request code)?
- Are untrusted values (PR titles, branch names, commit messages, issue bodies) interpolated directly into shell steps? Pass them through environment variables instead.
- Are third-party actions, plugins, and images pinned to immutable commit SHAs or digests?
- Are pipeline token permissions set to the minimum required?
- Can caches or artifacts from untrusted runs be consumed by trusted runs (cache poisoning)?
- Do self-hosted runners execute untrusted code?
- Does the change disable or weaken required checks, tests, scanning, or branch protections?
- Are production deployments gated by required approvals and successful checks?
- Can secret masking in logs be defeated by transformed output (encoded, split, or partial secrets)?
- Are build artifacts reproducible, and is provenance or signing used where required?

### 11.7 Deployment, release, and rollback

- Is the change compatible with the deployment strategy (rolling, blue-green, canary), during which old and new versions run together?
- Is the order of migrations, configuration changes, and code deploys explicit and safe?
- Are health gates and automatic rollback configured, and do they detect this change's likely failure modes?
- Is rollback possible after data has been written in a new shape or a destructive migration has run?
- Are configuration changes deployed and reversible independently of code where possible?

### 11.8 Backup, disaster recovery, and data recovery

- Do new stateful stores have backups, point-in-time recovery where needed, and documented retention?
- Has restore been tested, and do recovery point and recovery time objectives still hold?
- Are backups encrypted and access-controlled, and is privacy-driven deletion reconciled with backup retention?
- Does a destructive operation (drop, truncate, bulk delete) have a snapshot or recovery path?

### 11.9 Scaling and capacity

- Do autoscaling settings use signals that reflect real load?
- Does maximum scale-out stay within downstream limits? Replicas × workers × pool size must fit within database `max_connections`, provider rate limits, and queue throughput.
- Are cold starts, warm-up, and cache warming handled?
- Are cloud quotas and per-account limits sufficient?
- Is the cost impact of scaling understood and bounded?

### 11.10 Alerting, runbooks, and SLOs

- Will the new failure modes produce actionable alerts rather than noise?
- Are runbooks updated for new components, dependencies, and failure modes?
- Does the change affect existing SLOs or error budgets, and are dashboards updated?

### 11.11 Shell scripts and automation

- Do scripts fail fast (`set -euo pipefail` or equivalent) and quote every variable expansion?
- Can an empty or unset variable turn a command destructive (for example `rm -rf "$DIR/"` with an empty `DIR`)?
- Are temporary files created with `mktemp` and cleaned up with traps?
- Are scripts idempotent, with a dry-run mode and confirmation for destructive actions?
- Can the script target the wrong environment, cluster, account, or context (for example the current `kubectl` context)? Require explicit targets for destructive operations.
- Does the script select targets by a unique identifier rather than a display name? It should fail when a name matches more than one target.
