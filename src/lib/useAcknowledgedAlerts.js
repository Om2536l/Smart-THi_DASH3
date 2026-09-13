import { useEffect, useState } from "react";

const KEY = "smart-thi-acked-alerts";

function alertKey(a) {
  return String(a.id);
}

export function useAcknowledgedAlerts() {
  const [acked, setAcked] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(KEY) || "[]"));
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify([...acked]));
  }, [acked]);

  const acknowledge = (alert) => {
    setAcked((prev) => new Set(prev).add(alertKey(alert)));
  };
  const isAcked = (alert) => acked.has(alertKey(alert));

  return { acknowledge, isAcked };
}
