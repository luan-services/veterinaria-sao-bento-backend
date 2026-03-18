/*
  Warnings:

  - You are about to drop the column `locationId` on the `appointment` table. All the data in the column will be lost.
  - You are about to drop the `location` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "appointment" DROP CONSTRAINT "appointment_locationId_fkey";

-- AlterTable
ALTER TABLE "appointment" DROP COLUMN "locationId";

-- DropTable
DROP TABLE "location";
