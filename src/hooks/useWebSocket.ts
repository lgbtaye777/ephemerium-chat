// src/hooks/useWebSocket.ts
import { useEffect, useMemo, useRef, useState } from "react";

type Listener = (payload: any) => void;

type WSState = {
  connected: boolean;
  connecting: boolean;
  error: string | null;
};

type JsonObject = Record<string, unknown>;

class WSClient {
  private ws: WebSocket | null = null;
  private url: string;

  private listeners = new Map<string, Set<Listener>>();
  private manualClose = false;

  // lock: не даём создавать 2 сокета, если connect вызвали дважды подряд
  private connectInFlight = false;

  private reconnectAttempt = 0;
  private reconnectTimers = [3000, 6000, 12000];

  private helloNick: string = "";

  constructor(url: string) {
    this.url = url;
  }

  setHelloNickname(nickname: string) {
    this.helloNick = nickname.trim();
    // если уже подключены — отправим hello сразу
    if (this.ws?.readyState === WebSocket.OPEN && this.helloNick) {
      this.safeSend({ type: "hello", nickname: this.helloNick });
    }
  }

  connect() {
    // если уже есть активный сокет или он создаётся — выходим
    if (this.connectInFlight) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;

    this.manualClose = false;
    this.connectInFlight = true;

    console.log("[WS] [Connect]", this.url);
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log("[WS] [Open]");
      this.connectInFlight = false;
      this.reconnectAttempt = 0;
      this.emit("_open", {});
      // авто-hello на (ре)коннект
      if (this.helloNick) this.safeSend({ type: "hello", nickname: this.helloNick });
    };

    this.ws.onclose = () => {
      console.log("[WS] [Close]");
      this.connectInFlight = false;
      this.emit("_close", {});
      if (!this.manualClose) this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      console.log("[WS] [Error]");
      this.emit("_error", { message: "WebSocket error" });
    };

    this.ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(String(ev.data));
        const type = data?.type;
        if (typeof type === "string") this.emit(type, data);
        else this.emit("_error", { message: "Invalid message shape" });
      } catch {
        this.emit("_error", { message: "Bad JSON from server" });
      }
    };
  }

  close() {
    this.manualClose = true;
    if (this.ws) {
      console.log("[WS] [ManualClose]");
      this.ws.close();
    }
  }

  /** Бросаем ошибку, если не connected. Удобно для message/connect. */
  send(payload: JsonObject) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not connected");
    }
    this.ws.send(JSON.stringify(payload));
  }

  /** Мягкая отправка без throw — удобно для auto-hello */
  private safeSend(payload: JsonObject) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(payload));
  }

  on(type: string, cb: Listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(cb);
    return () => this.off(type, cb);
  }

  off(type: string, cb: Listener) {
    this.listeners.get(type)?.delete(cb);
  }

  private emit(type: string, payload: any) {
    const set = this.listeners.get(type);
    if (!set) return;
    set.forEach((cb) => {
      try {
        cb(payload);
      } catch (e) {
        console.log("[WS] [ListenerError]", type, e);
      }
    });
  }

  private scheduleReconnect() {
    const delay = this.reconnectTimers[Math.min(this.reconnectAttempt, this.reconnectTimers.length - 1)];
    this.reconnectAttempt += 1;
    console.log("[WS] [ReconnectScheduled]", delay);

    window.setTimeout(() => {
      if (this.manualClose) return;
      this.connect();
    }, delay);
  }
}

/**
 * Глобальный singleton, привязанный к window/globalThis.
 * Так ты гарантированно не создашь 2 инстанса из-за дубль-импортов.
 */
function getGlobalSingleton(url: string): WSClient {
  const g = globalThis as any;
  if (!g.__EPHEMERIUM_WS__) {
    g.__EPHEMERIUM_WS__ = new WSClient(url);
  }
  return g.__EPHEMERIUM_WS__ as WSClient;
}

export function useWebSocket(url: string) {
  const instance = useMemo(() => getGlobalSingleton(url), [url]);

  const [state, setState] = useState<WSState>({
    connected: false,
    connecting: false,
    error: null,
  });

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const offOpen = instance.on("_open", () => {
      if (!mountedRef.current) return;
      setState({ connected: true, connecting: false, error: null });
    });

    const offClose = instance.on("_close", () => {
      if (!mountedRef.current) return;
      setState((p) => ({ ...p, connected: false, connecting: false }));
    });

    const offErr = instance.on("_error", (p) => {
      if (!mountedRef.current) return;
      setState((s) => ({ ...s, error: String(p?.message ?? "Unknown error") }));
    });

    setState((p) => ({ ...p, connecting: true }));
    instance.connect();

    return () => {
      mountedRef.current = false;
      offOpen();
      offClose();
      offErr();
      // singleton не закрываем
    };
  }, [instance]);

  return {
    ...state,
    on: instance.on.bind(instance),
    send: instance.send.bind(instance),
    close: instance.close.bind(instance),
    setHelloNickname: instance.setHelloNickname.bind(instance),
    connect: instance.connect.bind(instance),
  };
}
