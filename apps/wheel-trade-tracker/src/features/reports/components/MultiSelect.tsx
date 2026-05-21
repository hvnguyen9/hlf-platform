"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type MultiSelectOption = { value: string; label: string };

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder,
  disabled,
  triggerClassName,
}: {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  disabled?: boolean;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  // Summary text on the trigger button.
  const summary = (() => {
    if (selected.length === 0) return placeholder;
    if (selected.length === 1) {
      const opt = options.find((o) => o.value === selected[0]);
      return opt?.label ?? selected[0];
    }
    if (selected.length === options.length) return `All ${options.length}`;
    return `${selected.length} selected`;
  })();

  const hasSelection = selected.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn(
            "h-8 justify-between text-xs font-normal gap-1.5",
            !hasSelection && "text-muted-foreground",
            triggerClassName,
          )}
        >
          <span className="truncate">{summary}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-0 w-[220px]">
        <div className="flex items-center justify-between px-3 py-2 border-b text-[11px] uppercase tracking-wide text-muted-foreground">
          <span>{placeholder}</span>
          {hasSelection && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-foreground hover:underline normal-case text-xs tracking-normal"
            >
              Clear
            </button>
          )}
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">No options</div>
          ) : (
            options.map((opt) => {
              const isSelected = selected.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggle(opt.value)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent text-left"
                >
                  <span
                    className={cn(
                      "h-4 w-4 rounded border flex items-center justify-center shrink-0",
                      isSelected
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-input",
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </span>
                  <span className="truncate">{opt.label}</span>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
