import React, { useMemo, useState } from "react";
import { Box, Button, Container, TextField, Typography } from "@mui/material";
import MotionScreen from "./MotionScreen";

interface Props {
  onNext: (nickname: string) => void;
  titleAnchorRef?: React.RefObject<HTMLDivElement | null>;
  hideTitle?: boolean;
  disableAutoFocus?: boolean;
}

const NICK_RE = /^[a-zA-Z0-9_-]+$/;

export default function ScreenNickInput({
  onNext,
  titleAnchorRef,
  hideTitle = false,
  disableAutoFocus = false,
}: Props) {
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => {
    const v = nickname.trim();
    return v.length >= 2 && v.length <= 20 && NICK_RE.test(v);
  }, [nickname]);

  const submit = () => {
    const v = nickname.trim();
    if (v.length < 2 || v.length > 20) return setError("Никнейм 2–20 символов");
    if (!NICK_RE.test(v)) return setError("Только буквы/цифры/_/-");
    setError("");
    onNext(v);
  };

  return (
    <MotionScreen>
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Box
          sx={{
            display: "grid",
            placeItems: "center",
            textAlign: "center",
            gap: 0.5,
            mb: 2.5,
          }}
        >
          <div
            ref={titleAnchorRef}
            style={{
              display: "inline-block",
              opacity: hideTitle ? 0 : 1,
              transition: "opacity 120ms linear",
              transform: "scale(0.62)",
              transformOrigin: "50% 0%",
              marginBottom: 0,
            }}
          >
            <Typography variant="displayMedium" align="center">
              Ephemerium
            </Typography>
          </div>
          <Typography variant="bodyMedium" color="text.secondary" sx={{ mt: 0 }}>
            Ephemerium • 1:1 • Чат без сохранения
          </Typography>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="Никнейм"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            error={!!error}
            helperText={error || "2–20 символов: a-z A-Z 0-9 _ -"}
            placeholder="alice123"
            autoFocus={!disableAutoFocus}
            fullWidth
          />
          <Button variant="contained" onClick={submit} disabled={!canSubmit}>
            Продолжить
          </Button>
        </Box>
      </Container>
    </MotionScreen>
  );
}
