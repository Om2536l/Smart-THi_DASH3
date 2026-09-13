import React, { useState } from "react";
import { Zap, RotateCcw, ShieldAlert, Info, Activity, Check, Trash2 } from "lucide-react";
import { useAcknowledgedAlerts } from "../lib/useAcknowledgedAlerts.js";

const ICON = { correction: Zap, reclose: RotateCcw, trip: ShieldAlert, alert: Info, note: Activity };
const COLOR = { correction: "var(--signal)", reclose: "var(--warning)", trip: "var(--emergency)", alert: "var(--critical)", note: "var(--ink-mute)" };
const LABEL = { correction: "Correction", reclose: "Reclose", trip: "Protection", alert: "Alert", note: "Note" };

function ago(mins) {
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return `${h}h ${m}m ago`;
}

const FILTERS = ["all", "trip", "alert", "reclose", "correction"];

export default function AlertsPage({ unit }) {
  const [filter, setFilter] = useState("all");
  const [hideAcked, setHideAcked] = useState(false);
  const { acknowledge, isAcked } = useAcknowledgedAlerts();

  const events = unit.events; // already newest-first, includes {id?, kind, text, minutesAgo}
  const filtered = events.filter((e) => filter === "all" || e.kind === filter);
  const visible = hideAcked ? filtered.filter((e) => !isAcked(e)) : filtered;

  const clearAlerts = () => {
    if (!window.confirm("Clear the entire alert history for this device? This cannot be undone.")) return;
    localStorage.removeItem("smart-thi-live-alerts-v1");
    window.location.reload();
  };

  return (
    <div className="shell" style={{ paddingTop: 24, paddingBottom: 48 }}>
      <h1 style={{ marginBottom: 6 }}>Alerts</h1>
      <p className="muted" style={{ fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
        Every state change and protective action this device has reported, newest first.
        Acknowledging an alert is local to this browser — it doesn't change the device.
      </p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <div role="tablist" aria-label="Filter alerts" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {FILTERS.map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={filter === f ? "btn btn-accent" : "btn"}
              style={{ fontSize: 12.5, textTransform: "capitalize" }}
            >
              {f === "all" ? "All" : LABEL[f]}
            </button>
          ))}
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--ink-soft)", cursor: "pointer" }}>
          <input type="checkbox" checked={hideAcked} onChange={(e) => setHideAcked(e.target.checked)} />
          Hide acknowledged
        </label>
      </div>

      <div className="card" style={{ padding: events.length ? "6px 20px" : "18px 20px", marginBottom: 16 }}>
        {visible.length === 0 ? (
          <p className="mute" style={{ fontSize: 14.5, padding: "12px 0" }}>
            {events.length === 0 ? "No events recorded yet \u2014 conditions have stayed nominal." : "Nothing matches this filter."}
          </p>
        ) : (
          visible.map((e, i) => {
            const Icon = ICON[e.kind] ?? Info;
            const acked = isAcked(e);
            return (
              <div key={e.id ?? i} style={{ display: "flex", gap: 12, padding: "14px 0", borderTop: i > 0 ? "1px solid var(--line)" : "none", opacity: acked ? 0.55 : 1 }}>
                <div style={{ flex: "none", width: 32, height: 32, borderRadius: "50%", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={16} color={COLOR[e.kind]} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span className="mono" style={{ fontSize: 10.5, color: COLOR[e.kind], textTransform: "uppercase", letterSpacing: 0.5 }}>{LABEL[e.kind] ?? e.kind}</span>
                  </div>
                  <div style={{ fontSize: 14.5, marginTop: 2 }}>{e.text}</div>
                  <div className="mono mute" style={{ fontSize: 12.5, marginTop: 3 }}>{ago(e.minutesAgo)}</div>
                </div>
                {e.id != null && (
                  <button
                    className="icon-btn"
                    onClick={() => acknowledge(e)}
                    disabled={acked}
                    aria-label={acked ? "Acknowledged" : "Acknowledge this alert"}
                    title={acked ? "Acknowledged" : "Acknowledge"}
                    style={{ flex: "none", alignSelf: "flex-start" }}
                  >
                    <Check size={15} color={acked ? "var(--healthy)" : "var(--ink-mute)"} />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {events.length > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button className="btn" onClick={clearAlerts}>
            <Trash2 size={14} /> Clear alert history
          </button>
        </div>
      )}
    </div>
  );
}
