export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  highlights: string[];
  notes?: string;
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "v1.2.0",
    date: "2026-05-28",
    title: "Month at a Glance Dashboard",
    highlights: [
      "The dashboard is now a single, top-to-bottom story of your month: where money went, what came in, and what's left — no more hunting across five cards and charts to piece it together.",
      "Expenses come first, grouped by category with recurring items clearly tagged. Categories with a budget show a progress bar and tell you how much is left (or how far over you went).",
      "Income is laid out the same way, so you can see exactly what you brought in — and a friendly nudge to add any income you haven't logged yet, since that's what makes your surplus accurate.",
      "One clear bottom line: your surplus to allocate, or a plain warning when you've spent more than you earned. A single bar shows how your income split between spending, savings, and what's left.",
      "Put your surplus to work — when you finish the month ahead, allocate the leftover straight to a savings goal in one step, with a 'fill to goal' shortcut. No savings goal yet? A quick link to set one up.",
      "Money set aside in savings categories now shows in its own section, separate from everyday expenses, so your spending picture isn't muddied by intentional saving.",
    ],
  },
  {
    version: "v1.1.0",
    date: "2026-05-09",
    title: "Shared Auth & Single Sign-On",
    highlights: [
      "Unified sign-in across the HLF suite — your account now lives in a single shared auth database, so the same username and password work in Wheel Tracker, Bookkeeping, and Budget Tracker. Profile and password changes made in any app update everywhere.",
      "Single sign-on across subdomains — signing into one HLF app signs you in to all of them automatically (production only).",
      "Behind the scenes: removed the local User table and the unused NextAuth adapter tables (Account, Session, VerificationToken); auth flows now read and write through the shared @hlf/auth-db package.",
    ],
  },
  {
    version: "v1.0.1",
    date: "2026-05-08",
    title: "Monorepo Migration",
    highlights: [
      "Moved to the HLF Platform monorepo — all three HLF apps now live in a single codebase, share a common component library, and deploy from one place. No changes to features or data.",
    ],
  },
  {
    version: "v1.0.0",
    date: "2026-04-30",
    title: "Launch",
    highlights: [
      "Track every dollar — log income and expenses, assign categories, and add notes. Recurring items like rent and salary are set once and show up every month automatically.",
      "Know your budget at a glance — set monthly spending limits per category and watch progress bars fill in real time as you spend. No need to reconfigure each month.",
      "Dashboard that tells the full story — see your income, spending, what you actually saved, your savings rate, and what's still unallocated, all in one view. Flip back to any past month to compare.",
      "Savings that make sense — mark categories like your 401(k) or emergency fund as savings so your savings rate reflects intentional allocation, not just whatever was left over.",
      "Reports to spot the patterns — view the full year as a bar chart, a monthly breakdown table, or a category-by-category spend breakdown. Switch between income and expense views.",
      "Three retirement paths, side by side — the Retirement Calculator shows Traditional FIRE (the 25× rule), Coast FIRE (invest enough now and let it grow), and Wheel FIRE (generate monthly income from your portfolio) all at once so you can see how they compare.",
      "Your real net worth, calculated — add your home, vehicles, and other assets, your debts, and your investment accounts. The app does the math and shows you where you stand.",
      "Wheel Strategy income built in — flag which investment accounts you actually use for options trading. Set your target monthly yield with a slider and see what your portfolio is already generating and what you'd need to fully cover your budget.",
      "Try it without an account — the Retirement Calculator is publicly available. Anyone can run their numbers and see all three retirement scenarios without signing up.",
      "Looks great, works anywhere — full dark and light mode, clean sidebar navigation, and a layout that works on desktop and mobile.",
    ],
  },
];

export function getLatestVersion(): string {
  return CHANGELOG[0]?.version || "v1.0.0";
}
