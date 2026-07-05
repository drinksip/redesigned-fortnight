import { useApp } from "../../context/AppContext";
import { Modal } from "../ui";

const SHORTCUTS = [
  { keys: ["P"], action: "Open Pomodoro timer" },
  { keys: ["0"], action: "Overview" },
  { keys: ["1"], action: "Timetable" },
  { keys: ["2"], action: "Grades" },
  { keys: ["3"], action: "Spec Tracker" },
  { keys: ["4"], action: "AI Coach" },
  { keys: ["5"], action: "Revision Log" },
  { keys: ["?"], action: "Show this menu" },
  { keys: ["Esc"], action: "Close any dialog" },
];

export default function ShortcutsModal() {
  const { modals, closeModal } = useApp();
  return (
    <Modal open={modals.shortcuts} onClose={() => closeModal("shortcuts")} title="Keyboard shortcuts" icon="⌨️" size="sm">
      <div className="p-5">
        <div className="space-y-1">
          {SHORTCUTS.map((s) => (
            <div key={s.action} className="flex items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-surface-2">
              <span className="text-muted">{s.action}</span>
              <div className="flex gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="rounded-md border border-border-2 bg-surface-2 px-2 py-0.5 text-xs font-semibold text-text shadow-sm"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
