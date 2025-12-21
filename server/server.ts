import WebSocket, { WebSocketServer } from "ws";
import { randomUUID } from "crypto";

type ClientMsg =
  | { type: "hello"; nickname: string }
  | { type: "connect"; targetNickname: string }
  | { type: "connect_accept"; requestId: string }
  | { type: "connect_reject"; requestId: string }
  | { type: "connect_cancel"; requestId: string }
  | { type: "message"; text: string }
  | { type: "leave" };

type ServerMsg =
  | { type: "hello_ok"; sessionId: string }
  | { type: "waiting"; requestId: string; targetNickname: string; expiresAt: number }
  | { type: "incoming_request"; requestId: string; fromNickname: string; expiresAt: number }
  | { type: "paired"; peerNickname: string; sessionId: string }
  | { type: "message"; text: string; from: string; timestamp: string }
  | { type: "system"; text: string; type_: "user_joined" | "user_left" | "connection_established" | "peer_disconnected" }
  | { type: "session_end"; reason: "peer_disconnected" | "timeout" | "user_leave" | "error" }
  | { type: "error"; code: string; message: string };

type SessionEndReason = "peer_disconnected" | "timeout" | "user_leave" | "error";

interface User {
  id: string;
  nickname: string;
  ws: WebSocket;
  pairedWith?: string; // nickname peer
  sessionId?: string;  // shared session id when paired
  lastSeenAt: number;
}

interface Session {
  id: string;
  a: string; // nickname
  b: string; // nickname
  createdAt: number;
  lastActivityAt: number;
}

interface PendingRequest {
  id: string;
  from: string; // nickname
  to: string; // nickname
  createdAt: number;
  expiresAt: number;
}

const PORT = Number(process.env.PORT ?? 8080);
const SESSION_TIMEOUT_MS = Number(process.env.SESSION_TIMEOUT_MS ?? 10 * 60 * 1000);
const REQUEST_TTL_MS = 60_000;

const usersByNick = new Map<string, User>();
const nickByWs = new Map<WebSocket, string>();
const sessionsById = new Map<string, Session>();
const pendingById = new Map<string, PendingRequest>();
const pendingByTo = new Map<string, string>();
const pendingByFrom = new Map<string, string>();

function deletePending(pr: PendingRequest) {
  pendingById.delete(pr.id);
  pendingByFrom.delete(pr.from);
  pendingByTo.delete(pr.to);
}

function now() {
  return Date.now();
}

function validateNickname(nickname: string): { ok: true } | { ok: false; msg: string } {
  const n = nickname.trim();
  if (n.length < 2 || n.length > 20) return { ok: false, msg: "Nickname length must be 2..20" };
  if (!/^[a-zA-Z0-9_-]+$/.test(n)) return { ok: false, msg: "Nickname regex must match /^[a-zA-Z0-9_-]+$/" };
  return { ok: true };
}

function validateMessage(text: string): { ok: true } | { ok: false; msg: string } {
  const t = text.trim();
  if (t.length < 1 || t.length > 2000) return { ok: false, msg: "Message length must be 1..2000" };
  return { ok: true };
}

function send(ws: WebSocket, msg: ServerMsg) {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(msg));
}

function sendToNick(nick: string, msg: ServerMsg) {
  const u = usersByNick.get(nick);
  if (!u) return;
  send(u.ws, msg);
}

function endSession(sessionId: string, reason: SessionEndReason) {
  const s = sessionsById.get(sessionId);
  if (!s) return;

  const ua = usersByNick.get(s.a);
  const ub = usersByNick.get(s.b);

  if (ua) {
    ua.pairedWith = undefined;
    ua.sessionId = undefined;
    send(ua.ws, { type: "session_end", reason } as ServerMsg);
  }
  if (ub) {
    ub.pairedWith = undefined;
    ub.sessionId = undefined;
    send(ub.ws, { type: "session_end", reason } as ServerMsg);
  }

  sessionsById.delete(sessionId);
  console.log("[Server] [SessionEnd]", sessionId, reason);
}

function cleanupPendingForNickname(nick: string) {
  const outId = pendingByFrom.get(nick);
  if (outId) {
    const pr = pendingById.get(outId);
    pendingByFrom.delete(nick);
    if (pr) {
      pendingById.delete(outId);
      pendingByTo.delete(pr.to);
      sendToNick(pr.to, { type: "error", code: "REQUEST_CANCELED", message: `${pr.from} disconnected` });
      console.log("[Server] [PendingCanceled]", pr.from, "->", pr.to, outId);
    }
  }

  const inId = pendingByTo.get(nick);
  if (inId) {
    const pr = pendingById.get(inId);
    pendingByTo.delete(nick);
    if (pr) {
      pendingById.delete(inId);
      pendingByFrom.delete(pr.from);
      sendToNick(pr.from, { type: "error", code: "REQUEST_CANCELED", message: `${pr.to} disconnected` });
      console.log("[Server] [PendingCanceled]", pr.from, "->", pr.to, inId);
    }
  }
}

function cleanupUser(ws: WebSocket) {
  const nick = nickByWs.get(ws);
  if (!nick) return;

  cleanupPendingForNickname(nick);

  const u = usersByNick.get(nick);
  if (!u) {
    nickByWs.delete(ws);
    return;
  }

  // if in session -> notify peer and end session
  if (u.sessionId) {
    const s = sessionsById.get(u.sessionId);
    if (s) {
      const peerNick = s.a === nick ? s.b : s.a;
      sendToNick(peerNick, {
        type: "system",
        text: `${nick} disconnected`,
        type_: "peer_disconnected",
      });
      endSession(s.id, "peer_disconnected");
    }
  }

  usersByNick.delete(nick);
  nickByWs.delete(ws);
  console.log("[Server] [UserRemoved]", nick);
}

const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (ws) => {
  console.log("[Server] [WS] connect", wss.clients.size);

  ws.on("message", (raw) => {
    try {
      const data = typeof raw === "string" ? raw : raw.toString("utf-8");
      const msg = JSON.parse(data) as ClientMsg;

      if (msg.type === "hello") {
        const nickname = msg.nickname.trim();
        const v = validateNickname(nickname);
        if (!v.ok) {
          send(ws, { type: "error", code: "INVALID_NICKNAME", message: v.msg });
          return;
        }
        if (usersByNick.has(nickname)) {
          send(ws, { type: "error", code: "NICKNAME_TAKEN", message: "Nickname already taken" });
          return;
        }

        const u: User = { id: randomUUID(), nickname, ws, lastSeenAt: now() };
        usersByNick.set(nickname, u);
        nickByWs.set(ws, nickname);

        send(ws, { type: "hello_ok", sessionId: u.id });
        console.log("[Server] [HelloOk]", nickname, u.id);
        return;
      }

      const senderNick = nickByWs.get(ws);
      if (!senderNick) {
        send(ws, { type: "error", code: "NOT_REGISTERED", message: "Send hello first" });
        return;
      }

      const sender = usersByNick.get(senderNick);
      if (!sender) {
        send(ws, { type: "error", code: "NOT_REGISTERED", message: "User not found" });
        return;
      }
      sender.lastSeenAt = now();

      if (msg.type === "connect") {
        const targetNickname = msg.targetNickname.trim();
        const vt = validateNickname(targetNickname);
        if (!vt.ok) {
          send(ws, { type: "error", code: "INVALID_TARGET", message: vt.msg });
          return;
        }
        if (targetNickname === senderNick) {
          send(ws, { type: "error", code: "SELF_CONNECT", message: "Cannot connect to yourself" });
          return;
        }

        const target = usersByNick.get(targetNickname);
        if (!target) {
          send(ws, { type: "error", code: "USER_NOT_FOUND", message: "Target not found" });
          return;
        }
        if (sender.sessionId || sender.pairedWith) {
          send(ws, { type: "error", code: "SENDER_BUSY", message: "You are already in a session" });
          return;
        }
        if (target.sessionId || target.pairedWith) {
          send(ws, { type: "error", code: "TARGET_BUSY", message: "Target is already in a session" });
          return;
        }
        if (pendingByFrom.has(senderNick)) {
          send(ws, { type: "error", code: "REQUEST_ALREADY_SENT", message: "You already have a pending request" });
          return;
        }
        if (pendingByTo.has(targetNickname)) {
          send(ws, { type: "error", code: "TARGET_HAS_PENDING", message: "Target already has a pending request" });
          return;
        }

        const requestId = randomUUID();
        const createdAt = now();
        const expiresAt = createdAt + REQUEST_TTL_MS;
        const pr: PendingRequest = { id: requestId, from: senderNick, to: targetNickname, createdAt, expiresAt };
        pendingById.set(requestId, pr);
        pendingByFrom.set(senderNick, requestId);
        pendingByTo.set(targetNickname, requestId);

        send(ws, { type: "waiting", requestId, targetNickname, expiresAt });

        send(target.ws, { type: "incoming_request", requestId, fromNickname: senderNick, expiresAt });

        console.log("[Server] [RequestSent]", senderNick, "->", targetNickname, requestId);
        return;
      }

      if (msg.type === "connect_accept") {
        const requestId = msg.requestId;
        const pr = pendingById.get(requestId);
        if (!pr) {
          send(ws, { type: "error", code: "REQUEST_NOT_FOUND", message: "Request not found" });
          return;
        }
        if (pr.to !== senderNick) {
          send(ws, { type: "error", code: "REQUEST_FORBIDDEN", message: "Not your request" });
          return;
        }

        deletePending(pr);

        const fromUser = usersByNick.get(pr.from);
        const toUser = usersByNick.get(pr.to);

        if (!fromUser || !toUser) {
          send(ws, { type: "error", code: "USER_OFFLINE", message: "User offline" });
          if (fromUser) send(fromUser.ws, { type: "error", code: "REQUEST_FAILED", message: "Target offline" });
          return;
        }
        if (fromUser.sessionId || fromUser.pairedWith || toUser.sessionId || toUser.pairedWith) {
          send(ws, { type: "error", code: "USER_BUSY", message: "Someone is already in session" });
          send(fromUser.ws, { type: "error", code: "REQUEST_FAILED", message: "Someone is busy" });
          return;
        }

        const sessionId = randomUUID();
        const s: Session = { id: sessionId, a: pr.from, b: pr.to, createdAt: now(), lastActivityAt: now() };
        sessionsById.set(sessionId, s);

        fromUser.pairedWith = pr.to;
        toUser.pairedWith = pr.from;
        fromUser.sessionId = sessionId;
        toUser.sessionId = sessionId;

        send(fromUser.ws, { type: "paired", peerNickname: pr.to, sessionId });
        send(toUser.ws, { type: "paired", peerNickname: pr.from, sessionId });

        send(fromUser.ws, { type: "system", text: "connection established", type_: "connection_established" });
        send(toUser.ws, { type: "system", text: "connection established", type_: "connection_established" });

        console.log("[Server] [Paired]", pr.from, "<->", pr.to, sessionId);
        return;
      }

      if (msg.type === "connect_reject") {
        const requestId = msg.requestId;
        const pr = pendingById.get(requestId);
        if (!pr) {
          send(ws, { type: "error", code: "REQUEST_NOT_FOUND", message: "Request not found" });
          return;
        }
        if (pr.to !== senderNick) {
          send(ws, { type: "error", code: "REQUEST_FORBIDDEN", message: "Not your request" });
          return;
        }

        deletePending(pr);

        const fromUser = usersByNick.get(pr.from);
        if (fromUser) {
          send(fromUser.ws, { type: "error", code: "REQUEST_REJECTED", message: `${pr.to} rejected your request` });
        }

        console.log("[Server] [RequestRejected]", pr.from, "->", pr.to, requestId);
        return;
      }

      if (msg.type === "connect_cancel") {
        const requestId = msg.requestId;
        const pr = pendingById.get(requestId);
        if (!pr) {
          send(ws, { type: "error", code: "REQUEST_NOT_FOUND", message: "Request not found" });
          return;
        }
        if (pr.from !== senderNick) {
          send(ws, { type: "error", code: "REQUEST_FORBIDDEN", message: "Not your request" });
          return;
        }

        deletePending(pr);

        const toUser = usersByNick.get(pr.to);
        if (toUser) {
          send(toUser.ws, { type: "error", code: "REQUEST_CANCELED", message: `${pr.from} canceled request` });
        }

        send(ws, { type: "error", code: "REQUEST_CANCELED", message: "Request canceled" });
        console.log("[Server] [RequestCanceled]", pr.from, "->", pr.to, requestId);
        return;
      }

      if (msg.type === "message") {
        if (!sender.sessionId) {
          send(ws, { type: "error", code: "NO_SESSION", message: "Not in session" });
          return;
        }
        const v = validateMessage(msg.text);
        if (!v.ok) {
          send(ws, { type: "error", code: "INVALID_MESSAGE", message: v.msg });
          return;
        }

        const s = sessionsById.get(sender.sessionId);
        if (!s) {
          send(ws, { type: "error", code: "SESSION_NOT_FOUND", message: "Session not found" });
          sender.sessionId = undefined;
          sender.pairedWith = undefined;
          return;
        }
        s.lastActivityAt = now();

        const peerNick = s.a === senderNick ? s.b : s.a;
        const timestamp = new Date().toISOString();

        const out: ServerMsg = {
          type: "message",
          text: msg.text,
          from: senderNick,
          timestamp,
        };

        sendToNick(senderNick, out);
        sendToNick(peerNick, out);
        return;
      }

      if (msg.type === "leave") {
        if (sender.sessionId) {
          const s = sessionsById.get(sender.sessionId);
          if (s) {
            const peerNick = s.a === senderNick ? s.b : s.a;
            sendToNick(peerNick, { type: "system", text: `${senderNick} left`, type_: "user_left" });
            endSession(s.id, "user_leave");
          }
        } else {
          send(ws, { type: "session_end", reason: "user_leave" });
        }
        cleanupUser(ws);
        return;
      }
    } catch (e) {
      console.log("[Server] [ParseError]", e);
      send(ws, { type: "error", code: "PARSE_ERROR", message: "Bad JSON" });
    }
  });

  ws.on("close", () => {
    console.log("[Server] [WS] close");
    cleanupUser(ws);
  });

  ws.on("error", (e) => {
    console.log("[Server] [WS] error", e);
  });
});

// Cleanup loop
setInterval(() => {
  const t = now();
  for (const [id, s] of sessionsById) {
    if (t - s.lastActivityAt > SESSION_TIMEOUT_MS) {
      endSession(id, "timeout");
    }
  }

  for (const [id, pr] of pendingById) {
    if (t - pr.createdAt > REQUEST_TTL_MS) {
      deletePending(pr);
      const fromUser = usersByNick.get(pr.from);
      if (fromUser) {
        send(fromUser.ws, { type: "error", code: "REQUEST_TIMEOUT", message: "Request timed out" });
      }
      console.log("[Server] [RequestTimeout]", pr.from, "->", pr.to, id);
    }
  }
}, 30_000);

console.log(`[Server] ws://localhost:${PORT}`);
