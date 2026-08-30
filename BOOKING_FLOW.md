# Booking Flow (Current State)

Documented from the live codebase after: permanent Course-step removal, `?course=` → `selectedCourse` / `course_id` preservation, OAuth return-URL handling, and early redirect for bare `/booking`.

**Wizard (UI):** Branch → Date → Time → Details → Payment → Done  
**Route:** single SPA route `/booking` (no nested step routes)  
**Primary component:** `src/app/pages/booking/booking.component.ts` (+ `.html`)

---

## 1. Entry Points

Every public link into customer booking. Admin `/admin/bookings` and offline booking are out of scope unless noted.

### 1.1 Course-scoped (intended happy path)

These resolve to `/booking?course=<slug>` (and optionally other query keys from CMS `cta_link`).

| Location | Link construction | Typical URL |
|----------|-------------------|-------------|
| Courses listing cards | `[routerLink]="c.ctaPath" [queryParams]="c.ctaQuery"` via `CmsContentService.mapCourse` | `/booking?course=basic-scooty` |
| Home featured course cards | Same CMS mapping | `/booking?course=<slug>` |
| Pricing page cards | Same CMS mapping | `/booking?course=<slug>` |
| Course detail (`/courses/:slug`) | Parses `cta_link` or defaults `/booking?course=${slug}`; hardens missing `course` query | `/booking?course=<slug>` |

**CTA hardening** (`cms-content.service.ts`, `course-detail.component.ts`): if path is `/booking` and `course` is missing from the query, inject `course=<slug>`.

Admin CMS may store `cta_link` as `/booking` or `/booking?course=…`; frontend mapping still forces `course` for booking paths.

### 1.2 Bare `/booking` (no course) — blocked on load

These generate **`/booking` with no `course` query**. Current `ngOnInit` immediately toasts and redirects to `/courses` (no wizard render, no branch/slot APIs).

| Location | URL |
|----------|-----|
| Navbar “Book Now” | `/booking` |
| Footer “Book Your Training” | `/booking` |
| Footer “Book training” | `/booking` |
| Home bottom CTA | `/booking` |
| Home hero primary CTA (settings default) | often `/booking` (`ctaPrimaryLink`) |
| Courses page bottom CTA | `/booking` |
| About / Contact CTAs | `/booking` |
| Trainers page / trainer modal | `/booking` |
| Blog detail | `/booking` |
| FAQ inline link | `/booking` |
| My Bookings empty states | `/booking` |
| Customer dashboard “Book” | `/booking` |
| My Payments “Book a session” | `/booking` |

### 1.3 Branch-scoped (no course)

| Location | URL |
|----------|-----|
| Home branch cards | `/booking?branch=<branch-slug>` |
| Branches listing | `/booking?branch=<branch-slug>` |
| Branch detail | `/booking?branch=<branch-slug>` |

**Current behavior:** no `course` → same early redirect to `/courses` as bare `/booking`. Branch query alone is **not** enough to enter the wizard.

### 1.4 Broken / unhandled resume entry

| Location | URL | Current booking behavior |
|----------|-----|---------------------------|
| My Payments “Upload receipt” | `/booking?resumePayment=<paymentId>` | No `course` → redirected to `/courses`. **`resumePayment` is not read** by `BookingComponent`. |

### 1.5 Combined query (supported if present)

`/booking?course=<slug>&branch=<branch-slug>`

- Resolves course → starts at Branch (or jumps to Date if branch slug matches).
- Used by OAuth return URL builder when both were known.

---

## 2. Full State Machine

Single component state: `step: 'branch' | 'date' | 'slot' | 'details' | 'payment' | 'done'`.

Progress sidebar: exactly those six steps (no Course).

### Shared load (after `?course=` gate)

Only runs when `course` query is present and non-empty.

| API | Purpose | Failure |
|-----|---------|---------|
| `GET /settings/booking-rules` (fallback: settings blob) | Window hours, min advance, same-day, visibility mode | Soft fallback defaults (168h / 5h) |
| `GET /courses?activeOnly=true` | Resolve slug → `selectedCourse` | Toast; if slug missing from list → `/courses` |
| `GET /branches?activeOnly=true` | Branch cards | Toast “Failed to load booking options” |
| Auth `userProfile$` | Prefill phone (non-`GOOGLE_` phones) | Ignored if missing |

---

### Step: Branch (`step === 'branch'`)

**Entry:** default after successful course resolve; also via sidebar `go('branch')`.

**`canNavigate('branch')`:** always `true` (once past load gate).

**Reads:** `branches[]`, optional `selectedCourse` (subtitle “For {name}”).

**Writes:** `selectBranch(b)` → `selectedBranch`, clears slot/slots/dayMeta, `step = 'date'`, starts month probe.

**Direct URL / back-forward without prior state:** There is no `/booking/branch` route. Refresh of `/booking?course=…` re-runs `ngOnInit` → Branch (or Date if `branch=` also present). In-memory branch/slot selection is lost on full reload.

**APIs at this step:** none beyond initial load. Selecting a branch triggers Date-step probing (below).

**Failure:** empty branches → empty-state UI; no crash.

---

### Step: Date (`step === 'date'`)

**`canNavigate('date')`:** `!!selectedBranch`.

**Reads:** calendar month, `dayMeta`, booking rules (`minDate`, same-day).

**Writes:** `selectedDate` on day click / tomorrow; then `loadSlots()`.

**APIs:**

| Call | When | Payload / params | Failure |
|------|------|------------------|---------|
| `GET /slots/date/:date?branch_id=…&bookable_only=false` | `probeMonthAvailability()` per in-month day (batched) | date + branch | Probe swallows per-day errors (day badge degrades) |
| Same `getSlotsByDate` | `loadSlots()` / calendar day select / “Continue to times” | date + branch | Toast “Failed to load slots”; stays on Date; clears slot lists |

**Back-forward:** Sidebar can return to Date if `selectedBranch` still set. Without branch, Date is locked in progress UI.

---

### Step: Time (`step === 'slot'`)

**`canNavigate('slot')`:** branch + date + (slots loaded **or** already on slot/details/payment/done).

**Reads:** `slots` / `rawSlots`, vehicle capacities, UI state (available / full / past / window).

**Writes:** `selectSlot(slot)` → `selectedSlot`, default `selectedVehicleId`, `step = 'details'` **if authenticated**.

**Auth gate:** if not logged in → `sessionStorage.oauth_return_url = bookingReturnUrl()` (includes `course` + `branch` when known) → Google OAuth. Does **not** advance step until user returns and picks again (or returns to Branch via reload).

**APIs:** none new (slots already fetched). Optional future: none currently for live re-check before select.

**Failure selecting unavailable chip:** `canSelectSlot` false → click ignored (disabled).

---

### Step: Details (`step === 'details'`)

**`canNavigate('details')`:** `!!selectedSlot`.

**Reads/writes:** phone, notes, vehicle select, coupon code / `couponResult`.

**APIs:**

| Call | Payload | Failure |
|------|---------|---------|
| Coupon validate (`CouponService.validate`) | code, amount from `selectedCourse.amount_inr`, optional branch_id, vehicle_id | Inline `couponError` + no toast success |
| **`POST /api/bookings`** via `confirmDetails` / `createBooking` | See §4 | Toast with API message; stay on Details |

**Guards before create (visible, not silent):**

1. Missing `selectedCourse` → `handleMissingCourseContext()` (toast + `/courses` or `/courses/:slug`)
2. Missing branch → toast → `step = 'branch'`
3. Missing slot → toast → `slot` or `date`
4. Phone not 10 digits → toast
5. No vehicle → toast

**Back-forward:** Can open Details from sidebar only if `selectedSlot` still in memory. Reload loses it → back to Branch after init.

---

### Step: Payment (`step === 'payment'`)

**`canNavigate('payment')`:** `!!paymentId` (set only after successful create).

**Reads:** `paymentId`, `referenceNumber`, `receiptFile`, `createdBooking.booking_reference`, fee label from course/coupon.

**Writes:** file + reference → `submitPayment()`.

**API:**

| Call | Payload | Failure |
|------|---------|---------|
| `POST /api/payments/:paymentId/receipt` (multipart) | `receipt` file, `reference_number` | Toast + inline `paymentError`; stay on Payment; progress reset |

**Success:** `step = 'done'`.

**Back-forward / sidebar:** Payment step locked until `paymentId` exists. Browser Back does **not** pop wizard history (steps are not URL segments)—user can still click sidebar Date/Branch if `canNavigate` allows and potentially create **another** booking (see §5).

---

### Step: Done (`step === 'done'`)

**`canNavigate('done')`:** `step === 'done'` only.

**UI:** success copy + link to My Bookings.

**APIs:** none.

---

## 3. Course Context Lifecycle

### 3.1 Where `selectedCourse` is set

| Event | Mechanism |
|-------|-----------|
| `ngOnInit` | Read `?course=<slug>` → `coursesApi.list(true)` → find by slug → assign `selectedCourse` |
| Manual Course UI | **Removed** — no `selectCourse()` |

### 3.2 Where it is read

| Consumer | Use |
|----------|-----|
| Branch header / sidebar summary | Display name + fee |
| `payableLabel` / coupon amount | Pricing UI |
| `applyCoupon` | Requires course or toast |
| `confirmDetails` → `createBooking` | **`course_id: selectedCourse.id`** (required for backend) |
| `bookingReturnUrl()` | Persist slug into OAuth return |

### 3.3 How it can be lost

| Scenario | What happens |
|----------|----------------|
| Full page reload | Re-read from `?course=` if still in URL; re-fetch courses list |
| OAuth mid-flow | Return URL includes `?course=` (and `branch` if set) → re-init restores course |
| Strip / lose query string | Bare `/booking` → immediate redirect `/courses` |
| Invalid / inactive slug | Toast → `/courses` after courses load |
| In-memory only state after create | Course still in memory for Done UI; not required for receipt upload |
| `selectedCourse` cleared mid-session without navigation | No code path clears it today except failed resolve / leaving page |
| Two tabs different courses | Separate component instances; last write to `oauth_return_url` in `sessionStorage` can race (see §5) |

### 3.4 Fallback / recovery paths (current)

| Trigger | When | Behavior |
|---------|------|----------|
| No `?course=` | First lines of `ngOnInit` | Toast “Please select a course…” → `/courses` (no APIs) |
| Bad / unknown slug | After courses list | Toast “We could not load that course…” → `/courses` |
| Missing course at confirm | `confirmDetails` / `handleMissingCourseContext` | Toast; navigate `/courses/:slug` if query still has course, else `/courses`; **never** POST without `course_id` |
| Missing course at coupon apply | `applyCoupon` | Toast; no validate call |
| Missing branch/slot at confirm | `confirmDetails` | Toast + jump to Branch / Time or Date |

---

## 4. Backend Contract

### 4.1 `POST /api/bookings` (customer create)

**Auth:** required (`authenticate`). Missing/invalid token → **401**.

**Express-validator (`validateBookingCreation`):**

| Field | Rule | Missing / invalid |
|-------|------|-------------------|
| `slot_id` | required UUID | **400** validation |
| `vehicle_id` | required UUID | **400** validation |
| `trainer_id` | optional UUID | **400** if present but invalid |
| `phone` | optional; if set must be 10 digits (post-normalize) | **400** validation |
| `notes` | optional string ≤ 1000 | **400** validation |
| `course_id` | **not** in express-validator | Handled in route body |

**Route handler hard checks / outcomes:**

| Field / condition | Missing / invalid | `errorCode` (typical) |
|-------------------|-------------------|------------------------|
| `slot_id` | **400** | `MISSING_SLOT_ID` |
| `course_id` | **400** | `MISSING_COURSE_ID` |
| Course inactive / not found | **400** | `INVALID_COURSE` |
| Slot not found | **404** | `SLOT_NOT_FOUND` |
| `branch_id` unresolved | **400** | `MISSING_BRANCH_ID` |
| Slot branch ≠ body branch | **400** | `BRANCH_SLOT_MISMATCH` |
| Inactive customer | **403** | `INACTIVE_BLOCKED` |
| Duplicate active booking same date | **400** | `ACTIVE_BOOKING_EXISTS` |
| Eligibility / capacity / advance / window | **400** | e.g. `VEHICLE_CAPACITY_FULL`, `BOOKING_ADVANCE_REQUIRED`, `BOOKING_NOT_OPEN_YET`, … |
| DB pool acquire failure | **503** | `DB_CONNECTION_TIMEOUT` |

On success: inserts booking with `course_id`, creates payment with amount from course (`amount_inr`) minus coupon if applied, returns booking + `payment`.

**Frontend payload** (`ApiService.createBooking`):

```text
slot_id, vehicle_id, branch_id, course_id, phone?, notes?, coupon_code?
```

### 4.2 Other endpoints in the flow

| Endpoint | Used for | Required inputs | Failure UX |
|----------|----------|-----------------|------------|
| `GET /settings/booking-rules` | Rules | none (public/settings) | Silent defaults |
| `GET /courses?activeOnly=true` | Resolve slug | none | Toast / redirect |
| `GET /branches?activeOnly=true` | Branch list | none | Toast |
| `GET /slots/date/:date?branch_id=&bookable_only=` | Calendar + time list | date, branch | Toast on loadSlots; probe soft-fails |
| Coupon validate API | Details coupon | code + amount (+ optional branch/vehicle) | Inline error |
| `POST /payments/:id/receipt` | Payment step | auth, multipart receipt, reference | Toast + inline error |

Availability helper `GET /api/availability?course_id=` exists but is **not** the primary public booking calendar path (slots-by-date is).

---

## 5. Known Gaps / Untested Paths

Severity key: **Breaks booking** / **Bad UX** / **Edge case**.

| # | Scenario | Current behavior | Severity |
|---|----------|------------------|----------|
| 1 | **Two tabs:** `/booking?course=A` and `/booking?course=B` | Separate Angular instances; `sessionStorage.oauth_return_url` is shared — last tab to trigger OAuth wins return URL | **Bad UX** (wrong course after login) |
| 2 | **Auth token expires** after login, before `confirmDetails` / receipt upload | Create/upload fail with **401**; toast from error message; no forced re-login UX on booking page | **Breaks booking** until user re-auths elsewhere |
| 3 | **Network failure** on courses/branches load | Toast; `loading` false; may show empty Branch with no course if redirect didn’t run | **Bad UX** |
| 4 | **Network failure** on `loadSlots` / probe | Toast on loadSlots; probe days may look empty/wrong badges | **Bad UX** |
| 5 | **Network failure** on create booking | Toast; remain on Details; can retry (may double-submit if slow double-click — button disabled only while `loading`) | **Bad UX** / low **Breaks** if double hold |
| 6 | **Network failure** on receipt upload | Toast + `paymentError`; booking already held (`pending_payment`) | **Bad UX** (recover via My Payments ideally) |
| 7 | **Browser Back after Hold Slot** | Wizard steps are not history entries; sidebar may allow earlier steps; user can **create a second booking** if they walk through again | **Breaks booking** (duplicate holds) / capacity |
| 8 | **Refresh on Payment** | `paymentId` lost from memory; `?course=` still required to re-enter; **cannot resume** same payment from booking wizard; My Payments `resumePayment` link is **unimplemented** on booking page | **Breaks booking** resume path |
| 9 | **Slot race:** another user books same vehicle capacity between select and confirm | Backend rejects with capacity/eligibility error; toast shown | Handled server-side; **Edge case** OK if message clear |
| 10 | **Coupon invalid between apply and confirm** | Server re-validates on create via `applyCouponForBooking`; failure should error the create | Mostly OK; FE may still show stale discount label until fail — **Bad UX** |
| 11 | **Branch-only links** (`?branch=` without course) | Redirect to `/courses` — preselected branch intent lost | **Bad UX** (product gap) |
| 12 | **Navbar / generic Book Now** | Always bounce to Courses — intentional for now | **Bad UX** until product decides default course UX |
| 13 | **Home hero CMS link `/booking`** | Same bounce | **Bad UX** if marketing expects direct book |
| 14 | **Tab duplicate / session restore** without query | Redirect to Courses | OK / **Edge case** |
| 15 | **`?course=` + inactive course** | Treated as unresolved slug → `/courses` | OK |
| 16 | **Payment step Back** | No Back button on Payment panel; sidebar earlier steps may still be reachable if state remains | **Bad UX** / duplicate risk (#7) |
| 17 | **OAuth return without completing Google** | User stays logged out; must pick slot again after return | **Edge case** |
| 18 | **`resumePayment` query** | Ignored; bare booking redirect steals the flow | **Breaks booking** for “upload receipt” CTA from My Payments |
| 19 | **No idempotency key** on create | Retry after ambiguous network error can double-book | **Breaks booking** (edge but real) |
| 20 | **Deep-link only `?course=` after payment held** | Starts fresh wizard; does not reopen Payment for existing hold | **Bad UX** |

---

## Quick reference diagram

```text
[Course / Pricing / Detail Book Now]
        │
        ▼
 /booking?course=<slug>  ──no/invalid slug──►  toast → /courses
        │
        ▼
  load rules + courses + branches
        │
        ▼
   Branch → Date → Time ──(auth?)──► Google OAuth → return ?course=&branch=
        │
        ▼
   Details → POST /bookings { course_id, branch_id, slot_id, vehicle_id, … }
        │
        ▼
   Payment → POST /payments/:id/receipt
        │
        ▼
      Done → My Bookings
```

---

## Source files (canonical)

| Area | Path |
|------|------|
| Wizard UI/logic | `src/app/pages/booking/booking.component.ts`, `.html` |
| CTA mapping | `src/app/services/cms-content.service.ts` |
| Course detail CTA | `src/app/pages/course-detail/course-detail.component.ts` |
| Create booking client | `src/app/services/api.service.ts` → `createBooking` |
| Create booking API | `backend/routes/bookings.js` `POST /` |
| Validators | `backend/validators/booking.validator.js` |
| Receipt upload | `src/app/services/payment.service.ts` |
| Toast UX | `src/app/services/toast.service.ts` |

*Generated from codebase inspection; update this file when booking entry rules or API contracts change.*
