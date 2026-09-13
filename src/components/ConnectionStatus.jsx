import React from "react";
import { Wifi, WifiOff, Clock, Cpu, Thermometer, Droplets } from "lucide-react";

function ago(mins) {
  if (mins == null) return "\u2014";
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return `${h}h ${m}m ago`;
}

export default function ConnectionStatus({ node, tempWinding, tempAmbient, humidity }) {
  return (
    <div className="card" style={{ padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h2>Device connection</h2>
        <span
          className="pill"
          style={{
            background: node.online ? "var(--healthy-bg)" : "var(--emergency-bg)",
            color: node.online ? "var(--healthy)" : "var(--emergency)",
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          {node.online ? <Wifi size={13} /> : <WifiOff size={13} />}
          {node.online ? "Connected" : "Offline"}
        </span>
      </div>
      <p className="mute" style={{ fontSize: 12, marginBottom: 16 }}>
        Polling the ESP32 directly over its own WiFi hotspot — no live connection means no fresh readings, not a healthy transformer.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
            <Clock size={12} /> Last update
          </div>
          <div className="mono" style={{ fontSize: 12.5 }}>{ago(node.lastSeenMin)}</div>
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
            <Cpu size={12} /> Device uptime
          </div>
          <div className="mono" style={{ fontSize: 12.5 }}>{node.uptimeDays != null ? `${node.uptimeDays} days` : "\u2014"}</div>
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
            <Thermometer size={12} /> Winding / Ambient temp
          </div>
          <div className="mono" style={{ fontSize: 12.5 }}>
            {tempWinding != null ? `${tempWinding}\u00b0C` : "\u2014"} / {tempAmbient != null ? `${tempAmbient}\u00b0C` : "\u2014"}
          </div>
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
            <Droplets size={12} /> Humidity
          </div>
          <div className="mono" style={{ fontSize: 12.5 }}>{humidity != null ? `${humidity}%` : "\u2014"}</div>
        </div>
      </div>
    </div>
  );
}
