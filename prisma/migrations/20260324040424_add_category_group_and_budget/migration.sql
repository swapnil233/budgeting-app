/*
  Warnings:

  - Added the required column `group` to the `Category` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CATEGORY_GROUP" AS ENUM ('FIXED', 'SUBSCRIPTIONS', 'FOOD', 'LIFESTYLE', 'PEOPLE_AND_PETS', 'OTHER');

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "budgetAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "group" "CATEGORY_GROUP" NOT NULL;
