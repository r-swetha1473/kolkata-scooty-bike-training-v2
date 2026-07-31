# API Overview

Base URL (local): `http://localhost:3000/api`

Health (no `/api` prefix): `GET /health`

## Auth

| Method | Path | Notes |
|--------|------|--------|
| GET | `/auth/google` | Customer OAuth start |
| GET | `/auth/google/callback` | OAuth callback |
| POST | `/auth/admin/login` | Staff email/password |
| GET | `/auth/me` | Current profile (Bearer JWT) |

## Public / customer

| Area | Prefix | Examples |
|------|--------|----------|
| Courses | `/courses` | List, detail by slug |
| Branches | `/branches` | List, detail |
| Slots / availability | `/slots`, `/availability` | Bookable capacity |
| Bookings | `/bookings` | Create / list own |
| Payments | `/payments` | Customer payment views |
| Gallery / blogs / testimonials | `/gallery`, `/blogs`, `/testimonials` | CMS content |
| Schedule | `/schedule` | Public schedule helpers |
| Profiles | `/profiles` | Customer profile |

## Admin

Prefix: `/admin` — requires admin JWT + permission checks.

Notable groups:

- `/admin/dashboard`, `/admin/stats`, `/admin/scheduling-health`
- `/admin/bookings`, offline booking create
- `/admin/users`, `/admin/customers`
- `/admin/trainers`, `/admin/vehicles`, `/admin/slots`
- `/admin/settings`, CMS (gallery, blogs, testimonials, courses)
- `/admin/payments`, reports, audit logs

## Auth header

```
Authorization: Bearer <jwt>
```

## Errors

JSON body typically includes `error` / `message`. Validation failures return `400`; auth failures `401`/`403`.
