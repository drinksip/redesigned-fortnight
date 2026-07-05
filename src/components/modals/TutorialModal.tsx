import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useApp } from "../../context/AppContext";
import { Button, Modal } from "../ui";
import { firebase } from "../../lib/firebase";
import { TUTORIAL_KEY } from "../../lib/utils";

const STEPS = [
  {
    icon: "👋",
    title: "Welcome",
    body: "Your personal GCSE command centre. Track your spec, hit your targets, and let your AI coach guide every session. Everything syncs to your account automatically.",
    accent: "var(--primary)",
  },
  {
    icon: "📖",
    title: "The Spec Tracker",
    body: "Open any subject and tap the traffic-light dots to mark each subtopic Red (needs work), Amber (getting there) or Green (confident). This powers your coverage stats and AI recommendations.",
    accent: "var(--green)",
  },
  {
    icon: "🏆",
    title: "Grades & Tests",
    body: "Add your subjects, set target grades, and log upcoming mocks & exams. You'll get live countdowns so you always know what to prioritise.",
    accent: "var(--amber)",
  },
  {
    icon: "✨",
    title: "AI Coach — no API key!",
    body: "Your coach works out of the box, analysing your real data to recommend what to revise. Want full natural-language tutoring? Enable Local AI to run a model privately in your browser.",
    accent: "#818cf8",
  },
  {
    icon: "🍅",
    title: "Focus & build a streak",
    body: "Press P anywhere to start a Pomodoro. Completed sessions log automatically and feed your weekly goal and streak. Consistency beats cramming — let's build the habit!",
    accent: "var(--red)",
  },
];

export default function TutorialModal() {
  const { modals, closeModal, user } = useApp();
  const [step, setStep] = useState(0);
  const total = STEPS.length;
  const s = STEPS[step];
  const last = step === total - 1;

  const finish = async () => {
    localStorage.setItem(TUTORIAL_KEY, "1");
    if (user) await firebase.saveData(user.uid, { tutorialDone: true }).catch(() => {});
    setStep(0);
    closeModal("tutorial");
  };

  return (
    <Modal open={modals.tutorial} onClose={finish} size="md">
      <div className="p-6">
        {/* progress */}
        <div className="mb-5 flex gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full transition-colors"
              style={{ backgroundColor: i <= step ? s.accent : "var(--surface-3)" }}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="text-center"
          >
            <div
              className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl text-4xl"
              style={{ backgroundColor: `color-mix(in srgb, ${s.accent} 16%, transparent)` }}
            >
              {s.icon}
            </div>
            <h3 className="mt-5 font-display text-2xl font-bold">{s.title}</h3>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted">{s.body}</p>
          </motion.div>
        </AnimatePresence>

        <div className="mt-7 flex items-center justify-between">
          <button onClick={finish} className="text-sm text-faint transition-colors hover:text-muted">
            Skip tour
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="secondary" onClick={() => setStep((p) => p - 1)}>
                Back
              </Button>
            )}
            <Button onClick={() => (last ? finish() : setStep((p) => p + 1))}>
              {last ? "Let's go! 🚀" : "Next →"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
