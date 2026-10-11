# Stack pack: Messaging and Event Streaming Checklist

Loaded only when the repository uses this stack (see `stacks/README.md`). Seed content; the skill may add checks here as it learns (SKILL.md, "Keeping this skill current").

## 9. Messaging and Event Streaming Checklist

### 9.1 RabbitMQ and AMQP

- Is the exchange, queue, routing key, and binding configuration correct?
- Are durability, persistence, and acknowledgement settings aligned with delivery requirements?
- Is acknowledgement sent only after the work that must be durable has succeeded?
- Can the consumer process the same message more than once safely?
- Are retries bounded, and can they create a hot loop? `nack`/`reject` with requeue on a permanent error loops forever; use delivery limits, retry counters, or dead-lettering.
- Is retry delay implemented without blocking the consumer (delay or TTL retry queues rather than sleeping in the handler)?
- Are transient and permanent errors distinguished?
- Is dead-letter routing configured and monitored?
- Is consumer prefetch appropriate for processing time and memory use? A prefetch of `0` means unlimited.
- Can message ordering affect correctness?
- Are publisher confirms used when required?
- Can unroutable messages be silently dropped? Without the `mandatory` flag or an alternate exchange, they are.
- Can a database commit succeed while message publication fails?
- Is an outbox or reconciliation process necessary?
- Are schemas versioned and consumers tolerant of compatible changes?
- Are poison messages and oversized payloads handled safely?
- Is topology redeclared after connection recovery, and are consumer cancellation notifications handled?
- Are channels used safely under concurrency?
- Are message TTL, queue length limits, and overflow behavior set deliberately?
- Is shutdown coordinated with in-flight acknowledgements?
- Are queue depth, redelivery count, consumer failures, and processing latency observable?

### 9.2 Kafka and log-based streams

- Are offsets committed only after processing succeeds? Auto-commit can commit before work completes and lose messages on crash.
- Is the partition key chosen to provide the ordering the consumer needs, without creating hot partitions?
- Is in-flight work handled correctly during consumer-group rebalances?
- Can a poison message block a partition, and is there a dead-letter topic?
- Are producer durability settings (acknowledgements, idempotence) aligned with delivery requirements?
- Is consumer lag monitored, and is retention longer than the worst realistic lag?
- Are schema changes compatible under the registry's compatibility mode?
- Are compacted topics keyed and tombstoned correctly?

------------------------------------------------------------------------

