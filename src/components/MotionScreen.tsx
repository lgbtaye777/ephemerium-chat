// src/components/MotionScreen.tsx
import React from "react";
import { motion } from "framer-motion";
import { useResponsiveAnimation } from "../hooks/useResponsiveAnimation";

interface Props {
  children: React.ReactNode;
}

export default function MotionScreen({ children }: Props) {
  const { variants, transition } = useResponsiveAnimation();

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={variants}
      transition={transition}
      style={{ width: "100%", height: "100%", willChange: "transform, opacity" }}
    >
      {children}
    </motion.div>
  );
}
