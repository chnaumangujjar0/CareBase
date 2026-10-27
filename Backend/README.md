# CareBase Backend

CareBase Backend is a TypeScript API built with Express 5 and Prisma. It provides authentication, tenant-scoped hospital workflows, public appointment booking, live appointment slot updates, and platform hospital approval endpoints. PostgreSQL is the primary database.

## Requirements

- Node.js and npm versions compatible with the dependencies in `package.json`.
- PostgreSQL reachable from the backend process.
- A database connection string and the required local environment configuration.

## Setup

From this directory:

```bash
npm install
```

Create a local `.env` file in `Backend/`. Set the following variables for your environment; do not commit secrets:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string used by Prisma. |
| `PORT` | HTTP and Socket.IO server port; defaults to `8000`. |
| `CORS_ORIGIN` | Allowed frontend origin for HTTP and Socket.IO requests. |
| `ACCESS_TOKEN_SECRET` | Secret used to sign and verify access tokens. |
| `REFRESH_TOKEN_SECRET` | Secret used to sign and verify refresh tokens. |
| `ACCESS_TOKEN_EXPIRY` | Access token lifetime accepted by the token helper. |
| `REFRESH_TOKEN_EXPIRY` | Refresh token lifetime accepted by the token helper. |
| `RECAPTCHA_SECRET_KEY` | Server-side key for login and signup reCAPTCHA verification. |
| `FRONTEND_URL` | Frontend origin used to build links in emails. |
| `STRIPE_SECRET_KEY` | Backend-only Stripe secret key. Never expose it to the browser. |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for `/api/v1/subscriptions/webhook`. |
| `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_GROWTH`, `STRIPE_PRICE_PLUS` | Stripe recurring monthly USD Price IDs for $100, $200, and $250 plans, respectively. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | SMTP connection settings for email delivery. |
| `SMTP_SECURE` | Set to `true` when the SMTP provider requires implicit TLS. |
| `SMTP_FROM`, `SMTP_FROM_NAME` | Optional sender email and display name. The sender email defaults to `SMTP_USER`; the display name defaults to `CareBase`. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Optional Cloudinary credentials for image uploads. |
| `SUPER_ADMIN_EMAILS` | Comma-separated trusted platform administrator email addresses. |
| `NODE_ENV` | Runtime environment, such as `development` or `production`. |

Never commit `.env` files or include real credentials in documentation, screenshots, or issue reports.

### CareBase subscriptions

Create three active recurring Prices in Stripe: Starter at $100 USD/month, Growth at $200 USD/month, and Plus at $250 USD/month. Configure their Price IDs using the backend variables above. Checkout verifies that each configured Price is active and matches its plan's monthly USD amount before creating a subscription.

Register `POST /api/v1/subscriptions/webhook` in Stripe and subscribe to `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, and `invoice.payment_failed`. Put the endpoint's signing secret in `STRIPE_WEBHOOK_SECRET`. The webhook updates CareBase subscription state; the signed-in success return also verifies the Checkout Session directly with Stripe before updating the browser's access state. Plan changes update the existing Stripe subscription with `always_invoice` proration and never create a second subscription.

The frontend uses Stripe-hosted Checkout, so the publishable key is not needed for this redirect flow. Keep any publishable key in the frontend only, and keep the secret key on the backend only. Hospital module and user limits are not enforced by the current plan selection; add entitlement checks before advertising those limits as active restrictions.

## Database

Prisma schema is in `prisma/schema.prisma`; SQL migration history is in `prisma/migrations/`.

```bash
npm run db:generate  # Generate the Prisma client
npm run db:migrate   # Create and apply a development migration
npm run db:deploy    # Apply committed migrations in deployment environments
```

`npm install` also runs Prisma client generation through the package's `postinstall` script. Apply migrations before starting the API against a new database. In deployed environments, use `db:deploy` with the committed migration history.

## Run and validate

```bash
npm run dev        # Watch and run src/index.ts
npm run build      # Compile TypeScript into dist/
npm run typecheck  # Type-check without emitting files
npm start          # Run the compiled server
```

The server connects to PostgreSQL before listening. The HTTP API is mounted under `/api/v1`; the same HTTP server hosts Socket.IO for live appointment slot updates.

## API areas

| Base path | Purpose |
| --- | --- |
| `/api/v1/user` | Signup, login, refresh, current-user, and logout. |
| `/api/v1/tenant` | Hospital onboarding and profile management. |
| `/api/v1/super-admin` | Platform hospital review and approval. |
| `/api/v1/department`, `/api/v1/staff`, `/api/v1/roles` | Hospital structure, staff profiles, and role permissions. |
| `/api/v1/patients`, `/api/v1/appointments` | Patient records and appointment management. |
| `/api/v1/clinical` | Encounters, consultations, prescriptions, admissions, and related clinical workflows. |
| `/api/v1/facility` | Wards, rooms, and beds. |
| `/api/v1/pharmacies`, `/api/v1/medicines` | Pharmacy locations, stock, transfers, requests, sales, and medicine catalogue. |
| `/api/v1/billing` | Billing rates, invoices, charges, and payments. |
| `/api/v1/dashboard`, `/api/v1/audit-logs` | Hospital dashboards and audit history. |
| `/api/v1/public` | Public doctor search, appointment slots, booking, and booking lookup. |

Most hospital endpoints require a valid access token, an approved hospital, and the relevant role permission. Public booking routes do not require a user login. Consult the route files in `src/routes/` for individual methods and authorization requirements.

## Public appointment flow

1. The frontend requests the public doctor directory and a doctor's available slots.
2. A patient selects a returned slot and submits contact details.
3. The backend rechecks the doctor's active availability and appointment conflicts before creating the booking.
4. A private booking code is returned for appointment lookup. Confirmation email delivery is attempted when SMTP is configured.
5. Socket.IO notifies subscribed booking pages when a doctor's slot state changes.

Appointment schedules and public slot dates currently use the `Asia/Karachi` time zone. Booking email failure does not undo a successfully created appointment; the response reports whether the email was sent.

## Email and platform administrator setup

Staff credential emails and public appointment confirmations use the SMTP variables above. If SMTP is absent or delivery fails, the associated account or booking workflow can still complete and reports the email result.

Set `SUPER_ADMIN_EMAILS` to a comma-separated allowlist before creating a platform administrator. Then run:

```bash
npm run super-admin:create -- admin@example.com
```

The email passed to the command must be in the allowlist. Public signup creates an ordinary hospital owner and does not grant platform administrator privileges. New hospitals remain pending until an authorized platform administrator approves them.

## Project structure

```text
prisma/             Database schema and migrations
src/
  constants/        Role and permission definitions
  controllers/      HTTP workflow handlers
  db/               Prisma client and connection setup
  middlewares/      Authentication, authorization, uploads, and errors
  routes/           Express route definitions
  scripts/          Administrative command-line tools
  services/         Email and Socket.IO workflows
  types/            Shared backend types
  utils/            Validation, API responses, auditing, tokens, and helpers
  app.ts            Express app, Socket.IO setup, and route mounting
  index.ts          Database connection and HTTP server startup
```

## Security and operations notes

- Keep access-token, refresh-token, database, SMTP, Cloudinary, and reCAPTCHA secrets private.
- Use separate credentials for development and production.
- Keep Prisma migrations committed and apply them before deploying code that depends on schema changes.
- Configure `CORS_ORIGIN` and `FRONTEND_URL` to the deployed frontend origin.
- Protect the platform administrator allowlist and use a dedicated administrator account.
