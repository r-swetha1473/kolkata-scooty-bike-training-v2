# Project Consistency Audit Report

Date: 2026-07-28  
Scope: Full backend + frontend audit for field-name, API, mapping, image, and cache inconsistencies that can make the same entity look different across pages.

---

## Executive summary

The highest-impact class of bugs was **the same entity exposed through multiple field names / mappers** (especially courses: `image_url` vs `thumbnail_url`, and `Course` vs `CourseDisplay`). Secondary issues included upload URL preference order, missing backend update fields, vehicle SELECT parity, public trainer DTO drift, unused branch images, and service-worker caching of `/media`.

This pass **fixed the high-impact display inconsistencies**. Larger architectural debt (booking DTO unification, slots vs availability SSOT, full home CMS wiring) remains documented below.

---

## Issue table (found → fixed / remaining)

| Issue | Location | Impact | Root Cause | Fix Applied |
|---|---|---|---|---|
| Course list/pricing used stale `thumbnail_url`; detail used `image_url` | `cms-content.service.ts`, home/courses/pricing templates, `courses.js` | Different images for same course | Admin updates only `image_url`; cards preferred thumb | Prefer `image_url`; sync variants on update/save; DB sync script |
| CourseDisplay renamed API fields (`price`, `includes`, `image`) | `cms-content.service.ts` + public pages | Detail/booking vs list used different names | Display DTO remapping | Canonical fields + aliases (`image_url`, `price_label`, `features`, …) |
| Course price fallback only on list mapper | `mapCourse` vs course-detail | Price on list, blank on detail | No shared `displayCoursePrice` | Shared util; detail uses it |
| Pricing ignored admin CTA | `pricing.component.ts` | Different booking CTA than home/courses | Hardcoded `/booking?course=` | Uses `ctaPath` / `ctaQuery` / `cta_text` |
| Multiple `resolveImageUrl` implementations | blog/gallery/branch/testimonial/cms/course-detail | Same URL behaves differently | Duplicated helpers | Shared `utils/media-url.ts` |
| Upload preference order differed | Admin settings vs courses vs blogs | Different persisted URL aliases | `secure_url` first in settings only | `pickUploadedImageUrl`: `image_url` → `secure_url` → `url` |
| Testimonials PUT ignored `course_name` / `training_date` | `backend/routes/testimonials.js` | Admin edit didn’t stick; home showed old course label | UPDATE omitted columns | UPDATE persists both fields |
| Vehicles GET by id omitted `branch_id` | `backend/routes/vehicles.js` | Detail missing branch vs list | Different SELECT | Aligned SELECT; create RETURNING includes `image_url` |
| Public trainers stringified IDs; no `branch_id`; no `image_url` | `backend/routes/trainers.js` | Public ≠ admin trainer shape | Separate formatter | UUID + `branch_id` + `profile.image_url` |
| Trainer public page invented skills / 95% success | `trainers.component.ts` | Fake stats vs API | Display reconstruction | Skills from API only; removed fake success % |
| Branch `image_url` unused on public pages | home/branches/branch-detail | Admin image invisible publicly | Not bound | Bind `image_url` via shared resolver |
| Working days shown as raw numbers | branch-detail | Confusing labels | No day-name map | `formatWorkingDays` → Mon/Tue… |
| Blog/testimonial image field names diverge | blogs `featured_image_url`, testimonials `photo_url` | FE must special-case | Schema naming | API adds `image_url` alias |
| SW could cache same-origin `/media` | `src/sw.js` | Stale images after replace | Broad cache put | Exclude `/api`, `/media`, `/uploads`; bump to `v7` |
| Hero ignored `image_url` / secondary CTA from CMS | `getHero` | Partial CMS apply | Forced defaults | Accept `image`/`image_url`; honor secondary CTA |
| Home testimonials used renamed fields | `HomeTestimonial` | Drift vs admin model | Manual remap | Prefer `customer_name` / `photo_url` / `review` |
| Dual booking response shapes | bookings create / my-bookings / admin | Customer vs admin diverge | No shared DTO | **Debt** — not fully unified this pass |
| `/slots` vs `/availability` capacity shapes | slots + availability routes | Booking vs admin capacity differ | Two engines | **Debt** — document SSOT |
| Home marketing blocks hardcoded | `home-content.ts` / home | CMS settings unused | Split CMS | **Debt** — wire or delete |
| About page ignores `about_text` | about + settings | Admin text unused | Hardcoded about | **Debt** |
| Coupons `activeOnly=false` unauthenticated | `coupons.js` | Possible leakage | Missing auth gate | **Debt** |
| Course dual price storage | `price_label` + `amount_inr` | Label can drift from amount | Two columns | Mitigated with shared display helper; full SSOT still debt |

---

## Variable mismatches (canonical convention going forward)

| Concept | Canonical field | Legacy / aliases (keep temporarily) |
|---|---|---|
| Primary image | `image_url` | `secure_url` (upload only), `photo_url` (testimonials DB), `featured_image_url` (blogs DB), `avatar_url` (profiles), hero `image` |
| Course price display | `price_label` (UI) + `amount_inr` (billing) | CourseDisplay `price` |
| Course bullets | `features` | CourseDisplay `includes` |
| Featured flag | `is_featured` | `featured` |
| Active flag | `is_active` | blogs use `status` (`published`/`draft`) |
| Branch reference | `branch_id` | — |
| Person name (testimonial) | `customer_name` | home aliases `name` |
| Review body | `review` | home aliases `text` |

---

## Duplicate APIs / models

| Area | Status |
|---|---|
| Courses list vs slug | Same `SELECT *` shape — OK |
| No dedicated `/pricing` or `/homepage` course API | Home/pricing use `GET /courses` via `CmsContentService` — OK |
| `Course` vs `CourseDisplay` | Still exists; now mirrors API names |
| Public vs admin trainer formatters | Partially aligned (`branch_id`, `image_url`) |
| Booking create / my-bookings / admin detail | Still divergent — remaining debt |
| Slots vs availability | Still dual — remaining debt |

---

## Hardcoded / fallback content

| Item | Action |
|---|---|
| Course/gallery/blog dynamic images inventing `/media` | Already removed earlier; not reintroduced |
| Trainer invented skills + 95% success | Removed / reduced |
| Home stats / why-choose / how-it-works | Still hardcoded in `home-content.ts` (debt) |
| About page copy | Still hardcoded (debt) |
| FAQ fallbacks in `cms-content.service` | Still present if settings empty (acceptable fallback) |
| Settings seed contact defaults | Still present until API loads (debt to empty-seed) |

---

## Caching

| Layer | Finding | Fix |
|---|---|---|
| RxJS `shareReplay` on entity lists | Not used | N/A |
| Settings `BehaviorSubject` | Seeds defaults until load | Debt |
| Service worker | Cached non-shell same-origin GETs | Excluded `/api`, `/media`, `/uploads` |
| Availability / booking-rules TTL (backend) | Up to ~60s stale capacity/rules | Documented; intentional |

---

## Files modified (this consistency pass)

**Backend:** `routes/courses.js` (prior), `routes/testimonials.js`, `routes/vehicles.js`, `routes/trainers.js`, `routes/blogs.js`, `utils/trainerFormat.js`, `scripts/sync_course_image_variants.js`

**Frontend:** `utils/media-url.ts` (new), `cms-content.service.ts`, `blog/gallery/branch/testimonial.service.ts`, `course.service.ts`, home/courses/pricing/course-detail/trainers/branches/branch-detail, admin courses/blogs/gallery/testimonials/branches/settings, `sw.js`

---

## Remaining technical debt (priority)

1. Unify booking DTOs (create / my-bookings / admin list / detail / offline).
2. Declare booking SSOT: prefer `/availability` for customers; keep `/slots` admin-oriented; normalize capacity fields.
3. Wire or delete unused homepage CMS settings (`homepage_trust_badges`, features, how-it-works, statistics).
4. Drive About from `about_text` or remove the settings key.
5. Auth-gate coupons `activeOnly=false`.
6. Collapse course image columns to a single `image_url` long-term (variants optional).
7. Empty settings defaults (no fake phone/email flash).
8. Blog list payload: omit full `content` for performance.

---

## Verification checklist (CMS images after Admin update)

| Page | Expected source | Status |
|---|---|---|
| Homepage courses | `image_url` | Fixed |
| Course listing | `image_url` | Fixed |
| Pricing | `image_url` | Fixed |
| Course details | `image_url` | Fixed |
| Admin courses table | `image_url` | Fixed |
| Homepage testimonials | `photo_url` (+ `image_url` alias) | Fixed |
| Branches public | `image_url` | Fixed |
| Gallery / blogs | `image_url` / `featured_image_url` | Consistent |
| Trainers | `profile.avatar_url` / `image_url` | Improved |

Hard-refresh the browser (or unregister old SW) once so `v7` service worker activates.
