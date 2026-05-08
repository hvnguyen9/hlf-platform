"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@hlf/ui/input";
import { cn } from "@hlf/ui/utils";

interface Props {
  value: string;
  onChange: (raw: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

function toDisplay(raw: string): string {
  const n = parseFloat(raw.replace(/,/g, ""));
  if (isNaN(n)) return raw;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
}

function toRaw(display: string): string {
  return display.replace(/,/g, "");
}

export function FormattedNumberInput({ value, onChange, onBlur, placeholder, className, autoFocus }: Props) {
  const [display, setDisplay] = useState(() => value ? toDisplay(value) : "");
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  // Sync when value changes externally (e.g. prefill from budget link)
  useEffect(() => {
    if (!focused) {
      setDisplay(value ? toDisplay(value) : "");
    }
  }, [value, focused]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Allow digits, one decimal point, commas (user may type them)
    const cleaned = e.target.value.replace(/[^0-9.]/g, "");
    setDisplay(cleaned);
    onChange(cleaned);
  }

  function handleBlur() {
    setFocused(false);
    const raw = toRaw(display);
    const n = parseFloat(raw);
    if (!isNaN(n) && n >= 0) {
      const formatted = toDisplay(raw);
      setDisplay(formatted);
      onChange(raw);
    }
    onBlur?.();
  }

  function handleFocus() {
    setFocused(true);
    // Show raw number on focus so editing is easy
    setDisplay(toRaw(display));
  }

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  return (
    <Input
      ref={ref}
      type="text"
      inputMode="decimal"
      value={display}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={cn(className)}
    />
  );
}
