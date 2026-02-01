/*
  Warnings:

  - Added the required column `endDate` to the `appointment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "Species" ADD VALUE 'OTHER';

-- AlterTable
ALTER TABLE "appointment" ADD COLUMN     "endDate" TIMESTAMP(3) NOT NULL;
