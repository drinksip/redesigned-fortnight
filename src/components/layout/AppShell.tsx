import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useApp, type TabId } from "../../context/AppContext";
import { fmtMinutes, revisionThisWeek } from "../../lib/utils";

const NAV: { id: TabId; label: string; short: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Overview", short: "Home", icon: <DotGrid /> },
  { id: "timetable", label: "Timetable", short: "Timetable", icon: <CalIcon /> },
  { id: "grades", label: "Subjects & grades", short: "Subjects", icon: <TrophyIcon /> },
  { id: "spec", label: "Spec tracker", short: "Spec", icon: <BookIcon /> },
  { id: "ai", label: "AI chats", short: "AI", icon: <SparkIcon /> },
  { id: "log", label: "Revision log", short: "Log", icon: <ClockIcon /> },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { tab, openModal, setTab } = useApp();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      if (e.key.toLowerCase() === "p") openModal("pomodoro");
      else if (e.key === "?") openModal("shortcuts");
      else if (e.key >= "0" && e.key <= "5") {
        const map: TabId[] = ["dashboard", "timetable", "grades", "spec", "ai", "log"];
        setTab(map[Number(e.key)]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openModal, setTab]);

  return (
    <div className="relative z-10 min-h-screen">
      <Sidebar active={tab} onSelect={setTab} />
      <MobileNav active={tab} onSelect={setTab} />
      <div className="lg:pl-[244px]">
        <Header />
        <main className="mx-auto max-w-6xl px-5 pb-28 pt-8 sm:px-8 lg:pb-16 lg:pt-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

/* ── Desktop sidebar ─────────────────────────────────────── */
function Sidebar({ active, onSelect }: { active: TabId; onSelect: (t: TabId) => void }) {
  const { data } = useApp();
  return (
    <aside className="glass fixed left-0 top-0 z-30 hidden h-screen w-[244px] flex-col border-r border-border lg:flex">
      <div className="flex items-center px-5 pt-6">
        <Logo />
      </div>

      <nav className="mt-8 flex-1 space-y-0.5 px-3">
        {NAV.map((n) => (
          <button
            key={n.id}
            onClick={() => onSelect(n.id)}
            className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
              active === n.id ? "bg-[var(--primary-soft)] text-primary" : "text-muted hover:bg-[var(--surface-2)] hover:text-text"
            }`}
          >
            <span className={`flex h-5 w-5 items-center justify-center ${active === n.id ? "text-primary" : "text-faint group-hover:text-muted"}`}>
              {n.icon}
            </span>
            <span className="flex-1 text-left">{n.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4">
        <button
          onClick={() => useApp().openModal("pomodoro")}
          className="group flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:border-border-2"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--red)]/15 text-[var(--red)]">
            <TomatoIcon />
          </span>
          <span className="flex-1 text-sm font-semibold">Focus timer</span>
        </button>
        <div className="mt-4 px-1 text-sm text-muted">
          {data.subjects.length} subjects · {fmtMinutes(revisionThisWeek(data.revisionLog))} this week
        </div>
      </div>
    </aside>
  );
}

/* ── Mobile bottom nav ───────────────────────────────────── */
function MobileNav({ active, onSelect }: { active: TabId; onSelect: (t: TabId) => void }) {
  return (
    <nav className="glass fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-border px-1 py-2 lg:hidden">
      {NAV.map((n) => (
        <button
          key={n.id}
          onClick={() => onSelect(n.id)}
          className={`flex flex-1 flex-col items-center gap-1 rounded-lg px-1 py-1 text-[9px] font-medium transition-colors ${
            active === n.id ? "text-primary" : "text-faint"
          }`}
        >
          <span className="flex h-5 w-5 items-center justify-center">{n.icon}</span>
          <span className="truncate">{n.short}</span>
        </button>
      ))}
    </nav>
  );
}

/* ── Top header ──────────────────────────────────────────── */
function Header() {
  const { user, data, saving, theme, toggleTheme, openModal, logout, setData } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { openModal: om } = useApp();

  useEffect(() => {
    const onDown = (e: MouseEvent) => menuRef.current && !menuRef.current.contains(e.target as Node) && setMenuOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "gcse-tracker-backup.json";
    a.click();
    setMenuOpen(false);
  };
  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const d = JSON.parse(ev.target?.result as string);
        setData((prev) => ({ ...prev, ...d, username: prev.username }));
      } catch { alert("Invalid backup file."); }
    };
    reader.readAsText(file);
    e.target.value = "";
    setMenuOpen(false);
  };

  return (
    <header className="glass sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-border px-5 sm:px-8">
      <div className="flex items-center gap-2 lg:hidden">
        <Logo small />
      </div>

      <div className="hidden items-center gap-2 lg:flex">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${saving ? "bg-[var(--amber)]/12 text-[var(--amber)]" : "bg-[var(--green)]/12 text-[var(--green)]"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${saving ? "bg-[var(--amber)]" : "bg-[var(--green)] pulse-dot"}`} />
          {saving ? "Saving" : "Synced"}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <button onClick={toggleTheme} aria-label="Toggle theme" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-[var(--surface-2)] hover:text-text">
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>
        <button onClick={() => om("pomodoro")} aria-label="Pomodoro" className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--red)] transition-colors hover:bg-[var(--red)]/10">
          <TomatoIcon />
        </button>

        <div className="relative ml-1" ref={menuRef}>
          <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-2 rounded-xl border border-border py-1 pl-1 pr-2.5 transition-colors hover:border-border-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--primary)] text-xs font-bold text-[var(--primary-fg)]">
              {user?.username?.[0]?.toUpperCase() ?? "?"}
            </span>
            <span className="hidden text-sm font-medium sm:block">{user?.username}</span>
            <ChevronIcon className="h-4 w-4 text-faint" />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-12 w-60 overflow-hidden rounded-xl border border-border bg-[var(--surface)] p-1.5 shadow-2xl shadow-black/30 backdrop-blur"
              >
                <div className="border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold">{user?.username}</p>
                  <p className="text-xs text-muted">Year {data.yearGroup}</p>
                </div>
                <div className="p-1.5">
                  <MenuItem icon="⚙️" onClick={() => { openModal("settings"); setMenuOpen(false); }}>Settings</MenuItem>
                  <MenuItem icon="🎓" onClick={() => { openModal("yearGroup"); setMenuOpen(false); }}>Change year group</MenuItem>
                  <MenuItem icon="⬇️" onClick={exportData}>Download backup</MenuItem>
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-[var(--surface-2)] hover:text-text">
                    <span>⬆️</span> Upload backup
                    <input type="file" accept="application/json" className="hidden" onChange={importData} />
                  </label>
                  <MenuItem icon="⌨️" onClick={() => { openModal("shortcuts"); setMenuOpen(false); }}>Shortcuts</MenuItem>
                  <MenuItem icon="🧭" onClick={() => { openModal("tutorial"); setMenuOpen(false); }}>App tour</MenuItem>
                  <MenuItem icon="💬" onClick={() => { openModal("feedback"); setMenuOpen(false); }}>Send feedback</MenuItem>
                  <div className="my-1 border-t border-border" />
                  <MenuItem icon="🚪" danger onClick={() => { logout(); setMenuOpen(false); }}>Sign out</MenuItem>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}

function MenuItem({ children, icon, onClick, danger }: { children: React.ReactNode; icon: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--surface-2)] ${danger ? "text-[var(--red)] hover:bg-[var(--red)]/10" : "text-muted hover:text-text"}`}>
      <span>{icon}</span>{children}
    </button>
  );
}

/* ── Icons ───────────────────────────────────────────────── */
function Logo({ small }: { small?: boolean }) {
  const s = small ? "h-8 w-8" : "h-9 w-9";
  const i = small ? 15 : 17;
  return (
    <div className={`relative flex ${s} items-center justify-center overflow-hidden rounded-xl bg-[var(--primary)] text-[var(--primary-fg)] shadow-lg shadow-[var(--primary)]/30`}>
      <svg viewBox="0 0 24 24" width={i} height={i} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19V5l8 5 8-5v14" />
      </svg>
    </div>
  );
}
const P = { viewBox: "0 0 24 24", className: "h-[17px] w-[17px]", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const P5 = { ...P, strokeWidth: 2 };
function DotGrid() { return <svg {...P}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>; }
function CalIcon() { return <svg {...P}><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>; }
function TrophyIcon() { return <svg {...P}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M6 4h12v5a6 6 0 0 1-12 0zM12 15v3M8 22h8M9 18h6" /></svg>; }
function BookIcon() { return <svg {...P}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>; }
function SparkIcon() { return <svg {...P}><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /></svg>; }
function ClockIcon() { return <svg {...P}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>; }
function SunIcon() { return <svg {...P}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>; }
function MoonIcon() { return <svg {...P}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>; }
function TomatoIcon() { return <svg {...P5} className="h-[17px] w-[17px]"><path d="M12 7c0-2 1-3 3-3M12 7c-3.5 0-7 2.5-7 7 0 4 3 7 7 7s7-3 7-7c0-4.5-3.5-7-7-7z" /></svg>; }
function ChevronIcon({ className }: { className?: string }) { return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>; }
