import React from "react";
import { Typography } from "@mui/material";
import { motion } from "framer-motion";

export type Rect = { left: number; top: number; width: number; height: number };

function centerY(rect: Rect) {
  return rect.top + rect.height / 2;
}

interface Props {
  active: boolean;
  from: Rect | null;
  to: Rect | null;
  text?: string;
  yOffset?: number;
  onComplete: () => void;
}

export default function HeroTitleMorph({
  active,
  from,
  to,
  text = "Ephemerium",
  yOffset = 0,
  onComplete,
}: Props) {
  if (!active || !from || !to) return null;

  const fromCy = centerY(from);
  const toCy = centerY(to);
  const scale = to.height / from.height;

  return (
    <motion.div
      style={{
        position: "fixed",
        left: "50%",
        top: fromCy,
        zIndex: 999999,
        pointerEvents: "none",
        willChange: "transform",
      }}
      initial={{ y: 0 }}
      animate={{ y: toCy - fromCy + yOffset }}
      transition={{ duration: 0.9, ease: [0.2, 0, 0, 1] }}
      onAnimationComplete={onComplete}
    >
      <div
        style={{
          transform: "translate(-50%, -50%) translateZ(0)",
          transformOrigin: "50% 50%",
        }}
      >
        <motion.div
          initial={{ scale: 1, opacity: 1 }}
          animate={{ scale, opacity: 1 }}
          transition={{ duration: 0.9, ease: [0.2, 0, 0, 1] }}
          style={{ transformOrigin: "50% 50%", willChange: "transform" }}
        >
          <Typography
            variant="displayMedium"
            sx={{ whiteSpace: "nowrap", transform: "translateZ(0)" }}
          >
            {text}
          </Typography>
        </motion.div>
      </div>
    </motion.div>
  );
}
