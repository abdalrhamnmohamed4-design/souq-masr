# Guest vs Authenticated Access Control

Product philosophy (unchanged since the request that started this work):
**Browse without registration. Register only when identity, data, communication,
ownership, or money is involved.** Everything below implements that rule for the
current local-only (no live Frappe/ERPNext backend) architecture, and documents
exactly what still has to move server-side once a backend exists.

**Honesty note up front:** everything in this document is a *client-side* gate.
`onboarding.joinedAt` lives in AsyncStorage on the device. There is no server, no
session token, no password — "login" here is a name + phone form that flips a local
flag. Anyone with access to the device (or who clears/edits AsyncStorage) can bypass
every guard below. None of this is real security; it is UX scaffolding that mirrors
the shape real security will eventually take, built so the guarded call sites don't
have to be touched again when a real backend arrives (see §6 for what has to move
server-side, and `souq-masr-app/PHASE_1_MOBILE_API_MAPPING.md` for the endpoint-level
mapping).

---

## 1. Architecture

- **`store/useAppStore.ts`** — `useIsAuthenticated()` derives auth state from the
  existing `onboarding.joinedAt` field (no new parallel "is logged in" flag was
  added). `PendingAuthAction` is a discriminated union (`favorite_listing` |
  `favorite_service` | `save_job`) stored as `pendingAuthAction`, used to resume a
  one-shot toggle action after the user comes back from `/signin`.
- **`lib/auth.ts`** — `useRequireAuth()` returns a `requireAuth(action, pending?)`
  function for guarding a single action inline (a button press). If the user is
  authenticated the action runs immediately and it returns `true`; if not, it shows
  the auth prompt and the action **never runs** — there is no fake-success path.
  `resolvePendingAuthAction()` is called once, from `signin.tsx`, right after login
  completes, to replay a one-shot pending action and then return the user to the
  screen they were on (`router.back()`), not to a generic landing page.
- **`components/AuthGuard.tsx`** — `useAuthGuard(opts?)` guards an entire screen. It
  returns `null` (render the screen normally) when authenticated, or ready-made JSX
  for a "sign in required" screen when not. Used as:
  ```ts
  const authBlock = useAuthGuard({ title: '...', description: '...' });
  if (authBlock) return authBlock;
  ```
  placed **after every other hook call** in the component (see §9 — this ordering is
  load-bearing, not stylistic).
- Both primitives funnel into the same `showAuthPrompt()` — one Arabic message
  everywhere ("سجّل دخولك علشان تقدر تستخدم الميزة دي"), not a different string
  invented per screen. No `if (!user)` checks are scattered through the codebase —
  confirmed by a repo-wide grep as part of this pass.

## 2. Guest-accessible surface (no login required)

Browsing, search, and discovery across all three verticals stay fully open:

- Marketplace: `/`, `/(tabs)/home`, `/(tabs)/categories`, `/category/[id]`,
  `/results`, `/detail/[id]` (view only), `/seller/[id]` (view only)
- Jobs: `/jobs`, `/jobs/results`, `/jobs/[id]` (view only), `/jobs/company/[id]`
  (view only)
- Services: `/services`, `/services/results`, `/services/[id]` (view only),
  `/services/professional/[id]` (view only)
- Onboarding/legal/support-adjacent: `/welcome`, `/city`, `/interests`, `/done`,
  `/legal/terms`, `/legal/privacy`, `/signin`
- `/settings` — theme, language display, Face ID toggle, and the app-info group are
  genuinely device/app-level preferences, not account data, so they stay reachable
  pre-login. The account-specific rows inside it ("بيانات الحساب", "المستخدمون
  المحظورون") route straight into already-guarded screens, so a guest tapping them
  hits the sign-in prompt one screen later — settings itself doesn't need a full gate.

## 3. Protected routes (full-page guard via `useAuthGuard`)

33 screens gate their entire content behind login. Each carries a custom title/
description matched to what the screen actually does (not a generic string copy-
pasted everywhere):

`(tabs)/myads`, `(tabs)/messages`, `(tabs)/profile`, `notifications`,
`saved-searches`, `favorites`, `analytics`, `edit-profile`, `pay`, `paypending`,
`transfer`, `promote/[id]`, `business`, `blocked-users`, `support`, `chat/[id]`,
`call/[id]`, `post/index`, `jobs/my-jobs`, `jobs/applications`, `jobs/saved`,
`jobs/alerts`, `jobs/profile`, `jobs/my-company`, `jobs/interviews`,
`jobs/applicants`, `jobs/resume-builder`, `jobs/resume-view/[id]`, `jobs/post`,
`jobs/apply/[id]`, `services/my-services`, `services/profile`, `services/post`.

`favorites`, `analytics`, `(tabs)/profile`, and `paypending` were **found unguarded
during this pass** and fixed — see §10 (Bugs found and fixed). Everything else in
this list was guarded in the initial implementation.

## 4. Protected actions (inline guard via `useRequireAuth`, screen stays public)

These live on otherwise-public detail/browse screens — only the specific action is
gated, not the whole page, so a guest can still read everything around it:

| Action | Screens | Resumes after login? |
|---|---|---|
| Favorite (listing) | `detail/[id]`, `RowCard`, `GridCard`, `(tabs)/home` (×4 call sites) | Yes — `favorite_listing` |
| Favorite (service/pro) | `services/[id]`, `services/professional/[id]` | Yes — `favorite_service` |
| Save job | `jobs/[id]`, `jobs/results`, `jobs/index` | Yes — `save_job` |
| Start chat | `detail/[id]`, `seller/[id]` | No — re-initiated after re-landing |
| Report listing/job/service/company/professional | `detail/[id]`, `jobs/[id]`, `services/[id]`, `jobs/company/[id]`, `services/professional/[id]` | No — reason picker re-opened by the user |
| Review/rate seller/company/professional | `seller/[id]`, `jobs/company/[id]`, `services/professional/[id]` | No — rating panel re-opened by the user |
| Save search | `results` | No — filters are still set, user re-taps save |

Only genuinely one-shot, safely-resumable toggles (favorite, save-job) auto-resume.
Multi-step actions (chat, report, review, save-search) deliberately don't try to
replay themselves mid-flow after a screen remount — the guard just returns the user
to the same screen via the normal back-stack, and they re-tap the action once. This
was a scope decision, not an oversight: auto-resuming "reopen the report reason
picker" or "re-submit whatever star rating was mid-entry" would be guessing at intent
across a screen that may have fully re-mounted.

## 5. Ownership

Today there is exactly one possible user per device — every "mine" check in the
codebase compares against the literal sentinel string `'me'`
(`sellerId === 'me'`, `ownerSellerId === 'me'`, `professionalSellerId === 'me'`,
etc. — confirmed by grep across `app/`). There is no second real account to violate
ownership against, so "ownership security" in this build is entirely UI-level: owner-
only controls (edit/delete a listing, manage a company's jobs, see your own rate
button hidden) are hidden via `isMe`/`=== 'me'` checks, and that is the **only**
enforcement that exists.

**This is not real ownership security and must not be treated as such once a
backend exists.** When Frappe is live and `'me'` becomes a real, distinct user ID:
- Every mutation (`PUT`/`DELETE` on a listing, job, service, company profile) must
  re-check `owner == frappe.session.user` **server-side**, independent of whatever
  the client sent — a hidden button is not a permission check.
- User A must get a `403` attempting to modify User B's resource even if they
  construct the request by hand (e.g. via `/api/resource/...` directly) — this is
  exactly the class of bug a hidden UI button cannot prevent.
- `isMe`/`'me'` comparisons in the mobile code stay useful for **UI purposes only**
  (show/hide edit controls) after the backend lands — they must never be treated as
  the security boundary.

## 6. Backend / Frappe permission requirements (documented, not implemented — no live bench exists)

- Unauthenticated request to any endpoint in `PRIVATE_API_SURFACE` (see §7) →
  **401**, never a fake/empty success response.
- Authenticated request against a resource the caller doesn't own (edit someone
  else's listing, read someone else's CV, apply as someone else) → **403**, checked
  server-side against `frappe.session.user`, not the client-supplied owner field.
- Frappe's own DocType-level Permission Rules (`read`/`write`/`delete` per role) are
  the mechanism — this app must not reinvent auth, it configures Frappe's existing
  permission system per DocType, matching the "never modify core, only Custom
  Fields/hooks/whitelisted methods" rule from the Phase 1 architecture.
- No endpoint may return `200` with fabricated/empty data to mask a permission
  failure — that would look like a client bug, and would silently break the
  guest-vs-auth contract this whole system exists to enforce.

## 7. Public vs private API surface

Declared once, in `lib/auth.ts`, as `PUBLIC_API_SURFACE` / `PRIVATE_API_SURFACE` —
this is documentation for the eventual backend, not executable logic today (nothing
calls a real API yet). It must stay in sync with
`souq-masr-app/PHASE_1_MOBILE_API_MAPPING.md`'s endpoint list and Phase 1's role
design when that catches up to jobs/services scope.

- **Public** (`allow_guest=True`): taxonomy (categories/attributes/brands/models/
  locations), listing/job/service search & get, public seller/company/professional
  profile reads.
- **Private** (session required): create/update/delete on listings/jobs/services/
  companies, favorites, saved searches, chat, offers, job applications, candidate
  profile & resumes, professional profile, reviews, reports, notifications, wallet,
  payments, `users.me`/`users.update`.

## 8. CV / personal-data privacy

A CV/résumé is personal data by default — never public just because a listing or
job link is guessable. `jobs/resume-view/[id]` is fully login-gated (own screen
guard, §3) even for the owner viewing their own generated résumé, and
`jobs/profile`'s résumé-upload section inherits its parent screen's full-page guard.
There is no route today that renders résumé content to an unauthenticated request.
Once Frappe exists, the same rule must hold server-side: a résumé DocType read must
check the caller is the owner (or an employer the candidate explicitly applied to,
per the Jobs module's future application-visibility rules) — never public by
default, never guessable-by-ID.

## 9. Rate limiting (documented requirement, not implemented client-side)

No client-side throttling was added for auth prompts, favorite toggles, report
submission, or review submission — a client-side rate limit is not real protection
(trivially bypassed by anyone not using the app's own UI) and would have added fake
confidence. This must be enforced server-side once Frappe exists: per-user rate
limits on `reports.*`, `reviews.*`, `chat.*`, and repeated failed-auth attempts are a
Phase 2+ backend requirement, not a mobile-app concern.

## 10. Bugs found and fixed during this pass

Four screens read/mutated personal data with **no auth guard at all**, found by a
repo-wide sweep for hook-order-safe `useAuthGuard` placement against every route
under `app/`:

| Screen | What it exposed to a guest | Fix |
|---|---|---|
| `(tabs)/profile.tsx` | The whole account tab — wallet balance, ID-verification photo upload, ads count, share-profile — reachable directly from the tab bar, no guard | Added `useAuthGuard`, same pattern as the `(tabs)/messages` tab already used |
| `favorites.tsx` | Would have rendered an (always-empty, since favoriting is itself gated) list — not a data leak, but inconsistent with every other personal-data list screen being gated | Added `useAuthGuard` |
| `analytics.tsx` | Same as favorites — always-empty for a guest today, but seller analytics is personal/business data and should be gated on principle, not by accident of empty state | Added `useAuthGuard` |
| `paypending.tsx` | **Actually executed** `promoteMyAd`/`topUp`/`transfer` mutations directly from route params — the one real functional gap, not just a display inconsistency | Added `useAuthGuard` before any mutation can run |

Also found and fixed: `jobs/results.tsx` and `jobs/index.tsx`'s "save job" heart
icons called `toggleSaveJob` directly with no guard (the equivalent action was
already guarded on `jobs/[id].tsx`'s own detail screen, but not on either list/rail
view of the same action) — both now go through `requireAuth(..., { type: 'save_job',
jobId })`, and `(tabs)/home.tsx`'s three `MiniCard` favorite buttons plus its
`MiniCardLink` component had the same gap for listing favorites — all four sites
fixed the same way.

No other un-guarded personal-data mutation call sites were found in the final sweep
(grepped every `toggleFavorite`, `toggleSaveJob`, `addReview`, `startChatForListing`,
`reportJobsTarget`, `reportListing`, `addSavedSearch` call site in `app/` and
confirmed each is either inside a `requireAuth(...)` wrap or on a screen already
behind a full-page `useAuthGuard`).

## 11. Admin dashboard access

Unchanged and still explicitly documented as a known gap (carried over from the
Phase 1 readiness report, not new to this pass): the admin dashboard
(`admin/`) has no real authentication today — it is a local demo tool, already
labeled as such in-app (`DemoDataNote`/analytics labels from the earlier QA pass).
Real admin access control is a backend requirement: Frappe roles
(`Souq Masr Admin`, seeded via `hooks.py`'s `fixtures`) must gate every admin-only
DocType and whitelisted method server-side once Frappe exists. This document does
not change that status — it is repeated here so the guest/auth work doesn't
accidentally read as having also solved admin auth, which it did not attempt to.

## 12. QA test matrix

Executed by code-path inspection (walking each guard's actual conditional logic and
call sites) — a real device/simulator run was not available in this environment.
Rows marked "requires real Frappe" cannot be verified further until a live backend
exists; everything else was verified against the code as shipped in this pass.

| # | Scenario | Expected | Verified how |
|---|---|---|---|
| 1 | Guest opens `/(tabs)/home` | Full listing feed renders, no prompt | Screen has no `useAuthGuard`/`requireAuth` gate on render |
| 2 | Guest opens `/results` and searches/filters | Full results, filters work | No guard on the screen; `saveSearch` is the only gated action |
| 3 | Guest opens `/detail/[id]` | Full listing detail renders | No screen guard; only favorite/chat/report gated |
| 4 | Guest taps the heart on a listing card | Auth prompt appears, favorite is **not** toggled | `toggleFavGuarded`/`onFav` all route through `requireAuth`, which returns `false` and never calls `toggleFav` when unauthenticated |
| 5 | Guest confirms "تسجيل الدخول" from the prompt, signs in, lands back | The listing is now favorited automatically | `pendingAuthAction` set before navigating to `/signin`; `resolvePendingAuthAction()` replays `toggleFavorite` on submit; `router.back()` returns to the same screen |
| 6 | Guest taps "إلغاء" on the prompt | Nothing happens, no navigation, favorite still off | `Alert.alert`'s cancel button has no `onPress` side effect |
| 7 | Guest taps chat/"راسل" on a listing or seller profile | Auth prompt appears, no chat created | `openChat`/`messageSeller` wrapped in `requireAuth` |
| 8 | Guest taps "بلّغ عن..." on any of the 5 report-able entity types | Auth prompt appears, no report recorded | All 5 `report*` functions wrapped in `requireAuth` |
| 9 | Guest taps "قيّم..." on seller/company/professional | Auth prompt appears, rating panel never opens | `openRate` wrapped in `requireAuth` before `setRateOpen` |
| 10 | Guest taps "احفظ عملية البحث دي" | Auth prompt appears, no saved search created | `saveSearch` wrapped in `requireAuth` |
| 11 | Guest taps the "الرسائل" tab | Full-page sign-in prompt, not an empty inbox | `(tabs)/messages.tsx`'s own `useAuthGuard` |
| 12 | Guest taps the "الحساب" tab | Full-page sign-in prompt, not a blank/default profile | `(tabs)/profile.tsx`'s `useAuthGuard` (fixed this pass) |
| 13 | Guest deep-links to `/favorites` | Full-page sign-in prompt, not an empty list | `useAuthGuard` (fixed this pass) |
| 14 | Guest deep-links to `/analytics` | Full-page sign-in prompt, not an empty state | `useAuthGuard` (fixed this pass) |
| 15 | Guest deep-links to `/paypending?purpose=topup&amount=50` | Full-page sign-in prompt; `topUp` never runs | `useAuthGuard` before `confirm()` can be reached (fixed this pass) |
| 16 | Guest deep-links to `/post` (create listing) | Full-page sign-in prompt | `post/index.tsx`'s `useAuthGuard` |
| 17 | Guest deep-links to `/jobs/apply/[id]` | Full-page sign-in prompt | `jobs/apply/[id].tsx`'s `useAuthGuard` |
| 18 | Guest deep-links to `/jobs/resume-view/[id]` | Full-page sign-in prompt even for a real generated résumé id | `useAuthGuard`, unconditional — no owner bypass for guests |
| 19 | Guest deep-links to `/chat/[id]` for a real conversation id | Full-page sign-in prompt, message contents never render | `chat/[id].tsx`'s `useAuthGuard` |
| 20 | Guest deep-links to `/edit-profile` | Full-page sign-in prompt | `useAuthGuard`, verified hook-order-safe (placed after all `useState` calls — the bug class this exact file had during implementation) |
| 21 | Guest opens `/settings` | Theme/language/Face ID toggles work; tapping "بيانات الحساب" or "المستخدمون المحظورون" lands on the sign-in prompt one screen later | `settings.tsx` itself ungated by design (§2); its account sub-routes are gated |
| 22 | Authenticated user favorites/saves/chats/reports/reviews/saves-search | Action executes immediately, no prompt | `requireAuth` returns `true` and calls `action()` directly when `isAuthenticated` |
| 23 | Authenticated user opens any of the 33 full-page-guarded screens | Real content renders, no prompt | `useAuthGuard` returns `null` when authenticated |
| 24 | Authenticated user views their own listing/company/professional profile | Owner-only controls visible (edit/manage), rate-yourself control hidden | `isMe`/`'me'` checks — UI-level only, see §5 |
| 25 | Signed-in user tries to view/edit another real user's private resource | **Cannot be tested today** — there is only one possible user (`'me'`) in this local architecture | Requires real Frappe (§5/§6) |
| 26 | Unauthenticated `curl`/direct API call to a private endpoint | Should return 401 | Requires real Frappe — no live API exists yet |
| 27 | Authenticated call to a private endpoint for a resource owned by someone else | Should return 403 | Requires real Frappe |
| 28 | Repeated rapid report/review submissions from one account | Should be rate-limited server-side | Requires real Frappe (§9) |
| 29 | Admin dashboard access without Frappe role check | Currently open (documented demo-only gap, §11) | Requires real Frappe |
| 30 | Guest navigates the jobs vertical rail on `/jobs` and taps a job's heart | Auth prompt, no save | `jobs/index.tsx`'s `JobRail`'s `onSave`, fixed this pass |
| 31 | Guest navigates `/jobs/results` and taps a job's heart | Auth prompt, no save | `jobs/results.tsx`'s `JobRow` `onSave`, fixed this pass |

## 13. Regression suite (this pass)

| Check | Result |
|---|---|
| `npx tsc --noEmit -p tsconfig.json` (mobile) | Clean, 0 errors |
| `npx tsc -b` (admin) | Clean, 0 errors |
| `npx vite build` (admin) | Succeeds (pre-existing >500kB chunk-size warning, unrelated to this change) |
| `npx expo export --platform ios` | Succeeds, 1793 modules bundled, run twice (before and after the §10 fixes) with identical module count |
| Repo-wide grep for scattered `if (!user)`/`if (!isAuthenticated)` | None found — all gating goes through `useRequireAuth`/`useAuthGuard` |
| Repo-wide sweep of every personal-data mutation call site | All confirmed gated (§10) |
| Taxonomy data/APIs (`mock/taxonomy/*`, `souq_masr.api.v1.taxonomy.*`) | Untouched by this pass — no file under `mock/taxonomy/` was edited |

## 14. Summary / GO-NO-GO

- **Public/guest routes:** §2 — full marketplace/jobs/services browsing, search,
  detail views, onboarding, legal, and app-level settings stay open.
- **Protected routes:** §3 — 33 screens, each behind `useAuthGuard` with a message
  specific to what that screen does.
- **Protected actions:** §4 — favorite, save-job, chat, report, review, save-search
  all gated inline via `useRequireAuth` on otherwise-public screens.
- **Auth guards added:** `useRequireAuth()` (action-level) + `useAuthGuard()`/
  `<AuthGuard>` (screen-level), both funneling into one `showAuthPrompt()`.
- **Ownership checks added:** UI-level only (`isMe`/`'me'` sentinel) — §5 spells out
  explicitly that this is not enforcement and what must move server-side.
- **Backend/Frappe requirements documented:** §6 (401/403 contract), §7 (public/
  private endpoint classification), §9 (rate limiting) — none implemented, all
  correctly deferred to a real bench.
- **CV privacy rules:** §8 — never public by default, gated even for the owner.
- **Admin access rules:** §11 — unchanged known gap, re-confirmed not silently
  dropped.
- **Tests executed:** §12 (24 of 31 scenarios verified against actual code paths in
  this environment), §13 (full regression suite, all green).
- **Tests requiring real Frappe:** scenarios 25–29 in §12 — cross-user ownership,
  401/403 contract, rate limiting, admin role enforcement. None of these are
  possible to test honestly without a live bench, and none were faked.
- **Bugs found and fixed:** 6 real un-guarded call sites across 6 files (§10) — 4
  full-page gaps (`(tabs)/profile`, `favorites`, `analytics`, `paypending` — the last
  being an actual unguarded financial mutation, not just a display inconsistency),
  plus 2 files with un-guarded save-job/favorite toggles duplicated across list/rail
  views that weren't caught when the corresponding detail-screen action was
  originally guarded.
- **Remaining security limitations:** everything in this document is client-side
  only (see the honesty note at the top) — real security starts when Frappe exists
  and session-based 401/403 checks replace `onboarding.joinedAt`.
- **GO / NO-GO:** **GO** for the guest-vs-authenticated UX layer on the current
  local-only architecture — it correctly implements the product philosophy end to
  end, with no fake success paths and no scattered ad-hoc checks. **NO-GO** for
  treating any of this as real access control — that remains explicitly blocked on
  a live Frappe/ERPNext bench, exactly as already stated in
  `souq-masr-app/PHASE_1_READINESS_REPORT.md`.
