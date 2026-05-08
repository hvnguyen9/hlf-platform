import { Transaction } from "@/types";
import { formatDate } from "./formatters";

export function exportTransactionsCsv(
  transactions: Transaction[],
  filename: string
): void {
  const headers = ["Date", "Type", "Category", "Description", "Amount", "Notes"];
  const rows = transactions.map((t) => [
    formatDate(t.date),
    t.type,
    t.category?.name ?? "Uncategorized",
    t.description ?? "",
    t.amount.toFixed(2),
    t.notes ?? "",
  ]);

  const csv = [headers, ...rows]
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
