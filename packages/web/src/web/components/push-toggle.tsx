import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { getToken } from "../lib/auth";

const supported = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

// Botão de ativar/desativar notificações push neste dispositivo.
export function PushToggle() {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState(!supported);

  useEffect(() => {
    if (!supported) return;
    navigator.serviceWorker.getRegistration().then(async (reg) => {
      const sub = await reg?.pushManager.getSubscription();
      setEnabled(!!sub);
    });
  }, []);

  const toggle = async () => {
    if (!supported || busy) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const existing = await reg.pushManager.getSubscription();

      if (existing) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify({ endpoint: existing.endpoint }),
        });
        await existing.unsubscribe();
        setEnabled(false);
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      const keyRes = await fetch("/api/push/vapid-public-key", { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!keyRes.ok) { setUnavailable(true); return; }
      const { key } = await keyRes.json() as { key: string };

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(sub.toJSON()),
      });
      setEnabled(true);
    } catch (e) {
      console.error("Push toggle error:", e);
    } finally {
      setBusy(false);
    }
  };

  if (unavailable) return null;

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer border transition-opacity hover:opacity-80 disabled:opacity-60"
      style={enabled
        ? { background: "#DCFCE7", color: "#16A34A", borderColor: "#DCFCE7" }
        : { borderColor: "var(--gray-lt)", color: "var(--gray)", background: "var(--white)" }}
    >
      {enabled ? <Bell size={14} /> : <BellOff size={14} />}
      {busy ? "..." : enabled ? "Notificações ativas" : "Ativar notificações"}
    </button>
  );
}
