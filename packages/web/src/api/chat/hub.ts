import type { ServerWebSocket } from "bun";

export type WsData = { userId: string; name: string; role: string };
type WS = ServerWebSocket<WsData>;

// Registo de ligações por sala + conjunto de admins (para a caixa de entrada).
const roomSubs = new Map<string, Set<WS>>();
const adminSubs = new Set<WS>();

function join(ws: WS, room: string) {
  let set = roomSubs.get(room);
  if (!set) { set = new Set(); roomSubs.set(room, set); }
  set.add(ws);
}

// Uma ligação subscreve a comunidade + a sua própria conversa privada.
export function addSocket(ws: WS) {
  join(ws, "community");
  join(ws, `dm:${ws.data.userId}`);
  if (ws.data.role === "admin") adminSubs.add(ws);
}

export function removeSocket(ws: WS) {
  for (const set of roomSubs.values()) set.delete(ws);
  adminSubs.delete(ws);
}

// Envia para todos os subscritores de uma sala.
export function publish(room: string, payload: unknown) {
  const data = JSON.stringify(payload);
  roomSubs.get(room)?.forEach((ws) => { try { ws.send(data); } catch { /* ignore */ } });
}

// Mensagem privada: envia à aluna (sala dm) E a todas as admins ligadas
// (para a caixa de entrada atualizar ao vivo).
export function publishDm(room: string, payload: unknown) {
  publish(room, payload);
  const data = JSON.stringify(payload);
  adminSubs.forEach((ws) => { try { ws.send(data); } catch { /* ignore */ } });
}
