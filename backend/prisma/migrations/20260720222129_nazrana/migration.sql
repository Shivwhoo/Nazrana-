/*
  Warnings:

  - The `images` column on the `Product` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "VendorUserStatus" AS ENUM ('INVITED', 'ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "VendorOnboardingStatus" AS ENUM ('SHELL_CREATED', 'INVITED', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SUSPENDED');

-- AlterTable
ALTER TABLE "CampaignProduct" ADD COLUMN     "variantSnapshots" JSONB;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "createdByVendorUserId" TEXT,
ADD COLUMN     "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'PUBLISHED',
ADD COLUMN     "validationErrors" JSONB,
DROP COLUMN "images",
ADD COLUMN     "images" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "Variant" ADD COLUMN     "priceCentsOverriddenByAdmin" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "defaultMarkupBps" INTEGER,
ADD COLUMN     "onboardingStatus" "VendorOnboardingStatus" NOT NULL DEFAULT 'SHELL_CREATED';

-- CreateTable
CREATE TABLE "VendorUser" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "status" "VendorUserStatus" NOT NULL DEFAULT 'INVITED',
    "mustResetPassword" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorInvite" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HsnCode" (
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "defaultGstRateBps" INTEGER NOT NULL,

    CONSTRAINT "HsnCode_pkey" PRIMARY KEY ("code")
);

-- CreateIndex
CREATE UNIQUE INDEX "VendorUser_vendorId_email_key" ON "VendorUser"("vendorId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "VendorInvite_tokenHash_key" ON "VendorInvite"("tokenHash");

-- AddForeignKey
ALTER TABLE "VendorUser" ADD CONSTRAINT "VendorUser_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
