/*
  Warnings:

  - Changed the type of `specialty` on the `professional` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "Specialty" AS ENUM ('GENERAL_DOCTOR', 'GROOMER');

-- AlterTable
ALTER TABLE "professional" DROP COLUMN "specialty",
ADD COLUMN     "specialty" "Specialty" NOT NULL;
