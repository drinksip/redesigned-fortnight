import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

/**
 * Custom cursor: a precise dot + a lagging ring. Uses mix-blend-difference so
 * it stays visible on any background. Scales up over interactive elements.
 * Desktop / fine-pointer only; disabled entirely on touch + reduced-motion.
 */
export default function Cursor() {
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [down, setDown] = useState(false);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const ringX = useSpring(x, { stiffness: 520, damping: 38, mass: 0.5 });
  const ringY = useSpring(y, { stiffness: 520, damping: 38, mass: 0.5 });

  useEffect(() => {
    const fine =
      window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine) return;
    setEnabled(true);
    document.documentElement.classList.add("has-cursor");

    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      const t = e.target as HTMLElement | null;
      setHovering(
        !!t?.closest('a, button, [role="button"], input, textarea, select, [data-cursor]')
      );
    };
    const dn = () => setDown(true);
    const up = () => setDown(false);

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", dn);
    window.addEventListener("pointerup", up);
    return () => {
      document.documentElement.classList.remove("has-cursor");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", dn);
      window.removeEventListener("pointerup", up);
    };
  }, [x, y]);

  if (!enabled) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] mix-blend-difference">
      <motion.div
        style={{ x: ringX, y: ringY, marginLeft: -16, marginTop: -16 }}
        className="absolute left-0 top-0 h-8 w-8 rounded-full border border-white"
        animate={{ scale: down ? 0.7 : hovering ? 1.8 : 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 22 }}
      />
      <motion.div
        style={{ x, y, marginLeft: -3, marginTop: -3 }}
        className="absolute left-0 top-0 h-1.5 w-1.5 rounded-full bg-white"
        animate={{ scale: hovering ? 0 : 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 28 }}
      />
    </div>
  );
}

/** Film-grain overlay for that premium, textured finish. */
export function Grain() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[9998] opacity-[0.04] mix-blend-overlay"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 300 300' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      }}
    />
  );
}
