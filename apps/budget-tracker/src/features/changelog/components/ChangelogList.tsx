import { CHANGELOG } from "@/data/changelog";

export function ChangelogList() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Changelog</h1>
        <p className="text-sm text-muted-foreground mt-0.5">What&apos;s new in HLF Budget Tracker</p>
      </div>
      <div className="space-y-5">
        {CHANGELOG.map((entry) => (
          <div key={entry.version} className="bg-card rounded-xl border p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {entry.version}
              </span>
              <span className="text-xs text-muted-foreground">{entry.date}</span>
            </div>
            <h2 className="text-base font-semibold mb-3">{entry.title}</h2>
            <ul className="space-y-2">
              {entry.highlights.map((h, i) => (
                <li key={i} className="text-sm text-muted-foreground flex gap-2">
                  <span className="text-primary mt-0.5 flex-shrink-0">·</span>
                  {h}
                </li>
              ))}
            </ul>
            {entry.notes && (
              <p className="mt-4 pt-4 border-t text-xs text-muted-foreground/70 leading-relaxed">
                {entry.notes}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
