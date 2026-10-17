# Backend setup

## Platform super administrator

Set `SUPER_ADMIN_EMAILS` in the backend environment to a comma-separated list of trusted CareBase platform administrator email addresses. Only these addresses can use the platform hospital review API. Public signup does not grant platform administrator access.

Create a separate platform administrator account with `npm run super-admin:create -- admin@example.com`. The email must be listed in `SUPER_ADMIN_EMAILS`. Public hospital signup always creates an ordinary hospital owner account and sends that owner to hospital onboarding.

## Hospital approvals

Apply Prisma migrations with `npm run db:deploy`. Existing hospitals are marked approved by default; hospitals created through new onboarding are marked pending until a platform administrator approves them.
