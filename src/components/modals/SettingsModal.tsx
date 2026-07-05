import { useApp } from "../../context/AppContext";
import { Button, Modal } from "../ui";
import { deriveSubjects, fmtMinutes, normalizeTimetable } from "../../lib/utils";
import type { UserData } from "../../lib/types";

export default function SettingsModal() {
  const { modals, closeModal, theme, toggleTheme, weeklyGoal, setWeeklyGoal, data, setData } =
    useApp();

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "gcse-tracker-backup.json";
    a.click();
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const d = JSON.parse(ev.target?.result as string) as Partial<UserData>;
        setData((prev) => {
          const merged: UserData = { ...prev, ...d, username: prev.username } as UserData;
          // normalise imported data (clean legacy timetable keys, derive subjects)
          merged.timetable = normalizeTimetable(merged.timetable || {});
          merged.subjects = deriveSubjects(merged);
          return merged;
        });
        alert("Backup restored!");
      } catch {
        alert("Invalid backup file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const clearData = () => {
    if (!confirm("Clear all tracked data? This cannot be undone (your account stays).")) return;
    setData((p) => ({
      ...p,
      spec: {},
      grades: {},
      tests: [],
      revisionLog: [],
      conversations: [],
      timetable: {},
    }));
    closeModal("settings");
  };

  return (
    <Modal open={modals.settings} onClose={() => closeModal("settings")} title="Settings" icon="⚙️" size="md">
      <div className="space-y-6 p-5">
        {/* appearance */}
        <section>
          <h4 className="mb-3 text-sm font-semibold">Appearance</h4>
          <div className="flex items-center justify-between rounded-xl border border-border bg-surface-2 px-4 py-3">
            <div>
              <p className="text-sm font-medium">Theme</p>
              <p className="text-xs text-muted">{theme === "dark" ? "Dark" : "Light"} mode</p>
            </div>
            <button
              onClick={toggleTheme}
              className="relative h-7 w-12 rounded-full bg-surface-3 transition-colors"
              style={theme === "dark" ? { backgroundColor: "var(--primary)" } : undefined}
            >
              <span
                className="absolute top-1 h-5 w-5 rounded-full bg-white transition-all"
                style={{ left: theme === "dark" ? "26px" : "4px" }}
              />
            </button>
          </div>
        </section>

        {/* weekly goal */}
        <section>
          <h4 className="mb-3 text-sm font-semibold">Weekly goal</h4>
          <div className="rounded-xl border border-border bg-surface-2 px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{fmtMinutes(weeklyGoal)} per week</p>
              <span className="text-xs text-muted">target</span>
            </div>
            <input
              type="range"
              min={60}
              max={1200}
              step={30}
              value={weeklyGoal}
              onChange={(e) => setWeeklyGoal(Number(e.target.value))}
              className="mt-3 w-full"
            />
            <div className="mt-1 flex justify-between text-xs text-faint">
              <span>1h</span>
              <span>20h</span>
            </div>
          </div>
        </section>

        {/* data */}
        <section>
          <h4 className="mb-3 text-sm font-semibold">Data</h4>
          <div className="space-y-2">
            <Button variant="secondary" className="w-full justify-start" onClick={exportData}>
              ⬇️ Download backup (.json)
            </Button>
            <label className="flex w-full cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:text-text">
              ⬆️ Upload backup
              <input type="file" accept="application/json" className="hidden" onChange={importData} />
            </label>
            <button
              onClick={clearData}
              className="w-full rounded-xl border border-red/30 bg-red/5 px-4 py-2.5 text-left text-sm font-medium text-red transition-colors hover:bg-red/10"
            >
              🗑️ Clear all tracked data
            </button>
          </div>
          <p className="mt-3 text-xs text-faint">
            Everything syncs automatically to your cloud account. You can sign in from any device.
          </p>
        </section>

        <div className="border-t border-border pt-4 text-center text-xs text-faint">
          Built for GCSE students 💜
        </div>
      </div>
    </Modal>
  );
}
