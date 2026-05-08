import { prisma } from "../src/server/prisma";
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from "../src/data/defaultCategories";

async function main() {
  const user = await prisma.user.findUnique({ where: { username: "admin" } });

  if (!user) {
    console.log("⚠️  Admin user not found. Run wheel-strat-tracker seed first.");
    process.exit(1);
  }

  const uid = user.id;
  console.log(`👤 Found user: ${user.username}`);

  await prisma.transaction.deleteMany({ where: { userId: uid } });
  await prisma.recurringTransaction.deleteMany({ where: { userId: uid } });
  await prisma.monthlyBudget.deleteMany({ where: { userId: uid } });
  await prisma.category.deleteMany({ where: { userId: uid } });
  await prisma.investment.deleteMany({ where: { userId: uid } });
  await prisma.btAsset.deleteMany({ where: { userId: uid } });
  await prisma.btLiability.deleteMany({ where: { userId: uid } });
  await prisma.fIREProfile.deleteMany({ where: { userId: uid } });
  await prisma.savingsGoal.deleteMany({ where: { userId: uid } });
  await prisma.netWorthSnapshot.deleteMany({ where: { userId: uid } });
  console.log("🧹 Cleared existing budget data");

  // ── Categories ────────────────────────────────────────────────────────────────

  const categoryData = [
    ...DEFAULT_EXPENSE_CATEGORIES.map((c, i) => ({
      ...c,
      userId: uid,
      isDefault: true,
      order: i,
      monthlyBudget: budgetFor(c.name),
    })),
    ...DEFAULT_INCOME_CATEGORIES.map((c, i) => ({
      ...c,
      userId: uid,
      isDefault: true,
      order: i,
    })),
  ];

  await prisma.category.createMany({ data: categoryData, skipDuplicates: true });

  const allCategories = await prisma.category.findMany({ where: { userId: uid } });
  const cat = Object.fromEntries(allCategories.map((c) => [c.name, c.id]));
  console.log(`📂 Created ${allCategories.length} categories`);

  // ── Recurring transactions ────────────────────────────────────────────────────

  await prisma.recurringTransaction.createMany({
    data: [
      {
        userId: uid,
        amount: 9200,
        type: "income",
        categoryId: cat["Salary"],
        description: "Monthly salary — W-2",
        dayOfMonth: 1,
        isActive: true,
      },
      {
        userId: uid,
        amount: 2400,
        type: "income",
        categoryId: cat["Investment Income"],
        description: "Wheel strategy monthly income estimate",
        dayOfMonth: 5,
        isActive: true,
      },
      {
        userId: uid,
        amount: 2850,
        type: "expense",
        categoryId: cat["Housing"],
        description: "Mortgage payment (P&I + escrow)",
        dayOfMonth: 1,
        isActive: true,
      },
      {
        userId: uid,
        amount: 485,
        type: "expense",
        categoryId: cat["Subscriptions"],
        description: "Adobe CC, GitHub, Notion, Vercel, Railway, 1Password",
        dayOfMonth: 5,
        isActive: true,
      },
      {
        userId: uid,
        amount: 295,
        type: "expense",
        categoryId: cat["Utilities"],
        description: "Electricity, internet, gas",
        dayOfMonth: 15,
        isActive: true,
      },
      {
        userId: uid,
        amount: 420,
        type: "expense",
        categoryId: cat["Transportation"],
        description: "Car loan payment",
        dayOfMonth: 10,
        isActive: true,
      },
      {
        userId: uid,
        amount: 180,
        type: "expense",
        categoryId: cat["Insurance"],
        description: "Auto + home insurance (blended monthly)",
        dayOfMonth: 15,
        isActive: true,
      },
    ],
  });
  console.log("🔁 Created recurring transactions");

  // ── Transactions (Nov 2025 – May 2026) ───────────────────────────────────────

  const tx = (
    date: string,
    type: "income" | "expense",
    amount: number,
    categoryName: string,
    description: string
  ) => ({
    userId: uid,
    date: new Date(date + "T12:00:00"),
    type,
    amount,
    categoryId: cat[categoryName] ?? null,
    description,
  });

  const transactions = [
    // November 2025
    tx("2025-11-01", "income", 9200, "Salary", "November salary"),
    tx("2025-11-05", "income", 1850, "Investment Income", "Wheel strategy — Oct/Nov premiums"),
    tx("2025-11-01", "expense", 2850, "Housing", "Mortgage — November"),
    tx("2025-11-05", "expense", 485, "Subscriptions", "Monthly SaaS stack"),
    tx("2025-11-10", "expense", 420, "Transportation", "Car loan — November"),
    tx("2025-11-12", "expense", 680, "Food & Dining", "Groceries + dining (2 weeks)"),
    tx("2025-11-15", "expense", 295, "Utilities", "Utilities — November"),
    tx("2025-11-15", "expense", 180, "Insurance", "Insurance — November"),
    tx("2025-11-18", "expense", 340, "Food & Dining", "Groceries + Thanksgiving supplies"),
    tx("2025-11-22", "expense", 145, "Shopping", "Amazon household essentials"),
    tx("2025-11-25", "expense", 95, "Personal Care", "Haircut, pharmacy"),
    tx("2025-11-28", "expense", 280, "Entertainment", "Concert tickets"),
    // December 2025
    tx("2025-12-01", "income", 9200, "Salary", "December salary"),
    tx("2025-12-15", "income", 2960, "Investment Income", "Wheel strategy — NVDA/META CSPs expired"),
    tx("2025-12-01", "expense", 2850, "Housing", "Mortgage — December"),
    tx("2025-12-05", "expense", 485, "Subscriptions", "Monthly SaaS stack"),
    tx("2025-12-10", "expense", 420, "Transportation", "Car loan — December"),
    tx("2025-12-12", "expense", 720, "Food & Dining", "Groceries + holiday meals"),
    tx("2025-12-14", "expense", 580, "Shopping", "Holiday gifts"),
    tx("2025-12-15", "expense", 295, "Utilities", "Utilities — December"),
    tx("2025-12-15", "expense", 180, "Insurance", "Insurance — December"),
    tx("2025-12-20", "expense", 890, "Shopping", "Christmas gifts + wrapping"),
    tx("2025-12-26", "expense", 165, "Entertainment", "Streaming + games"),
    tx("2025-12-28", "expense", 245, "Food & Dining", "New Year's Eve dinner reservation"),
    // January 2026
    tx("2026-01-01", "income", 9200, "Salary", "January salary"),
    tx("2026-01-31", "income", 1390, "Investment Income", "Wheel strategy — Jan (CSPs assigned, premiums)"),
    tx("2026-01-01", "expense", 2850, "Housing", "Mortgage — January"),
    tx("2026-01-05", "expense", 485, "Subscriptions", "Monthly SaaS stack"),
    tx("2026-01-08", "expense", 349, "Subscriptions", "Annual renewals — Linear, 1Password"),
    tx("2026-01-10", "expense", 420, "Transportation", "Car loan — January"),
    tx("2026-01-14", "expense", 620, "Food & Dining", "Groceries + dining"),
    tx("2026-01-15", "expense", 295, "Utilities", "Utilities — January"),
    tx("2026-01-15", "expense", 180, "Insurance", "Insurance — January"),
    tx("2026-01-18", "expense", 280, "Healthcare", "Annual physical + lab work"),
    tx("2026-01-22", "expense", 195, "Shopping", "New workout gear"),
    tx("2026-01-25", "expense", 95, "Personal Care", "Haircut, grooming"),
    // February 2026
    tx("2026-02-01", "income", 9200, "Salary", "February salary"),
    tx("2026-02-28", "income", 2040, "Investment Income", "Wheel strategy — AMZN/TSLA assigned, CC premiums"),
    tx("2026-02-01", "expense", 2850, "Housing", "Mortgage — February"),
    tx("2026-02-05", "expense", 485, "Subscriptions", "Monthly SaaS stack"),
    tx("2026-02-10", "expense", 420, "Transportation", "Car loan — February"),
    tx("2026-02-12", "expense", 580, "Food & Dining", "Groceries"),
    tx("2026-02-14", "expense", 645, "Shopping", "Herman Miller Aeron chair — home office"),
    tx("2026-02-14", "expense", 185, "Food & Dining", "Valentine's dinner"),
    tx("2026-02-15", "expense", 295, "Utilities", "Utilities — February"),
    tx("2026-02-15", "expense", 180, "Insurance", "Insurance — February"),
    tx("2026-02-20", "expense", 145, "Healthcare", "Dentist visit + copay"),
    tx("2026-02-25", "expense", 110, "Personal Care", "Gym month + haircut"),
    // March 2026
    tx("2026-03-01", "income", 9200, "Salary", "March salary"),
    tx("2026-03-20", "income", 7200, "Freelance", "MedTech — AWS → Railway migration contract"),
    tx("2026-03-31", "income", 2830, "Investment Income", "Wheel strategy — all 4 CCs expired worthless"),
    tx("2026-03-01", "expense", 2850, "Housing", "Mortgage — March"),
    tx("2026-03-03", "expense", 249, "Shopping", "AirPods Pro 2"),
    tx("2026-03-05", "expense", 485, "Subscriptions", "Monthly SaaS stack"),
    tx("2026-03-10", "expense", 420, "Transportation", "Car loan — March"),
    tx("2026-03-12", "expense", 640, "Food & Dining", "Groceries + dining"),
    tx("2026-03-15", "expense", 295, "Utilities", "Utilities — March"),
    tx("2026-03-15", "expense", 180, "Insurance", "Insurance — March"),
    tx("2026-03-19", "expense", 320, "Entertainment", "Weekend trip — hotel + activities"),
    tx("2026-03-22", "expense", 185, "Food & Dining", "Dinner out + drinks"),
    tx("2026-03-28", "expense", 95, "Personal Care", "Haircut, personal care"),
    // April 2026
    tx("2026-04-01", "income", 9200, "Salary", "April salary"),
    tx("2026-04-30", "income", 4520, "Investment Income", "Wheel strategy — MSFT + AMZN full cycles complete"),
    tx("2026-04-01", "expense", 2850, "Housing", "Mortgage — April"),
    tx("2026-04-05", "expense", 485, "Subscriptions", "Monthly SaaS stack"),
    tx("2026-04-08", "expense", 187, "Subscriptions", "Vercel bandwidth overage — client demo spike"),
    tx("2026-04-10", "expense", 420, "Transportation", "Car loan — April"),
    tx("2026-04-12", "expense", 670, "Food & Dining", "Groceries"),
    tx("2026-04-15", "expense", 295, "Utilities", "Utilities — April"),
    tx("2026-04-15", "expense", 180, "Insurance", "Insurance — April"),
    tx("2026-04-15", "expense", 480, "Education", "CPA — tax prep fee (Schedule C + SE)"),
    tx("2026-04-18", "expense", 240, "Food & Dining", "Birthday dinner"),
    tx("2026-04-20", "expense", 165, "Healthcare", "Eye exam + new lenses"),
    tx("2026-04-24", "expense", 220, "Entertainment", "Concert + parking"),
    tx("2026-04-28", "expense", 95, "Personal Care", "Haircut + misc"),
    // May 2026 (partial — month just started)
    tx("2026-05-01", "income", 9200, "Salary", "May salary"),
    tx("2026-05-01", "expense", 2850, "Housing", "Mortgage — May"),
  ];

  await prisma.transaction.createMany({ data: transactions });
  console.log(`💳 Created ${transactions.length} transactions`);

  // ── Investments ───────────────────────────────────────────────────────────────

  await prisma.investment.createMany({
    data: [
      {
        userId: uid,
        name: "Tastytrade — Wheel Account",
        type: "brokerage",
        currentValue: 187500,
        isWheelAccount: true,
        notes: "Primary wheel strategy brokerage. Main Portfolio in wheel tracker.",
      },
      {
        userId: uid,
        name: "Fidelity 401(k)",
        type: "retirement_401k",
        currentValue: 84200,
        isWheelAccount: false,
        notes: "Employer 401k. 6% contribution + 4% match.",
      },
      {
        userId: uid,
        name: "Fidelity Roth IRA",
        type: "roth_IRA",
        currentValue: 46800,
        isWheelAccount: false,
        notes: "Max contribution annually. Index funds (FZROX, FZILX).",
      },
      {
        userId: uid,
        name: "HYSA — Emergency Fund",
        type: "other",
        currentValue: 27400,
        isWheelAccount: false,
        notes: "SoFi HYSA. Target: 6 months of expenses (~$36k).",
      },
    ],
  });
  console.log("📈 Created investments");

  // ── Assets & Liabilities ─────────────────────────────────────────────────────

  await prisma.btAsset.createMany({
    data: [
      {
        userId: uid,
        name: "Primary Residence",
        type: "real_estate",
        value: 545000,
        notes: "3BR/2BA purchased 2021. Zillow estimate Apr 2026.",
      },
      {
        userId: uid,
        name: "2022 Honda Accord",
        type: "vehicle",
        value: 28500,
        notes: "KBB fair value, excellent condition.",
      },
    ],
  });

  await prisma.btLiability.createMany({
    data: [
      {
        userId: uid,
        name: "Home Mortgage",
        type: "mortgage",
        balance: 378000,
        notes: "30-yr fixed at 6.25%. $2,850/mo. ~27 years remaining.",
      },
      {
        userId: uid,
        name: "Auto Loan — Accord",
        type: "car_loan",
        balance: 16800,
        notes: "$420/mo. 40 months remaining.",
      },
    ],
  });
  console.log("🏠 Created assets and liabilities");

  // ── FIRE Profile ──────────────────────────────────────────────────────────────

  await prisma.fIREProfile.create({
    data: {
      userId: uid,
      targetAnnualExpenses: 66000,
      safeWithdrawalRate: 0.04,
      expectedReturn: 0.07,
      currentAge: 34,
      targetRetirementAge: 45,
      wheelMonthlyRate: 0.025,
      additionalRetirementSpend: 1200,
    },
  });
  console.log("🔥 Created FIRE profile (FI target: $1.65M)");

  // ── Savings Goals ─────────────────────────────────────────────────────────────

  await prisma.savingsGoal.createMany({
    data: [
      {
        userId: uid,
        name: "Emergency Fund (6 months)",
        targetAmount: 36000,
        currentAmount: 27400,
        description: "6 months of living expenses in HYSA. Currently 4.6 months covered.",
        isCompleted: false,
      },
      {
        userId: uid,
        name: "Japan Trip — December 2026",
        targetAmount: 8000,
        currentAmount: 3200,
        deadline: new Date("2026-12-01"),
        description: "2-person trip, 10 days. Flights + hotels + food budget.",
        isCompleted: false,
      },
      {
        userId: uid,
        name: "Assignment Reserve",
        targetAmount: 50000,
        currentAmount: 50000,
        description: "Cash reserve for potential double-assignment in wheel account.",
        isCompleted: true,
      },
    ],
  });
  console.log("🎯 Created savings goals");

  // ── Net Worth Snapshots (May 2025 – May 2026) ─────────────────────────────────

  const snapshots = [
    s("2025-05-01", 776000, 404000, 372000),
    s("2025-06-01", 784500, 400500, 384000),
    s("2025-07-01", 792200, 397000, 395200),
    s("2025-08-01", 800400, 393800, 406600),
    s("2025-09-01", 814100, 390700, 423400),
    s("2025-10-01", 826300, 388000, 438300),
    s("2025-11-01", 837500, 385200, 452300),
    s("2025-12-01", 849800, 382400, 467400),
    s("2026-01-01", 883200, 399600, 483600),
    s("2026-02-01", 896900, 396800, 500100),
    s("2026-03-01", 913400, 394200, 519200),
    s("2026-04-01", 927100, 395200, 531900),
    s("2026-05-01", 933900, 394800, 539100),
  ];

  await prisma.netWorthSnapshot.createMany({
    data: snapshots.map((snap) => ({ ...snap, userId: uid })),
  });
  console.log(`📊 Created ${snapshots.length} net worth snapshots`);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function s(date: string, totalAssets: number, totalLiabilities: number, netWorth: number) {
  return { date: new Date(date), totalAssets, totalLiabilities, netWorth };
}

function budgetFor(name: string): number | null {
  const budgets: Record<string, number> = {
    Housing: 3000,
    "Food & Dining": 800,
    Transportation: 500,
    Healthcare: 250,
    Entertainment: 300,
    Shopping: 400,
    Utilities: 350,
    Insurance: 200,
    Subscriptions: 550,
    Education: 200,
    "Personal Care": 150,
  };
  return budgets[name] ?? null;
}

main()
  .then(() => {
    console.log("🌱 Seed completed.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
