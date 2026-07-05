import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Modal } from "../ui";
import { firebase } from "../../lib/firebase";
import { WEEKLY_GOAL_KEY } from "../../lib/utils";

const OPTIONS = [
  { val: "10", label: "Year 10", icon: "📘", sub: "GCSEs next year" },
  { val: "11", label: "Year 11", icon: "🎓", sub: "GCSEs this year" },
] as const;

export default function YearGroupModal() {
  const { modals, closeModal, user, data, setData, setWeeklyGoal } = useApp();
  const [saving, setSaving] = useState(false);

  const choose = async (yg: "10" | "11") => {
    setSaving(true);
    setData((p) => ({ ...p, yearGroup: yg }));
    if (user) await firebase.saveData(user.uid, { yearGroup: yg });
    if (!localStorage.getItem(WEEKLY_GOAL_KEY)) setWeeklyGoal(yg === "10" ? 300 : 600);
    setSaving(false);
    closeModal("yearGroup");
  };

  const required = !data.yearGroup;

  return (
    <Modal open={modals.yearGroup} onClose={required ? () => {} : () => closeModal("yearGroup")} size="md" closeOnBackdrop={!required}>
      <div className="p-6">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xl">🎓</span>
          <h3 className="font-display text-lg font-semibold">
            {data.yearGroup ? "Change year group" : "What year are you in?"}
          </h3>
        </div>
        <p className="mb-5 text-sm text-muted">
          {required
            ? "We use this to personalise your dashboard, countdown and coach."
            : "This updates your exam countdown and coaching tone."}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {OPTIONS.map((o) => (
            <button
              key={o.val}
              disabled={saving}
              onClick={() => choose(o.val as "10" | "11")}
              className={`rounded-xl border-2 p-5 text-center transition-all disabled:opacity-50 ${
                data.yearGroup === o.val
                  ? "border-primary bg-primary-soft"
                  : "border-border bg-surface-2 hover:border-border-2"
              }`}
            >
              <div className="text-3xl">{o.icon}</div>
              <p className="mt-2 font-semibold">{o.label}</p>
              <p className="text-xs text-muted">{o.sub}</p>
              {data.yearGroup === o.val && (
                <p className="mt-2 text-xs font-medium text-primary">✓ Current</p>
              )}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
