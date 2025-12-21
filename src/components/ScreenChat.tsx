import React, { useMemo, useRef, useState } from "react";
import {
  AppBar,
  Box,
  Button,
  TextField,
  Toolbar,
  Typography,
  LinearProgress,
  Paper,
  Chip,
  Divider,
  IconButton,
  Tooltip,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import { alpha } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";
import { motion } from "framer-motion";
import SendRounded from "@mui/icons-material/SendRounded";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import ArrowDownwardRounded from "@mui/icons-material/ArrowDownwardRounded";
import SettingsRounded from "@mui/icons-material/SettingsRounded";
import TravelExploreRounded from "@mui/icons-material/TravelExploreRounded";
import EnhancedEncryptionRounded from "@mui/icons-material/EnhancedEncryptionRounded";
import VisibilityOffRounded from "@mui/icons-material/VisibilityOffRounded";
import ShieldRounded from "@mui/icons-material/ShieldRounded";
import MotionScreen from "./MotionScreen";
import type { Message } from "../types/state";

interface Props {
  nickname: string;
  peerNickname: string;
  messages: Message[];
  onSend: (text: string) => void;
  onLeave: () => void;
  peerOnline: boolean;
  wsConnected: boolean;
  isMockChat?: boolean;
  mockBotName?: string;
}

const SystemMessage = React.memo(function SystemMessage({ text }: { text: string }) {
  return (
    <Chip
      label={text}
      size="small"
      sx={(theme: Theme) => ({
        mx: "auto",
        backgroundColor: alpha(theme.palette.primary.main, 0.14),
        px: 1,
        py: 0.5,
        borderRadius: "12px",
        border: "1px solid rgba(255,255,255,0.10)",
        transition: "background-color 450ms cubic-bezier(0.2, 0, 0, 1)",
      })}
    />
  );
});

const MessageBubble = React.memo(function MessageBubble({ m }: { m: Message }) {
  const isSent = !!m.isSent;
  return (
    <Box
      sx={{
        p: "12px 16px",
        maxWidth: { xs: "70%", md: "78%" },
        ml: isSent ? "auto" : 0,
        mr: isSent ? 0 : "auto",
        backgroundColor: isSent ? "var(--color-primary)" : "rgba(255,255,255,0.10)",
        borderRadius: isSent ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
        border: "1px solid rgba(255,255,255,0.10)",
        transition:
          "background-color 450ms cubic-bezier(0.2, 0, 0, 1), border-color 450ms cubic-bezier(0.2, 0, 0, 1), color 450ms cubic-bezier(0.2, 0, 0, 1)",
      }}
    >
      <Typography variant="bodyMedium" sx={{ wordBreak: "break-word" }}>
        {m.text}
      </Typography>
      {m.timestamp && (
        <Typography variant="labelSmall" sx={{ opacity: 0.7, display: "block", mt: 0.5 }}>
          {m.timestamp}
        </Typography>
      )}
    </Box>
  );
});

const DOT_OFF_RED = "rgba(255, 90, 90, 0.85)";
const DOT_ONLINE_GREEN = "#36D07C";
const DOT_NOLOGS_ORANGE = "#FFB020";

const DOT_PULSE_ANIMATE = {
  opacity: [0.7, 1, 0.7] as number[],
  scale: [1, 1.2, 1] as number[],
};

const DOT_PULSE_TRANSITION = {
  duration: 1.4,
  repeat: Infinity,
  ease: "easeInOut",
} as const;

function StatusDot(props: {
  active: boolean;
  colorOn: string;
  colorOff?: string;
  size?: number;
  pulse?: boolean;
  phase?: number;
}) {
  const { active, colorOn, colorOff = DOT_OFF_RED, size = 8, pulse = true, phase = 0 } = props;

  const color = active ? colorOn : colorOff;
  const shouldPulse = active && pulse;

  return (
    <motion.span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: 999,
        background: color,
        boxShadow: active ? `0 0 0 4px ${alpha(colorOn, 0.18)}` : "none",
        willChange: "transform, opacity",
        flex: "0 0 auto",
      }}
      animate={shouldPulse ? DOT_PULSE_ANIMATE : undefined}
      transition={shouldPulse ? ({ ...DOT_PULSE_TRANSITION, delay: phase } as const) : undefined}
    />
  );
}

type SecurityId = "nologs" | "tor" | "e2ee" | "shield";

type SecurityFeature = {
  id: SecurityId;
  title: string;
  color: string;
  shape: "pill" | "rounded" | "square" | "outline";
  width: string;
  align: "flex-start" | "center" | "flex-end";
  lockedOn?: boolean;
  icon: React.ReactElement;
};

const SECURITY_FEATURES: SecurityFeature[] = [
  {
    id: "nologs",
    title: "No-logs mode",
    color: "#C78A18",
    shape: "pill",
    width: "100%",
    align: "center",
    lockedOn: true,
    icon: <VisibilityOffRounded fontSize="small" />,
  },
  {
    id: "tor",
    title: "Tor routing",
    color: "#8510ba",
    shape: "rounded",
    width: "100%",
    align: "center",
    icon: <TravelExploreRounded fontSize="small" />,
  },
  {
    id: "e2ee",
    title: "End-to-end encryption",
    color: "#2EE6C5",
    shape: "outline",
    width: "100%",
    align: "center",
    icon: <EnhancedEncryptionRounded fontSize="small" />,
  },
  {
    id: "shield",
    title: "Traffic shield",
    color: "#A48BFF",
    shape: "square",
    width: "100%",
    align: "center",
    icon: <ShieldRounded fontSize="small" />,
  },
];

function featureCardSx(f: SecurityFeature, enabled: boolean) {
  const filled = f.shape !== "outline";
  const bg = filled ? alpha(f.color, 0.1) : "rgba(255,255,255,0.03)";
  const border =
    f.shape === "outline"
      ? `1px dashed ${alpha(f.color, 0.55)}`
      : `1px solid ${alpha(f.color, enabled ? 0.42 : 0.24)}`;

  const radius =
    f.shape === "pill" ? 999 : f.shape === "rounded" ? 22 : f.shape === "square" ? 14 : 18;

  return {
    width: f.width,
    alignSelf: f.align,
    borderRadius: radius,
    border,
    background: bg,
    px: 1.75,
    py: 1.05,
    minHeight: 56,
    position: "relative",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    gap: 1.25,
    transition:
      "background-color 450ms cubic-bezier(0.2, 0, 0, 1), border-color 450ms cubic-bezier(0.2, 0, 0, 1), transform 450ms cubic-bezier(0.2, 0, 0, 1)",
    "&:before": {
      content: '""',
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: f.shape === "square" ? 10 : 6,
      background: `linear-gradient(180deg, ${alpha(f.color, 0.85)}, ${alpha(f.color, 0.25)})`,
      opacity: f.shape === "outline" ? 0.35 : 0.7,
    },
    "&:after": {
      content: '""',
      position: "absolute",
      inset: 0,
      background: enabled
        ? `radial-gradient(1200px 400px at 30% 0%, ${alpha(f.color, 0.08)} 0%, transparent 55%)`
        : "none",
      pointerEvents: "none",
    },
  } as const;
}

function SecurityCard({
  feature,
  enabled,
  onToggle,
}: {
  feature: SecurityFeature;
  enabled: boolean;
  onToggle: () => void;
}) {
  const tooltip = feature.lockedOn ? "Всегда включено" : "Coming soon";

  return (
    <Tooltip title={tooltip} arrow placement="right">
      <Paper
        variant="outlined"
        sx={{
          ...featureCardSx(feature, enabled),
          cursor: feature.lockedOn ? "default" : "pointer",
        }}
        onClick={() => {
          if (!feature.lockedOn) onToggle();
        }}
        role={feature.lockedOn ? undefined : "button"}
        tabIndex={feature.lockedOn ? -1 : 0}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (feature.lockedOn) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <Box sx={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 1.25, width: "100%" }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: feature.shape === "square" ? 12 : 999,
              background: alpha(feature.color, 0.18),
              border: `1px solid ${alpha(feature.color, 0.25)}`,
              display: "grid",
              placeItems: "center",
              flex: "0 0 auto",
              color: feature.color,
            }}
          >
            {feature.icon}
          </Box>
          <Typography variant="titleSmall" sx={{ flex: 1, minWidth: 0 }}>
            {feature.title}
          </Typography>
          <Switch
            checked={enabled}
            disabled={!!feature.lockedOn}
            onChange={(e) => {
              e.stopPropagation();
              if (!feature.lockedOn) onToggle();
            }}
            onClick={(e) => e.stopPropagation()}
            sx={{
              "& .MuiSwitch-switchBase.Mui-checked": {
                color: feature.color,
              },
              "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                backgroundColor: alpha(feature.color, 0.65),
                opacity: 1,
              },
              "& .MuiSwitch-track": {
                backgroundColor: "rgba(255,255,255,0.18)",
                opacity: 1,
              },
            }}
          />
        </Box>
      </Paper>
    </Tooltip>
  );
}

export default function ScreenChat({
  nickname,
  peerNickname,
  messages,
  onSend,
  onLeave,
  peerOnline,
  wsConnected,
  isMockChat = false,
  mockBotName,
}: Props) {
  const [inputText, setInputText] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const isDesktop960 = useMediaQuery("(min-width:960px)");
  const isMdUp = useMediaQuery((theme: Theme) => theme.breakpoints.up("md"));
  const btnSize = isDesktop960 ? "large" : "medium";
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [featureState, setFeatureState] = useState<Record<SecurityId, boolean>>({
    nologs: true,
    tor: false,
    e2ee: false,
    shield: false,
  });

  const toggleFeature = (key: SecurityId) => {
    setFeatureState((prev) => {
      if (key === "nologs") return prev;
      return { ...prev, [key]: !prev[key] };
    });
  };

  const canSend = useMemo(() => {
    const t = inputText.trim();
    return t.length > 0 && t.length <= 2000;
  }, [inputText]);

  const effectiveWsConnected = wsConnected || isMockChat;

  const submit = () => {
    const v = inputText.trim();
    if (!v) return;
    onSend(v);
    setInputText("");
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    });
  };

  const statusText = isMockChat
    ? `Demo-чат · ${mockBotName ?? peerNickname}`
    : !wsConnected
      ? "Reconnecting…"
      : peerOnline
        ? "Online"
        : "Offline";
  const dotPhase = useMemo(() => {
    return -((Date.now() % 1150) / 1000);
  }, []);

  return (
    <MotionScreen>
      <Box sx={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
        <AppBar position="static" elevation={0}>
          <Toolbar sx={{ gap: 2 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="titleLarge" noWrap>
                {peerNickname}
              </Typography>
              <Typography
                variant="bodySmall"
                color="text.secondary"
                component="div"
                sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0, flexWrap: "wrap" }}
              >
                <Box component="span" sx={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {statusText} • Вы: {nickname}
                </Box>
                {isMockChat && (
                  <Chip
                    label="Demo режим"
                    size="small"
                    color="warning"
                    variant="outlined"
                    sx={{ height: 22, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.4 }}
                  />
                )}
                <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1.25, ml: 1 }}>
                  <StatusDot active={peerOnline} colorOn={DOT_ONLINE_GREEN} phase={dotPhase} />
                  {SECURITY_FEATURES.map((feature) => {
                    const isOn = feature.lockedOn ? true : featureState[feature.id];
                    const tooltip =
                      feature.id === "nologs"
                        ? "No-logs mode — всегда включено"
                        : `${feature.title} — coming soon`;
                    const colorOn = feature.id === "nologs" ? DOT_NOLOGS_ORANGE : feature.color;
                    return (
                      <Tooltip key={feature.id} title={tooltip} arrow>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <StatusDot active={isOn} colorOn={colorOn} phase={dotPhase} />
                        </Box>
                      </Tooltip>
                    );
                  })}
                </Box>
              </Typography>
            </Box>
            <Button
              variant="outlined"
              color="error"
              onClick={onLeave}
              size={btnSize}
              startIcon={<LogoutRounded />}
            >
              Выход
            </Button>
            {!isMdUp && (
              <Tooltip title="Настройки">
                <IconButton onClick={() => setSettingsOpen(true)} sx={{ ml: 0.5 }}>
                  <SettingsRounded />
                </IconButton>
              </Tooltip>
            )}
          </Toolbar>
          {!effectiveWsConnected && <LinearProgress />}
        </AppBar>

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "320px 1fr" },
            gap: { xs: 0, md: 2 },
            p: { xs: 0, md: 2 },
          }}
        >
          <Box sx={{ display: { xs: "none", md: "block" }, minHeight: 0 }}>
            <Paper
              elevation={2}
              sx={{
                height: "100%",
                p: 2,
                display: "flex",
                flexDirection: "column",
                gap: 3.25,
              }}
            >
              <Box>
                <Typography variant="overline" color="text.secondary">
                  Собеседник
                </Typography>
                <Typography variant="h6" noWrap>
                  {peerNickname}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Статус: {statusText}
                </Typography>
              </Box>

              <Divider />

              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Typography variant="overline" color="text.secondary">
                  Сессия
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Сообщения не сохраняются. При выходе история исчезает.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Совет: не отправляй личные данные.
                </Typography>
              </Box>

              <Divider />

              <Box sx={{ display: "flex", flexDirection: "column", gap: 2.25, mt: 1 }}>
                <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.6 }}>
                  Безопасность
                </Typography>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 2.25 }}>
                  {SECURITY_FEATURES.map((feature) => {
                    const enabled = feature.lockedOn ? true : featureState[feature.id];
                    return (
                      <SecurityCard
                        key={feature.id}
                        feature={feature}
                        enabled={enabled}
                        onToggle={() => toggleFeature(feature.id)}
                      />
                    );
                  })}
                </Box>
              </Box>

              <Box sx={{ flex: 1 }} />

              <Button
                variant="contained"
                color="primary"
                onClick={() =>
                  listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" })
                }
                size={btnSize}
                startIcon={<ArrowDownwardRounded />}
              >
                К последнему сообщению
              </Button>
              <Button variant="outlined" color="error" onClick={onLeave} size={btnSize} startIcon={<LogoutRounded />}>
                Завершить сессию
              </Button>
            </Paper>
          </Box>

          <Paper
            elevation={2}
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              borderRadius: { xs: 0, md: 2 },
              overflow: "hidden",
            }}
          >
            <Box
              ref={listRef}
              sx={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                p: { xs: 2, md: 3 },
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
            >
              {messages.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ my: "auto" }}>
                  Сообщений нет
                </Typography>
              ) : (
                messages.map((m, idx) =>
                  m.type === "system" ? <SystemMessage key={idx} text={m.text} /> : <MessageBubble key={idx} m={m} />
                )
              )}
            </Box>

            <Box
              sx={{
                p: { xs: 2, md: 3 },
                borderTop: "1px solid",
                borderColor: "divider",
                backgroundColor: "background.paper",
              }}
            >
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Сообщение…"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                />
                <Tooltip title="К последнему сообщению">
                  <IconButton
                    onClick={() =>
                      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" })
                    }
                    sx={{ alignSelf: "center" }}
                  >
                    <ArrowDownwardRounded />
                  </IconButton>
                </Tooltip>
                <Button
                  variant="contained"
                  onClick={submit}
                  disabled={!canSend || !effectiveWsConnected}
                  size={btnSize}
                  endIcon={<SendRounded />}
                >
                  Отправить
                </Button>
              </Box>
            </Box>
          </Paper>
        </Box>
      </Box>
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Настройки</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {SECURITY_FEATURES.map((feature) => {
              const enabled = feature.lockedOn ? true : featureState[feature.id];
              return (
                <SecurityCard
                  key={feature.id}
                  feature={feature}
                  enabled={enabled}
                  onToggle={() => toggleFeature(feature.id)}
                />
              );
            })}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    </MotionScreen>
  );
}
