import React, { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { WavyBackground } from "./ui/WavyBackground";

interface Props {
  onEnter: () => void;
  titleRef: React.RefObject<HTMLDivElement>;
  hideTitle: boolean;
}

export default function ScreenLanding({ onEnter, titleRef, hideTitle }: Props) {
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setShowSubtitle(true), 450);
    return () => window.clearTimeout(t);
  }, []);

  const handleEnter = () => {
    setLeaving(true);
    onEnter();
  };

  return (
    <Box
      role="button"
      tabIndex={0}
      aria-label="Войти в приложение Ephemerium"
      onClick={handleEnter}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") handleEnter();
      }}
      component={motion.div}
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "grid",
        placeItems: "center",
        cursor: "pointer",
        userSelect: "none",
        backgroundColor: "#1c1b1e",
      }}
    >
      <Box
        component={motion.div}
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: leaving ? 0 : 1, y: leaving ? -18 : 0 }}
        transition={{ duration: leaving ? 0.18 : 0.35, ease: [0.2, 0, 0, 1] }}
        sx={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
        }}
      >
        <WavyBackground
          backgroundFill="#1c1b1e"
          colors={["#6B5CFF", "#FF7AD9", "#FF8A6B", "#3A4DFF"]}
          waveWidth={60}
          blur={16}
          speed="fast"
          waveOpacity={0.16}
        />
      </Box>

      <Box sx={{ textAlign: "center", px: 2, position: "relative", zIndex: 1 }}>
        <div
          ref={titleRef}
          style={{
            display: "inline-block",
            opacity: hideTitle ? 0 : 1,
            transition: "opacity 120ms linear",
          }}
        >
          <Typography
            variant="displayLarge"
            sx={{
              fontSize: { xs: "46px", sm: "57px" },
              lineHeight: { xs: "54px", sm: "64px" },
            }}
          >
            Ephemerium
          </Typography>
        </div>

        {showSubtitle && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{
              opacity: leaving ? 0 : 1,
              y: leaving ? -18 : 0,
            }}
            transition={{
              duration: leaving ? 0.18 : 0.28,
              ease: [0.2, 0, 0, 1],
            }}
            style={{ marginTop: 10 }}
          >
            <Typography variant="bodyMedium" color="text.secondary">
              Ephemerium • 1:1 • Чат без сохранения
            </Typography>
          </motion.div>
        )}

        <motion.div
          animate={
            leaving
              ? { opacity: 0, y: -12 }
              : { opacity: 1, y: [0, -3, 0, 0] }
          }
          transition={
            leaving
              ? { duration: 0.16, ease: [0.2, 0, 0, 1] }
              : {
                  duration: 1.0,
                  repeat: Infinity,
                  ease: [0.2, 0, 0, 1],
                  times: [0, 0.18, 0.36, 1],
                }
          }
          style={{ marginTop: 18, willChange: "transform" }}
        >
          <Typography variant="labelMedium" color="text.secondary">
            Кликни, чтобы начать
          </Typography>
        </motion.div>
      </Box>
    </Box>
  );
}
