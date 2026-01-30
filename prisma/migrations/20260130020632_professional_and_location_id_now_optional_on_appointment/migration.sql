-- DropForeignKey
ALTER TABLE "appointment" DROP CONSTRAINT "appointment_locationId_fkey";

-- DropForeignKey
ALTER TABLE "appointment" DROP CONSTRAINT "appointment_professionalId_fkey";

-- AlterTable
ALTER TABLE "appointment" ALTER COLUMN "professionalId" DROP NOT NULL,
ALTER COLUMN "locationId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
