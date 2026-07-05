import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { useApp } from "../../context/AppContext";
import { SUBJECTS } from "../../lib/subjects";
import { uid } from "../../lib/utils";
import { Button, Dropdown, Modal } from "../ui";

const DURATIONS = [15, 25, 45, 60];

export default function PomodoroModal() {
  const { modals, closeModal, setData } = useApp();
  const [subjectId, setSubjectId] = useState("");
  const [duration, setDuration] = useState(25);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  // reset when reopened
  useEffect(() => {
    if (modals.pomodoro) {
      setRunning(false);
      setDone(false);
      setRemaining(duration * 60);
    }
  }, [modals.pomodoro, duration]);

  useEffect(() => {
    if (!running) return;
    timer.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          window.clearInterval(timer.current);
          complete();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const complete = () => {
    setRunning(false);
    setDone(true);
    if (subjectId) {
      setData((p) => ({
        ...p,
        revisionLog: [
          ...p.revisionLog,
          {
            id: uid(),
            subjectId,
            minutes: duration,
            date: new Date().toISOString(),
            source: "pomodoro",
          },
        ],
      }));
    }
    try {
      // gentle notification
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Pomodoro complete! 🍅", {
          body: "Great focus — take a short break.",
        });
      }
    } catch {
      /* ignore */
    }
  };

  const pct = 1 - remaining / (duration * 60);
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <Modal open={modals.pomodoro} onClose={() => closeModal("pomodoro")} size="sm">
      <div className="flex flex-col items-center p-6">
        <div className="mb-1 flex items-center gap-2 self-stretch">
          <span className="text-xl">🍅</span>
          <h3 className="flex-1 font-display text-lg font-semibold">Focus session</h3>
        </div>

        {done ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center py-8 text-center"
          >
            <div className="text-5xl">🎉</div>
            <p className="mt-3 font-display text-xl font-bold">Session complete!</p>
            <p className="mt-1 text-sm text-muted">
              {duration} minutes logged
              {subjectId ? ` for ${SUBJECTS.find((s) => s.id === subjectId)?.name}` : ""}.
            </p>
            <Button className="mt-5" onClick={() => closeModal("pomodoro")}>
              Done
            </Button>
          </motion.div>
        ) : (
          <>
            {/* ring timer */}
            <div className="relative my-4 h-48 w-48">
              <svg viewBox="0 0 100 100" className="h-48 w-48 -rotate-90">
                <circle cx="50" cy="50" r="44" fill="none" stroke="var(--surface-3)" strokeWidth="6" />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke="var(--red)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 44}
                  animate={{ strokeDashoffset: 2 * Math.PI * 44 * (1 - pct) }}
                  transition={{ duration: 0.4 }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-4xl font-bold tabular-nums">
                  {mm}:{ss}
                </span>
                <span className="text-xs text-muted">{running ? "Focusing…" : "Paused"}</span>
              </div>
            </div>

            {/* duration presets */}
            <div className="mb-4 flex gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  disabled={running}
                  onClick={() => setDuration(d)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-all disabled:opacity-40 ${
                    duration === d
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-surface-2 text-muted"
                  }`}
                >
                  {d}m
                </button>
              ))}
            </div>

            {/* subject */}
            <div className="mb-4 w-full">
              <Dropdown
                value={subjectId}
                onChange={setSubjectId}
                disabled={running}
                placeholder="What are you studying?"
                options={SUBJECTS.map((s) => ({
                  value: s.id,
                  label: (
                    <>
                      {s.emoji} {s.name}
                    </>
                  ),
                }))}
              />
            </div>

            <div className="flex w-full gap-2">
              {!running ? (
                <Button
                  className="flex-1"
                  onClick={() => {
                    setDone(false);
                    setRunning(true);
                  }}
                >
                  ▶ Start
                </Button>
              ) : (
                <Button variant="secondary" className="flex-1" onClick={() => setRunning(false)}>
                  ⏸ Pause
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() => {
                  setRunning(false);
                  setRemaining(duration * 60);
                }}
              >
                Reset
              </Button>
            </div>
            <p className="mt-4 text-center text-xs text-faint">
              Completed sessions are saved to your revision log.
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}
