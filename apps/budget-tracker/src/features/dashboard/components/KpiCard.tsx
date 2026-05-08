import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  iconBg: string;
  sub?: string;
  loading?: boolean;
}

export function KpiCard({ label, value, icon: Icon, color, iconBg, sub, loading }: KpiCardProps) {
  return (
    <div className="bg-card rounded-xl border p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", iconBg)}>
          <Icon className={cn("h-4 w-4", color)} />
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-7 w-28" />
      ) : (
        <div>
          <p className={cn("text-2xl font-bold", color)}>{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      )}
    </div>
  );
}
