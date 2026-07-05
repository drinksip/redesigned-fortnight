import { useState } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import AuthScreen from "./components/auth/AuthScreen";
import Cursor, { Grain } from "./components/Cursor";
import { Preloader } from "./components/motion";
import AppShell from "./components/layout/AppShell";
import DashboardView from "./views/DashboardView";
import TimetableView from "./views/TimetableView";
import GradesView from "./views/GradesView";
import SpecView from "./views/SpecView";
import AIView from "./views/AIView";
import LogView from "./views/LogView";
import PomodoroModal from "./components/modals/PomodoroModal";
import SettingsModal from "./components/modals/SettingsModal";
import TutorialModal from "./components/modals/TutorialModal";
import FeedbackModal from "./components/modals/FeedbackModal";
import YearGroupModal from "./components/modals/YearGroupModal";
import ShortcutsModal from "./components/modals/ShortcutsModal";

function Views() {
  const { tab } = useApp();
  switch (tab) {
    case "timetable":
      return <TimetableView />;
    case "grades":
      return <GradesView />;
    case "spec":
      return <SpecView />;
    case "ai":
      return <AIView />;
    case "log":
      return <LogView />;
    default:
      return <DashboardView />;
  }
}

function Modals() {
  return (
    <>
      <PomodoroModal />
      <SettingsModal />
      <TutorialModal />
      <FeedbackModal />
      <YearGroupModal />
      <ShortcutsModal />
    </>
  );
}

function Root() {
  const { checking, user } = useApp();
  const [preloaded, setPreloaded] = useState(
    () => sessionStorage.getItem("intro_played") === "1"
  );

  const finishIntro = () => {
    sessionStorage.setItem("intro_played", "1");
    setPreloaded(true);
  };

  return (
    <>
      <Grain />
      <Cursor />
      {!preloaded && <Preloader onDone={finishIntro} />}
      {checking ? (
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-4">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-surface-3 border-t-primary" />
          </div>
          <p className="text-sm text-muted">Loading your tracker…</p>
        </div>
      ) : !user ? (
        <AuthScreen />
      ) : (
        <>
          <AppShell>
            <Views />
          </AppShell>
          <Modals />
        </>
      )}
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Root />
    </AppProvider>
  );
}
