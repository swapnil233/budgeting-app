-- AlterTable
ALTER TABLE "plaid_transaction" ADD COLUMN "importedAt" TIMESTAMP(3),
ADD COLUMN "importedTransactionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "plaid_transaction_importedTransactionId_key" ON "plaid_transaction"("importedTransactionId");

-- CreateIndex
CREATE INDEX "plaid_transaction_importedAt_idx" ON "plaid_transaction"("importedAt");

-- AddForeignKey
ALTER TABLE "plaid_transaction" ADD CONSTRAINT "plaid_transaction_importedTransactionId_fkey" FOREIGN KEY ("importedTransactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
