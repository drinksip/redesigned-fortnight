import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "../utils/cn";
import { fmtDate } from "../lib/utils";

const WEEKDAY = ["M", "T", "W", "T", "F", "S", "S"];

/**
 * A premium calendar popover date picker. Replaces the basic native
 * <input type="date"> used in the spec tracker. Controlled component.
 */
export default function DatePicker({
  value,
  onChange,
  disabled,
}: {
  value: string; // ISO date string (yyyy-mm-dd) or ""
  onChange: (iso: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    const d = value ? new Date(value) : new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) =>
      ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open && value) {
      const d = new Date(value);
      setView({ year: d.getFullYear(), month: d.getMonth() });
    }
  }, [open, value]);

  const today = new Date();
  const ymd = (y: number, m: number, day: number) =>
    `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const firstDay = new Date(view.year, view.month, 1);
  // Monday-first offset
  const lead = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(lead).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthName = new Date(view.year, view.month, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  const shift = (dir: number) => {
    let m = view.month + dir;
    let y = view.year;
    if (m < 0) {
      m = 11;
      y--;
    } else if (m > 11) {
      m = 0;
      y++;
    }
    setView({ year: y, month: m });
  };

  const selected = value ? new Date(value) : null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        data-cursor
        className={cn(
          "flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2 py-1 text-[11px] font-medium transition-colors focus:border-primary disabled:opacity-40",
          !value && "text-faint"
        )}
      >
        <CalIcon />
        <span>
          {value
            ? fmtDate(value, { day: "numeric", month: "short", year: "numeric" })
            : "Last reviewed"}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 top-9 z-50 w-64 rounded-2xl border border-border bg-surface p-3 shadow-2xl shadow-black/30"
          >
            {/* header */}
            <div className="mb-2 flex items-center justify-between">
              <button
                onClick={() => shift(-1)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-text"
              >
                ‹
              </button>
              <span className="text-sm font-semibold">{monthName}</span>
              <button
                onClick={() => shift(1)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-text"
              >
                ›
              </button>
            </div>

            {/* weekday row */}
            <div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[10px] font-semibold text-faint">
              {WEEKDAY.map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>

            {/* days */}
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((day, i) => {
                if (!day) return <span key={i} />;
                const iso = ymd(view.year, view.month, day);
                const isSel = selected && iso === value;
                const isToday =
                  today.getFullYear() === view.year &&
                  today.getMonth() === view.month &&
                  today.getDate() === day;
                return (
                  <button
                    key={i}
                    onClick={() => {
                      onChange(iso);
                      setOpen(false);
                    }}
                    className={cn(
                      "relative flex h-8 items-center justify-center rounded-lg text-xs transition-colors",
                      isSel
                        ? "bg-primary font-bold text-primary-fg"
                        : "text-text hover:bg-surface-2"
                    )}
                  >
                    {day}
                    {isToday && !isSel && (
                      <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* footer */}
            <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
              <button
                onClick={() => {
                  onChange(ymd(today.getFullYear(), today.getMonth(), today.getDate()));
                  setOpen(false);
                }}
                className="text-xs font-medium text-primary hover:underline"
              >
                Today
              </button>
              {value && (
                <button
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                  className="text-xs text-muted hover:text-red"
                >
                  Clear
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CalIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
    </svg>
  );
}
