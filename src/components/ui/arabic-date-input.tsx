"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { arTN } from "date-fns/locale/ar-TN";
import { format, parse, isValid } from "date-fns";

import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Accepts / emits ISO "yyyy-MM-dd" strings, displays date in Arabic (ar-TN).
export function ArabicDateInput({
  value,
  onChange,
  required,
  placeholder = "اختر التاريخ",
  className,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const parsed = React.useMemo(() => {
    if (!value) return undefined;
    const d = parse(value, "yyyy-MM-dd", new Date());
    return isValid(d) ? d : undefined;
  }, [value]);

  const display = parsed
    ? format(parsed, "d MMMM yyyy", { locale: arTN })
    : "";

  return (
    <>
      {/* Hidden native input to enforce `required` in the surrounding form */}
      {required && (
        <input
          type="text"
          value={value}
          onChange={() => {}}
          required
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute h-0 w-0 opacity-0"
        />
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            className={cn(
              "flex w-full max-w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30",
              !display && "text-muted-foreground",
              className,
            )}
          >
            <span className="truncate">{display || placeholder}</span>
            <CalendarIcon className="h-4 w-4 opacity-70" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start" dir="rtl">
          <Calendar
            mode="single"
            selected={parsed}
            defaultMonth={parsed}
            captionLayout="dropdown"
            startMonth={new Date(new Date().getFullYear() - 80, 0)}
            endMonth={new Date(new Date().getFullYear() + 10, 11)}
            onSelect={(d) => {
              if (d) {
                onChange(format(d, "yyyy-MM-dd"));
                setOpen(false);
              }
            }}
          />
        </PopoverContent>
      </Popover>
    </>
  );
}
