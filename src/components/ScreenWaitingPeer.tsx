import React, { useMemo, useState } from "react";
import { Box, Button, CircularProgress, Container, LinearProgress, TextField, Typography } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import MotionScreen from "./MotionScreen";
import { useResponsiveAnimation } from "../hooks/useResponsiveAnimation";

interface Props {
  nickname: string;
  onConnect: (targetNickname: string) => void;
  onCancel: () => void;
  onTestMode?: () => void;
  isWaiting: boolean;
  targetNickname: string;
  waitingRemainingSec?: number;
  waitingProgress?: number;
}

const NICK_RE = /^[a-zA-Z0-9_-]+$/;

export default function ScreenWaitingPeer({
  nickname,
  onConnect,
  onCancel,
  onTestMode,
  isWaiting,
  targetNickname,
  waitingRemainingSec,
  waitingProgress,
}: Props) {
  const [inputTarget, setInputTarget] = useState("");
  const [error, setError] = useState("");
  const { variants, transition } = useResponsiveAnimation();

  const canSubmit = useMemo(() => {
    const v = inputTarget.trim();
    return v.length >= 2 && v.length <= 20 && NICK_RE.test(v);
  }, [inputTarget]);

  const submit = () => {
    const v = inputTarget.trim();
    if (v.length < 2 || v.length > 20) return setError("Никнейм 2–20 символов");
    if (!NICK_RE.test(v)) return setError("Только буквы/цифры/_/-");
    setError("");
    onConnect(v);
  };

  return (
    <MotionScreen>
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr auto" },
            alignItems: { xs: "start", sm: "center" },
            gap: 1.5,
            mb: 2,
            minWidth: 0,
          }}
        >
          <Typography
            variant="titleLarge"
            noWrap
            sx={{
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            Ваш ник:{" "}
            <Box component="span" sx={{ fontWeight: 500 }}>
              {nickname}
            </Box>
          </Typography>

          <Typography
            variant="bodyMedium"
            color="text.secondary"
            noWrap
            sx={{
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              justifySelf: { xs: "start", sm: "end" },
            }}
          >
            К кому подключиться?
          </Typography>
        </Box>

        <AnimatePresence mode="wait">
          {!isWaiting ? (
            <motion.div
              key="input"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={variants}
              transition={transition}
            >
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <TextField
                  label="Ник собеседника"
                  value={inputTarget}
                  onChange={(e) => setInputTarget(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  error={!!error}
                  helperText={error || "Например: bob456"}
                  placeholder="bob456"
                  fullWidth
                  autoFocus
                />
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Button variant="outlined" fullWidth onClick={onCancel}>
                      Назад
                    </Button>
                    <Button variant="contained" fullWidth onClick={submit} disabled={!canSubmit}>
                      Подключиться
                    </Button>
                  </Box>
                  {onTestMode && (
                    <Button variant="outlined" color="secondary" fullWidth onClick={onTestMode}>
                      Тестирование
                    </Button>
                  )}
                </Box>
              </Box>
            </motion.div>
          ) : (
            <motion.div
              key="waiting"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={variants}
              transition={transition}
            >
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "center" }}>
                <CircularProgress />
                <Typography variant="bodyMedium" align="center">
                  Ожидание подключения к {targetNickname}…
                </Typography>
                <Box sx={{ width: "100%", mt: 1 }}>
                  <LinearProgress variant="determinate" value={(waitingProgress ?? 0) * 100} />
                  <Typography variant="labelSmall" sx={{ opacity: 0.7, display: "block", mt: 0.5 }} align="center">
                    Истечёт через {waitingRemainingSec ?? 0} сек
                  </Typography>
                </Box>
                <Button variant="outlined" onClick={onCancel}>
                  Отмена
                </Button>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>
      </Container>
    </MotionScreen>
  );
}
