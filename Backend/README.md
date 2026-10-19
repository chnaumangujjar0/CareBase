# Backend setup

## Patient appointment emails

Configure SMTP in the backend environment to email a patient's appointment confirmation and private booking code:

- `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASS` are required.
- `SMTP_PORT` defaults to `587`; use `465` for implicit TLS.
- `SMTP_SECURE=true` enables implicit TLS when required by your SMTP provider.
- `SMTP_FROM` defaults to `SMTP_USER`; `SMTP_FROM_NAME` defaults to `CareBase`.

If SMTP is not configured or delivery fails, appointment booking still succeeds and the response indicates that the confirmation email was not sent. The booking code is shown once after the booking, so the patient can save it manually.

## Staff credential emails

Staff access and public appointment emails use the SMTP settings above. If SMTP is not configured or delivery fails, account creation or booking still succeeds and the API reports that the email was not sent.

## Platform super administrator

Set `SUPER_ADMIN_EMAILS` in the backend environment to a comma-separated list of trusted CareBase platform administrator email addresses. Only these addresses can use the platform hospital review API. Public signup does not grant platform administrator access.

Create a separate platform administrator account with `npm run super-admin:create -- admin@example.com`. The email must be listed in `SUPER_ADMIN_EMAILS`. Public hospital signup always creates an ordinary hospital owner account and sends that owner to hospital onboarding.

## Hospital approvals

Apply Prisma migrations with `npm run db:deploy`. Existing hospitals are marked approved by default; hospitals created through new onboarding are marked pending until a platform administrator approves them.
