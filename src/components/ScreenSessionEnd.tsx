import React from "react";
import { Button, Stack, Typography } from "@mui/material";
import MotionScreen from "./MotionScreen";

interface Props {
  onRestart: () => void;
}

export default function ScreenSessionEnd({ onRestart }: Props) {
  return (
    <MotionScreen>
      <Stack
        spacing={1.5}
        sx={{
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          px: 2,
        }}
      >
        <Typography variant="headlineMedium">Сессия завершена</Typography>
        <Typography variant="bodyMedium" color="text.secondary">
          История не сохраняется — всё эфемерно.
        </Typography>
        <Button variant="contained" onClick={onRestart} fullWidth sx={{ mt: 1.5, maxWidth: 320 }}>
          Новый чат
        </Button>
      </Stack>
    </MotionScreen>
  );
}
