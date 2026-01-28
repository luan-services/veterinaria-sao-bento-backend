/*
  Warnings:

  - Added the required column `city` to the `location` table without a default value. This is not possible if the table is not empty.
  - Added the required column `zipCode` to the `location` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "location" ADD COLUMN     "city" TEXT NOT NULL,
ADD COLUMN     "zipCode" TEXT NOT NULL;
