import {
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useTransform,
  type Variants,
} from "motion/react";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "../utils/cn";

const EASE = [0.22, 1, 0.36, 1] as const;

/* ─────────────────────────────────────────────────────────────
   MaskReveal — text rises up from behind a clip mask.
   Splits into words, each rising + fading on a stagger. The
   signature "font animation" of the editorial portfolio look.
   ───────────────────────────────────────────────────────────── */
export function MaskReveal({
  text,
  className,
  wordClassName,
  delay = 0,
  stagger = 0.05,
  play = true,
  as = "div",
}: {
  text: string;
  className?: string;
  wordClassName?: string;
  delay?: number;
  stagger?: number;
  play?: boolean;
  as?: "div" | "h1" | "h2" | "h3" | "p";
}) {
  const words = text.split(" ");
  const Tag = motion[as] as typeof motion.div;
  return (
    <Tag
      className={cn("flex flex-wrap", className)}
      // allow the words' inner spans to overflow the line boxes
      style={{ rowGap: "0.1em" }}
    >
      {words.map((word, i) => (
        <span key={i} className="overflow-hidden pb-[0.12em]">
          <motion.span
            className={cn("inline-block", wordClassName)}
            initial={{ y: "110%" }}
            animate={play ? { y: 0 } : { y: "110%" }}
            transition={{
              duration: 0.9,
              ease: EASE,
              delay: delay + i * stagger,
            }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

/* ─────────────────────────────────────────────────────────────
   InView version: animates when scrolled into view (once).
   ───────────────────────────────────────────────────────────── */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
  once = true,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, margin: "-10% 0px" });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.8, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Stagger container + child — for lists that reveal together.
   ───────────────────────────────────────────────────────────── */
export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
export const staggerChild: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

export function Stagger({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      variants={staggerParent}
      initial="hidden"
      animate="show"
      transition={{ delayChildren: delay }}
    >
      {children}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Marquee — infinite horizontal scroll, edge-masked.
   ───────────────────────────────────────────────────────────── */
export function Marquee({
  items,
  separator = "✦",
  className,
  duration = 28,
  reverse = false,
}: {
  items: string[];
  separator?: ReactNode;
  className?: string;
  duration?: number;
  reverse?: boolean;
}) {
  const doubled = [...items, ...items];
  return (
    <div
      className={cn(
        "group relative flex w-full overflow-hidden",
        className
      )}
      style={{
        maskImage:
          "linear-gradient(to right, transparent, #000 6%, #000 94%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent, #000 6%, #000 94%, transparent)",
      }}
    >
      <div
        className="flex shrink-0 items-center"
        style={{
          animation: `${reverse ? "scroll-marquee-rev" : "scroll-marquee"} ${duration}s linear infinite`,
        }}
      >
        {doubled.map((item, i) => (
          <span key={i} className="flex items-center">
            <span className="whitespace-nowrap px-6 text-sm">{item}</span>
            <span className="text-faint">{separator}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Counter — animated number count-up (0 → target).
   ───────────────────────────────────────────────────────────── */
export function Counter({
  to,
  from = 0,
  duration = 1.6,
  className,
  suffix = "",
  format,
}: {
  to: number;
  from?: number;
  duration?: number;
  className?: string;
  suffix?: string;
  format?: (n: number) => string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [val, setVal] = useState(from);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    let start: number | null = null;
    const tick = (now: number) => {
      if (start === null) start = now;
      const p = Math.min(1, (now - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(from + (to - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, from, duration]);

  return (
    <span ref={ref} className={className}>
      {format ? format(val) : Math.round(val)}
      {suffix}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
   Magnetic — element drifts toward the cursor (buttons / links).
   ───────────────────────────────────────────────────────────── */
export function Magnetic({
  children,
  className,
  strength = 0.3,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 15 });
  const sy = useSpring(y, { stiffness: 200, damping: 15 });

  return (
    <motion.div
      ref={ref}
      style={{ x: sx, y: sy }}
      className={cn("inline-block", className)}
      onMouseMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────
   TiltCard — 3D perspective tilt that follows the cursor, with
   a glare highlight.
   ───────────────────────────────────────────────────────────── */
export function TiltCard({
  children,
  className,
  intensity = 8,
}: {
  children: ReactNode;
  className?: string;
  intensity?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rx = useSpring(useTransform(py, [0, 1], [intensity, -intensity]), {
    stiffness: 150,
    damping: 16,
  });
  const ry = useSpring(useTransform(px, [0, 1], [-intensity, intensity]), {
    stiffness: 150,
    damping: 16,
  });
  const gx = useTransform(px, [0, 1], ["0%", "100%"]);
  const gy = useTransform(py, [0, 1], ["0%", "100%"]);

  return (
    <motion.div
      ref={ref}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      className={cn("relative [transform-style:preserve-3d]", className)}
      onMouseMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width);
        py.set((e.clientY - r.top) / r.height);
      }}
      onMouseLeave={() => {
        px.set(0.5);
        py.set(0.5);
      }}
    >
      {children}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 [background:radial-gradient(180px_circle_at_var(--gx)_var(--gy),color-mix(in_srgb,var(--primary)_22%,transparent),transparent_60%)] hover:opacity-100"
        style={{ ["--gx" as string]: gx, ["--gy" as string]: gy } as React.CSSProperties}
      />
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Preloader — counts 0% → 100% then curtains up.
   Plays once per browser session (sessionStorage gated).
   ───────────────────────────────────────────────────────────── */
export function Preloader({ onDone }: { onDone: () => void }) {
  const [pct, setPct] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    let raf = 0;
    let start: number | null = null;
    const DURATION = 1500;
    const tick = (now: number) => {
      if (start === null) start = now;
      const p = Math.min(1, (now - start) / DURATION);
      const eased = 1 - Math.pow(1 - p, 2);
      setPct(Math.round(eased * 100));
      if (p < 1) raf = requestAnimationFrame(tick);
      else {
        setTimeout(() => setExiting(true), 250);
        setTimeout(onDone, 1150);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-[var(--bg)]"
      initial={{ y: 0 }}
      animate={exiting ? { y: "-100%" } : { y: 0 }}
      transition={{ duration: 0.9, ease: EASE }}
    >
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className="h-[50vw] w-[50vw] rounded-full opacity-[0.07] blur-3xl"
          style={{ background: "radial-gradient(circle, var(--primary), transparent 70%)" }}
        />
      </div>
      <div className="relative flex flex-col items-center gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)] text-[var(--primary-fg)] shadow-lg shadow-[var(--primary)]/30"
        >
          <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19V5l8 5 8-5v14" />
          </svg>
        </motion.div>
        <div className="font-display text-6xl font-bold tabular-nums tracking-tight sm:text-7xl">
          {pct}
          <span className="text-[var(--primary)]">%</span>
        </div>
        <div className="label">Loading</div>
      </div>
      {/* bottom progress line */}
      <div className="absolute bottom-0 left-0 h-0.5 w-full bg-[var(--border)]">
        <motion.div className="h-full bg-[var(--primary)]" style={{ width: `${pct}%` }} />
      </div>
    </motion.div>
  );
}
