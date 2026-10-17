ALTER TABLE "StaffProfile" ADD COLUMN "name" TEXT;
ALTER TABLE "StaffProfile" ADD COLUMN "email" TEXT;

UPDATE "StaffProfile" AS profile
SET "name" = account."name",
    "email" = account."email"
FROM "User" AS account
WHERE profile."userId" = account."id";

ALTER TABLE "StaffProfile" ALTER COLUMN "name" SET NOT NULL;
ALTER TABLE "StaffProfile" ALTER COLUMN "userId" DROP NOT NULL;
