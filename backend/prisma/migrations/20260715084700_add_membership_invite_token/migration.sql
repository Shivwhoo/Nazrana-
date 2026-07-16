-- AlterTable: Add invite token fields to Membership
ALTER TABLE "Membership" ADD COLUMN     "inviteToken" TEXT,
ADD COLUMN     "inviteTokenExpiry" TIMESTAMP(3),
ADD COLUMN     "acceptedAt" TIMESTAMP(3);

-- CreateIndex: Unique constraint on inviteToken
CREATE UNIQUE INDEX "Membership_inviteToken_key" ON "Membership"("inviteToken");
