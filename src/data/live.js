import { useEffect, useMemo, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// SMART-THI live telemetry — polls the ESP32's own JSON endpoint directly.
//
// Transport: the ESP32 runs in SoftAP mode (its own WiFi hotspot, no router
// needed) and serves GET /status with CORS enabled. This dashboard, running
// on a laptop/phone connected to that hotspot, polls it every POLL_MS.
//
// Expected JSON payload from the device:
//   {
//     "tsi": 0.82, "ths": 88, "dri": 0.14, "rul": 27.4,
//     "phase": [41, 42, 40],
//     "temp_winding": 38.2, "temp_ambient": 27.1, "humidity": 55,
//     "event": "NONE",
//     "uptime_s": 12345
//   }
// "event" is one of: NONE | ISOLATED | RECLOSE_ATTEMPT | RESTORED | LOCKOUT
// Only tsi/ths/dri/rul/phase are required — everything else is optional and
// the dashboard degrades gracefully (fields just show as "—") if absent.
// ---------------------------------------------------------------------------

const DEFAULT_DEVICE_URL = "/status"; // same-origin: works when this dashboard is
// itself hosted by the ESP32 (recommended for the live demo — see
// ESP32_SELF_HOSTING.md). Pass ?device=http://<ip>/status to point at a
// different host, e.g. when running this dashboard from a laptop dev server
// against the ESP32's SoftAP address instead.
export const DEVICE_URL =
  new URLSearchParams(window.location.search).get("device") || DEFAULT_DEVICE_URL;

const POLL_MS = 2500;
const FETCH_TIMEOUT_MS = 2000;
const OFFLINE_AFTER_MS = 8000; // no good reading in this long -> show Offline
const HISTORY_POINTS = 120; // ~5 minutes of samples at POLL_MS = 2.5s

const HISTORY_KEY = "smart-thi-live-history-v1";
const ALERTS_KEY = "smart-thi-live-alerts-v1";
const MAX_STORED_ALERTS = 200;

export const DEVICE_ID = "SMART-THI-01";
export const DEVICE_LOCATION = "Bench Testbed \u2014 Sanjivani Campus";

export const STATES = ["healthy", "caution", "warning", "critical", "emergency"];

export const STATE_META = {
  healthy: { label: "Healthy", rank: 0, action: "No action needed" },
  caution: { label: "Caution", rank: 1, action: "No action \u2014 within normal variance" },
  warning: { label: "Warning", rank: 2, action: "Keep watching" },
  critical: { label: "Critical", rank: 3, action: "Check soon" },
  emergency: { label: "Emergency", rank: 4, action: "Act now" },
};

// Decision-engine state boundaries — shown on the Methodology page so judges
// can see these are tuned thresholds, not hidden magic numbers.
export const THRESHOLDS = [
  { state: "healthy", condition: "TSI \u2265 0.80  and  DRI < 0.20" },
  { state: "caution", condition: "0.60 \u2264 TSI < 0.80  or  0.20 \u2264 DRI < 0.40" },
  { state: "warning", condition: "0.40 \u2264 TSI < 0.60  or  0.40 \u2264 DRI < 0.60" },
  { state: "critical", condition: "0.20 \u2264 TSI < 0.40  or  0.60 \u2264 DRI < 0.80" },
  { state: "emergency", condition: "TSI < 0.20  or  DRI \u2265 0.80" },
];

// AHP vs empirical weight derivation — same methodology result shown before.
export const WEIGHTS = [
  { key: "Vs", label: "Voltage stability", ahp: 0.22, empirical: 0.19 },
  { key: "Cf", label: "Current fluctuation", ahp: 0.18, empirical: 0.21 },
  { key: "Tv", label: "Temperature variation", ahp: 0.24, empirical: 0.27 },
  { key: "PI", label: "Phase imbalance", ahp: 0.26, empirical: 0.23 },
  { key: "Lv", label: "Load variation", ahp: 0.10, empirical: 0.10 },
];
export const CONSISTENCY_RATIO = 0.043;

// Mirrors THRESHOLDS above — most severe band checked first.
export function classifyState(tsi, dri) {
  if (tsi == null || dri == null) return null;
  if (tsi < 0.2 || dri >= 0.8) return "emergency";
  if (tsi < 0.4 || dri >= 0.6) return "critical";
  if (tsi < 0.6 || dri >= 0.4) return "warning";
  if (tsi < 0.8 || dri >= 0.2) return "caution";
  return "healthy";
}

const EVENT_META = {
  ISOLATED: { kind: "trip", text: "Phase isolated \u2014 sustained fault threshold crossed", toastLevel: "critical" },
  RECLOSE_ATTEMPT: { kind: "reclose", text: "Test-reclose attempt in progress", toastLevel: "warning" },
  RESTORED: { kind: "reclose", text: "Restored to service \u2014 test-reclose confirmed stable", toastLevel: "healthy" },
  LOCKOUT: { kind: "trip", text: "Lockout \u2014 repeated reclose failures, awaiting manual reset", toastLevel: "critical" },
};

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable — non-fatal */
  }
}

function pushCapped(arr, value, cap) {
  const next = [...arr, value];
  return next.length > cap ? next.slice(next.length - cap) : next;
}

export function useLiveTelemetry() {
  const [latest, setLatest] = useState(null); // raw payload + derived state
  const [history, setHistory] = useState(() =>
    loadJSON(HISTORY_KEY, { tsi: [], ths: [], dri: [], rul: [] })
  );
  const [alerts, setAlerts] = useState(() => loadJSON(ALERTS_KEY, []));
  const [online, setOnline] = useState(false);
  const [lastSeenMs, setLastSeenMs] = useState(null);
  const [toasts, setToasts] = useState([]);

  const prevStateRef = useRef(null);
  const prevEventRef = useRef("NONE");
  const toastIdRef = useRef(0);
  const alertIdRef = useRef(Date.now());

  const pushAlert = (kind, text) => {
    const entry = { id: ++alertIdRef.current, kind, text, timestamp: Date.now() };
    setAlerts((prev) => {
      const next = [entry, ...prev].slice(0, MAX_STORED_ALERTS);
      saveJSON(ALERTS_KEY, next);
      return next;
    });
  };
  const pushToast = (level, text) => {
    toastIdRef.current += 1;
    setToasts((prev) => [...prev, { id: toastIdRef.current, level, text }]);
  };
  const dismissToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      try {
        const res = await fetch(DEVICE_URL, { cache: "no-store", signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload = await res.json();
        if (cancelled) return;

        const state = classifyState(payload.tsi, payload.dri);
        const now = Date.now();
        setLatest({ ...payload, state });
        setOnline(true);
        setLastSeenMs(now);

        setHistory((prev) => {
          const next = {
            tsi: pushCapped(prev.tsi, payload.tsi, HISTORY_POINTS),
            ths: pushCapped(prev.ths, payload.ths, HISTORY_POINTS),
            dri: pushCapped(prev.dri, payload.dri, HISTORY_POINTS),
            rul: pushCapped(prev.rul, payload.rul, HISTORY_POINTS),
          };
          saveJSON(HISTORY_KEY, next);
          return next;
        });

        // Real firmware-reported protection events.
        const ev = payload.event || "NONE";
        if (ev !== "NONE" && ev !== prevEventRef.current) {
          const meta = EVENT_META[ev];
          if (meta) {
            pushAlert(meta.kind, meta.text);
            pushToast(meta.toastLevel, meta.text);
          }
        }
        prevEventRef.current = ev;

        // State-band transitions, derived client-side regardless of firmware events.
        if (prevStateRef.current && state && state !== prevStateRef.current) {
          const prevRank = STATE_META[prevStateRef.current].rank;
          const rank = STATE_META[state].rank;
          if (rank > prevRank) {
            const text = `Condition worsened: ${STATE_META[prevStateRef.current].label} \u2192 ${STATE_META[state].label}`;
            pushAlert("alert", text);
            pushToast(state === "emergency" || state === "critical" ? "critical" : "warning", text);
          } else {
            const text = `Condition improved: ${STATE_META[prevStateRef.current].label} \u2192 ${STATE_META[state].label}`;
            pushAlert("correction", text);
            if (state === "healthy") pushToast("healthy", text);
          }
        }
        prevStateRef.current = state;
      } catch {
        clearTimeout(timeout);
        if (cancelled) return;
        setOnline((wasOnline) => {
          if (lastSeenMs && Date.now() - lastSeenMs < OFFLINE_AFTER_MS) return wasOnline;
          return false;
        });
      }
    }

    poll();
    const t = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build the same per-unit shape the existing components already expect,
  // so HealthSignature / PhaseBars / TrendChart / EventLog need no changes.
  const unit = useMemo(() => {
    const state = latest?.state || null;
    const eventsForLog = alerts.map((a) => ({
      id: a.id,
      kind: a.kind,
      text: a.text,
      minutesAgo: Math.max(0, Math.floor((Date.now() - a.timestamp) / 60000)),
    }));
    return {
      id: DEVICE_ID,
      feeder: DEVICE_LOCATION,
      state: state || "unknown",
      tsi: latest?.tsi ?? 0,
      ths: latest?.ths ?? 0,
      dri: latest?.dri ?? 0,
      rul: latest?.rul ?? 0,
      phase: latest?.phase || [0, 0, 0],
      aps: state ? STATE_META[state].action : "Waiting for first reading\u2026",
      trends: history,
      node: {
        online,
        lastSeenMin: lastSeenMs ? Math.floor((Date.now() - lastSeenMs) / 60000) : null,
        uptimeDays: latest?.uptime_s ? +(latest.uptime_s / 86400).toFixed(2) : null,
        firmware: latest?.fw || null,
      },
      events: eventsForLog,
      tempWinding: latest?.temp_winding ?? null,
      tempAmbient: latest?.temp_ambient ?? null,
      humidity: latest?.humidity ?? null,
    };
  }, [latest, history, alerts, online, lastSeenMs]);

  const hasData = latest !== null;

  return { unit, hasData, online, toasts, dismissToast };
}
