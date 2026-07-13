import { useEffect, useRef } from "react";
import { getToken } from "./auth";

// Liga ao WebSocket do chat e chama onMessage por cada mensagem recebida.
// Reconecta sozinho e envia "ping" periódico para manter a ligação viva.
export function useChatSocket(onMessage: (payload: any) => void) {
  const cbRef = useRef(onMessage);
  cbRef.current = onMessage;

  useEffect(() => {
    let ws: WebSocket | null = null;
    let closed = false;
    let pingTimer: ReturnType<typeof setInterval> | undefined;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      const token = getToken();
      if (!token) { reconnectTimer = setTimeout(connect, 3000); return; }
      const proto = location.protocol === "https:" ? "wss" : "ws";
      ws = new WebSocket(`${proto}://${location.host}/ws?token=${encodeURIComponent(token)}`);
      ws.onopen = () => {
        pingTimer = setInterval(() => { if (ws?.readyState === WebSocket.OPEN) ws.send("ping"); }, 25000);
      };
      ws.onmessage = (e) => { try { cbRef.current(JSON.parse(e.data)); } catch { /* ping/pong */ } };
      ws.onclose = () => { clearInterval(pingTimer); if (!closed) reconnectTimer = setTimeout(connect, 3000); };
      ws.onerror = () => { ws?.close(); };
    };
    connect();

    return () => { closed = true; clearInterval(pingTimer); clearTimeout(reconnectTimer); ws?.close(); };
  }, []);
}
