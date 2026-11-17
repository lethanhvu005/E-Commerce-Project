# NEXA CommerceOS pre-release audit — 2026-11-17

Scope: branch `fix/full-system-improvement`, local Windows validation, Render Blueprint, Neon PostgreSQL integration. This is an engineering risk review, not a legal compliance certification.

Evidence run:

- Django: 94/94 tests passed.
- React: 25/25 tests passed; production build passed.
- Django `check --deploy`: no errors; two intentional HSTS preload/subdomain warnings remain for the shared `onrender.com` domain.
- `pip-audit`: no known Python dependency vulnerabilities.
- Ruff fatal rules and Bandit medium/high scan: passed.
- `npm audit --omit=dev`: two moderate React Router advisories; available automated fix requires the breaking v7 upgrade.
- Credential scan: no Neon password or tracked `.env` found in source. The password posted in chat must still be rotated before deployment.

## Security S01–S20

| ID | Status | Severity | Evidence / next action |
|---|---|---:|---|
| S01 | PASS | — | Django user manager and auth tests use password hashing. |
| S02 | PASS | — | Login/OAuth throttles and negative API tests executed. |
| S03 | PASS | — | SimpleJWT refresh rotation/blacklist and logout tests passed. |
| S04 | PASS | — | Blueprint sets `DJANGO_DEBUG=False`; production check executed. |
| S05 | FAIL | P0 | Neon password was posted in chat. Rotate it before entering `DATABASE_URL` on Render. No secret is committed. |
| S06 | PARTIAL | P2 | API error paths tested; live production traceback/log redaction remains unverified. |
| S07 | NOT_APPLICABLE | — | Current catalog stores image URLs; no server file-upload endpoint found in release scope. |
| S08 | NOT_APPLICABLE | — | No server file-upload flow in release scope. |
| S09 | PASS | — | Serializer validation, amount/role protection and negative tests passed. |
| S10 | PASS | — | Cross-user cart/order/review/admin access tests passed. |
| S11 | PASS | — | Staff/superuser permissions and customer denial tests passed. |
| S12 | PASS | — | ORM-based data access; Ruff/Bandit passed. |
| S13 | UNVERIFIED | P1 | Render HTTPS is declared but live redirect/TLS cannot be checked before service creation. |
| S14 | PARTIAL | P2 | Django security headers exist; CSP/Permissions-Policy are not fully verified live. |
| S15 | PARTIAL | P2 | Secure production cookies configured; JWT remains in browser session storage and depends on XSS prevention. |
| S16 | PARTIAL | P1 | Explicit production CORS origins are declared; live preflight still requires verification. |
| S17 | PARTIAL | P1 | Neon connection enforces TLS and pooling; provider/IP controls remain unverified. |
| S18 | FAIL | P1 | Initial Neon URL uses `neondb_owner`; create a least-privilege runtime role after initial migrations. |
| S19 | PARTIAL | P2 | DRF throttling and Render edge protection exist; WAF/load behavior is unverified. |
| S20 | UNVERIFIED | P1 | Neon backup/restore drill, Render alerts and outbox worker availability are not yet verified. |

## Legal, privacy and accessibility L01–L20

| ID | Status | Severity | Evidence / next action |
|---|---|---:|---|
| L01 | PARTIAL | P1 | `/privacy` exists; business/legal owner must verify it matches deployed OAuth, orders and logs. |
| L02 | PARTIAL | P1 | Terms content exists but needs business/legal approval. |
| L03 | PARTIAL | P2 | Authentication cookies/storage documented in code; live cookie inventory still needed. |
| L04 | PARTIAL | P1 | Return/delivery content exists; verify against actual operating policy. |
| L05 | PARTIAL | P2 | Account/order fields reviewed; formal retention/data inventory is absent. |
| L06 | UNVERIFIED | P1 | Lawful basis/consent decisions require business/legal review. |
| L07 | PARTIAL | P2 | Forms have contextual text; deployed OAuth/checkout notices need browser review. |
| L08 | FAIL | P1 | Public data-deletion instructions/workflow are incomplete; required before Facebook public release. |
| L09 | PARTIAL | P2 | Google/Facebook SDKs are used; third-party disclosure and live network inventory required. |
| L10 | UNVERIFIED | P1 | Image/font asset provenance and commercial licenses are not proven by source tests. |
| L11 | PASS | — | Verified-purchase review rules and reply behavior are covered by backend tests. |
| L12 | UNVERIFIED | P2 | Marketing, warranty and promotion claims require business evidence. |
| L13 | PARTIAL | P1 | Address/phone are present; seller identity, tax and e-commerce notification status need owner confirmation. |
| L14 | PARTIAL | P2 | Alt/accessibility names exist in core components; full DOM/assistive-tech pass not run. |
| L15 | UNVERIFIED | P2 | Automated/live contrast measurement not run for all themes. |
| L16 | PARTIAL | P2 | Labels/focus patterns exist; full keyboard-only browser pass not run. |
| L17 | PASS | — | Core commerce and admin actions use explicit text labels and loading/disabled states. |
| L18 | PARTIAL | P2 | No advertising pixel found; live third-party request gating remains unverified. |
| L19 | UNVERIFIED | P1 | Geographic legal scope requires qualified legal review. |
| L20 | PARTIAL | P2 | CI and this audit exist; periodic owner/review cadence is not established. |

## UI/UX U01–U20

These IDs are design heuristics, not security release blockers.

| ID | Status | Evidence / next action |
|---|---|---|
| U01 | PARTIAL | Product-led hero exists; live responsive comparison is pending. |
| U02 | PASS | Catalog badges are tied to product/category data. |
| U03 | PASS | Accent typography follows the established NEXA visual system. |
| U04 | PASS | Catalog group count follows actual categories rather than a forced three-card layout. |
| U05 | PASS | Cobalt/navy palette is an explicit NEXA brand choice. |
| U06 | PARTIAL | Gradients are intentional; live contrast remains pending. |
| U07 | PASS | Shared light/dark tokens and component styles are present. |
| U08 | PASS | Display serif and sans body roles are intentionally separated. |
| U09 | PARTIAL | Radius hierarchy exists; full-page consistency needs visual review. |
| U10 | PASS | Buttons, tabs and filters use distinct shapes/states. |
| U11 | PASS | Glass effects are limited to selected surfaces. |
| U12 | PASS | Icon families are paired with text/accessibility labels. |
| U13 | PARTIAL | Motion exists and reduced-motion support needs a live browser check. |
| U14 | PARTIAL | Action hover states exist; non-action card affordance needs visual review. |
| U15 | PASS | No fabricated animated KPI counters found in the release scope. |
| U16 | PASS | Dark neon product imagery is part of the supplied NEXA brand direction. |
| U17 | PARTIAL | Uppercase kickers remain frequent and should be checked for hierarchy/noise. |
| U18 | PARTIAL | Most commerce copy is specific; remaining campaign claims need content review. |
| U19 | PARTIAL | Footer has contact/policy links; legal seller fields remain incomplete. |
| U20 | UNVERIFIED | Live desktop/mobile task tests and competitor distinctiveness review are pending. |

## Release gate

- **Staging deploy:** allowed after rotating the leaked Neon password and entering the new URL in Render.
- **Production selling/payment:** blocked until S05, S18, L08 and operational backup/monitoring items are resolved or explicitly accepted by their owners.
- VNPay secrets are not included in the Blueprint; payment remains unavailable unless valid production/sandbox credentials are added separately.
