import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { firebase } from "../lib/firebase";
import {
  defaultData,
  deriveSubjects,
  normalizeTimetable,
  THEME_KEY,
  TUTORIAL_KEY,
  WEEKLY_GOAL_KEY,
} from "../lib/utils";
import type { AppUser, UserData } from "../lib/types";

export type TabId =
  | "dashboard"
  | "timetable"
  | "grades"
  | "spec"
  | "ai"
  | "log";

type Theme = "light" | "dark";

type ModalName =
  | "pomodoro"
  | "settings"
  | "tutorial"
  | "feedback"
  | "yearGroup"
  | "shortcuts";

interface AppContextValue {
  checking: boolean;
  saving: boolean;
  user: AppUser | null;
  data: UserData;
  theme: Theme;
  tab: TabId;
  weeklyGoal: number;
  modals: Record<ModalName, boolean>;
  authError: string;
  setData: (updater: UserData | ((d: UserData) => UserData)) => void;
  setTab: (t: TabId) => void;
  setWeeklyGoal: (n: number) => void;
  toggleTheme: () => void;
  openModal: (m: ModalName) => void;
  closeModal: (m: ModalName) => void;
  /** Add/remove a subject from the master list. */
  toggleSubject: (id: string) => void;
  login: (u: string, p: string) => Promise<void>;
  register: (u: string, p: string, year: "10" | "11") => Promise<void>;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

function defaultGoal(year: "10" | "11") {
  return year === "10" ? 300 : 600;
}

/**
 * Normalise a freshly-loaded document: ensure a `subjects` list exists and the
 * timetable has no legacy/ghost keys. Returns a fresh object (never mutates).
 */
function normalize(d: UserData): UserData {
  const subjects = deriveSubjects(d);
  const timetable = normalizeTimetable(d.timetable || {});
  return { ...d, subjects, timetable };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [data, setDataState] = useState<UserData>(defaultData(""));
  const [authError, setAuthError] = useState("");
  const [tab, setTab] = useState<TabId>("dashboard");
  const [modals, setModals] = useState<Record<ModalName, boolean>>({
    pomodoro: false,
    settings: false,
    tutorial: false,
    feedback: false,
    yearGroup: false,
    shortcuts: false,
  });

  /* ── Theme ────────────────────────────────────────────── */
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem(THEME_KEY) as Theme | null;
    if (saved) return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);
  const toggleTheme = useCallback(
    () => setTheme((t) => (t === "dark" ? "light" : "dark")),
    []
  );

  /* ── Weekly goal ──────────────────────────────────────── */
  const [weeklyGoal, setWeeklyGoalState] = useState<number>(() => {
    const v = Number(localStorage.getItem(WEEKLY_GOAL_KEY));
    return v > 0 ? v : 600;
  });
  const setWeeklyGoal = useCallback((n: number) => {
    setWeeklyGoalState(n);
    localStorage.setItem(WEEKLY_GOAL_KEY, String(n));
  }, []);

  /* ── Modals ───────────────────────────────────────────── */
  const openModal = useCallback(
    (m: ModalName) => setModals((s) => ({ ...s, [m]: true })),
    []
  );
  const closeModal = useCallback(
    (m: ModalName) => setModals((s) => ({ ...s, [m]: false })),
    []
  );

  /* ── Data setter + debounced cloud sync ───────────────── */
  const latestData = useRef<UserData>(data);
  latestData.current = data;
  const savingUid = useRef<string | null>(null);

  const setData = useCallback(
    (updater: UserData | ((d: UserData) => UserData)) => {
      setDataState((prev) =>
        typeof updater === "function"
          ? (updater as (d: UserData) => UserData)(prev)
          : updater
      );
    },
    []
  );

  const toggleSubject = useCallback((id: string) => {
    setDataState((prev) => {
      const has = prev.subjects.includes(id);
      const subjects = has
        ? prev.subjects.filter((s) => s !== id)
        : [...prev.subjects, id];
      // keep grades/spec in sync: dropping a subject clears its grades
      const grades = { ...prev.grades };
      if (has) {
        delete grades[id];
      } else {
        grades[id] = { target: null, predicted: null, working: null };
      }
      return { ...prev, subjects, grades };
    });
  }, []);

  // Debounced save whenever `data` changes (skips the first change after login).
  useEffect(() => {
    if (!user) return;
    if (savingUid.current !== user.uid) {
      savingUid.current = user.uid; // hydration — don't echo straight back
      return;
    }
    const t = window.setTimeout(() => {
      setSaving(true);
      firebase
        .saveData(user.uid, latestData.current)
        .catch(() => {})
        .finally(() => setSaving(false));
    }, 900);
    return () => window.clearTimeout(t);
  }, [data, user]);

  /* ── Hydration ────────────────────────────────────────── */
  const hydrate = useCallback(
    (uid: string, username: string, raw: UserData) => {
      const d = normalize(raw);
      setDataState(d);
      setUser({ uid, username, data: d });
      if (!localStorage.getItem(WEEKLY_GOAL_KEY))
        setWeeklyGoal(defaultGoal(d.yearGroup));
      if (!d.tutorialDone && !localStorage.getItem(TUTORIAL_KEY))
        setTimeout(() => setModals((s) => ({ ...s, tutorial: true })), 700);
      if (!d.yearGroup)
        setTimeout(() => setModals((s) => ({ ...s, yearGroup: true })), 400);
    },
    [setWeeklyGoal]
  );

  useEffect(() => {
    const unsub = firebase.onAuthChange(async (uid) => {
      if (uid) {
        try {
          const raw = await firebase.loadDoc(uid);
          if (raw)
            hydrate(
              uid,
              raw.username || "student",
              { ...defaultData("student"), ...raw }
            );
        } catch (e) {
          console.error(e);
        }
      }
      setChecking(false);
    });
    return () => unsub();
  }, [hydrate]);

  /* ── Auth actions ─────────────────────────────────────── */
  const login = useCallback(
    async (username: string, password: string) => {
      setAuthError("");
      try {
        const { uid, username: uname, data: d } = await firebase.login(
          username,
          password
        );
        hydrate(uid, uname, d);
      } catch (e: any) {
        const code = e?.code ?? "";
        setAuthError(
          code.includes("invalid-credential") || code.includes("wrong-password")
            ? "Incorrect username or password."
            : code.includes("user-not-found")
            ? "No account found with that username."
            : "Could not sign in. Please try again."
        );
        throw e;
      }
    },
    [hydrate]
  );

  const register = useCallback(
    async (username: string, password: string, year: "10" | "11") => {
      setAuthError("");
      try {
        const { uid, username: uname, data: d } = await firebase.register(
          username,
          password,
          year
        );
        hydrate(uid, uname, d);
      } catch (e: any) {
        const code = e?.code ?? "";
        setAuthError(
          code.includes("email-already-in-use")
            ? "That username is already taken."
            : code.includes("weak-password")
            ? "Password should be at least 6 characters."
            : "Could not create account. Please try again."
        );
        throw e;
      }
    },
    [hydrate]
  );

  const logout = useCallback(async () => {
    await firebase.logout();
    savingUid.current = null;
    setUser(null);
    setDataState(defaultData(""));
    setTab("dashboard");
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      checking,
      saving,
      user,
      data,
      theme,
      tab,
      weeklyGoal,
      modals,
      authError,
      setData,
      setTab,
      setWeeklyGoal,
      toggleTheme,
      openModal,
      closeModal,
      toggleSubject,
      login,
      register,
      logout,
    }),
    [
      checking,
      saving,
      user,
      data,
      theme,
      tab,
      weeklyGoal,
      modals,
      authError,
      setData,
      toggleSubject,
      toggleTheme,
      openModal,
      closeModal,
      login,
      register,
      logout,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
