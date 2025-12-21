// src/hooks/useResponsiveAnimation.ts
import { useMemo } from "react";
import useMediaQuery from "@mui/material/useMediaQuery";
import type { Theme } from "@mui/material/styles";
import type { Variants, Transition } from "framer-motion";

export interface ResponsiveMotion {
  variants: Variants;
  transition: Transition;
}

export function useResponsiveAnimation(): ResponsiveMotion {
  const isAtLeast600 = useMediaQuery((theme: Theme) => theme.breakpoints.up("sm"));
  const isAtLeast960 = useMediaQuery("(min-width:960px)");

  return useMemo(() => {
    const base: Variants = {
      hidden: { opacity: 0, y: 20, pointerEvents: "none" },
      visible: { opacity: 1, y: 0, pointerEvents: "auto" },
      exit: { opacity: 0, y: -20, pointerEvents: "none" },
    };

    if (!isAtLeast600) {
      const transition: Transition = { duration: 0.32, ease: [0.2, 0, 0, 1] };
      const variants: Variants = {
        hidden: { opacity: 0, y: 14, pointerEvents: "none" },
        visible: { opacity: 1, y: 0, pointerEvents: "auto" },
        exit: { opacity: 0, y: -14, pointerEvents: "none" },
      };
      return { variants, transition };
    }

    if (!isAtLeast960) {
      const transition: Transition = { duration: 0.38, ease: [0.2, 0, 0, 1] };
      const variants: Variants = {
        ...base,
        hidden: { opacity: 0, y: 18, pointerEvents: "none" },
        exit: { opacity: 0, y: -18, pointerEvents: "none" },
      };
      return { variants, transition };
    }

    const transition: Transition = { duration: 0.4, ease: [0.2, 0, 0, 1] };
    const variants: Variants = {
      ...base,
      hidden: { opacity: 0, y: 16, pointerEvents: "none" },
      exit: { opacity: 0, y: -16, pointerEvents: "none" },
    };

    return { variants, transition };
  }, [isAtLeast600, isAtLeast960]);
}
