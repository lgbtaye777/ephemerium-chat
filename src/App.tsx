import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CssBaseline,
  Box,
  Snackbar,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Typography,
} from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";

import ScreenNickInput from "./components/ScreenNickInput";
import ScreenWaitingPeer from "./components/ScreenWaitingPeer";
import ScreenChat from "./components/ScreenChat";
import ScreenSessionEnd from "./components/ScreenSessionEnd";
import ScreenLanding from "./components/ScreenLanding";
import HeroTitleMorph, { type Rect } from "./components/HeroTitleMorph";

import { createEphemeralTheme, pickRandomPack, type ScreenKey, type ThemePack } from "./theme/theme";
import BubbleBackground from "./components/BubbleBackground";
import type { EphemeralState } from "./types/state";
import { useWebSocket } from "./hooks/useWebSocket";

import "./App.css";

const initialState: EphemeralState = {
  screen: "landing",
  nickname: "",
  peerNickname: "",
  sessionId: "",
  messages: [],
};

const REQUEST_TTL_MS = 60_000;
const MOCK_BOT_NAMES = ["MotyaBOT1", "LGBTAUE777BOT", "FedurinBOT", "triplesixgodzxBOT", "NmethylamineBOT"];
const MOCK_BOT_RESPONSES = [
  "Привет! Я тестовый бот Ephemerium 🙌",
  "Я здесь, чтобы показать, как выглядит чат. Подеграй окошки и тумблеры, почувствуй этот импакт",
  "Отправь что-нибудь ещё, и я притворюсь собеседником.",
  "Кстати, я знаю твой адрес.",
  "Как тебе анимации? Material UI рулит 🎨",
  "Зацени этот design, почувствуй его flow",
  "Тут есть еще куча интересных моментиков",
  "Обнови страничку, увидишь новую палитру",
  "Готов, когда ты готов нажать «Завершить».",
];

export default function App() {
  const [state, setState] = useState<EphemeralState>(initialState);
  const [isWaiting, setIsWaiting] = useState(false);
  const [targetNickname, setTargetNickname] = useState("");
  const [peerOnline, setPeerOnline] = useState(false);
  const [incoming, setIncoming] = useState<{ requestId: string; fromNickname: string; expiresAt: number } | null>(null);
  const [outgoing, setOutgoing] = useState<{ requestId: string; targetNickname: string; expiresAt: number } | null>(null);
  const [incomingBusy, setIncomingBusy] = useState(false);
  const [nowTick, setNowTick] = useState(Date.now());

  const [snack, setSnack] = useState<{ open: boolean; text: string }>({ open: false, text: "" });
  const [pack, setPack] = useState<ThemePack>(() => pickRandomPack());
  const packRef = useRef(pack);
  const isFirstScreenRef = useRef(true);
  const [themeColor, setThemeColor] = useState<string>(() => pack.colors.landing);
  const [bgNonce, setBgNonce] = useState(0);
  const landingTitleRef = useRef<HTMLDivElement>(null!);
  const targetTitleRef = useRef<HTMLDivElement>(null!);
  const morphFailRef = useRef<number | null>(null);
  const [morphActive, setMorphActive] = useState(false);
  const [morphFrom, setMorphFrom] = useState<Rect | null>(null);
  const [morphTo, setMorphTo] = useState<Rect | null>(null);

  const [mockMode, setMockMode] = useState<{ active: boolean; botName: string; index: number }>({
    active: false,
    botName: "",
    index: 0,
  });
  const mockReplyTimeout = useRef<number | null>(null);
  const mockModeRef = useRef(mockMode);
  useEffect(() => {
    mockModeRef.current = mockMode;
  }, [mockMode]);

  const clearMockReplyTimeout = () => {
    if (mockReplyTimeout.current) {
      window.clearTimeout(mockReplyTimeout.current);
      mockReplyTimeout.current = null;
    }
  };

  useEffect(() => () => clearMockReplyTimeout(), []);

  const wsUrl = process.env.REACT_APP_WS_URL ?? "ws://localhost:8080";
  const ws = useWebSocket(wsUrl);

  const muiTheme = useMemo(() => createEphemeralTheme(themeColor), [themeColor]);
  const incomingRemainingMs = incoming ? Math.max(0, incoming.expiresAt - nowTick) : 0;
  const outgoingRemainingMs = outgoing ? Math.max(0, outgoing.expiresAt - nowTick) : 0;
  const incomingProgress = incoming ? Math.min(1, incomingRemainingMs / REQUEST_TTL_MS) : 0;
  const outgoingProgress = outgoing ? Math.min(1, outgoingRemainingMs / REQUEST_TTL_MS) : 0;

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (outgoing && outgoingRemainingMs <= 0) {
      setOutgoing(null);
      setIsWaiting(false);
      setTargetNickname("");
    }
  }, [outgoing, outgoingRemainingMs]);

  useEffect(() => {
    if (incoming && incomingRemainingMs <= 0) {
      setIncoming(null);
      setIncomingBusy(false);
    }
  }, [incoming, incomingRemainingMs]);

  useEffect(() => {
    packRef.current = pack;
  }, [pack]);

  useEffect(() => {
    if (isFirstScreenRef.current) {
      isFirstScreenRef.current = false;
      const initialKey = state.screen as ScreenKey;
      setThemeColor(packRef.current.colors[initialKey]);
      return;
    }
    const nextPack = pickRandomPack(packRef.current?.id);
    setPack(nextPack);

    const screenKey = state.screen as ScreenKey;
    setThemeColor(nextPack.colors[screenKey]);
  }, [state.screen]);

  useEffect(() => {
    setBgNonce((n) => n + 1);
  }, [state.screen]);

  useEffect(() => {
    const offOpen = ws.on("_open", () => {
      if (state.nickname) {
        try {
          ws.send({ type: "hello", nickname: state.nickname });
        } catch {
          // ignore
        }
      }
      setSnack({ open: true, text: "Соединение восстановлено" });
    });

    const offHelloOk = ws.on("hello_ok", (m: any) => {
      setState((p) => ({ ...p, sessionId: String(m.sessionId ?? "") }));
    });

    const offPaired = ws.on("paired", (m: any) => {
      setIsWaiting(false);
      setPeerOnline(true);
      setOutgoing(null);
      setIncoming(null);
      setIncomingBusy(false);
      setState((p) => ({
        ...p,
        peerNickname: String(m.peerNickname ?? ""),
        sessionId: String(m.sessionId ?? p.sessionId),
        screen: "chat",
      }));
    });

    const offMsg = ws.on("message", (m: any) => {
      const from = String(m.from ?? "");
      const text = String(m.text ?? "");
      const timestamp = m.timestamp
        ? new Date(String(m.timestamp)).toLocaleTimeString()
        : new Date().toLocaleTimeString();

      setState((p) => ({
        ...p,
        messages: [
          ...p.messages,
          { type: "user", text, from, isSent: from === p.nickname, timestamp },
        ],
      }));
    });

    const offSys = ws.on("system", (m: any) => {
      const text = String(m.text ?? "");
      setState((p) => ({ ...p, messages: [...p.messages, { type: "system", text }] }));
    });

    const offEnd = ws.on("session_end", (m: any) => {
      setPeerOnline(false);
      setIsWaiting(false);
      setTargetNickname("");
      setOutgoing(null);
      setIncoming(null);
      setIncomingBusy(false);
      setState((p) => ({ ...p, screen: "sessionEnd", messages: [] }));
    });

    const offErr = ws.on("error", (m: any) => {
      const code = String(m.code ?? "");
      const msg = String(m.message ?? "WS error");
      if (
        code === "REQUEST_REJECTED" ||
        code === "REQUEST_TIMEOUT" ||
        code === "REQUEST_CANCELED" ||
        code === "USER_NOT_FOUND" ||
        code === "TARGET_HAS_PENDING" ||
        code === "TARGET_BUSY" ||
        code === "SENDER_BUSY"
      ) {
        setIsWaiting(false);
        setOutgoing(null);
        setTargetNickname("");
      }
      if (code === "REQUEST_CANCELED" || code === "REQUEST_TIMEOUT") {
        setIncoming(null);
        setIncomingBusy(false);
      }
      setSnack({ open: true, text: msg });
      setIsWaiting(false);
    });

    return () => {
      offOpen();
      offHelloOk();
      offPaired();
      offMsg();
      offSys();
      offEnd();
      offErr();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws, state.nickname]);

  useEffect(() => {
    const offWaiting = ws.on("waiting", (m: any) => {
      const requestId = String(m.requestId ?? "");
      const targetNick = String(m.targetNickname ?? "");
      const expiresAt = Number(m.expiresAt ?? Date.now());
      setOutgoing({ requestId, targetNickname: targetNick, expiresAt });
      setIsWaiting(true);
      setTargetNickname(targetNick);
    });

    const offIncoming = ws.on("incoming_request", (m: any) => {
      setIncoming({
        requestId: String(m.requestId ?? ""),
        fromNickname: String(m.fromNickname ?? ""),
        expiresAt: Number(m.expiresAt ?? Date.now()),
      });
      setIncomingBusy(false);
    });

    return () => {
      offWaiting();
      offIncoming();
    };
  }, [ws]);

  useEffect(() => {
    const offClose = ws.on("_close", () => {
      setPeerOnline(false);
      setIsWaiting(false);
      setTargetNickname("");
      setIncoming(null);
      setOutgoing(null);
      setIncomingBusy(false);
      setSnack({ open: true, text: "Соединение потеряно. Переподключаемся…" });
    });
    return () => {
      offClose();
    };
  }, [ws]);

  const disableMockMode = () => {
    clearMockReplyTimeout();
    setMockMode({ active: false, botName: "", index: 0 });
  };

  const scheduleMockReply = () => {
    if (!mockModeRef.current.active) return;
    clearMockReplyTimeout();
    mockReplyTimeout.current = window.setTimeout(() => {
      const current = mockModeRef.current;
      if (!current.active) return;
      const replyText = MOCK_BOT_RESPONSES[current.index % MOCK_BOT_RESPONSES.length];
      const timestamp = new Date().toLocaleTimeString();
      setState((prev) => ({
        ...prev,
        messages: [
          ...prev.messages,
          { type: "user", text: replyText, from: current.botName, isSent: false, timestamp },
        ],
      }));
      setMockMode((prev) => ({ ...prev, index: prev.index + 1 }));
    }, 900 + Math.random() * 1200);
  };

  const handleTestMode = () => {
    if (!state.nickname) {
      setSnack({ open: true, text: "Сначала введи свой ник" });
      return;
    }
    const botName = MOCK_BOT_NAMES[Math.floor(Math.random() * MOCK_BOT_NAMES.length)];
    disableMockMode();
    const firstReply = MOCK_BOT_RESPONSES[0];
    const timestamp = new Date().toLocaleTimeString();
    setMockMode({ active: true, botName, index: 1 });
    setPeerOnline(true);
    setIsWaiting(false);
    setTargetNickname("");
    setOutgoing(null);
    setIncoming(null);
    setIncomingBusy(false);
    setState((p) => ({
      ...p,
      peerNickname: botName,
      screen: "chat",
      messages: [
        { type: "system", text: `Демо-режим активирован. Это локальный чат с ${botName}.` },
        { type: "user", text: firstReply, from: botName, isSent: false, timestamp },
      ],
    }));
  };

  const handleNick = (nickname: string) => {
    console.log("[App] [Nick] set", nickname);
    disableMockMode();
    setState((p) => ({ ...p, nickname, screen: "waitingPeer" }));
    ws.setHelloNickname(nickname);
    try {
      ws.send({ type: "hello", nickname });
    } catch {
      // если сокет ещё не открыт — hello отправим на on("_open") ниже
    }
  };

  const handleConnect = (tNick: string) => {
    if (!ws.connected) {
      setSnack({ open: true, text: "Нет соединения с сервером" });
      return;
    }
    disableMockMode();
    console.log("[App] [Connect] to", tNick);
    setTargetNickname(tNick);
    setIsWaiting(true);
    try {
      ws.send({ type: "connect", targetNickname: tNick });
    } catch (e: any) {
      setSnack({ open: true, text: e?.message ?? "WS not connected" });
      setIsWaiting(false);
    }
  };

  const handleCancel = () => {
    console.log("[App] [Waiting] cancel");
    disableMockMode();
    if (outgoing?.requestId && ws.connected) {
      try {
        ws.send({ type: "connect_cancel", requestId: outgoing.requestId });
      } catch {
        // ignore
      }
    }
    setIsWaiting(false);
    setOutgoing(null);
    setTargetNickname("");
  };

  const handleSend = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (mockMode.active) {
      const timestamp = new Date().toLocaleTimeString();
      setState((prev) => ({
        ...prev,
        messages: [
          ...prev.messages,
          { type: "user", text: trimmed, from: prev.nickname, isSent: true, timestamp },
        ],
      }));
      scheduleMockReply();
      return;
    }
    if (!ws.connected) {
      setSnack({ open: true, text: "Нет соединения с сервером" });
      return;
    }
    try {
      ws.send({ type: "message", text: trimmed });
    } catch (e: any) {
      setSnack({ open: true, text: e?.message ?? "WS not connected" });
    }
  };

  const handleLeave = () => {
    console.log("[App] [Leave]");
    if (mockMode.active) {
      disableMockMode();
    } else {
      try {
        ws.send({ type: "leave" });
      } catch {
        // ignore
      }
    }
    setPeerOnline(false);
    setIsWaiting(false);
    setTargetNickname("");
    setState((p) => ({ ...p, screen: "sessionEnd", messages: [] }));
  };

  const acceptIncoming = () => {
    if (!incoming || !ws.connected) return;
    setIncomingBusy(true);
    try {
      ws.send({ type: "connect_accept", requestId: incoming.requestId });
      setTargetNickname(incoming.fromNickname);
      setIsWaiting(true);
      setIncoming(null);
    } catch (e: any) {
      setSnack({ open: true, text: e?.message ?? "WS not connected" });
    } finally {
      setIncomingBusy(false);
    }
  };

  const rejectIncoming = () => {
    if (!incoming) return;
    try {
      ws.send({ type: "connect_reject", requestId: incoming.requestId });
    } catch {
      // ignore
    }
    setIncoming(null);
    setIncomingBusy(false);
  };

  const clearMorphFail = () => {
    if (morphFailRef.current) {
      window.clearTimeout(morphFailRef.current);
      morphFailRef.current = null;
    }
  };

  const readRect = (el: HTMLElement | null): Rect | null => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  };

  const startLandingToNick = () => {
    if (morphActive) return;
    console.log("[App] [Landing] start morph click");
    const fromRect = readRect(landingTitleRef.current);
    const toRect = readRect(targetTitleRef.current);
    console.log("[App] [Landing] rects", { fromRect, toRect });

    if (!fromRect || !toRect || fromRect.height === 0 || toRect.height === 0) {
      console.warn("[App] [Landing] fallback -> nickInput");
      setMorphActive(false);
      setMorphFrom(null);
      setMorphTo(null);
      setState((s) => ({ ...s, screen: "nickInput" }));
      return;
    }

    setMorphFrom(fromRect);
    setMorphTo(toRect);
    setMorphActive(true);

    clearMorphFail();
    morphFailRef.current = window.setTimeout(() => {
      console.warn("[App] [Landing] fail-safe -> nickInput");
      setMorphActive(false);
      setMorphFrom(null);
      setMorphTo(null);
      setState((s) => ({ ...s, screen: "nickInput" }));
    }, 1600);
  };

  const handleRestart = () => {
    console.log("[App] [Restart]");
    setPeerOnline(false);
    setIsWaiting(false);
    setTargetNickname("");
    disableMockMode();
    setMorphActive(false);
    clearMorphFail();
    setMorphFrom(null);
    setMorphTo(null);
    setState(initialState);
  };

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <LayoutGroup id="app" /* @ts-ignore */ inherit={false}>
        <AnimatePresence>
          {state.screen === "landing" && (
            <ScreenLanding
              key="landing"
              onEnter={startLandingToNick}
              titleRef={landingTitleRef}
              hideTitle={morphActive}
            />
          )}
        </AnimatePresence>

        <Box sx={{ position: "relative", minHeight: "100vh", backgroundColor: "background.default" }}>
          <Box sx={{ position: "fixed", inset: 0, zIndex: 0 }}>
            <motion.div
              style={{ position: "absolute", inset: 0 }}
              animate={{ opacity: state.screen === "landing" ? 0 : 1 }}
              transition={{ duration: 0.45, ease: [0.2, 0, 0, 1] }}
            >
              <BubbleBackground seedColor={themeColor} layoutKey={`${state.screen}-${bgNonce}`} interactive />
            </motion.div>
          </Box>

          <Box
            sx={{
              position: "relative",
              zIndex: 1,
              minHeight: "100vh",
              display: "flex",
              justifyContent: "center",
              alignItems: { xs: "stretch", sm: "center" },
              padding: "var(--frame-padding)",
              transition: "padding var(--transition-easing)",
            }}
          >
            <Box
              component={motion.div}
              className="app-shell glass-surface"
              animate={{
                opacity: state.screen === "landing" ? 0 : 1,
                scale: 1,
              }}
              transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
              style={{ pointerEvents: state.screen === "landing" ? "none" : "auto" }}
              sx={{
                border: "var(--shell-border)",
              }}
            >
              <AnimatePresence mode="wait">
                {state.screen === "nickInput" && (
                  <ScreenNickInput
                    key="nickInput"
                    onNext={handleNick}
                    titleAnchorRef={targetTitleRef}
                    hideTitle={morphActive}
                  />
                )}

                {state.screen === "waitingPeer" && (
                  <ScreenWaitingPeer
                    key="waitingPeer"
                    nickname={state.nickname}
                    onConnect={handleConnect}
                    onCancel={handleCancel}
                    onTestMode={handleTestMode}
                    isWaiting={isWaiting}
                    targetNickname={targetNickname}
                    waitingRemainingSec={outgoing ? Math.ceil(outgoingRemainingMs / 1000) : undefined}
                    waitingProgress={outgoing ? outgoingProgress : undefined}
                  />
                )}

                {state.screen === "chat" && (
                  <ScreenChat
                    key="chat"
                    nickname={state.nickname}
                    peerNickname={state.peerNickname}
                    messages={state.messages}
                    onSend={handleSend}
                    onLeave={handleLeave}
                    peerOnline={peerOnline}
                    wsConnected={ws.connected}
                    isMockChat={mockMode.active}
                    mockBotName={mockMode.botName}
                  />
                )}

                {state.screen === "sessionEnd" && (
                  <ScreenSessionEnd key="sessionEnd" onRestart={handleRestart} />
                )}
              </AnimatePresence>
            </Box>
          </Box>
        </Box>
      </LayoutGroup>

      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          opacity: 0,
          pointerEvents: "none",
          zIndex: -1,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            padding: "var(--frame-padding)",
          }}
        >
          <div className="app-shell glass-surface" style={{ width: "100%" }}>
            <div
              style={{
                padding: "var(--container-padding)",
                display: "grid",
                placeItems: "center",
                textAlign: "center",
              }}
            >
              <div
                ref={targetTitleRef}
                style={{
                  display: "inline-block",
                  transform: "scale(0.62)",
                  transformOrigin: "50% 0%",
                }}
              >
                <Typography variant="displayMedium" align="center">
                  Ephemerium
                </Typography>
              </div>
            </div>
          </div>
        </div>
      </div>

      <HeroTitleMorph
        active={morphActive}
        from={morphFrom}
        to={morphTo}
        text="Ephemerium"
        yOffset={10}
        onComplete={() => {
          console.log("[App] [Landing] morph complete");
          clearMorphFail();
          setMorphActive(false);
          setMorphFrom(null);
          setMorphTo(null);
          setState((s) => ({ ...s, screen: "nickInput" }));
        }}
      />

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack({ open: false, text: "" })}
      >
        <Alert severity="error" onClose={() => setSnack({ open: false, text: "" })}>
          {snack.text}
        </Alert>
      </Snackbar>

      <Dialog open={!!incoming} onClose={incomingBusy ? undefined : rejectIncoming}>
        <DialogTitle>Запрос на соединение</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 320 }}>
          <div>{incoming?.fromNickname} хочет начать чат.</div>
          <div style={{ opacity: 0.7, fontSize: 12 }}>
            Истечёт через {Math.ceil(incomingRemainingMs / 1000)} сек
          </div>
          <LinearProgress variant="determinate" value={incoming ? incomingProgress * 100 : 0} />
        </DialogContent>
        <DialogActions>
          <Button onClick={rejectIncoming} variant="outlined" disabled={incomingBusy}>
            Отклонить
          </Button>
          <Button
            onClick={acceptIncoming}
            variant="contained"
            disabled={incomingBusy || incomingRemainingMs === 0}
          >
            Принять
          </Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
}
