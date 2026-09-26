-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "discountPercent" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Product_status_discountPercent_idx" ON "Product"("status", "discountPercent");
