import React, { useState } from "react";
import { Trash2 } from "lucide-react";
import TrendChart from "../components/TrendChart.jsx";

const METRICS = [
  { key: "tsi", label: "TSI", unit: "", desc: "Transformer Stability Index \u2014 how steady voltage, current and temperature are right now." },
  { key: "ths", label: "THS", unit: "%", desc: "Transformer Health Score \u2014 long-term condition, moves over weeks not minutes." },
  { key: "dri", label: "DRI", unit: "", desc: "Dynamic Risk Index \u2014 likelihood of failure if current conditions continue." },
  { key: "rul", label: "RUL", unit: "y", desc: "Remaining Useful Life \u2014 IEEE C57.91 thermal-ageing model, winding-proximate temperature." },
];

export default function HistoryPage({ unit }) {
  const [metric, setMetric] = useState("tsi");
  const active = METRICS.find((m) => m.key === metric);
  const points = unit.trends[metric];

  const clearHistory = () => {
    if (!window.confirm("Clear all locally stored history for this device? This cannot be undone.")) return;
    localStorage.removeItem("smart-thi-live-history-v1");
    window.location.reload();
  };

  return (
    <div className="shell" style={{ paddingTop: 24, paddingBottom: 48 }}>
      <h1 style={{ marginBottom: 6 }}>History</h1>
      <p className="muted" style={{ fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
        Every reading this device has sent, plotted as it arrives — stored locally in this browser,
        not on a server. Clearing browser data or opening the dashboard on a different device starts a fresh record.
      </p>

      <div role="tablist" aria-label="Select index" style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {METRICS.map((m) => (
          <button
            key={m.key}
            role="tab"
            aria-selected={metric === m.key}
            onClick={() => setMetric(m.key)}
            className={metric === m.key ? "btn btn-accent" : "btn"}
            style={{ fontSize: 13 }}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: "18px 20px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
          <h2>{active.label} over time</h2>
          <span className="mono mute" style={{ fontSize: 12 }}>{points.length} reading{points.length === 1 ? "" : "s"} stored</span>
        </div>
        <p className="mute" style={{ fontSize: 12.5, marginBottom: 14 }}>{active.desc}</p>
        {points.length > 1 ? (
          <TrendChart points={points} unit={active.unit} metric={metric} width={860} height={280} />
        ) : (
          <p className="mute" style={{ fontSize: 13.5 }}>Not enough readings yet — this fills in as the device reports data.</p>
        )}
      </div>

      <div className="card" style={{ padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <p className="mute" style={{ fontSize: 12.5 }}>
          History keeps the most recent {points.length < 120 ? "readings" : "120 readings"} per index on this device.
        </p>
        <button className="btn" onClick={clearHistory}>
          <Trash2 size={14} /> Clear stored history
        </button>
      </div>
    </div>
  );
}
