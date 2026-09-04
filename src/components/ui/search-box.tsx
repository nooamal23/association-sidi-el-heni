import { Search, X } from "lucide-react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
};

export function SearchBox({ value, onChange, placeholder, className, ariaLabel }: Props) {
  return (
    <div className={`relative min-w-0 ${className ?? ""}`}>
      <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className="w-full rounded-lg border border-input bg-background py-2.5 pe-9 ps-9 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="مسح البحث"
          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function NoResults({ message = "لا توجد نتائج مطابقة" }: { message?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
