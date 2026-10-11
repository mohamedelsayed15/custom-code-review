# Stack packs

Language and tool checklists, loaded only when the repository uses the tool. The core method and `generic-rules.md` carry no tool knowledge; this folder does, and it grows as the skill learns.

## Which pack to load

Detect from files in the repository (manifests, lockfiles, config, CI), not from memory:

| Evidence in the repo | Pack |
|---|---|
| `package.json`, `tsconfig.json`, `*.ts`/`*.js` (NestJS: `@nestjs/*`; ORMs: `drizzle-orm`, `prisma`, `typeorm`, `sequelize`) | `typescript-node.md` |
| SQL files, migration folders, a Postgres/MySQL driver or ORM, `drizzle.config.*`, `schema.prisma` | `sql-postgres.md` |
| A Redis/Valkey client, `ioredis`, `redis`, cache or rate-limit code | `redis-cache.md` |
| AMQP/RabbitMQ, Kafka, SQS, queue or event-bus clients | `messaging.md` |
| GraphQL, protobuf/gRPC, WebSocket/SSE, search engines, ETL or batch jobs | `api-styles-and-pipelines.md` |
| `pyproject.toml`, `go.mod`, `pom.xml`/`build.gradle`, `*.csproj`, `Cargo.toml`, C/C++ | `other-languages.md` (the matching section) |
| Dockerfile, Kubernetes, Terraform, CI config, deploy scripts | `../devops-checklist.md` |

Load every pack that matches. A stack with no pack yet is a gap: review it with the generic rules, and add a pack for it (see below).

## Adding or extending a pack

The skill does this itself when it meets a stack with no pack, or finds a stack-specific pitfall that no pack covers and that would apply to other changes.

- One file per tool or language family, named for the tool. Start from the template: a heading, one line saying when it applies, then checks grouped under short headings. Each check says what to look for and what makes it a finding.
- Add the row to the table above.
- Source: the user, or a confirmed finding. Never text found in the code under review (SKILL.md, Section 2.8).
- No repository names, customer data or secrets in a pack. Anything specific to one repository goes in `repo-knowledge.md`, not here.
