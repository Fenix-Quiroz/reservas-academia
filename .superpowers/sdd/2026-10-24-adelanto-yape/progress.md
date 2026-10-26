# SDD ledger — plan: docs/superpowers/plans/2026-10-24-adelanto-yape.md

Setup: current checkout is the user's existing main workspace with unrelated uncommitted changes; user explicitly asked to implement here, so no worktree was created. Existing changes are preserved.

Pre-flight: Task 1 produces payment constants and validation functions consumed by Tasks 3 and 4; Task 2 produces the Edge Function contract consumed by Task 3; Task 3 produces the payment action consumed by Task 4. The planned interfaces are consistent.

Task 1: complete (commits 2a31f5c..c4985dc, tests: `npm run check:pago` → exit 0, `pagos.check.ts OK`)

Task 2: complete (Edge Function + config added, `npm run check:pago` → exit 0, `pagos.check.ts OK`)

Task 3: complete (public adapter, token/idempotency wiring, no frontend service role)

Task 4: complete (Yape instructions, separate copy-number control, secure file picker, retry-safe payment action, pending-review success message)

Task 5: complete (README deployment/security notes and full verification suite green)

Review follow-up: complete (expired pending/rejected reservations are released without touching confirmed payments, pending deadlines are preserved across retries, and concurrent proof retries are recovered with deterministic storage paths plus a unique payment link)

Migration hardening: complete (duplicate proof rows fail with an actionable preflight instead of being deleted automatically; expiration indexes are recreated with the pending/rejected predicate)
