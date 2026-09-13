import React, { useEffect, useMemo, useState } from "react";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import GlossaryPanel from "./components/GlossaryPanel.jsx";
import ToastStack from "./components/ToastStack.jsx";
import LivePage from "./pages/LivePage.jsx";
import HistoryPage from "./pages/HistoryPage.jsx";
import AlertsPage from "./pages/AlertsPage.jsx";
import MethodologyPage from "./pages/MethodologyPage.jsx";
import { useLiveTelemetry } from "./data/live.js";
import { useAcknowledgedAlerts } from "./lib/useAcknowledgedAlerts.js";

function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash || "#/");
  useEffect(() => {
    const onChange = () => setHash(window.location.hash || "#/");
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return hash;
}

function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem("smart-thi-theme") || "light");
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("smart-thi-theme", theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#0B1417" : "#F3F6F5");
  }, [theme]);
  return [theme, setTheme];
}

export default function App() {
  const hash = useHashRoute();
  const [theme, setTheme] = useTheme();
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const { unit, hasData, online, toasts, dismissToast } = useLiveTelemetry();
  const { isAcked } = useAcknowledgedAlerts();

  const openAlertCount = useMemo(
    () => unit.events.filter((a) => !isAcked(a)).length,
    [unit.events, isAcked]
  );

  useEffect(() => { window.scrollTo(0, 0); }, [hash]);

  let page;
  if (hash.startsWith("#/history")) {
    page = <HistoryPage unit={unit} />;
  } else if (hash.startsWith("#/alerts")) {
    page = <AlertsPage unit={unit} />;
  } else if (hash.startsWith("#/methodology")) {
    page = <MethodologyPage />;
  } else {
    page = <LivePage unit={unit} hasData={hasData} />;
  }

  return (
    <>
      <Header
        theme={theme}
        onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
        online={online}
        onOpenGlossary={() => setGlossaryOpen(true)}
        hash={hash}
        alertCount={openAlertCount}
      />
      <main>{page}</main>
      <Footer />
      <GlossaryPanel open={glossaryOpen} onClose={() => setGlossaryOpen(false)} />
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
