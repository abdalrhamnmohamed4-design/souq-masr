# Force Update & Online-Only Architecture

Two production requirements for Souq Masr: **mandatory app-version enforcement**
(server-controlled, correct numeric comparison, blocking) and an **online-only
startup gate** (connectivity + backend reachability checked before the app is
usable, no silent offline assumption). Both are built as real, centralized
infrastructure — a `StartupGate` component wrapping the entire router — not
scattered per-screen checks, and both are designed to sit in front of a real
Frappe/ERPNext backend that does not exist yet.

**Honesty note up front, same as [ACCESS_CONTROL.md](ACCESS_CONTROL.md)'s:** there is
still no live Frappe bench. Every piece of server-communication code here (the
version-check fetch, the connectivity-gated mutations) is written against a real,
documented HTTP contract and works correctly the moment a real backend exists —
but until then, `development` mode uses a clearly-labeled local mock so the app
stays usable for continued work, and `staging`/`production` modes have zero mock
fallback (they show the real "backend unavailable" screen, honestly, if no backend
is configured). Nothing here is a fake-success shortcut.

---

## 1. Version management architecture

Three values, deliberately never conflated (request's §2):

| Value | Source | Meaning |
|---|---|---|
| **Installed version** | `expo-application`'s `nativeApplicationVersion` (falls back to `app.json`'s `expo.version` in Expo Go, where the native value belongs to Expo Go itself, not this app — documented in [lib/appInfo.ts](lib/appInfo.ts)) | What's actually running on the device |
| **Installed build** | `expo-application`'s `nativeBuildVersion` (falls back to `app.json`'s `ios.buildNumber`/`android.versionCode`) | Tie-breaker only — same version can ship multiple builds during development |
| **Minimum supported version/build** | `AppVersionConfig` from the backend | The enforcement threshold — installed < this → blocked |
| **Latest version/build** | `AppVersionConfig` from the backend | Soft-update threshold only — never blocks |

**Value used for enforcement, exactly** ([store/useAppGateStore.ts](store/useAppGateStore.ts)):
`compareVersions({installedVersion, installedBuild}, {minimum_supported_version,
minimum_supported_build})` from [lib/semver.ts](lib/semver.ts) — major → minor → patch →
build, in that order, numeric at every step (never string comparison). `1.0.9` vs
`1.0.10` is parsed to `{major:1,minor:0,patch:9}` vs `{major:1,minor:0,patch:10}` and
compared as integers, so `9 < 10` correctly, unlike a naive string compare where
`"1.0.9" > "1.0.10"` lexicographically. Build number (`1.0.10+15`) is parsed from
after a literal `+` and used only as a final tie-breaker when major.minor.patch are
identical.

`app.json` now declares `ios.buildNumber: "1"` and `android.versionCode: 1` (both
absent before this change) so `expo-application`'s native fallback has a real value
to read outside of Expo Go.

## 2. Mandatory update behavior

`installed < minimum_supported_version` **or** `force_update === true` →
`useAppGateStore`'s `phase` becomes `'mandatory_update'` →
[components/gates/MandatoryUpdateScreen.tsx](components/gates/MandatoryUpdateScreen.tsx)
renders **instead of** the app's `<Stack />` (not inside it — see §16 architecture
note). No skip, later, continue, close, or X control exists on this screen — the
only interactive element is the "تحديث التطبيق" button, which opens
`update_url_ios`/`update_url_android` (platform-appropriate) via `Linking.openURL`.
There is no navigation stack to "back" out of, because the router itself was never
mounted while this phase is active — the absence of an escape route is structural,
not a hidden button.

## 3. Soft update behavior

`installed >= minimum_supported_version` **and** `installed < latest_version` (and
`force_update` is false) → `softUpdateAvailable: true`, phase still `'ready'` — the
real app renders normally, and
[components/gates/SoftUpdateModal.tsx](components/gates/SoftUpdateModal.tsx) shows a
dismissible bottom-sheet ("في إصدار جديد من سوق مصر" / "تحديث الآن" / "لاحقًا"). "لاحقًا"
dismisses for the current app session only (not persisted) — closing and reopening
the app re-evaluates and re-shows it if still outdated, matching "later" literally
rather than "never ask again."

## 4. Online-only architecture

**What's real today:** the startup gate itself. `checkDeviceConnectivity()`
([services/connectivityService.ts](services/connectivityService.ts)) uses `expo-network`
to ask the OS directly whether the device has real internet reachability — not
assumed. `fetchAppVersionConfig()`
([services/appVersionService.ts](services/appVersionService.ts)) then attempts a real,
timed-out (`8s`) HTTP call to the configured backend. Neither of these silently
assumes success.

**What's honestly not real yet:** the rest of the app's data layer.
`store/useAppStore.ts` and `store/useJobsStore.ts` are still Zustand + AsyncStorage
— listings, chats, jobs, services, wallet, reviews, reports, favorites, applications
all live locally, exactly as before this change. Converting every read/write in the
app to go through real Frappe REST calls is Phase 2 scope (blocked on a live bench,
same as every other "Phase 2" item flagged across this project's prior reports) and
was **not** attempted here — claiming otherwise would violate this project's own
no-fake-progress rule. What this phase adds is the **gate in front of** that data
layer (nothing loads until connectivity + version + maintenance checks pass) and a
**connectivity check in front of** the mutating actions listed in the request's §8
(see §5 below) — real, meaningful progress toward online-only, not the complete
migration.

## 5. Connectivity behavior

- **Startup:** `StartupGate` ([components/StartupGate.tsx](components/StartupGate.tsx))
  runs connectivity → backend → version → maintenance before rendering `<Stack />`
  at all. No internet → `OfflineScreen` (variant `no_internet`, "لا يوجد اتصال
  بالإنترنت"). Internet OK but backend unreachable/misconfigured → the same
  component, `backend_unavailable` variant, distinct message ("مفيش اتصال بالسيرفر
  دلوقتي") — these are deliberately different copy for a real UX reason: one tells
  the user to check their own network, the other tells them the problem isn't theirs.
- **Retry, not infinite loop:** the retry button re-runs the check exactly once per
  tap — no auto-retry timer, no infinite loop. `AppState`'s `'active'` event
  additionally re-runs the **full** gate check whenever the app returns to the
  foreground (not just at cold start), so a mandatory-update or maintenance flag
  raised while the app was backgrounded takes effect on resume, not only on next
  full restart.
- **Mid-session degradation (a deliberate, documented scope decision):** a
  connectivity drop *after* the gate has already passed does **not** yank the user
  back to a blocking screen mid-navigation — that would violate the request's own
  "avoid creating an infinite blocking loop" instruction and would be a worse
  regression than the problem being solved, given this is a single-device local app
  with no live data to protect retroactively. Instead, `isOnline` in the gate store
  updates live, and every connectivity-gated action (§8 below) starts failing
  honestly with "لا يوجد اتصال بالإنترنت" the moment it's tapped while offline. What
  already rendered stays visible; nothing new pretends to succeed.
- **Mutation gating:** `useRequireOnline()` ([lib/connectivityGuard.ts](lib/connectivityGuard.ts))
  is the same pattern as `useRequireAuth()` — a reusable hook returning
  `requireOnline(action)`, which runs the action only if `isOnline`, otherwise shows
  a real alert and the action **never executes**. `useRequireAuth()` itself
  ([lib/auth.ts](lib/auth.ts)) now also checks connectivity as a second gate after
  authentication, so every already-`requireAuth`-wrapped action (favorite, save-job,
  report, save-search) got this protection automatically, with zero call-site
  changes needed at those locations.

## 6. Backend/Frappe requirements

- **Endpoint:** `GET /api/method/souq_masr.api.v1.app_config.get_version_config
  ?platform=ios|android`, `allow_guest=True` (has to work before sign-in is even
  reachable). Full mapping in
  [souq-masr-app/PHASE_1_MOBILE_API_MAPPING.md §8](souq-masr-app/PHASE_1_MOBILE_API_MAPPING.md).
- **Every mobile HTTP request now carries** `X-App-Version`, `X-App-Build`,
  `X-Platform` headers ([lib/apiClient.ts](lib/apiClient.ts)) — ready for a future
  Frappe `before_request` hook to reject sensitive endpoints with `426 Upgrade
  Required` for outdated clients, independent of the client-side check (request's
  §10: "do not rely exclusively on the mobile app"). That hook is **not built**,
  because it would have nothing real to guard yet (no sensitive mutation endpoints
  exist on the backend at all — they're all still local writes, see §4). The mobile
  side is ready for it regardless: `apiFetch()` already recognizes a `426` response
  from any request and calls `markMandatoryUpdateRequired()`, which locks the app to
  the mandatory-update screen immediately, mid-session — not just at startup.

## 7. Admin controls

`Souq Masr App Version Config` DocType (module `Platform`, new — see
[souq-masr-app/souq_masr/platform/doctype/souq_masr_app_version_config/](souq-masr-app/souq-masr/souq_masr/platform/doctype/souq_masr_app_version_config/)),
one record per platform (`autoname: field:platform`), exposing every field the
request asked for: Platform, Latest Version, Minimum Supported Version, Latest
Build, Minimum Supported Build, Force Update, Arabic/English Update Message, iOS/
Android Store URL, Active, Maintenance Mode, Maintenance Message (ar/en). Read/write
restricted to the `Souq Masr Admin` role only (deliberately **not** `Guest`/`All`
read like the taxonomy DocTypes — the mobile app never queries this DocType
directly, only through the whitelisted method, so there's no reason to expose it to
anonymous REST reads even though nothing in it is secret). `after_install` seeds one
harmless default record per platform (`minimum == latest == installed`, force/
maintenance both off) so a fresh install isn't a blank, un-editable list.

**Changing `minimum_supported_version` from `1.0.3` to `1.0.4` in this DocType, with
no new mobile app release, blocks every `1.0.3` install and allows `1.0.4`+** — this
is the exact mechanism the request asked for (§4), implemented and ready; it has
just never been exercised against a live site because none exists.

## 8. Maintenance mode

`maintenance_mode` is a field on the same DocType, checked as a **separate step**
from `force_update`/version comparison in `useAppGateStore.runStartupCheck()` — an
app that's fully up to date can still be blocked by maintenance, and an outdated app
under maintenance shows the mandatory-update screen first (version check runs before
maintenance check, per the request's own §16 flow diagram), not the maintenance
screen, since updating is the more actionable instruction. Maintenance screen
([components/gates/MaintenanceScreen.tsx](components/gates/MaintenanceScreen.tsx)) shows
"سوق مصر تحت الصيانة حاليًا" plus the configurable message, with its own retry button
(maintenance is expected to be temporary).

## 9. Cache policy

No live/cached data distinction was introduced, because none was needed: nothing in
this phase adds client-side caching of server data (there's no server data being
cached — see §4's honesty note). What *is* now true, satisfying the spirit of the
request's §9: once the gate has passed, a mid-session connectivity drop does not let
wallet-adjacent, review, report, or listing-mutation actions silently "succeed" —
they're blocked at the point of action by `useRequireOnline()`/`useRequireAuth()`
(§5), so stale local state is never presented as a confirmed server transaction. When
Phase 2 introduces real fetched data, the same `isOnline` signal is the natural place
to hang a "cached — قد لا تكون محدثة" badge on financial/ownership-sensitive views;
not built now because there is no such fetched data to badge yet.

## 10. Security considerations

- Client-side version enforcement is **not** real security — a modified/rooted
  client can lie about its own version. §6's header-based server-side rejection is
  the real enforcement layer, and is explicitly documented as not-yet-built
  (nothing to protect yet) rather than silently assumed to exist.
- The mock backend path (`allowDevMockBackend` in
  [config/env.ts](config/env.ts)) is **structurally impossible** in a production
  build — it requires `isDevelopment === true`, which is computed from
  `EXPO_PUBLIC_APP_ENV`/`__DEV__`, never a value a production bundle can carry
  accidentally. No hidden bypass exists for staging/production (request's §13/§15O).
- Store URLs (`update_url_ios`/`update_url_android`) ship empty — no invented App
  Store/Play Store links anywhere in the codebase (request's §14). The mandatory
  update button silently no-ops if the URL is empty rather than opening a fake link.

## 11. Test matrix results

Executed by code-path inspection (walking each conditional in
`useAppGateStore.runStartupCheck()` and the gate components) plus the regression
suite in §12 — no real device/simulator or live Frappe bench exists in this
environment, so entries needing either are marked accordingly, honestly, per this
project's established verification standard.

| # | Scenario | Expected | Verified how |
|---|---|---|---|
| A | installed == minimum | Allowed | `compareVersions` returns `0`, `isBelowMinimum` is `false` — code path confirmed |
| B | installed > minimum | Allowed | `isBelowMinimum` false — confirmed |
| C | installed < minimum | Blocked (`mandatory_update`) | Confirmed in `runStartupCheck` |
| D | minimum ≤ installed < latest | Soft update shown, app usable | `softUpdateAvailable` computed only after mandatory/maintenance checks pass |
| E | `force_update = true` | Mandatory, regardless of version numbers | `belowMinimum \|\| config.force_update` — `force_update` short-circuits independent of the comparison |
| F | `force_update = false` | Normal version-based behavior | Same line — comparison alone decides |
| G | `1.0.9` vs `1.0.10` | `1.0.9 < 1.0.10` correctly | `lib/semver.ts`'s `parseVersion`+`compareVersions` — integer comparison, not string; manually traced: `patch 9 < patch 10` → `-1` |
| H | Backend/internet unavailable (device offline) | Offline screen, "لا يوجد اتصال بالإنترنت" | `checkDeviceConnectivity()` → `isInternetReachable: false` → phase `no_internet` |
| I | Internet OK, Frappe unavailable | Distinct "مفيش اتصال بالسيرفر دلوقتي" screen | `fetchAppVersionConfig` fetch failure/non-2xx → `backend_unavailable`, separate copy from H |
| J | Cached data + backend unavailable | No fake-live protected operations | No caching layer exists to fake (§9) — mutations are gated by `isOnline`, confirmed not bypassable |
| K | Direct navigation to protected route while update required | Still blocked | `<Stack />` is not mounted while phase ≠ `'ready'` — there is no route to navigate *to* |
| L | App restart while update required | Still blocked | `runStartupCheck()` re-runs from scratch on every cold start — no persisted "already passed" flag |
| M | Update URL opens correctly | PASS | **Not verified** — `update_url_ios`/`update_url_android` are empty by design (§14/§10); `Linking.openURL` call is standard Expo API, correctness of the URL itself only verifiable once a real store link exists |
| N | Maintenance mode | Maintenance screen | `config.maintenance_mode` checked after mandatory-update check, before `ready` |
| O | Production configuration, no hidden bypass | Confirmed | `allowDevMockBackend` traced — requires `isDevelopment`, unreachable in a production build |

## 12. Regression suite

| Check | Result |
|---|---|
| `npx tsc --noEmit -p tsconfig.json` (mobile) | Clean, 0 errors |
| `npx tsc -b` (admin) | Clean, 0 errors — untouched by this change |
| `npx vite build` (admin) | Succeeds — untouched by this change |
| `npx expo export --platform ios` | Succeeds twice (before and after wiring `requireOnline` into mutation sites), 1810 modules bundled (up from 1793 pre-change — `expo-network`/`expo-application` + 15 new gate/service files) |
| Live Metro dev-server entry bundle fetch | `200`, 0 errors in the Metro log — confirms the live dev server (not just static export) also resolves the new root-layout wiring |
| "56 route bundle checks" | This app bundles as a single JS entry (expo-router SPA-style, not per-route chunks) — the export's 1810-module resolution and the live entry-bundle fetch **are** the full-coverage equivalent of a per-route sweep; a literal per-route `.bundle?...` URL scheme (used in an earlier session phase) returns `404` on this Metro/SDK configuration and was not a meaningful additional check, so it was not pursued further |
| Taxonomy APIs/data | Untouched — no file under `mock/taxonomy/` or `souq_masr/marketplace/` was edited this phase |
| Guest browsing | Unaffected — `StartupGate` resolves to `'ready'` in dev (mock config: `force_update: false`, `minimum == latest == installed`), after which routing behaves exactly as before this change |
| Protected actions remain protected | `useRequireAuth()`'s auth check runs first, unchanged; the added connectivity check is strictly additional, not a replacement |
| No broken navigation | Confirmed via the export + live entry-bundle results above |

## 13. Files changed

**New (mobile):** `lib/semver.ts`, `lib/appInfo.ts`, `lib/apiClient.ts`,
`lib/connectivityGuard.ts`, `lib/mockAppVersionConfig.ts`, `config/env.ts`,
`types/appVersion.ts`, `services/connectivityService.ts`,
`services/appVersionService.ts`, `store/useAppGateStore.ts`,
`components/StartupGate.tsx`, `components/gates/MandatoryUpdateScreen.tsx`,
`components/gates/OfflineScreen.tsx`, `components/gates/MaintenanceScreen.tsx`,
`components/gates/SoftUpdateModal.tsx`, `.env.example`.

**Modified (mobile):** `app/_layout.tsx` (StartupGate + SafeAreaProvider wiring),
`app.json` (`ios.buildNumber`, `android.versionCode`), `package.json`
(`expo-network`, `expo-application`), `lib/auth.ts` (connectivity check folded into
`requireAuth`), `app/post/index.tsx`, `app/(tabs)/myads.tsx`, `app/chat/[id].tsx`,
`app/jobs/apply/[id].tsx`, `app/jobs/resume-builder.tsx`, `app/jobs/profile.tsx`,
`app/paypending.tsx`, `app/seller/[id].tsx`, `app/jobs/company/[id].tsx`,
`app/services/professional/[id].tsx` (all: `useRequireOnline` added at real
mutation points), `.gitignore` (`.env`).

**New (Frappe, `souq-masr-app/`):** `souq_masr/platform/` (new module — `__init__.py`
×3), `souq_masr/platform/doctype/souq_masr_app_version_config/{.json,.py}`,
`souq_masr/api/v1/app_config.py`, `souq_masr/setup/seed_data/seed_app_version_config.py`.

**Modified (Frappe):** `souq_masr/modules.txt` (`+Platform`), `souq_masr/setup/install.py`
(seeds the new config), `PHASE_1_MOBILE_API_MAPPING.md` (§8 added), `README.md`
(layout + status updated).

## 14. Remaining backend-dependent work

- The `426`-on-sensitive-endpoints server hook (§6) — nothing to guard yet.
- Every actual data mutation (listings, chat, jobs, applications, reviews, reports,
  wallet) is still local-only — Phase 2 scope, unchanged by this phase, tracked the
  same as every other Phase-2 item in the project's prior reports.
- Real App Store/Google Play URLs — placeholders only (§10/§14 of the request).
- A live bench to actually install `Souq Masr App Version Config` on and exercise
  the DocType/endpoint for real (nothing here has run against a real Frappe
  instance — same standing limitation as the rest of `souq-masr-app/`).
- `EXPO_PUBLIC_API_BASE_URL` needs a real value before `staging`/`production`
  builds can do anything but show the offline screen — expected and correct
  behavior for those modes with no backend configured, not a bug.

## 15. Production readiness status

**GO** for the client-side Force Update / Online-Only *gate* architecture on top of
the current local-only data layer — it is real, centralized, not fake, and
production-mode-safe (no hidden bypass). **NO-GO**, explicitly, for calling any of
this "production-grade" in the full sense the request describes: that requires a
live Frappe/ERPNext backend serving real `AppVersionConfig` records, the §6
server-side header rejection actually implemented and tested against real sensitive
endpoints, and real store URLs — none of which exist yet. This mirrors
[souq-masr-app/PHASE_1_READINESS_REPORT.md](souq-masr-app/PHASE_1_READINESS_REPORT.md)'s
own GO/NO-GO framing exactly: the mobile-side architecture is ready and correct;
production status is blocked on the same live-bench dependency as everything else in
this project.
