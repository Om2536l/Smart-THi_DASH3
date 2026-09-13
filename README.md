# SMART-THI — Live Unit Dashboard

This is the **field/demo build**: a lean, single-transformer dashboard wired directly
to a real ESP32 over WiFi. It's a sibling to the original multi-unit "Fleet" showcase
build (`Smart-THI-PF`) — that one stays as the large-scale vision piece for pitching
scope; this one is for showing the judges the real hardware actually working.

Reuses the same visual language and most of the same components (health-signature
radar, phase bars, trend charts, event log, methodology page) so the two builds feel
like one product family, but the data layer, routing, and page set are new.

## Pages

- **Live** (home) — health signature, three-phase current, connection status,
  decision-engine stage, historian preview, event log, and a local "Simulate overload"
  rehearsal button (doesn't touch real history/alerts — for demoing when hardware isn't powered).
- **History** — full trend record for TSI / THS / DRI / RUL, stored in this browser only.
- **Alerts** — every state change and protective action, filterable, with local acknowledge.
- **Methodology** — AHP vs. empirical weight derivation, state thresholds, safety scope
  (unchanged from the fleet build — this content doesn't depend on unit count).

## How it talks to the hardware

Two ways to run this, depending on setup stage:

**Self-hosted on the ESP32 (recommended for the actual demo)** — the ESP32 serves
this dashboard's own files *and* the JSON data from the same address over plain
HTTP. The dashboard's data layer already defaults to a same-origin relative fetch
(`/status`), so this works with zero configuration once the files are on the
device. No CORS header needed either, since it's no longer a cross-origin
request. Full walkthrough in **[ESP32_SELF_HOSTING.md](./ESP32_SELF_HOSTING.md)**.

**Running the dashboard from somewhere else** (a laptop dev server, or a public
host like GitHub Pages) — the ESP32 still runs in **SoftAP mode** (its own WiFi
hotspot, no router needed) and serves `GET /status`, but now it's a cross-origin
request, so append `?device=http://192.168.4.1/status` to the dashboard's URL,
and the ESP32 must send `Access-Control-Allow-Origin: *` on its response or the
browser will silently block the fetch.

> **If you host this on GitHub Pages / Netlify / Vercel:** those are HTTPS-only.
> Browsers block a secure page from fetching a plain-HTTP address (the ESP32
> can't easily do TLS) — this is "mixed content" blocking, and it isn't optional
> or fixable with a CORS header. A publicly hosted copy is fine as a shareable
> link/portfolio piece, but it will only ever show the offline "Waiting for
> device" state for anyone not on the ESP32's own WiFi. For the actual live
> demo, self-host on the ESP32 or run the dashboard locally on the venue laptop.

**Required JSON response shape:**

```json
{
  "tsi": 0.82,
  "ths": 88,
  "dri": 0.14,
  "rul": 27.4,
  "phase": [41, 42, 40],
  "temp_winding": 38.2,
  "temp_ambient": 27.1,
  "humidity": 55,
  "event": "NONE",
  "uptime_s": 12345
}
```

- `tsi`, `ths`, `dri`, `rul`, `phase` are **required** — everything else is optional and
  fields just show as "—" if the firmware doesn't send them yet.
- `event` is one of `NONE | ISOLATED | RECLOSE_ATTEMPT | RESTORED | LOCKOUT`, sent only
  when a protection action actually fires. If the firmware can't produce this yet, the
  dashboard still works fine — it derives state-band alerts (healthy → caution → warning
  → critical → emergency) client-side from `tsi`/`dri` alone.
- **CORS**: the ESP32 must send `Access-Control-Allow-Origin: *` on the response, or the
  browser will silently block the fetch.

If your device serves on a different address, load the dashboard with a query param:
`index.html?device=http://<ip>:<port>/status`.

## Data storage

History and alerts are stored in **this browser's `localStorage`**, not on a server —
last ~120 readings per index, last 200 alerts. Opening the dashboard on a different
device or clearing browser data starts a fresh record. There's a "Clear stored history"
/ "Clear alert history" button on each page for testing.

## Build

```
npm install
npm run build      # -> dist/
npm run dev        # watch mode
```

Same esbuild-based build as the fleet showcase — `dist/` is fully static, so it can be
opened directly, served from anywhere, or hosted alongside the ESP32 itself if you want
a fully self-contained offline demo.

## What's different from the Fleet showcase build

| | Fleet showcase | This (Live) build |
|---|---|---|
| Units | 8 mock, scripted 2-min demo arc | 1 real, live-polled |
| Pages | Fleet, Unit Detail, Network, Alerts, Methodology | Live, History, Alerts, Methodology |
| Data | Deterministic mock generator | Real ESP32 over SoftAP |
| Purpose | Pitch the at-scale vision | Prove the real system works |
