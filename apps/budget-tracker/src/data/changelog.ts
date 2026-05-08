export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  highlights: string[];
  notes?: string;
}

export const CHANGELOG: ChangelogEntry[] = [
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
