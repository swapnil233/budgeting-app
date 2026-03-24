import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const CATEGORIES = [
  // INCOME
  { name: "Salary",       group: "INCOME" as const, budgetAmount: 0 },
  { name: "Freelance",    group: "INCOME" as const, budgetAmount: 0 },
  { name: "Other Income", group: "INCOME" as const, budgetAmount: 0 },
  // FIXED
  { name: "Rent",                  group: "FIXED" as const, budgetAmount: 165000 },
  { name: "Utilities",             group: "FIXED" as const, budgetAmount: 12500  },
  { name: "Tenant Insurance",      group: "FIXED" as const, budgetAmount: 3361   },
  { name: "OSAP",                  group: "FIXED" as const, budgetAmount: 22280  },
  { name: "MacBook (Affirm)",      group: "FIXED" as const, budgetAmount: 17627  },
  { name: "Amex Installments",     group: "FIXED" as const, budgetAmount: 8335   },
  { name: "Espresso Machine",      group: "FIXED" as const, budgetAmount: 11798  },
  { name: "LoC Interest",          group: "FIXED" as const, budgetAmount: 35100  },
  { name: "TTC",                   group: "FIXED" as const, budgetAmount: 990    },
  { name: "TD Checking Fee",       group: "FIXED" as const, budgetAmount: 1795   },
  { name: "TD Balance Protection", group: "FIXED" as const, budgetAmount: 696    },
  // SUBSCRIPTIONS
  { name: "Claude",          group: "SUBSCRIPTIONS" as const, budgetAmount: 2700 },
  { name: "ChatGPT",         group: "SUBSCRIPTIONS" as const, budgetAmount: 3169 },
  { name: "Netflix",         group: "SUBSCRIPTIONS" as const, budgetAmount: 2711 },
  { name: "YouTube Premium", group: "SUBSCRIPTIONS" as const, budgetAmount: 1468 },
  { name: "Spotify",         group: "SUBSCRIPTIONS" as const, budgetAmount: 1434 },
  { name: "AWS",             group: "SUBSCRIPTIONS" as const, budgetAmount: 2000 },
  { name: "iCloud",          group: "SUBSCRIPTIONS" as const, budgetAmount: 1663 },
  { name: "Wikimedia",       group: "SUBSCRIPTIONS" as const, budgetAmount: 175  },
  { name: "Subscriptions",   group: "SUBSCRIPTIONS" as const, budgetAmount: 0    },
  // FOOD
  { name: "Coffee",     group: "FOOD" as const, budgetAmount: 21000 },
  { name: "Groceries",  group: "FOOD" as const, budgetAmount: 40000 },
  { name: "Dining Out", group: "FOOD" as const, budgetAmount: 20000 },
  { name: "Alcohol",    group: "FOOD" as const, budgetAmount: 6000  },
  // LIFESTYLE
  { name: "Uber / Transport",  group: "LIFESTYLE" as const, budgetAmount: 7500  },
  { name: "Hair",              group: "LIFESTYLE" as const, budgetAmount: 9200  },
  { name: "Health / Pharmacy", group: "LIFESTYLE" as const, budgetAmount: 4000  },
  { name: "Shopping",          group: "LIFESTYLE" as const, budgetAmount: 15000 },
  { name: "Clothes",           group: "LIFESTYLE" as const, budgetAmount: 0     },
  { name: "Necessities",       group: "LIFESTYLE" as const, budgetAmount: 5000  },
  { name: "Entertainment",     group: "LIFESTYLE" as const, budgetAmount: 0     },
  // PEOPLE_AND_PETS
  { name: "For Bornil", group: "PEOPLE_AND_PETS" as const, budgetAmount: 0    },
  { name: "Minnie",     group: "PEOPLE_AND_PETS" as const, budgetAmount: 5000 },
  // OTHER
  { name: "Travel",        group: "OTHER" as const, budgetAmount: 0 },
  { name: "Furniture",     group: "OTHER" as const, budgetAmount: 0 },
  { name: "Installments",  group: "OTHER" as const, budgetAmount: 0 },
  { name: "E-Transfers",   group: "OTHER" as const, budgetAmount: 0 },
  { name: "Random",        group: "OTHER" as const, budgetAmount: 0 },
  { name: "One-time",      group: "OTHER" as const, budgetAmount: 0 },
  { name: "Other Expense", group: "OTHER" as const, budgetAmount: 0 },
];

async function main() {
  const user = await prisma.user.findUnique({ where: { email: "swapniliqbal@gmail.com" } });
  if (!user) {
    console.error("User swapniliqbal@gmail.com not found.");
    process.exit(1);
  }

  console.log(`Seeding for user: ${user.email}`);

  for (const cat of CATEGORIES) {
    await prisma.category.upsert({
      where: { name_userId: { name: cat.name, userId: user.id } },
      update: { group: cat.group, budgetAmount: cat.budgetAmount },
      create: { ...cat, userId: user.id },
    });
  }

  console.log(`Done — ${CATEGORIES.length} categories seeded.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
