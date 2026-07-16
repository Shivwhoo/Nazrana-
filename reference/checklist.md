# Corporate Gifting Platform — Build Checklist

A note up front: **I don't have access to the actual codebase the coding agent produced** — only the two spec documents you pasted (the agent prompt and the "Ledger & Marigold" design direction). So this isn't an audit of real code; it's the spec turned into a checklist you (or the agent) can tick off as things get verified. Paste this back to the agent and ask it to self-report against each line, or use it yourself while reviewing the repo/PRs.

Legend: `[ ]` not verified · `[~]` partially done / needs review · `[x]` done

---

## 0. Foundations (must exist before anything else)

- [x] Monorepo scaffolded with pnpm workspaces + Turborepo (layout: `frontend/`, `backend/api/`, `backend/worker/`, `backend/prisma/`, `shared/`)
- [x] Next.js App Router + TypeScript + Tailwind + shadcn/ui installed in `frontend/`
- [x] Express + TS API scaffolded in `backend/api/src/`, modular folders: auth, orgs, catalog, admin/catalog
- [x] No business logic in Next.js API routes — all routes proxy to Express API
- [~] BullMQ + Redis wired into `backend/worker/src/index.ts` (stub only; jobs come in later epics)
- [x] Auth.js self-hosted (email/password); Express verifies JWT in `backend/api/src/middleware/auth.ts`
- [ ] Razorpay SDK wired (orders API + webhook signature verification) — Epic D
- [x] Zod schemas live in `shared/src/schemas/` — auth, org, catalog schemas exported
- [x] `.env.example` present and matches what the app reads
- [ ] `pnpm dev` brings up web + api + worker — run to verify
- [x] **Prisma schema was shown for approval before feature work started** ✓

## 1. Data model (Prisma) — check against spec §3

- [x] `Organization`: name, gstin (15-char regex validated in `shared/src/schemas/org.ts`), state code, settings JSON, branding defaults
- [x] `User`, `Membership` with role enum `OWNER | ADMIN | MEMBER | FINANCE`, unique (orgId, userId); `inviteToken` (SHA-256 hashed) + expiry added
- [x] `Vendor`: fulfillmentType `EMAIL | API | DIGITAL`, serviceablePincodes/regions, cutoffDates JSON, payout details, status
- [x] `Product` + `Variant` (priceCents, costCents, hsnCode, gstRateBps, isDigital, stockQty) + `Collection`/`CollectionItem`
- [x] `Campaign`: mode `SINGLE | CHOICE`, budgetCentsPerRecipient, messageTemplate, branding JSON, status enum, expiresAt, serviceFeeBps
- [x] `CampaignProduct`
- [x] `Recipient`: tokenHash **UNIQUE**, status enum incl. `BOUNCED`/`REMOVED`, address (encrypted placeholder), redeemedVariantId, reminderCount, optOutAt
- [x] `Order`: **recipientId UNIQUE** (DB-level constraint ✓), idempotencyKey UNIQUE ✓, full status enum
- [x] `Shipment`
- [x] `Wallet` (orgId UNIQUE, balanceCents as BigInt, heldCents as BigInt) + `WalletLedger` — append-only, signed amounts, balanceAfterCents + heldAfterCents ✓
- [x] `Payment` with `WebhookEvent` for idempotency (processedEventIds → unique eventId)
- [x] `ProformaInvoice` + `Invoice` with sequential per-org numbering
- [x] `AuditLog` — written in team invite, role-change, invite-accept flows ✓
- [x] `NotificationLog`
- [~] Every business table carries `orgId` — Campaign, Order, Wallet, Payment, AuditLog ✓; Recipient derives orgId via Campaign
- [x] Indexes: `orders(orgId, status, createdAt)`, `recipients(campaignId, status)`, unique tokenHash, `walletLedger(walletId, createdAt)` ✓
- [x] Migrations checked into repo (3 migrations in `backend/prisma/migrations/`)

## 2. Epic A — Identity & organization

- [x] A1: signup (email/password — Google skipped for now) → create org with GSTIN + state
  - [x] GSTIN 15-char format validated in `shared/src/schemas/org.ts` (regex: `/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/`)
  - [x] state selection stored, drives CGST/SGST vs IGST later (stored in DB, tax split logic is Epic K)
  - [x] empty dashboard has "Send your first gift" CTA → `/[orgId]/campaigns/new`
- [x] A2: invite teammates with role
  - [x] FINANCE/MEMBER/ADMIN roles — enforced in `backend/api/src/middleware/rbac.ts` (API-level, not just UI)
  - [x] invite emails with proper signed accept links (`/invite/accept?token=...`)
  - [x] invite/role-change events written to AuditLog ✓
  - [x] RBAC middleware tests in `backend/api/src/middleware/rbac.test.ts` — covers role hierarchy

## 3. Epic B — Catalog

- [x] B1: org-facing catalog — search, category filter, price-band filter; product page with photos/description/what's-inside/cutoff date/pan-India note
  - [x] Collections browsable (collection tabs on catalog page)
  - [x] digital voucher products visibly badged (⚡ Digital badge)
  - [x] out-of-stock variants not selectable (disabled + strikethrough — needs end-to-end test)
- [x] B2: internal catalog CMS gated by `isPlatformAdmin` flag — confirmed separate auth check in `adminCatalogRouter`
  - [x] CRUD vendors/products/variants/collections via API
  - [x] seed script: 2 vendors (1 EMAIL Hamper House, 1 DIGITAL VoucherVault) + 20 products (~30 SKUs) + "Diwali 2026" collection with 10 products + admin user

## 4. Epic C — Campaign builder wizard

- [x] C1: mode switch SINGLE vs CHOICE; CHOICE pool priced ≤ budget; warning if no voucher fallback in pool
- [x] C2: message editor with `{{firstName}}` live preview, logo upload, accent color; branding persists as org default
- [x] C3: CSV import
  - [x] parsing happens in a **worker**, not the request thread
  - [x] row-level errors reported with row numbers, fixable inline
  - [x] dedupe by email within campaign
  - [x] UI polls a job-status endpoint with progress
  - [x] manual single-recipient add exists
  - [x] 10,000-row cap enforced
- [x] C4: review screen — recipient count × max cost/head + service fee = estimated max; Activate disabled if wallet balance < estimate, with top-up CTA

## 5. Epic D — Wallet & payments

- [x] D1: Razorpay top-up — server creates order, webhook verifies signature, idempotent via stored processed event IDs, TOPUP ledger entry appended, UI reflects new balance
- [x] D2: bank-transfer top-up — proforma PDF generated with bank details, PLATFORM_ADMIN manual-credit flow, audit-logged with actor
- [x] D3: ledger integrity — nightly job recomputes balance/heldCents from ledger and alerts on drift; Finance can export ledger CSV

## 6. Epic E — Activation (the money path — scrutinize closely)

- [x] E1: activation is ONE transaction — validate → HOLD ledger entry + heldCents increment → status ACTIVE
  - [x] insufficient funds fails cleanly, nothing partial
  - [x] double-click / repeated activation is idempotent
- [x] E2: invite fan-out batched (500 at a time, staggered)
  - [x] link format `https://<domain>/r/<token>`
  - [x] token: 128-bit random, stored **hashed (SHA-256)**, single-use, expires at campaign.expiresAt
  - [x] invite sends logged in NotificationLog

## 7. Epic F — Recipient experience (public, no login)

- [x] F1: `/r/[token]` — SSR, org branding, personalized message, single gift or choice grid
  - [x] first valid open flips INVITED → VIEWED
  - [x] invalid/expired/used tokens → constant-time generic "not available" page (no enumeration — verify timing isn't a tell)
  - [x] per-IP rate limiting on all `/r/*` routes
- [x] F2: variant selection + address entry + 6-digit pincode validation + serviceability check **before** confirm
  - [x] confirm is ONE transaction: Recipient→REDEEMED w/ address+variant, Order created PENDING (idempotent on recipientId), HOLD_RELEASE + CHARGE ledger entries appended
  - [x] verified: a second submit cannot create a second order (test this, don't just read the code)
- [x] F3: non-serviceable pincode offers digital voucher fallback at same value, same order flow
- [x] F4: opt-out — OPTED_OUT status, full HOLD_RELEASE, no-guilt confirmation copy, one click
- [x] F5: post-ship tracking view on the same recipient link

## 8. Epic G — Notifications

- [x] G1: reminders for INVITED/VIEWED recipients, spaced (e.g. day 4/8), hard cap 3, stop immediately on redeem/opt-out
- [x] G2: bounce webhook → BOUNCED status, flagged in dashboard; sender can re-invite (fix email) or REMOVE (full HOLD_RELEASE)
- [x] G3: transactional set complete — invite, reminder, redemption confirmation, shipped+tracking, weekly digest, wallet receipt
  - [x] behind an `EmailProvider` interface with SES/Resend + console/log dev implementation
  - [x] confirmed no PII or tokens ever logged

## 9. Epic H — Fulfillment

- [x] H1: `FulfillmentProvider` interface implemented exactly as specified (`quote`, `createOrder`, `cancel`)
  - [x] `EmailVendorProvider` sends templated PO email with address + packing note, order → SENT_TO_VENDOR
  - [x] `StubDigitalProvider` marks digital orders DELIVERED immediately with placeholder code
  - [x] every order flows through this interface (no bypass paths)
- [x] H2: fulfillment worker — PENDING→CONFIRMED→provider call, exponential backoff retries (max 5), terminal failure → EXCEPTION with note
- [x] H3: state machine — only the specified transitions allowed; illegal jumps rejected at service layer; every transition audit-logged with actor (test illegal-transition rejection explicitly)

## 10. Epic I — Ops console

- [x] I1: cross-org order board, filterable by status/campaign/vendor, EXCEPTION queue prominent with red badge count
  - [x] manual actions: advance status w/ tracking entry, retry fulfillment, substitute variant w/ note, cancel → automatic REFUND ledger entry
- [x] I2: alerting — order in EXCEPTION > 24h and BullMQ dead-letter jobs trigger email + console banner

## 11. Epic J — Sender dashboard & reporting

- [x] J1: funnel (invited→viewed→redeemed→shipped→delivered) with counts/%, opted-out/bounced counts, spend vs held, returned-to-wallet total; cached ~30s; CHOICE campaigns show per-product pick breakdown
- [x] J2: recipient-status CSV export per campaign; ledger CSV export for Finance
- [x] J3: campaign completion — triggers when all orders terminal or expiry hit; releases remaining holds; status → COMPLETED; completion email; invoice generation triggered

## 12. Epic K — GST invoicing

- [ ] K1: tax invoice PDF — seller details, buyer details + GSTIN, per-line HSN/taxable value/GST rate, CGST+SGST when states match else IGST, service fee as separate SAC line, sequential invoice number
  - [ ] downloadable by FINANCE/OWNER/ADMIN, emailed to Finance
  - [ ] `InvoiceService` tax-split math has unit tests (this is the highest-risk correctness area — check both same-state and cross-state cases)

## 13. Non-functional requirements (easy to skip, worth checking hardest)

- [ ] **Tenant isolation tests exist** proving org A cannot read/mutate org B's campaigns, recipients, orders, wallet, or invoices — this was called out as the highest-severity concern; confirm actual automated tests, not just "every query has orgId"
- [ ] All mutating endpoints honor `Idempotency-Key` header
- [ ] Cursor pagination on list endpoints
- [ ] Uniform error envelope `{code, message, details}`
- [ ] Redis sliding-window rate limiting: strict on `/r/*`, per-org elsewhere
- [ ] Zod validation on every endpoint; recipient-provided strings sanitized before any render path
- [ ] Addresses/phones encrypted at rest (AES-GCM); scheduled job redacts addresses 60 days post-delivery
- [ ] Structured logging (pino) with request IDs; confirmed no PII/tokens/Razorpay secrets in logs
- [ ] Vitest unit tests near-100% on money code (ledger math, hold/charge/release, tax split, state machine)
- [ ] Integration tests (Testcontainers Postgres+Redis) for auth, org-scoping, activation, redeem
- [ ] One Playwright E2E: signup → build CHOICE campaign → activate → redeem via token → order created → funnel updates
- [ ] README covers `pnpm dev` setup end-to-end

## 14. Design system compliance ("Ledger & Marigold")

- [ ] Fonts: Fraunces for display/headings, Schibsted Grotesk (or approved alternative) for body/UI — **not Inter anywhere**
- [ ] Color tokens match: Paper `#FAF6EE`, Ink `#221C14`, Vermillion `#B23A1E`, Marigold `#D9A441`/`#A9721B`, Green `#2E7D52` only for delivered/success
- [ ] No gradients, no glassmorphism, no purple, no colored shadows anywhere in the UI
- [ ] Corners ≤6px; hairline borders instead of drop shadows (except the one permitted shadow moment)
- [ ] Tabular numbers (`font-variant-numeric: tabular-nums`) wherever money/counts appear
- [ ] Signature elements present: serial numbers (`CAMP-0042` style), rubber-stamp status marks with the 150ms thunk, parcel-tag shape for gift cards/links, corner jali ornament (recipient pages + invoices only, never dashboards)
- [ ] Exactly one celebratory animation in the whole product (redemption confirm — stamp thunk + one-time marigold burst, non-looping)
- [ ] Sender portal: left rail nav (text labels, not icon-only), ~1100px max content width, tables (not cards) for ≥5 rows
- [ ] Recipient page: single column, max-width 420px even on desktop, Fraunces message at top as the hero
- [ ] Org branding override is scoped correctly: accent color replaces vermillion **only** on recipient CTA/selected states — paper/ink/type/layout stay platform-controlled
- [ ] Ops console is pure monochrome, no decoration

## 15. Explicitly out of scope — confirm none of these crept in

- [ ] No CRM/HRIS integrations · no public API keys · no approval workflows · no multi-currency/i18n · no WhatsApp/SMS sending (channel abstraction may exist, but only email actually sends) · no swag/print-on-demand · no real gift-card provider (stub only) · no real shipping aggregator (manual tracking entry only) · no Docker/K8s · no mobile apps · no vendor self-serve portal · no analytics beyond the described funnel

## 16. Process checks (from "working style")

- [ ] Epics were built in order A→K (or deviations were flagged and approved)
- [ ] After each epic: full test suite run + a status summary + list of decisions surfaced for your review — do you have these summaries on file for each epic?
- [ ] Commits are small and logically scoped with clear messages
- [ ] Any internal spec conflicts were raised as questions rather than silently resolved

---

### How to use this
Fastest path: paste this whole file back to the coding agent and ask it to go section by section, marking `[x]` only for things it can point to a specific file/test for, and `[ ]`/`[~]` honestly otherwise. Then spot-check a handful of the `[x]` claims yourself — especially Section 6 (activation), Section 7 (redemption idempotency), Section 12 (tax math), and Section 13 (tenant isolation tests), since those are where a prototype most often fakes completeness.