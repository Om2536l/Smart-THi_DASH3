import React, { useEffect, useState } from "react";
import { Sun, Moon, BookOpen, Radio, Activity, Clock3, Waypoints, Bell } from "lucide-react";
import { LOGO_ICON } from "../assets/logo.js";

const NAV = [
  { href: "#/", match: (h) => h === "#/" || h === "", label: "Live", icon: Activity },
  { href: "#/history", match: (h) => h.startsWith("#/history"), label: "History", icon: Clock3 },
  { href: "#/alerts", match: (h) => h.startsWith("#/alerts"), label: "Alerts", icon: Bell },
  { href: "#/methodology", match: (h) => h.startsWith("#/methodology"), label: "Methodology", icon: Waypoints },
];

export default function Header({ theme, onToggleTheme, online, alertCount, onOpenGlossary, hash }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const time = now.toLocaleTimeString("en-IN", { hour12: false });

  return (
    <header
      style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "var(--surface)",
        borderBottom: "1px solid var(--line)",
        boxShadow: "0 1px 0 var(--line), 0 4px 14px rgba(16,27,34,0.05)",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <div style={{ height: 3, background: "linear-gradient(90deg, var(--signal), var(--healthy) 50%, var(--signal))" }} />
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 66, gap: 10 }}>
        <a href="#/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "inherit", minWidth: 0, flex: "0 0 auto" }}>
          <div style={{ padding: 3, borderRadius: 10, background: "var(--signal-soft)", display: "flex", flex: "none" }}>
            <img src={LOGO_ICON} alt="SMART-THI" style={{ width: 24, height: 34, objectFit: "contain" }} />
          </div>
          <div style={{ minWidth: 0 }} id="wordmark">
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 18, lineHeight: 1.1, whiteSpace: "nowrap" }}>SMART-THI</div>
            <div className="eyebrow" style={{ fontSize: 10, whiteSpace: "nowrap" }} id="tagline">live unit dashboard</div>
          </div>
        </a>

        <nav aria-label="Primary" style={{ display: "flex", alignItems: "center", gap: 2, flex: "0 0 auto" }} id="primary-nav">
          {NAV.map((n) => {
            const active = n.match(hash || "#/");
            const Icon = n.icon;
            return (
              <a
                key={n.href}
                href={n.href}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "7px 10px", borderRadius: 8,
                  fontSize: 13, textDecoration: "none", flex: "none",
                  color: active ? "var(--signal)" : "var(--ink-soft)",
                  background: active ? "var(--signal-soft)" : "transparent",
                  fontWeight: active ? 500 : 400,
                  position: "relative",
                }}
              >
                <Icon size={16} style={{ flexShrink: 0 }} />
                <span className="nav-label">{n.label}</span>
                {n.label === "Alerts" && alertCount > 0 && (
                  <span className="mono" style={{ flexShrink: 0, background: "var(--emergency)", color: "#fff", fontSize: 10, borderRadius: 999, padding: "1px 5px", lineHeight: 1.4 }}>
                    {alertCount}
                  </span>
                )}
              </a>
            );
          })}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "0 1 auto", minWidth: 0, justifyContent: "flex-end" }}>
          <div
            className="mono"
            id="online-pill"
            style={{
              display: "flex", alignItems: "center", gap: 6, fontSize: 12, whiteSpace: "nowrap", flex: "none",
              color: online ? "var(--healthy)" : "var(--emergency)",
              background: online ? "var(--healthy-bg)" : "var(--emergency-bg)",
              padding: "5px 10px", borderRadius: 999,
            }}
          >
            <Radio size={13} />
            <span>{online ? "Connected" : "Offline"}</span>
          </div>
          <span className="mono mute" style={{ fontSize: 12, display: "none", minWidth: 74, flex: "none" }} id="clock-desktop">
            {time}
          </span>
          <button className="btn" onClick={onOpenGlossary} aria-label="Open the user manual" style={{ padding: "7px 12px", flex: "none" }}>
            <BookOpen size={16} style={{ flexShrink: 0 }} />
            <span id="manual-label">Manual</span>
          </button>
          <button className="icon-btn" onClick={onToggleTheme} aria-label="Toggle color theme" style={{ flex: "none" }}>
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </div>
      <style>{`
        @media (min-width: 560px) { #clock-desktop { display: inline-block !important; } }
        @media (max-width: 460px) { #tagline, #manual-label, .nav-label { display: none; } #primary-nav a { padding: 8px !important; } }
        @media (max-width: 360px) { #wordmark { display: none; } }
      `}</style>
    </header>
  );
}
