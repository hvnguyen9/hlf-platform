"use client";

import { useState, useRef } from "react";
import { format, parse, isValid } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Calendar } from "./calendar";
import { Input } from "./input";
import { cn } from "./utils";

interface DatePickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function DatePicker({ value, onChange, placeholder = "MM/DD/YYYY", className }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [inputText, setInputText] = useState(
    value ? format(new Date(value + "T00:00:00"), "MM/dd/yyyy") : ""
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = value ? new Date(value + "T00:00:00") : undefined;

  function handleInputChange(raw: string) {
    setInputText(raw);
    // Try parsing MM/DD/YYYY or YYYY-MM-DD
    const parsed =
      parse(raw, "MM/dd/yyyy", new Date());
    if (isValid(parsed) && parsed.getFullYear() > 1900) {
      onChange(format(parsed, "yyyy-MM-dd"));
      return;
    }
    const parsed2 = parse(raw, "yyyy-MM-dd", new Date());
    if (isValid(parsed2) && parsed2.getFullYear() > 1900) {
      onChange(format(parsed2, "yyyy-MM-dd"));
    }
  }

  function handleCalendarSelect(date: Date | undefined) {
    if (!date) return;
    const iso = format(date, "yyyy-MM-dd");
    const display = format(date, "MM/dd/yyyy");
    onChange(iso);
    setInputText(display);
    setOpen(false);
    inputRef.current?.focus();
  }

  return (
    <div className={cn("relative flex items-center", className)}>
      <Input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        value={inputText}
        onChange={(e) => handleInputChange(e.target.value)}
        className="pr-9"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="absolute right-2.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Open calendar"
          >
            <CalendarIcon className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={handleCalendarSelect}
            defaultMonth={selected ?? new Date()}
            captionLayout="dropdown"
            fromYear={2020}
            toYear={new Date().getFullYear() + 1}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
