/*
  Warnings:

  - You are about to drop the column `profileCompleted` on the `session` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "session" DROP COLUMN "profileCompleted";

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "profileCompleted" BOOLEAN NOT NULL DEFAULT false;
