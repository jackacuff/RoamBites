# RoamBites — Food Truck Tracker

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.

### `artifacts/roambites-mobile` (`@workspace/roambites-mobile`)

Expo React Native app — RoamBites mobile frontend for iOS/Android.

- **Port**: `$PORT` (19571 in dev), Expo Go QR code served from the same server
- **Auth**: JWT in AsyncStorage (`@roambites_token`). `setAuthTokenGetter` called in `app/_layout.tsx` via `setBaseUrl` + token getter pattern from `@workspace/api-client-react`.
- **Routing**: Expo Router file-based. Root layout → `(tabs)` group (5 tabs) + modal screens.
- **Tabs**: Home, Map, Browse, Events, Account
- **Screens**:
  - `app/(tabs)/index.tsx` — Home: featured section, open-now horizontal scroll, upcoming events list
  - `app/(tabs)/map.tsx` — Live map (native: react-native-maps; web: truck list fallback via `MapViewWrapper`)
  - `app/(tabs)/browse.tsx` — All trucks with search + city/open-now filters
  - `app/(tabs)/events.tsx` — Upcoming / All events toggle
  - `app/(tabs)/account.tsx` — Auth-aware profile or sign-in CTA
  - `app/trucks/[id].tsx` — Truck detail: menu, reviews, favorites, schedule
  - `app/events/[id].tsx` — Event detail: lineup, date/time/venue
  - `app/auth/login.tsx`, `app/auth/signup.tsx` — JWT auth screens
  - `app/vendor/index.tsx` — Vendor dashboard
  - `app/organizer/index.tsx` — Organizer dashboard
- **Key components**:
  - `components/MapViewWrapper.native.tsx` / `.web.tsx` — Platform split to avoid react-native-maps bundling on web
  - `components/TruckCard.tsx`, `components/EventCard.tsx`, `components/SearchBar.tsx`, `components/StatusBadge.tsx`
  - `context/AuthContext.tsx` — AuthProvider with login/logout + token persistence
  - `hooks/useColors.ts` — Light/dark theme-aware color accessor
  - `constants/colors.ts` — Brand palette (primary #F47825, accent #2EB860, secondary #FFB300)
- **Maps**: `react-native-maps@1.18.0` (pinned, not in app.json plugins). Does NOT support web — platform-split wrapper used.
- **Location**: `expo-location` dynamically imported on native; `navigator.geolocation` used on web.
- **Fonts**: `@expo-google-fonts/inter` (400/500/600/700)

### `artifacts/food-truck-tracker` (`@workspace/food-truck-tracker`)

React + Vite frontend — Central Oklahoma Food Truck Tracker.

- **Auth**: JWT stored in localStorage as `"token"`. `setAuthTokenGetter` called in `main.tsx` to auto-attach `Authorization: Bearer` header.
- **Routing**: Wouter, mounted at `BASE_URL`. All routes in `src/App.tsx`.
- **Pages**:
  - `/` Home, `/trucks` list, `/trucks/:id` detail
  - `/events` list, `/events/:id` detail (with embedded Leaflet map)
  - `/login`, `/signup`
  - `/vendor` dashboard, `/vendor/truck`, `/vendor/menu`, `/vendor/schedule`, `/vendor/events`, `/vendor/branding`, `/vendor/specials`, `/vendor/event-spots`, `/vendor/inbox`, `/vendor/marketing`
  - `/organizer` dashboard, `/organizer/events/new`, `/organizer/events/:id/manage`, `/organizer/events/:id/edit`
  - `/admin` admin panel (tabs: Stats, Users, Trucks, Events, Plans, Subscriptions)
  - `/superadmin` superadmin console (user list + impersonation)
- **Maps**: `react-leaflet` + OpenStreetMap tiles. `MapView` component shows truck locations. Leaflet marker icon fix applied.
- **Demo accounts** (all `password123`): `admin@okfoodtrucks.com`, `vendor1@okfoodtrucks.com`–`vendor4@okfoodtrucks.com`, `organizer1@okfoodtrucks.com`, `organizer2@okfoodtrucks.com`
- **SuperAdmin**: `jracuff@gmail.com` / `RoamBites_SuperAdmin_2024!` — role `superadmin`, redirects to `/superadmin`
- **Seed data**: 8 approved trucks, 40 menu items, 20 schedule entries, 5 events with event-truck relationships

## Subscription System

### Plans (`plansTable`)
Admin-managed subscription plans. Fields: `id`, `name`, `description`, `monthlyPrice`, `trialDays` (default 90), `features` (jsonb array), `isActive`, `stripePriceId`, `stripeProductId`.

### Vendor Subscriptions (`vendorSubscriptionsTable`)
One per vendor user. Fields: `id`, `vendorUserId`, `planId`, `status` (trialing/active/past_due/canceled/free), `trialEndsAt`, `currentPeriodEnd`, `stripeCustomerId`, `stripeSubscriptionId`, `canceledAt`.

- Vendors auto-get a `trialing` subscription on signup (auth.ts)
- Trial countdown and subscribe CTA shown in vendor dashboard banner
- Admin can grant trial extensions, cancel, or change plans
- Stripe checkout and billing portal ready (requires `STRIPE_SECRET_KEY` + `stripePriceId` on plan)

### Subscription API Routes
- `GET /api/vendor/subscription` — get my subscription status + trial days left
- `POST /api/vendor/subscription/subscribe` — create Stripe checkout session
- `POST /api/vendor/subscription/portal` — get Stripe billing portal URL
- `GET /api/admin/plans` — list all plans
- `POST /api/admin/plans` — create plan
- `PUT /api/admin/plans/:id` — update plan (price, trial days, active, Stripe price ID)
- `GET /api/admin/subscriptions` — list all vendor subscriptions with vendor/plan info
- `POST /api/admin/subscriptions/:id/grant-trial` — extend trial (adds days to trialEndsAt)
- `POST /api/admin/subscriptions/:id/cancel` — cancel subscription
- `POST /api/admin/subscriptions/:id/set-plan` — change vendor plan

### Stripe Sandbox Products
- **Vendor Base**: `prod_UEcvV8URPPdpoj`, price `price_1TG9kYQ3mgJsadzj7iX1afg0` ($39.00/mo)
- **Vendor Pro**: `prod_UEW4NpgfdOVyUh`, price `price_1TG9kZQ3mgJsadzjsfWp5n7n` ($59.00/mo)

## Marketing Studio

Vendor Pro feature at `/vendor/marketing`. Backed by `GET/POST /api/vendor/marketing/brand` and `POST /api/vendor/marketing/copy`.

- Brand kit: primary/secondary color pickers, tagline; saved to `trucks.primaryColor`, `trucks.secondaryColor`, `trucks.tagline`
- 4 live-preview templates with truck branding applied (Social Post, Open Now, Daily Special, Event Night)
- AI copy generator via OpenAI `gpt-5-mini` (Replit AI integration, no user key required)
- Copy result clipboard copy button
- Route guard: redirects non-Pro users to upgrade

### Marketing API Routes
- `GET /api/vendor/marketing/brand` — get brand kit (colors, tagline, truck info)
- `POST /api/vendor/marketing/brand` — save brand colors + tagline
- `POST /api/vendor/marketing/copy` — generate AI copy (`templateType`: social/event/special/open-now/general, optional `customPrompt`)

## Recent Feature Changes (Session Plan T001–T010)

- **T001** — Vendor nav cleanup: Replaced "Dashboard" with "Schedule" in vendor top bar; dropdown "My Business" → "My Truck"
- **T002** — Event lineup cards: Removed description text from truck cards on EventDetail; cuisine shown as pill badge instead of plain text
- **T004** — Parks map user location: Blue pulsing dot on the Parks map (session-scoped geolocation, no repeated prompts). `useUserLocation` hook also already present in EventDetail.
- **T005** — Plans `isRecommended` field: Added `isRecommended boolean` to `plansTable` schema (pushed). Admin plan editor now shows "Mark as Recommended" toggle. Pricing.tsx uses `isRecommended` instead of hardcoded `index === 0` for "Most Popular" badge. Admin API routes (POST/PUT) updated to accept + store `isRecommended`.
- **T007** — Role-adaptive signup: Step 2 of Signup shows "What you'll do first" numbered guidance box for vendor (3 setup steps) and organizer (3 steps) roles; customer sees minimal form.
- **T008** — Event Logistics section on EventDetail: Logged-in organizers, vendors, and admins see a new "Event Logistics" card with contact info (name, email, phone), hookups, fee structure, and vendor notes.
- **T009** — Customer → Organizer upgrade: Profile page now shows "Host an Event" CTA for customer role. Clicking opens an upgrade modal listing benefits; confirm button calls `POST /api/auth/upgrade-to-organizer` and redirects to /organizer on success.
- **T010** — Multi-photo upload in OrganizerNewEvent: Photo upload section added below banner image; supports multiple files. First photo auto-selected as thumbnail. `photoUrls` stored as JSON array in events table; `thumbnailUrl` set from first photo.

## Park Spot Marketplace (legacy)

Full apply/waitlist workflow for truck parks.

### New DB Tables (`lib/db/src/schema/parkApplications.ts`)
- `park_spot_applications` — vendor applications for specific park vacancies; status: pending/approved/declined
- `park_waitlist_entries` — vendor waitlist entries when parks are full; status: waiting/contacted/approved/declined

### API Routes (`artifacts/api-server/src/routes/parks.ts`)
- `POST /api/parks/:id/apply` — vendor applies for a spot
- `POST /api/parks/:id/waitlist` — vendor joins park waitlist
- `GET /api/vendor/park-applications` — vendor views all their own applications + waitlist entries
- `GET /api/parks/:id/applications` — park host views all applications
- `PUT /api/park-applications/:id` — host approves/declines app
- `GET /api/parks/:id/waitlist-entries` — park host views waitlist
- `PUT /api/park-waitlist/:id` — host updates waitlist entry status

### Frontend (`artifacts/food-truck-tracker/src/`)
- `ParkDetail.tsx` — vendor-aware CTA banner with apply/waitlist actions
- `ParkHostDashboard.tsx` — applications and waitlist management
- `VendorEventSpots.tsx` — "My Applications" tab with all application types

## Spot Marketplace (unified)

New unified marketplace for all hosting opportunities (truck parks, single spots, recurring hosts, pop-ups).

### DB Tables (`lib/db/src/schema/spotMarketplace.ts`)
- `spot_listings` — generic listing with `spotType`: `truck_park | single_spot | recurring_host | popup_opportunity`
- `spot_listing_schedules` — recurring (day_of_week) or one_time (date) availability windows
- `spot_listing_applications` — vendor applications; status: `pending | approved | declined | cancelled`
- `spot_listing_waitlist` — waitlist entries for full listings

### API Routes (`artifacts/api-server/src/routes/spots.ts`)
- `GET /api/spots` — public browse with filters (spotType, scheduleType, search, maxPrice, isInstantBook, hasWaitlist, sortBy, lat/lng)
- `GET /api/spots/:id` — public detail with schedules + host info
- `POST /api/spots` — create listing (authenticated; auto-upgrades customer → spot_host)
- `PUT /api/spots/:id` — update listing (host only)
- `DELETE /api/spots/:id` — delete listing (host only)
- `POST /api/spots/:id/apply` — vendor applies (with optional notes)
- `POST /api/spots/:id/waitlist` — vendor joins waitlist
- `GET /api/vendor/spot-applications` — vendor views their applications
- `GET /api/host/spots` — host views their listings with application counts
- `GET /api/host/spots/:id/applications` — host views applications for a listing
- `GET /api/host/spots/:id/waitlist` — host views waitlist for a listing
- `PATCH /api/host/spots/applications/:id` — host approves/declines with optional message

### Frontend Pages (`artifacts/food-truck-tracker/src/pages/`)
- `SpotMarketplace.tsx` — browse/filter all listings, grid/list toggle, spot-type filters, instant-book badge
- `SpotDetail.tsx` — detail view + vendor apply (with note) / join waitlist CTAs
- `ListASpot.tsx` — 5-step creation wizard: Type → Info → Availability → Spots & Pricing → Review
- `SpotHostDashboard.tsx` — host dashboard: manage listings, view/approve/decline applications, waitlist

### Roles
- `spot_host` — new unified role auto-assigned when a customer creates their first listing
- Vendors and organizers use `SpotMarketplace.tsx` to find and apply for spots

## Database Schema

Tables: `users`, `trucks`, `menuItems`, `scheduleEntries`, `events`, `eventTrucks`, `reviews`, `favorites`, `notificationPreferences`, `reservationRequests`, `truckMedia`, `plans`, `vendorSubscriptions`, `truckParks`, `parkVacancies`, `parkSpotApplications`, `parkWaitlistEntries`, `spotListings`, `spotListingSchedules`, `spotListingApplications`, `spotListingWaitlist`

Key schema additions:
- `plans.isRecommended` (boolean, default false) — marks plan for "Most Popular" badge on pricing page
- `parkSpotApplications` — vendor park spot applications
- `parkWaitlistEntries` — vendor park waitlist entries

Truck fields include `logoUrl`, `coverImageUrl` (updated automatically when media is attached).
Truck status logic (open/closing_soon/opening_later/closed) computed in `artifacts/api-server/src/lib/truckStatus.ts`.

## Object Storage (Media Uploads)

Replit Object Storage provisioned. Env vars: `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR`.

Upload flow (2-step, no Uppy):
1. `POST /api/storage/uploads/request-url` with `{name, size, contentType}` → returns `{uploadURL, objectPath}`
2. `PUT uploadURL` with the file binary (direct to GCS)
3. Save `objectPath` via `POST /api/trucks/:id/media`

Media API routes:
- `GET /api/trucks/:id/media` — list all media for a truck
- `POST /api/trucks/:id/media` — attach uploaded media (vendor/admin only)
- `PUT /api/trucks/:id/media/:mediaId` — update altText/sortOrder
- `DELETE /api/trucks/:id/media/:mediaId` — remove media
- `POST /api/trucks/:id/media/:mediaId/set-featured` — set as the truck card thumbnail

Media types: `logo`, `cover`, `gallery`, `menu_image`, `menu_pdf`
