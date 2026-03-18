/*
  Warnings:

  - The values [GROOMER] on the enum `Specialty` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Specialty_new" AS ENUM ('GENERAL_DOCTOR', 'BATH_GROOMING');
ALTER TABLE "professional" ALTER COLUMN "specialty" TYPE "Specialty_new" USING ("specialty"::text::"Specialty_new");
ALTER TYPE "Specialty" RENAME TO "Specialty_old";
ALTER TYPE "Specialty_new" RENAME TO "Specialty";
DROP TYPE "public"."Specialty_old";
COMMIT;
