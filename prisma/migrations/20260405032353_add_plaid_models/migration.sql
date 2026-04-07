-- CreateTable
CREATE TABLE "plaid_item" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "accessTokenEncrypted" TEXT NOT NULL,
    "cursor" TEXT,
    "institutionId" TEXT,
    "institutionName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plaid_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plaid_account" (
    "id" TEXT NOT NULL,
    "plaidAccountId" TEXT NOT NULL,
    "plaidItemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "officialName" TEXT,
    "mask" TEXT,
    "type" TEXT NOT NULL,
    "subtype" TEXT,
    "currentBalance" DOUBLE PRECISION,
    "availableBalance" DOUBLE PRECISION,
    "currencyCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plaid_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plaid_transaction" (
    "id" TEXT NOT NULL,
    "plaidTransactionId" TEXT NOT NULL,
    "plaidItemId" TEXT NOT NULL,
    "plaidAccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "merchantName" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "isoCurrencyCode" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "authorizedDate" TIMESTAMP(3),
    "pending" BOOLEAN NOT NULL DEFAULT false,
    "categoryPrimary" TEXT,
    "categoryDetailed" TEXT,
    "rawJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plaid_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plaid_item_itemId_key" ON "plaid_item"("itemId");

-- CreateIndex
CREATE INDEX "plaid_item_userId_idx" ON "plaid_item"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "plaid_account_plaidAccountId_key" ON "plaid_account"("plaidAccountId");

-- CreateIndex
CREATE INDEX "plaid_account_plaidItemId_idx" ON "plaid_account"("plaidItemId");

-- CreateIndex
CREATE UNIQUE INDEX "plaid_transaction_plaidTransactionId_key" ON "plaid_transaction"("plaidTransactionId");

-- CreateIndex
CREATE INDEX "plaid_transaction_plaidItemId_idx" ON "plaid_transaction"("plaidItemId");

-- CreateIndex
CREATE INDEX "plaid_transaction_plaidAccountId_idx" ON "plaid_transaction"("plaidAccountId");

-- CreateIndex
CREATE INDEX "plaid_transaction_date_idx" ON "plaid_transaction"("date");

-- AddForeignKey
ALTER TABLE "plaid_item" ADD CONSTRAINT "plaid_item_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plaid_account" ADD CONSTRAINT "plaid_account_plaidItemId_fkey" FOREIGN KEY ("plaidItemId") REFERENCES "plaid_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plaid_transaction" ADD CONSTRAINT "plaid_transaction_plaidItemId_fkey" FOREIGN KEY ("plaidItemId") REFERENCES "plaid_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plaid_transaction" ADD CONSTRAINT "plaid_transaction_plaidAccountId_fkey" FOREIGN KEY ("plaidAccountId") REFERENCES "plaid_account"("plaidAccountId") ON DELETE RESTRICT ON UPDATE CASCADE;
