# Phase Map — Expanded

---

## Phase 0 — Control Fabric & Survival Doctrine
Purpose: lock the survival rules and CI harness before you build anything fancy. You will define exactly how content must survive across hostile pipelines and make those rules executable. The doctrine sets remote-manifest as the default; embedded provenance is permitted only on explicitly preserved routes. You create a failure taxonomy (Survived, Broken, Destroyed, Inaccessible) with deterministic codes, and a canonical transform set (resize, recompress, format-convert, strip metadata, rotate, crop, watermark, thumbnail, AVIF/WebP conversion, progressive JPEG, server-side “optimize,” and CDN “Polish”-like transforms). You wire three sandboxes: strip-happy (guaranteed breakage), preserve-embed (origin, no transforms), and remote-only (expected to always survive). You also freeze SLOs (embed ≥95%; remote ≥99.9%) and add auto-fallback rules: if a route’s survival drops below thresholds for any 10-minute window, it is forced to remote-only + badge-required until health is restored. CI executes a survival:baseline job on every commit, emits deterministic text/CSV artifacts, and fails on regression. A Cloudflare Worker injects the Link header for remote manifests; preserved routes disable destructive transforms. You check in a “no deceptive claims” policy (you provide provenance, not truth), a break-glass procedure (manual override and incident logging), and a hard rule that any new feature must include acceptance tests inside the harness. Exit is: all 12 transforms pass with remote ≥99.9%, embed ≥95% in preserve sandbox; the Worker injection is proven end-to-end; and the CI job is green with artifacts reproducible on a fresh clone.

---

## Phase 1 — Signer Core v1
Objective: build a fast, deterministic, and tenant-isolated signer that defaults to remote manifests and cleanly supports embedded when safe. The signer is a Rust microservice around c2pa-rs, exposing /sign and /attest endpoints. It supports P-256 with RFC3161 timestamp anchoring and idempotency via a caller-provided key (e.g., content-hash + assertion set). You enforce small, sane input limits (file size caps; URL schemes; content-type checks), and you normalize metadata to prevent “equivalent but different” manifests. Per-tenant keys are managed with a KMS wrapper and scheduled quarterly rotations; you provide a dry-run rotation mode that re-signs a sample set, compares hashes, and emits a rotation report before any live change. Logging is structured and minimal: manifest hash, tenant id, key id, TSA id, signing latency, mode (remote|embed), and decision reason (why remote was chosen). The signer must return deterministic results: identical inputs produce identical hashes; repeated requests with the same idempotency key must be side-effect-free. Performance target is p95 embed sign <800 ms and p95 remote sign <400 ms at early volumes. Failure modes include TSA unavailability and clock skew; mitigate with two TSA providers and NTP checks. Exit requires deterministic hashing on a seed corpus, idempotent retries validated, and a rotation dry-run that emits artifacts without touching production keys.

---

## Phase 2 — Remote Manifest Store v1
Goal: make remote manifests immutable, fast, and easy to discover. You store sidecars at a hash-addressed path such as /{sha256}.c2pa with object versioning enabled and “write-once” semantics (prevent overwrite; any new version must be a new key). The store enforces strict MIME and cache-control with short TTL at edge and strong validation headers (ETag, Content-Length). Every write operation produces a tamper-evident audit record containing author, tenant, request signature, object checksum, and a before/after state (which should be null→created for first writes). To prevent cache poisoning, you prefer signed PUT/POST URLs for writes, restrict public methods to HEAD/GET, and include negative caching rules for 404 manifest probes. You build a manifest integrity check that recomputes the filename hash from the stored bytes and validates it matches the key, failing otherwise. Latency budget is p95 HEAD/GET <150 ms from edge; you verify listing scalability by walking 100k objects and streaming keys without timing out. Link discovery must be simple: the application or Worker injects Link: <https://manifests.domain/sha.c2pa>; rel="c2pa-manifest" on pages serving the associated asset. Exit: store policy blocking overwrites, listing a 100k object test namespace, sub-150 ms p95 HEAD/GET, and a green integrity checker over a seeded corpus.

---

## Phase 3 — Verify API & <c2-badge> v1
Intent: give buyers a fast, reliable verification API and a safe, accessible badge they can drop anywhere. The verify service (Node/Fastify) accepts either an asset_url or a manifest_url. It performs strict fetches (no redirects to untrusted schemes, same-origin rules for manifests unless explicitly allowed) and applies a trust list for signer roots. The service returns a minimal payload: valid flag, signer identity summary, chain fragments, core assertions (ai_generated, edits), warnings, and the decision path (e.g., discovered via Link → fetched manifest → validated chain). You must match CAI Verify outputs on a standard sample set and return precise, user-actionable warnings (“Manifest unreachable,” “Mismatched hash,” “Unknown trust root”). The web component (badge) is a vanilla custom element with no eval, CSP-safe, and SRI-pinnable; it fetches verification asynchronously and presents a keyboard-navigable modal with ARIA roles. It must refuse to render if the page blocks the manifest fetch (mixed content or CORS issues) and surface a recovery hint. Accessibility audits (aXe/PA11Y) must pass on at least three demo pages. Performance targets: p95 verify <600 ms for cached manifests and <1,000 ms for cold fetches. Exit: parity with CAI outputs on samples, successful CSP report-only then enforce, accessible modal validated, and clear error strings wired to action buttons (“view raw manifest,” “copy manifest URL”).

---

## Phase 4 — CMS Injectors v1 (WordPress/Shopify)
Purpose: make installation trivial and survival predictable in the two largest SMB stacks. WordPress plugin: on add_attachment (and any registered media-add routes), it streams the asset to /sign, records the mode decision (remote by default), stores the manifest_url in attachment meta, and injects either a Link header (on HTML responses) or a badge placeholder in the theme via a minimal template filter. You add a nightly retro-sign task that walks recent attachments and flags transform risks. Shopify app: subscribe to product image upload webhooks, call /sign, persist manifest_url in metafields, and expose a Liquid snippet that renders the badge next to images or inserts a Link tag in theme.liquid. Both plugins detect optimizers (e.g., common WP image pipeline, third-party “optimize” apps) and automatically switch to remote-only with a banner in the admin UI explaining why. Acceptance tests include a theme matrix (five WP themes, three Shopify themes), uninstall safety (removal leaves pages rendering fine), and rate-limit handling with exponential backoff. The goal is zero-config for “it just works,” with a toggle to prefer embed on explicitly preserved routes. Exit: pass/fail survival matrix report per theme, optimizer detection causing auto-flip to remote, and a clean uninstall path verified on demo sites.

---

## Phase 5 — Hostile CDN Gauntlet v1
Objective: publish a reproducible, vendor-neutral survival report across common CDNs/optimizers that prospective buyers can click through. You build provider recipes for Cloudflare, Imgix, Cloudinary, Fastly, and Akamai covering the 12 canonical transforms and any provider-specific “optimize” settings. For each provider, you serve the same seed corpus via three routes: preserve-embed (no transforms), strip-happy (aggressive transforms), and remote-only (expected to survive). Each recipe emits a small, stable set of URLs that anyone can verify (no auth). Your report lists survival outcomes by transform and mode, with direct links to assets and manifests and an explanation of why a case failed (e.g., provider strips EXIF/XMP on WebP convert). You pin provider versions or document “as of <date>” so the report doesn’t mislead. Your bar is remote ≥99.9% across all providers and transforms; any failure is a P0 bug. Embed outcomes are segmented by “preserve configured” vs “defaults” to avoid confusion. You add an automated weekly job to regenerate the report and diff results; any regression opens an incident with a rollback or rule update. Exit: public Report #1 with reproducible links, method notes, and a badge stating “remote survives everywhere (as of <date>)”; failures opened as issues with owners and timelines.

---

## Phase 6 — Optimizer Auto-Fallback
Aim: convert SLOs into hard runtime behavior so survival can’t silently decay. You implement heuristics to detect strip-risk in real time: sudden drops in embed survival on a route, presence of known optimizer headers, mismatched content-types after transform, or known filename patterns (e.g., “/imgix/”). The Worker maintains a short sliding window of survival metrics per route and, upon breaching thresholds, forces remote-only mode and injects the badge requirement for that route. Each auto-flip emits a signed incident log including route, headers snapshot, decision rule fired, start timestamp, and the condition to exit fallback. The fallback must also respect a manual override (break-glass) to prevent feedback loops during experiments. You expose a minimal admin endpoint to view current policy state and recent decisions. The target is policy enforcement within one minute of detecting a break and automatic restoration when survival rebounds for a sustained period. You test by deliberately enabling a destructive transform in the strip-happy sandbox and validating that the route flips to remote-only, the badge becomes mandatory, and an incident is recorded. Exit: live demo where a break triggers fallback quickly and returns to normal when fixed; incident log is immutable and queryable; false positive rate is acceptably low thanks to conservative rules.

---

## Phase 7 — Pilots at ICPs (first three)
Goal: validate willingness to pay and integration speed with three distinct ICPs: a newsroom, an EU-facing brand or agency, and a marketplace where provenance affects trust. You ship a 14-day, 200-asset pilot pack including onboarding runbook, data processing agreement template, clear scope caps (domains, asset counts), and an explicit close plan (milestones, demo dates, decision date). The onboarding defaults to remote manifests and adds the CMS injector where possible. You establish usage metering (assets signed, verifications served, survival by route) and weekly check-ins with a skeleton “Survival Report” tailored to the tenant. You make outcome promises, not feature promises: “By day 7 you’ll have a public report showing where your stack breaks and a fix plan; by day 14 we’ll have green checks or a documented reason.” You push for LOIs up-front with a pilot-to-paid clause and pre-agreed pricing. Exit: three signed LOIs, at least two pilots converted or committed to convert (≥40% pilot→paid), and one published tenant report (anonymized by default) that you can reference in sales. If you fail to open pilots in the expected verticals, you pause feature work and fix offer/ICP targeting immediately.

---

## Phase 8 — Retro-Sign at Scale
Intent: monetize back catalogs safely and cheaply. You build a CLI that walks S3/R2 buckets, computes checksums, deduplicates by content hash, batches files for signing, and can resume from checkpoints. The CLI must tolerate flaky networks and TSA limits via exponential backoff and jitter. You implement a per-tenant cost ledger that projects TSA fees, egress, and compute so you can quote fixed or capped prices. Performance target: sustained ≥50 assets/second for medium objects on a modest instance; correctness target: deterministic outputs (same file yields same manifest hash) and exact at-least-once semantics without duplicates. You add a dry-run mode that processes metadata only and emits a full plan with estimated costs and time. You also incorporate a “first 10k free” sampling option to demonstrate value before committing the full catalog. The pipeline forces remote-manifest mode unless a tenant marks specific origins as preserve-embed. Exit: a one-million object dry-run produces a ledger within your cost budget, a live mini-backfill completes at target throughput, and reporting shows survival ≥99.9% on transformed delivery paths once Link headers are added.

---

## Phase 9 — Key Custody Upsell
Objective: give higher-trust customers a reason to pay more and stick with you. You add an optional HSM-backed custody tier (e.g., YubiHSM2 or Vault-KMS integration) with per-tenant key slots, explicit signing policies (algorithms, allowed assertions, rotation windows), and formalized CSR issuance and attestation artifacts. The control plane maintains a rotation calendar and generates “rotation evidence packs” (pre/post fingerprints, sample re-signs, signed rotation statement). For tenants not ready for full HSM, you still keep keys in cloud KMS with isolated per-tenant scopes and regular rotations. You document incident response steps for suspected key compromise: immediate pause, rotate, re-sign last N days’ assets, publish a signed incident statement. The upsell value is auditability: you ship PDFs and machine-readable logs that compliance teams can file. Exit: two tenants running under HSM custody, at least one successful quarterly rotation producing a complete evidence pack, and the incident playbook rehearsed in a tabletop exercise. If operational load grows beyond solo capacity, you restrict HSM to enterprise plans only.

---

## Phase 10 — Video & Audio v1
Aim: expand beyond still images to cover real pipelines where labels frequently vanish. You start with poster-frame verification and remote manifests referencing the primary media, then progress to fragmented manifest support for HLS/DASH where per-segment assertions may differ (ads, overlays, edits). You add drift tolerance in verification (small segment timing variance or adaptive bitrate behavior must not break the chain). For audio, support WAV/FLAC/MP3 with clear semantics for edits (trims, compression). The badge must render unobtrusively over video controls with accessible toggles and no layout shifts. Player integration is via standard events; verification is done off the main thread to keep playback smooth. Your Service Worker relay handles manifest fetches to avoid CORS/Mixed Content pitfalls. Performance target: verification under one second on cached manifests, and no measurable impact on frame drops at normal bandwidth. Exit: a 10-minute HLS demo stream that verifies live with an overlay badge; audio samples that verify end-to-end; and a report explaining which players or platforms still hide labels and how your remote-first approach guarantees survival despite those gaps.

---

## Phase 11 — Trust Graph & Badge Reputation v1
Purpose: make the badge clickthrough meaningful by showing who signed, with what, and with what standing. You build a simple issuer graph: nodes are keys, organizations, and devices; edges are issuance events and rotations; attributes include last-seen, revocation, and conformance badges. You compute a basic trust score (transparent formula) based on freshness of keys, presence of hardware attestation, conformance program participation, and absence of revocations. The verify API returns a compact representation of this path so the badge can show “Issued by X (key Y), hardware-backed, rotated Q3, no revocations.” You implement CRL/OCSP-like checks or equivalent revocation mechanisms supported by your trust roots and propagate revocations within minutes. The user experience must be plain language and non-deceptive: you avoid “truth” language and stick to provenance and identity statements. Exit is a working demo where revoking a test key updates the trust path in under 10 minutes, the score recalculates, and the badge UI reflects the change without developer intervention. Documentation explains that the score is guidance, not a guarantee.

---

## Phase 12 — Compliance Layer v1 (EU AI Act)
Intent: convert provenance into filings and audit artifacts people can submit. You map AI transparency obligations to concrete C2PA assertions and produce a monthly export per tenant that bundles CSV/JSON facts with a human-readable PDF. The export includes asset identifiers, timestamps, ai_generated flags, key ids, manifest locations, and links to public verification pages. You ship basic DPIA templates and a retention policy (24 months by default with tenant overrides) and provide toggles for pseudonymization of contributor names when required. The scheduler must reliably generate packs on time and store immutable copies for later retrieval; every run is logged with a signed summary. You include disclaimers: you supply provenance evidence, not legal advice, and you suggest specific wording for public disclosures that conform to platform norms. Exit: a tenant’s monthly export appears automatically with verifiable links; a purge job demonstrates retention deletion while preserving the audit trail; and a mock compliance review passes with your artifacts alone. If legal interpretations shift, you update mapping docs with date-stamped changes and version exports accordingly.

---

## Phase 13 — Analytics SKU v1
Goal: sell visibility and control, not just plumbing. You create per-tenant dashboards that matter: survival percentage over time by route, recent incidents and auto-fallbacks, signing/verification latencies, and per-tenant cost projections. You enforce error budgets: when a tenant burns its survival budget on a route, alerts are sent and fallback is enforced. Public Survival Reports are generated from the same pipeline, guaranteeing consistency between sales collateral and ops reality. Avoid vanity metrics; focus on those tied to SLOs and billing. For revenue, the Analytics SKU is included at Pro and above, with read-only public views tenants can share internally. Exit: three tenants actively viewing dashboards, a triggered alert that leads to a documented incident and fix, and a published Survival Report reflecting the same metrics. You time-box the UI: basic cards and tables first, charting only where necessary. If build time threatens core features, render dashboards via server-generated pages or CSVs and postpone SPA work.

---

## Phase 14 — Edge Relay (Zero-CORS)
Objective: eliminate CORS, mixed-content, and caching headaches when fetching manifests and related assets. You implement a Cloudflare Worker (and a Service Worker pattern for sites that prefer it) that relays manifest requests through a trusted origin. The relay signs outgoing requests where needed, stamps integrity metadata, and normalizes cache headers to prevent poisoning. The badge includes an SRI hash, and your policy blocks scripts without valid integrity. You also add clear negative cache behavior for transient errors: don’t doom a manifest for hours because of a single 502. The relay should degrade gracefully if a tenant temporarily misconfigures DNS or headers. Testing covers mixed content (HTTP manifest on HTTPS page must be blocked with a clear error), origin redirects, and stale caches. Exit: demo pages verify without any CORS allowances, SRI failures are caught and reported, and an offline scenario proves a Service Worker cache can validate a recent asset while noting degraded mode. The relay becomes your default path on sites with strict CSP or third-party embed policies.

---

## Phase 15 — OEM Bridge v1
Aim: accept camera-captured Content Credentials and prove you can maintain the chain through CMS/CDN hell. You implement a simple ingest endpoint that accepts media with in-camera credentials, extracts the provenance, and anchors it into your remote-manifest flow so later transformations do not break discovery. You maintain trust profiles per OEM with certificate pins and compatibility notes (e.g., Leica production certs; programs in flux). When OEM metadata is missing or malformed, you fall back to your signer while marking the asset as imported without in-camera attestations. The badge must clearly communicate “captured with device X at time Y” when present, and never over-state if the data is partial. For QA, you keep a curated set of camera samples and confirm verification parity with external tools. Exit: at least one Leica sample verifies end-to-end via your pipeline, a malformed sample degrades cleanly without misleading claims, and your public demo shows “camera-captured → site → CDN → still verifiable via remote.” You do not hinge your business on OEMs, but you are ready when adoption grows.

---

## Phase 16 — Adversarial Lab v1
**Purpose:** Proactively break your own stack before attackers or misconfigured customers do. The Adversarial Lab becomes the canonical place to reproduce known C2PA attack patterns, parser edge cases, and viewer/UI exploits. You assemble a corpus of “toxic” manifests and assets: malformed JUMBF boxes, overlong fields, recursive references, dangling remote URIs, mixed-charset payloads, HTML/JS injection attempts in human-readable fields, timestamp anomalies, and conflicting lineage claims. Add fuzzer harnesses that mutate valid manifests (bit flips, truncations, invalid lengths) and feed them into /verify, the badge renderer, and any report generator. Security invariants must be executable: **no eval in badge**, strict output encoding, deny-lists for dangerous MIME types, and strict Content Security Policy with nonces. The lab also simulates infra failures (TSA down, origin 5xx, S3 stale reads) to verify your policy: degrade to remote verification where possible, fail closed otherwise, and always emit a signed incident record. Tests run in CI nightly and on release branches. Artifacts (attack case → expected decision/warning) are frozen so regressions are obvious.  
**Exit tests:** Minimum 10 named attacks with deterministic expected outcomes; `security:c2pa-attacks` job green for two consecutive nights; zero reflected XSS in viewer/badge under fuzz; intentional manifest tamper correctly yields “Destroyed” with a user-facing reason.  
**Risks:** Flaky fuzzers and false positives creating alert fatigue.  
**Mitigation:** Quarantine unstable seeds; pin versions; triage board that requires explicit human acceptance to demote a finding.

---

## Phase 17 — Ledger Anchors (opt-in)
**Purpose:** Provide optional, low-cost proof-of-existence for provenance evidence without leaking asset data. You implement a weekly (or daily for Enterprise) Merkle rollup: hash each stored manifest (or its canonical digest), build a tree per tenant, and anchor the Merkle root to a public, time-stamped ledger (e.g., Bitcoin/ETH via a notary service or RFC3161 TSA receipt catalogs). Receipts are small JSON/PDF artifacts containing the root, inclusion proofs for sample items, the anchoring transaction id (or TSA token), and your notarized statement. No asset contents leave your boundary; only digests are anchored. When tenants retrieve a manifest, they can also retrieve an inclusion proof to demonstrate the manifest existed at or before a specific time. Add privacy budgets: disable anchoring for sensitive tenants by default; allow opt-in at plan level with clear pricing. Rate-limit anchoring to keep costs predictable.  
**Exit tests:** Weekly anchor job publishes proofs; inclusion verification succeeds for random samples; opt-in/off flows leave consistent audit trails; backfill anchoring can process N historical manifests per hour without overwhelming costs.  
**Risks:** Perceived “blockchain” hype, privacy misunderstandings, and anchoring outages.  
**Mitigation:** Position strictly as “timestamp attestation,” not truth; hash-only; detailed cost cap and kill-switch; dual path (TSA-only for conservative tenants, public-chain for others).

---

## Phase 18 — Enterprise Controls v1
**Purpose:** Unblock mid-market security/legal buyers by meeting minimum enterprise requirements without boiling the ocean. You add SSO (OIDC/SAML), SCIM-based user provisioning, role-based access control (Org Admin, Auditor, Integrator), and read-only auditor views with immutable timestamps. Policies become first-class: who can generate keys, sign assets, rotate, export compliance packs, or enable anchoring. Every privileged action emits a structured audit record with actor, request id, and before/after state; these records are immutable and exportable for SOC2/ISO evidencing. Implement tenant-configurable data retention and IP allowlists for API keys. Feature flags let you restrict beta features to a pilot org. Keep UI utilitarian: policy tables and toggles; downloadable CSV logs.  
**Exit tests:** SSO works for one reference identity provider; SCIM creates, updates, and deprovisions users; a targeted pen-test confirms privilege boundaries; auditor mode can view but not mutate; policy exports satisfy a mock security review.  
**Risks:** Scope creep and complexity drag.  
**Mitigation:** Ship SSO first; SCIM for “create/disable” only; defer group sync if it stalls; document a minimal RBAC matrix and refuse one-off roles unless paid.

---

## Phase 19 — Marketplace Connectors v1
**Purpose:** Meet customers where they already operate (Getty, news APIs, stock providers), tying licensed content to provenance without violating terms. You build read-only ingest adapters that pull metadata and, where permitted, asset URLs or proxies. On ingest, create linkage assertions (license id, source provider, rights window) and attach them to your remote manifest so downstream publishers can verify provenance and license statements in one place. For providers that forbid hot-linking, store only references; the badge clickthrough shows license assertions and directs back to the provider. Build rate-limited, cached connectors to avoid throttling.  
**Exit tests:** Two connectors live with reproducible demos; verify pages show license assertions clearly; connectors degrade gracefully on 429/5xx; nightly sync keeps mappings current; provider terms reviewed and honored.  
**Risks:** API instability, terms-of-use violations, and legal exposure.  
**Mitigation:** Read-only posture; caching with short TTL; explicit “not legal advice” copy; provider contact for official partnership once pilots convert.

---

## Phase 20 — Policy Engine & Assertions Builder
**Purpose:** Let non-engineers express disclosure/compliance intent that reliably compiles to C2PA assertions. Create a minimal, human-readable policy DSL (HCL/YAML-like): inputs include content type, audience region, AI usage flags, editing steps, and license statements. The compiler validates inputs against the spec vocabulary and emits a canonical assertion set used by /sign. Version policies so changes are auditable and reproducible (policy id included in the manifest). Provide sector templates (“Newsroom Default,” “EU Ads Default,” “Marketplace Listing Default”) with toggles for stricter disclosure. Build a dry-run that shows exactly what assertions will be emitted and any implied badge copy.  
**Exit tests:** “Newsroom Default” compiles into a compliant manifest set; diffs between policy versions are human-readable; bad inputs fail with actionable errors; tenants can lock to a policy version; rollbacks are trivial.  
**Risks:** DSL complexity and support burden.  
**Mitigation:** Hard cap scope: only fields your signer truly supports; warn on unknown keys; no Turing-complete nonsense; embed clear examples in UI/docs.

---

## Phase 21 — Multi-Region & DR
**Purpose:** Prevent evidence loss and minimize downtime. Replicate manifest storage across regions with strong read-after-write guarantees for manifest retrieval. Maintain an active/standby control plane: if region A fails, cut over DNS and Workers to region B; ensure signing and verifying continue with minimal blast radius. Define RPO (max data loss) and RTO (time to recover) as hard numbers, not vibes. Chaos drills simulate region loss, degraded object store, and TSA outages; runbooks include exact commands and owners. Avoid split-brain by gating writer election with a single leader and health checks.  
**Exit tests:** Game-day demonstrates RPO < 5 minutes and RTO < 15 minutes; data consistency checks pass post-failover; anchor/rotation jobs either pause safely or resume idempotently; tenants see no integrity regressions.  
**Risks:** Replication lag, DNS TTL traps, and silent partial failures.  
**Mitigation:** Short TTLs with fast propagation; health-based traffic steering; background consistency sweeps; prominent status page with incident playbooks.

---

## Phase 22 — Supply-Chain Security
**Purpose:** Don’t ask buyers to trust binaries you cannot prove. Produce SBOMs for services and clients; sign container images; use Sigstore or equivalent to attest build provenance. Lock dependency versions and enable reproducible builds for critical components (signer, verify service, badge). Gate deploys on attestation verification; refuse to run unsigned images in prod. Rotate build credentials regularly; isolate build runners; scan artifacts for known CVEs and fail releases above a severity threshold. Publish a “Trust of the Build” doc buyers can read without legalese.  
**Exit tests:** SBOM downloadable per release; image signature verification gate in CI passes; a simulated compromise (tampered image) fails to deploy; critical CVE found triggers hotfix and public note.  
**Risks:** Build times and developer friction.  
**Mitigation:** Cache dependencies, sign only release artifacts, batch CVE scans nightly, and set clear exception processes for false positives.

---

## Phase 23 — Offline Verification Kits
**Purpose:** Serve air-gapped or incident environments (courtrooms, secure newsrooms, crisis response) where internet access is limited or forbidden. Provide a self-contained CLI and a static badge render that can verify manifests against a bundled trust root snapshot. Include a process to update trust roots via signed offline bundles. The kit must verify common failure modes and generate a local, timestamped report with QR codes linking to public verification when reconnected. UI constraints: zero network calls; clear red/green outcomes; explicit statement when trust roots are outdated.  
**Exit tests:** A laptop demo fully offline verifies sample assets; trust root update is applied from a USB package; reports export correctly; behavior is safe when manifests reference remote URIs (make no network call; warn).  
**Risks:** Stale trust info and misinterpretation of offline results.  
**Mitigation:** Prominent “as-of” timestamp, mandatory re-check prompt on reconnect, and signed update bundles with rollback.

---

## Phase 24 — Browser Extensions
**Purpose:** Make provenance visible to end users without publisher cooperation. Build Chrome/Edge/Safari extensions that read page images/video, follow Link headers, and invoke your verify API through a privacy-preserving relay. On hover or via an icon, show a lightweight badge overlay; clicking opens the verified details panel. Respect CSP and never inject eval or remote code. Add per-site controls to avoid noise (e.g., social media). Log nothing sensitive by default; provide opt-in telemetry for QA.  
**Exit tests:** Three site demos (publisher cooperative, hostile CDN, and marketplace) show overlays and correct verify states; privacy review passes; on locked-down sites the extension degrades cleanly with an explanation.  
**Risks:** Extension store approval and breakage from site DOM changes.  
**Mitigation:** Minimal DOM coupling; use standard APIs; fast iteration channels and clear fallback to a toolbar-only UI.

---

## Phase 25 — Mobile SDKs
**Purpose:** Bring verification to iOS/Android share-sheets and viewers. Provide Swift/Kotlin SDKs that accept a URL or local photo, discover remote/embedded manifests, and show a native modal with result details. Include background manifest caching and strict network policies (HTTPS-only, pinned hosts if using relay). Avoid bloated dependencies; deliver small AAR/Swift packages. Provide sample apps and a simple “verify from Photos” share action.  
**Exit tests:** Local albums show a provenance badge; remote fetch respects policy and errors are actionable; SDKs integrate into a sample news or marketplace app in under an hour following a quickstart.  
**Risks:** Platform differences and battery/network usage.  
**Mitigation:** Aggressive caching with TTLs; work off main thread; tiny binary footprint; clear versioning and deprecation policy.

---

## Phase 26 — Third-Party CMS Connectors (Wave 2)
**Purpose:** Extend coverage beyond WP/Shopify to reduce “we can’t integrate” objections. Ship minimal-intrusion injectors/snippets for Drupal, Webflow, Squarespace (code injection), and Ghost. Prefer serverless hooks or scheduled jobs when webhooks are absent. Provide a “manual mode” for static-site generators: a pre-publish script that signs assets, writes manifests, and injects Link headers into HTML.  
**Exit tests:** Two additional CMS connectors running on demo sites with survival tracking in your dashboard; uninstall leaves pages intact; publish instructions are copy/paste-able for a mid-level web admin.  
**Risks:** Limited extensibility on hosted CMSs and template churn.  
**Mitigation:** Keep connectors tiny; document clearly; provide fallbacks (badge-only with remote verify) where injection isn’t possible.

---

## Phase 27 — Edge Signer (WASM Probe)
**Purpose:** Probe feasibility of signing at the edge for very small assets where round-trip latency dominates. Build a WASM prototype of a signer subset that can run in a constrained environment. Work through key isolation models (KMS-backed ephemeral ops vs hardware-bound). Stress-test quotas, cold-starts, and multi-tenant risks. Produce a decision memo: either a viable path with acceptable security or a clear “do not ship” with reasons. Feature-flag it off by default.  
**Exit tests:** Memo that answers performance, security, and cost with measured data; if unsafe or marginal, the probe is archived and locked behind an explicit feature flag.  
**Risks:** Key exposure or “crypto in the wrong place.”  
**Mitigation:** Never ship production keys to the edge; use synthetic test keys only; get external review before enabling for a tenant.

---

## Phase 28 — TSA Redundancy & SLAs
**Purpose:** Make timestamp anchoring resilient and measurable. Integrate two or more TSA providers behind a health-checked client. Track latency, success rates, and error classes; enforce per-tenant policies (which TSA roots accepted). Implement automatic failover within seconds and a queueing mode that holds signatures safely if all TSAs are briefly down. Publish a TSA status card in your dashboard.  
**Exit tests:** Simulated TSA outage produces <2% error spike and <30 s failover; backlog drains within SLA; per-tenant policy prevents “unknown TSA” tokens from being accepted.  
**Risks:** Inconsistent TSA roots and silent partial failures.  
**Mitigation:** Pin roots; verify tokens at ingest; alert on drift.

---

## Phase 29 — Manifest Diff & Audit
**Purpose:** Give investigators a fast way to see “what changed” across versions or copies. Build a diff engine that compares two manifests (or a chain) and renders both a human-readable table (assertions added/removed, signer changes, timestamps) and a JSON diff for tooling. Add a lineage view that draws the chain from original capture to latest derivative, highlighting unsupported or broken links. Enable “open in new tab” raw manifest.  
**Exit tests:** Three incident scenarios resolved using the tool (tamper, re-encode, license removal); exports added to an evidence pack; performance acceptable on large manifests.  
**Risks:** UI bloat and misinterpretation.  
**Mitigation:** Keep visuals minimal; show exact spec fields; link to spec docs for each field.

---

## Phase 30 — Variant Linking (Renditions)
**Purpose:** Keep provenance intact across derivatives—resizes, crops, format changes, thumbnails. Define canonical linking semantics: child manifests carry a pointer to parent hash plus the transformation description. Where only remote manifests survive, rely on Link headers tying each variant to the same manifest or a derivative manifest with parent pointer. Validate chains during verify; if a variant claims the wrong parent, mark as “Broken.”  
**Exit tests:** Image → WebP chain verifies; thumbnails and crops display lineage; wrong-parent variants are flagged; editorial tools can consume the chain to show “derived from.”  
**Risks:** False linking due to weak heuristics.  
**Mitigation:** Prefer content-hash based parent linking; reject ambiguous chains; document best practices for CMS pipelines.

---

## Phase 31 — Stream Manifests v2 (Ads/SCTE)
**Purpose:** Handle ad insertions and splices in live/VoD streams without losing provenance. Map SCTE-35 markers to segment-level assertions; when ads are stitched, each ad segment has its own issuer path but remains tied to the program. Player-side verify should tolerate segment swaps and ABR while maintaining a coherent badge state.  
**Exit tests:** Ad-stitched HLS stream verifies across program/ad boundaries; the badge indicates when viewers are on ad or program segments; seek and bitrate shifts do not break verification.  
**Risks:** Player variability and CPU overhead.  
**Mitigation:** Limit per-segment verification frequency; cache segment-level results; focus on one reference player first.

---

## Phase 32 — Licensed Content Enforcement Hooks
**Purpose:** Provide non-DRM guardrails so partners can detect unlicensed reuse while staying standards-compliant. Implement license URNs as assertions and a simple verifier callback mechanism that partners can register to receive “verify events” on their assets. Start with soft-block UX (warning banners, reduced quality preview) and reserve hard blocks for clearly permitted contexts. Keep privacy limits: no PII in callbacks.  
**Exit tests:** Two partner PoCs that successfully flag unlicensed reuse and trigger the soft-block flow; logs capture the reasoning; partners can export event histories.  
**Risks:** False positives and user backlash.  
**Mitigation:** Conservative default (warn-only), appeals path, transparent signals in the badge.

---

## Phase 33 — Optimizer Behavior Reverse-Lab
**Purpose:** Continuously fingerprint and monitor optimizer behavior so your rules keep up. Build a crawler that hits known endpoints across provider/version combos, applies transforms, and records headers, resulting formats, and metadata outcomes. Version each provider profile; trigger alert if survival changes. Feed new profiles to the Hostile Gauntlet and Auto-Fallback rules automatically.  
**Exit tests:** A new optimizer version is detected, profiled, and rules updated within 48 hours; the weekly Survival Report reflects the change; tenants affected receive proactive notices.  
**Risks:** Rate limits and provider blocking.  
**Mitigation:** Respect robots and terms; throttle; use public demo assets where possible; cache aggressively.

---

## Phase 34 — Spec Watch & Contributions
**Purpose:** Influence the standard where it impacts your survival doctrine (remote manifests, discovery order, video semantics). Track C2PA releases, file concise issues with reproducible cases from your Gauntlet, and contribute small PRs/tests. Publish a quarterly “Spec Watch” note to customers explaining changes that affect them.  
**Exit tests:** One accepted PR or WG note citing your evidence per quarter; your roadmap aligns with upcoming changes; customer notes land on time.  
**Risks:** Time sink and politics.  
**Mitigation:** Cap investment to one day/month; focus on small, high-leverage fixes; avoid debates outside your wedge.

---

## Phase 35 — Public Survival Leaderboard
**Purpose:** Turn your evidence into demand by ranking CDNs/CMS/themes for provenance survival under common settings. Publish a transparent methodology, reproducible links, and allow vendors to submit corrections through a formal process. Provide buyers with “How to get to green in 15 minutes” playbooks per stack. Accept that some vendors will dislike the ranking—your neutrality is your marketing.  
**Exit tests:** Leaderboard v1 live with vendor outreach; at least five inbound leads attributable to the report; a vendor requests changes and you re-test publicly.  
**Risks:** PR blowback and legal threats.  
**Mitigation:** Meticulous reproducibility; neutral tone; invite collaboration; host raw data dumps.

---


## Phase 36 — Self-Serve Onboarding & Billing
**Purpose:** Reduce founder hours per dollar; remove friction from trials to paid. Implement a self-serve flow that provisions a tenant, issues API credentials, enables default policy (“remote-first + badge”), and starts metering immediately. Integrate billing with usage-based components (assets signed, verifications served) layered onto plan gates ($199/$699/$2k+), with free pilot automatically configured as 200 assets/14 days. The onboarding wizard collects domain(s), manifest host, and CMS choice, then applies a prescriptive checklist: install plugin/snippet, verify demo asset, publish Link-injected page, and run a one-click survival smoke test. Provide an “Install Health” card (green/amber/red) that blocks checkout if survival < thresholds, forcing fixes before money changes hands (you do not want churn). Dunning flows, failed-payment retries, and grace periods are built-in; invoices include a transparent line for TSA or optional anchoring costs. The self-serve path must be **reversible**: one-click cancel exports manifests and compliance data, leaving them usable elsewhere—this earns trust and eases closing.  
**Exit tests:** A net-new user moves from “Sign Up” → “Verified demo” → “Paid” without human support; grace + dunning cycles are observable in logs; overage charges post correctly; refunds behave deterministically.  
**Risks:** Chargebacks and orphaned tenants.  
**Mitigation:** Card verification upfront, anti-fraud checks, auto-suspension with read-only verify when invoices age beyond grace.

---

## Phase 37 — Observability v2
**Purpose:** Operate by SLOs, not vibes. Wire end-to-end tracing (OpenTelemetry or equivalent) across signer, verify service, Worker relay, and storage interactions. Standardize structured logs with tenant, request id, manifest hash, path decision, and cache hit/miss. Define dashboards for the only numbers that matter: survival (embed vs remote), sign/verify p95, error rates by class, TSA latency, manifest fetch latency, and per-tenant cost accrual. Establish error budgets (for example, 0.1% monthly for remote survival; 5 nines won’t happen—be honest). Alerts route to a single on-call target with paging only when budgets are burning; everything else is ticketed. RCAs are two pages: what failed, why it was not detected earlier, what guard you added. Correlate incidents to code deploys via release markers; tie revenue and churn events to reliability regressions to make trade-offs explicit.  
**Exit tests:** Two simulated incidents resolved with MTTR <30 minutes; burn rates auto-open incidents; dashboards reflect the same numbers published in Survival Reports; noisy alert reduction achieved through tuned thresholds.  
**Risks:** Observability sprawl and alert fatigue.  
**Mitigation:** Sampling and log budgets; a weekly “alert cemetery” purge; hard rule that no new metric ships without an owner and a budget.

---

## Phase 38 — Pen-Test & Abuse Desk
**Purpose:** Demonstrate diligence to buyers and harden abuse surfaces before scale. Commission an external penetration test focused on signer inputs, verify endpoints, badge UI injection points, CF Worker manipulation, and billing APIs. Stand up an abuse desk with triage workflows for scraping, denial-of-wallet (excess verify spam), and signature fraud attempts. Abuse mitigations include token buckets per tenant, anonymous verify cache with freshness bounds, and high-cost operations requiring OAuth or signed intents. Evidence locks (WORM) ensure that once an incident is recorded (headers, decisions, manifests, TSA tokens), it cannot be altered without leaving a trail. Publicly document a vulnerability disclosure program and SLA for responses.  
**Exit tests:** All high/critical pen-test findings remediated with verifiable fixes; synthetic verify-flood does not degrade paid tenants; denial-of-wallet is capped at a fixed dollar exposure per day; abuse tickets close with consistent artifacts and timelines.  
**Risks:** Over-throttling legitimate users, legal exposure if disclosures are mishandled.  
**Mitigation:** Different queues for free vs paid; “VIP lanes” for enterprise; templated legal responses; single point of contact email and status page with live posts.

---

## Phase 39 — Disaster Economics & Pricing Engine
**Purpose:** Price to margin under worst-case paths and auto-guard against cost explosions. Build a unit economics model that simulates TSA, storage, egress, compute, and relay costs under realistic and adversarial use (e.g., massive verify cache-miss storms). Bake this model into a pricing engine that powers plan calculators and internal safeguards: per-tenant daily burst caps, auto-degradation rules (coarser caching, slower TSA schedules), and hard kill-switches that flip a tenant to read-only verify if cumulative cost exceeds contractually allowed exposure. Model also informs discount ladders, annual prepay multipliers, and minimums for enterprise.  
**Exit tests:** A 10× traffic stress scenario remains within budget; caps trigger gracefully without breaking SLAs for paid tiers; pricing page scenarios match ledger totals; “what-if” simulation for a pilot accurately predicts end-of-month invoice within ±5%.  
**Risks:** Underpricing and silent cost leakage through long-tail features (e.g., extensions).  
**Mitigation:** Monthly price review against COGS; alert when gross margin drops below 70%; product changes require an economics diff.

---

## Phase 40 — A/B Embed vs Remote Economics
**Purpose:** Prove that remote-first is the correct default using controlled data. Design an experiment across at least three tenants: 50% of routes attempt embed on preserved paths; 50% force remote-only. Measure survival, verify latency, CDN/storage costs, and operational burden (support tickets, incident time). Include edge cases like aggressive theme updates and optimizer toggles. The goal is to quantify the hidden tax of chasing embed survival versus the predictable economics of remote. Publish a decision memo covering survival deltas, user experience impact, and margins.  
**Exit tests:** A statistically meaningful result shows remote-only meets or exceeds survival targets with lower variance and better margin; embed provides value only on a small subset of carefully configured routes. The memo locks the default as remote, with embed as an opt-in advanced path.  
**Risks:** Misinterpreting data due to tenant heterogeneity.  
**Mitigation:** Normalize by asset type and route; run for at least two weeks per tenant; exclude known outages; report confidence intervals, not just point estimates.

---

## Phase 41 — Cache Discipline & TTL Tactics
**Purpose:** Integrity first, then speed. Define rigorous caching policy for manifests and verify responses. Manifests get short TTLs with strong validators (ETag) and negative caching tuned to avoid long-lived poison. Verify responses may be cached per hash+policy tuple with a bounded TTL and immediate purge if the manifest changes. Signed URLs ensure intermediaries cannot serve stale manifests beyond grace. Integrate cache invalidation with your signer: any new assertion set invalidates dependent keys. Include a “health probe” endpoint that returns freshness and the last manifest validator values for debugging.  
**Exit tests:** A synthetic cache-poisoning attempt fails to show stale data; cache purge propagates within seconds; no mixed-content violations observed; verify cache hit rate improves latency without masking updates.  
**Risks:** Over-aggressive negative caching hiding recoveries; stale-but-valid windows creating confusion.  
**Mitigation:** Conservative negative TTLs; explicit “last verified at” labels; ability to force-refresh via badge.

---

## Phase 42 — Rehydration on 304/Delta
**Purpose:** Cut egress and speed re-verification safely. Implement conditional requests for manifests using ETag/If-None-Match; when servers return 304, reuse cached content. For large manifests, design a delta format (or chunked transport) to update only changed sections. Ensure verify logic treats 304 as a strong signal only when validators match and certificates are unchanged; otherwise fetch the full object. Delta transport must never be applied to unsigned regions—keep cryptographic boundaries intact.  
**Exit tests:** Egress reduced by ~30% on re-verification at scale; zero integrity regressions under chaotic proxies; fallbacks to full fetch on ambiguous validators are correct and logged.  
**Risks:** Intermediary proxies mangling validators or breaking conditional flows.  
**Mitigation:** Pin relay; skip conditional logic on known-bad networks; continue to prefer full fetch for critical incidents or legal holds.

---

## Phase 43 — SDKs (JS/Python/Go)
**Purpose:** Reduce buyer lift and increase surface area. Provide typed client libraries that wrap your API contracts with retries, backoff, and clear error classes. Examples include: “verify page assets on build,” “inject Link headers into static HTML,” “batch-verify a feed,” and “retro-sign folder.” Publish quickstarts and a set of minimal examples with CI recipes. Keep dependencies tiny; treat SDKs as thin, reliable shims, not frameworks. Strong versioning and deprecation policy prevent breaking integrators.  
**Exit tests:** Three external repos adopt SDKs; time-to-first-verify is under 10 minutes for each language following quickstarts; error messages are copy/paste into search-engine friendly form; SDK telemetry is opt-in and disabled by default.  
**Risks:** Maintenance burden and language feature drift.  
**Mitigation:** Generate clients from a single API schema; ship only the three languages with highest ROI; mark experimental APIs behind feature flags.

---

## Phase 44 — CLI v1
**Purpose:** Power tools for operators, SREs, and batch workflows. The CLI exposes sign, verify, inspect, diff, and batch modes with resumable progress, manifest printing, and on-error continue. It supports file system walks, S3/R2 prefixes, and filter expressions (by content type, size, modification date). For safety, a dry-run option prints what would be done and projected costs. The CLI includes local caching of manifests and can produce a “compliance pack” from a set of assets. Ship static builds; ensure predictable behavior across macOS/Linux/Windows.  
**Exit tests:** A retro-sign pilot completes using only the CLI and docs; a large batch job resumes correctly after interruption; diffs are legible and integrate into the investigation workflow.  
**Risks:** Platform quirks and brittle path handling.  
**Mitigation:** Extensive path tests; no shell tricks; UTF-8 everywhere; user-friendly error outputs and exit codes.

---

## Phase 45 — Terraform & Infra Blueprints
**Purpose:** Make environments reproducible and safe to operate. Publish Terraform modules (or equivalent) that define manifest storage, Workers, queues, monitors, alerting, and role bindings. A one-command setup provisions demo, staging, and production with tagged resources and cost centers. Include drift detection, policy checks (no public writes), and guardrails (delete protection on buckets). Provide teardown that leaves no orphans.  
**Exit tests:** A fresh environment stands up in under 30 minutes; drift is detected in CI; a teardown removes all non-protected resources; cost dashboards show spend by environment.  
**Risks:** Provider drift and hidden manual steps.  
**Mitigation:** Lock provider versions; docs for manual edge cases; smoke tests that run after apply.

---

## Phase 46 — CI/CD Enterprise-Grade
**Purpose:** Ship faster without breaking survival guarantees. Enforce branch protections, automated tests (unit, integration, survival-harness), canary deploys, and instant rollbacks. Feature flags gate risky changes; DB migrations are reversible and tested against snapshots. Release trains provide predictability; incidents tie to releases for blame-free root cause.  
**Exit tests:** Two drill rollbacks succeed without data loss; canary catches an introduced verify regression before full rollout; survival harness blocks a change that would degrade remote survival.  
**Risks:** Over-engineering and slow delivery.  
**Mitigation:** Keep pipelines lean; only block on tests that correlate with customer pain; defer heavy suites to nightly runs.

---

## Phase 47 — GTM: Sales Playbook & Assets
**Purpose:** Turn survival evidence into predictable pipeline. Build a 30-second demo that shows strip vs preserve vs remote side-by-side with clickable proofs; a three-step outbound sequence (clip → incident-cost calculator → pilot close); and objection one-liners (watermarks, “we have CAI,” “no compliance need,” key custody). Tie outreach to industries with obvious exposure (news, EU ads, collectibles). Provide email/LinkedIn scripts, a qualification scorecard, and CRM fields mapped to exit criteria (pilot scope, decision date, value owner).  
**Exit tests:** Ten qualified meetings booked; at least three pilots opened within two weeks using the playbook; objection handling closes one resistant lead.  
**Risks:** Spraying and praying without ICP focus.  
**Mitigation:** Weekly review of target list quality; drop low-value verticals quickly; instrument outreach to learn which hooks resonate.

---

## Phase 48 — Compliance v2 (US/EU/UK/BR)
**Purpose:** Broaden legal mapping while keeping the product simple. Extend assertion presets and reporting harmonizer to cover additional regimes (e.g., EU DSA transparency, UK Online Safety Act angles, Brazil LGPD where relevant). Produce a unified monthly compliance pack with regional appendices so legal teams do not piece together outputs. Add localized disclosure suggestions ready to paste into policy pages and ad disclosures.  
**Exit tests:** Unified pack generated on schedule for a tenant with multi-region exposure; counsel review passes in two regions with no changes; retention/purge policies align to stricter of selected regimes.  
**Risks:** Scope creep and lawyer-magnet complexity.  
**Mitigation:** Ship EU first, then minimal viable templates for others; flag “advisory only” and provide links to official texts; version every template.

---

## Phase 49 — Contracts & DPAs
**Purpose:** Close mid-market deals faster without bespoke legal hair. Prepare a standard MSA/DPA/SLA set with performance penalties aligned to your SLOs and security exhibits (key custody, evidence locks, pen-test cadence). Provide an e-sign workflow and an editable order form for seats/usage/overage. Include data residency and subprocessor disclosures.  
**Exit tests:** A mid-market customer signs without redlines or with a single pass and minimal changes; your order form supports upgrades/downgrades mid-term; renewal is automated.  
**Risks:** Time lost in redlines and risk acceptance.  
**Mitigation:** Offer a “fast-lane” with standard paper discount; publish your security posture and pen-test letter upfront; refuse toxic clauses early.

---

## Phase 50 — Pricing Experiments & SKUs
**Purpose:** Converge on margin-positive, low-churn pricing. Run controlled experiments on plan caps (assets, sites), verify allotments, overage rates, and annual discounts. Test a “retro-sign pack” add-on with stepwise volume pricing, and an “analytics-only” viewer plan for publishers who cannot change their pipelines yet. Monitor trial-to-paid, 90-day retention, and net dollar retention.  
**Exit tests:** A cohort achieves gross margin >70% and 90-day retention above target; pricing page yields higher paid conversion without cannibalizing enterprise; overage complaints drop as calculators get clearer.  
**Risks:** Confusing packaging and surprise bills.  
**Mitigation:** Transparent calculators; proactive alerts when approaching caps; generous pilot caps with strict production limits.

---

## Phase 51 — Perceptual Collision Analytics (R&D Moat)
**Purpose:** Detect look-alike assets with conflicting provenance to help customers investigate fraud without pretending to be truth arbiters. Build perceptual hashing and clustering over signed assets; when two visually similar assets claim incompatible lineage (different parents or issuers), flag for review and show a side-by-side in the investigator UI. Provide tunable sensitivity and clear false-positive controls.  
**Exit tests:** On a curated set, achieve 95th-percentile precision with a tolerable recall; reviewers can disposition collisions quickly; tenants opt in to share hashes for cross-tenant defense.  
**Risks:** Privacy and chilling effects.  
**Mitigation:** Hash-only signals; opt-in; never surface end-user data; loud disclaimers that collisions are *signals*, not judgments.

---

## Phase 52 — Watermark/Cert Hybrid Experiments
**Purpose:** Explore optional watermark signals that may help investigations without conflating watermark with provenance. Prototype robust but unobtrusive watermarks tied to manifest hashes; document that watermarks are hints only. Evaluate visual impact, survival under common transforms, and risks of false trust.  
**Exit tests:** Decision memo retains watermark as experimental/opt-in; no marketing conflates watermark with cryptographic provenance; lab results included in Security/Adversarial docs.  
**Risks:** Market confusion and legal claims.  
**Mitigation:** Absolute clarity in language; default OFF; compliance copy reviewed before release.

---

## Phase 53 — Public API Rate & Fairness Controls
**Purpose:** Keep verification available under stress while preventing scraping and floods. Implement per-tenant token buckets, global bursts, and fairness scheduling; cache anonymous verify results at the relay for hot assets. Add soft-harder fail ladders (HTTP 429 with retry-after, then temporary read-only mode) and a “verified cache prewarm” for frequently viewed assets.  
**Exit tests:** A synthetic 50k requests-per-second verify storm does not starve paid tenants; fairness metrics show intended distribution; observability exposes who is burning the budget and why.  
**Risks:** Over-throttling real news events.  
**Mitigation:** Event-mode override for trusted tenants; prewarm for expected spikes; publish contact path for temporary increases.

---

## Phase 54 — Evidence Vault & Legal Hold
**Purpose:** Provide durable, exportable evidence packs for disputes, takedowns, and audits. Store WORM copies of manifests, headers snapshots, verify decisions, TSA receipts, and operator actions with tamper-evident logs. Implement legal hold that freezes deletion and copies the relevant universe into an escrow namespace. Exporters produce a zipped pack with a signed index and SHA256s.  
**Exit tests:** Counsel can retrieve a pack in under two minutes; a legal hold prevents purges until cleared; the pack verifies on a clean machine using your offline kit.  
**Risks:** Storage costs and inadvertent retention violations.  
**Mitigation:** Tiered storage; explicit hold expirations; alerts when holds linger beyond policy.

---

## Phase 55 — Education & Community
**Purpose:** Reduce support load and create inbound momentum. Launch “Provenance Survival 101” with short modules, public demos, and code samples. Host monthly office hours; maintain a forum with solved FAQs and copy/paste snippets for the top five stacks. Incentivize community demos by highlighting integrator wins.  
**Exit tests:** 200 sign-ups; forum answers reduce recurring tickets; at least three community repositories referencing your SDKs; a partner webinar yields qualified leads.  
**Risks:** Time sink and unqualified traffic.  
**Mitigation:** Batch content creation; point support replies to canonical docs; track which content correlates with conversions.

---

## Phase 56 — Partner Marketplace
**Purpose:** Scale delivery via integrators and auditors who operationalize your doctrine for customers. Build a partner directory with certifications (installer, auditor, enterprise) and SLAs. Provide co-marketing kits and a referral program with revenue share and transparent attribution.  
**Exit tests:** Three partners close paid work via your listing; time-to-install for a new tenant drops measurably; partner NPS captured and published.  
**Risks:** Quality variance hurting brand.  
**Mitigation:** Certification gates, probationary periods, and public performance badges.

---

## Phase 57 — Globalization & Locales
**Purpose:** Sell outside English-first markets and align to local expectations. Internationalize badge UI and docs in top eight languages; support RTL; include locale-specific compliance notes and examples. Add default date/number formats per locale and ensure fonts render consistently.  
**Exit tests:** 90% translation coverage; locale QA signed off; one non-English pilot completes with zero translation blockers; public docs localized and discoverable.  
**Risks:** Stale translations and layout breaks.  
**Mitigation:** Translation memory, professional review for legal copy, visual diff testing for RTL.

---

## Phase 58 — Cost Engine v2 (FinOps)
**Purpose:** Predict and prevent margin erosion before invoices land. Ingest detailed cloud cost data, allocate by tenant, and detect anomalies (unexpected TSA spikes, egress hotspots, cache bypass routes). Provide auto-throttle or routing changes when anomalies persist; surface per-tenant P&L with recommendations (force remote-only, reduce badge frequency, move origins).  
**Exit tests:** Two real anomalies caught pre-invoice; tenant alerts sent with actionable remediation; gross margin trends visible and tied to product changes.  
**Risks:** Noisy false alarms and over-correction.  
**Mitigation:** Confidence thresholds; human-in-the-loop approvals; rollback switches.

---

## Phase 59 — Pivots Up-Stack (Keys/Analytics)
**Purpose:** If incumbents erase the SMB wedge (CDNs preserve by default), move up-stack to key custody and verification analytics. Offer an HSM-first custody SKU with rotation evidence packs and an analytics-only SKU that ingests third-party verify logs to produce survival dashboards and compliance packs. Provide migration paths from the base product with minimal friction.  
**Exit tests:** New SKU reaches ≥20% of MRR within 60 days; at least one enterprise adopts custody with audits; ingestion from third-party tools is stable and mapped to your dashboards.  
**Risks:** Split focus and message dilution.  
**Mitigation:** Feature-flag split; sales collateral refreshed; strict qualification—no custom engineering without revenue.

---

## Phase 60 — Kill Switch & Hard Truths Enforcement
**Purpose:** Prevent sunk-cost drift and enforce the discipline that keeps this solo-venture viable. Implement automated gates that read survival percentages, pilot→paid conversion, and MRR growth against the timelines. If Day-30 has no pilots or even warm replies, automatically pause feature work and trigger a “fix ICP/offer” block. If Day-45 has no conversions and no compliance asks, pivot path activates (analytics/custody outreach, pricing change). If two or more major CDNs preserve by default for SMB, flip a roadmap switch that prioritizes custody/analytics and sunsets low-value SMB features.  
**Exit tests:** Simulated misses trigger the correct playbooks; logs capture decisions and owners; manual overrides require justification and expire automatically.  
**Risks:** Founders overriding gates emotionally.  
**Mitigation:** Immutable decision logs, peer/advisor review sign-offs, and a strict de-scope-first rule—reduce scope or pivot, never extend deadlines blindly.

---
