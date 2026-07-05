import { AnimatePresence, motion } from "motion/react";
import { createPortal } from "react-dom";
import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { cn } from "../utils/cn";

/* ── Button ─────────────────────────────────────────────── */
type Variant = "primary" | "secondary" | "ghost" | "danger";
const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-fg hover:brightness-110 shadow-lg shadow-primary/25",
  secondary: "bg-[var(--surface-2)] text-text border border-border hover:border-border-2",
  ghost: "text-muted hover:text-text hover:bg-[var(--surface-2)]",
  danger: "bg-red text-white hover:brightness-110",
};

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: { variant?: Variant; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.97]",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function IconButton({
  className,
  children,
  active,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-muted transition-all hover:bg-[var(--surface-2)] hover:text-text active:scale-95",
        active && "bg-[var(--primary-soft)] text-primary",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* ── Card — deliberately subtle (no heavy box feel) ─────── */
export function Card({
  className,
  children,
  hover = false,
  tint = false,
  ...rest
}: {
  className?: string;
  children: ReactNode;
  hover?: boolean;
  /** give it the faint surface tint */
  tint?: boolean;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl",
        tint && "bg-[color-mix(in_srgb,var(--surface)_55%,transparent)] border border-border backdrop-blur-sm",
        hover &&
          "transition-all duration-300 hover:border-border-2 hover:shadow-xl hover:shadow-black/5",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/* ── Stat — big bare number, editorial (no box) ─────────── */
export function Stat({
  value,
  label,
  hint,
  color,
}: {
  value: ReactNode;
  label: string;
  hint?: string;
  color?: string;
}) {
  return (
    <div className="flex flex-col">
      <span
        className="font-display text-4xl font-bold leading-none tracking-tight sm:text-5xl"
        style={color ? { color } : undefined}
      >
        {value}
      </span>
      <span className="label mt-2.5">{label}</span>
      {hint && <span className="mt-1 text-xs text-muted">{hint}</span>}
    </div>
  );
}

/* ── Badge ──────────────────────────────────────────────── */
export function Badge({
  children,
  color,
  className,
}: {
  children: ReactNode;
  color?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        className
      )}
      style={
        color
          ? { backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`, color }
          : undefined
      }
    >
      {children}
    </span>
  );
}

/* ── Progress bar ───────────────────────────────────────── */
export function ProgressBar({
  value,
  color = "var(--primary)",
  className,
  height = 8,
}: {
  value: number;
  color?: string;
  className?: string;
  height?: number;
}) {
  return (
    <div
      className={cn("w-full overflow-hidden rounded-full bg-[var(--surface-3)]", className)}
      style={{ height }}
    >
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

/* ── Inputs ─────────────────────────────────────────────── */
const fieldCls =
  "w-full rounded-xl border border-border bg-[var(--surface-2)] px-3.5 py-2.5 text-sm text-text placeholder:text-faint outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldCls, className)} {...props} />;
}
export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldCls, "resize-none", className)} {...props} />;
}
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="text-xs text-faint">{hint}</span>}
    </label>
  );
}

/* ── Dropdown (portal — never clipped) ──────────────────── */
export interface DropdownOption { value: string; label: ReactNode }

export function Dropdown({
  value,
  onChange,
  options,
  placeholder = "Select…",
  className,
  disabled,
  align = "left",
}: {
  value: string;
  onChange: (v: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, dropUp: false });
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const place = () => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const MENU_MAX = 264;
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    const dropUp = spaceBelow < MENU_MAX && spaceAbove > spaceBelow;
    const width = Math.max(r.width, 168);
    setCoords({ top: dropUp ? r.top : r.bottom, left: align === "right" ? r.right - width : r.left, width, dropUp });
  };

  useEffect(() => {
    if (!open) return;
    place();
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && menuRef.current && !menuRef.current.contains(e.target as Node))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onScroll = (e: Event) => {
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onResize = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (!open) place(); setOpen((o) => !o); }}
        data-cursor
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-[var(--surface-2)] px-3.5 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none disabled:opacity-50",
          selected ? "text-text" : "text-faint"
        )}
      >
        <span className="flex min-w-0 items-center gap-2 truncate">{selected ? selected.label : placeholder}</span>
        <svg viewBox="0 0 24 24" className={cn("h-4 w-4 shrink-0 text-faint transition-transform", open && "rotate-180")} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.ul
              ref={menuRef}
              id={listId}
              role="listbox"
              initial={{ opacity: 0, y: coords.dropUp ? 8 : -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: coords.dropUp ? 8 : -8, scale: 0.97 }}
              transition={{ duration: 0.14 }}
              style={{
                position: "fixed",
                left: coords.left,
                width: coords.width,
                maxHeight: 264,
                transformOrigin: coords.dropUp ? "bottom" : "top",
                ...(coords.dropUp ? { bottom: window.innerHeight - coords.top + 6 } : { top: coords.top + 6 }),
              }}
              className="z-[9999] overflow-y-auto rounded-xl border border-border bg-[var(--surface)] p-1.5 shadow-2xl shadow-black/30 backdrop-blur"
            >
              {options.map((o) => (
                <li key={o.value}>
                  <button
                    type="button"
                    onClick={() => { onChange(o.value); setOpen(false); }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                      o.value === value ? "bg-[var(--primary-soft)] text-primary" : "text-text hover:bg-[var(--surface-2)]"
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2 truncate">{o.label}</span>
                    {o.value === value && (
                      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                        <path d="m5 13 4 4L19 7" />
                      </svg>
                    )}
                  </button>
                </li>
              ))}
              {!options.length && <li className="px-3 py-2 text-sm text-faint">No options</li>}
            </motion.ul>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

/* ── Modal ──────────────────────────────────────────────── */
export function Modal({
  open, onClose, children, title, icon, size = "md", closeOnBackdrop = true,
}: {
  open: boolean; onClose: () => void; children: ReactNode; title?: ReactNode; icon?: ReactNode;
  size?: "sm" | "md" | "lg"; closeOnBackdrop?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/55 backdrop-blur-md" onClick={() => closeOnBackdrop && onClose()} />
          <motion.div
            className={cn("relative w-full rounded-t-3xl border border-border bg-[var(--surface)] shadow-2xl sm:rounded-2xl", widths[size])}
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
          >
            {(title || icon) && (
              <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                {icon && <div className="text-xl">{icon}</div>}
                <h3 className="flex-1 font-display text-lg font-semibold">{title}</h3>
                <IconButton onClick={onClose} aria-label="Close">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </IconButton>
              </div>
            )}
            <div className="max-h-[80vh] overflow-y-auto">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Empty state ────────────────────────────────────────── */
export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border-2 px-6 py-16 text-center">
      <div className="text-4xl opacity-80">{icon}</div>
      <div>
        <p className="font-medium text-text">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-xs text-sm text-muted">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

/* ── View header (editorial, animates on each navigation) ── */
export function ViewHeader({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: ReactNode; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
      <div>
        {eyebrow && (
          <motion.p
            className="kicker mb-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {eyebrow}
          </motion.p>
        )}
        <motion.h1
          className="font-display text-3xl font-bold tracking-tight sm:text-[2.5rem] sm:leading-[1.05]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
        >
          {title}
        </motion.h1>
        {subtitle && (
          <motion.p
            className="mt-2.5 max-w-lg text-[0.95rem] leading-relaxed text-muted"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          >
            {subtitle}
          </motion.p>
        )}
      </div>
      {action}
    </div>
  );
}
