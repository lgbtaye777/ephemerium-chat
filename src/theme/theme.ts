// src/theme/theme.ts
import { createTheme } from "@mui/material/styles";
import chroma from "chroma-js";

export type ScreenKey = "landing" | "nickInput" | "waitingPeer" | "chat" | "sessionEnd";

export type ThemePack = {
  id: string;
  label: string;
  colors: Record<ScreenKey, string>;
};

export const ThemePacks: ThemePack[] = [
  {
    id: "cobalt-violet-coral-pink",
    label: "Cobalt → Violet → Coral → Pink",
    colors: {
      landing: "#3A4DFF",
      nickInput: "#3A4DFF",
      waitingPeer: "#6B5CFF",
      chat: "#FF8A6B",
      sessionEnd: "#FF7AD9",
    },
  },
  {
    id: "ocean-iris-sunset-berry",
    label: "Ocean → Iris → Sunset → Berry",
    colors: {
      landing: "#06B6D4",
      nickInput: "#06B6D4",
      waitingPeer: "#6366F1",
      chat: "#F97316",
      sessionEnd: "#EC4899",
    },
  },
  {
    id: "mint-sky-coral-plum",
    label: "Mint → Sky → Coral → Plum",
    colors: {
      landing: "#34D399",
      nickInput: "#34D399",
      waitingPeer: "#60A5FA",
      chat: "#FB7185",
      sessionEnd: "#C084FC",
    },
  },
  {
    id: "teal-emerald-amber-fuchsia",
    label: "Teal → Emerald → Amber → Fuchsia",
    colors: {
      landing: "#1FC7C1",
      nickInput: "#1FC7C1",
      waitingPeer: "#29D17D",
      chat: "#FFB454",
      sessionEnd: "#FF4FD8",
    },
  },
];

function pickIndex(max: number) {
  const g = globalThis as any;
  const cryptoObj: Crypto | undefined = g?.crypto;
  if (cryptoObj?.getRandomValues) {
    const buf = new Uint32Array(1);
    cryptoObj.getRandomValues(buf);
    return buf[0] % max;
  }
  return Math.floor(Math.random() * max);
}

export function pickRandomPack(excludeId?: string): ThemePack {
  if (ThemePacks.length <= 1) return ThemePacks[0];
  let p = ThemePacks[pickIndex(ThemePacks.length)];
  while (excludeId && p.id === excludeId) p = ThemePacks[pickIndex(ThemePacks.length)];
  return p;
}

// ---- Base dark constants
const BG_DEFAULT = "#1c1b1e";
const SURFACE_BASE = "#232226";

function tonal(surface: string, seed: string, amount: number): string {
  return chroma.mix(surface, seed, Math.max(0, Math.min(1, amount)), "rgb").hex();
}

function secondaryFromSeed(seedColor: string): string {
  const [h, s, l] = chroma(seedColor).hsl();
  const safeH = (h ?? 0) % 360;
  const safeS = Number.isFinite(s) ? s : 0.7;
  const safeL = Number.isFinite(l) ? l : 0.5;
  return chroma.hsl((safeH + 60) % 360, safeS, safeL).hex();
}

const TRANSITION = "450ms cubic-bezier(0.2, 0, 0, 1)";
const FONT_STACK =
  '"Google Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "SF Pro Display", "Helvetica Neue", Arial, sans-serif';

export function createEphemeralTheme(seedColor: string) {
  const primary = seedColor;
  const secondary = secondaryFromSeed(seedColor);

  const surface1 = tonal(SURFACE_BASE, primary, 0.08);
  const surface2 = tonal(SURFACE_BASE, primary, 0.12);
  const surface3 = tonal(SURFACE_BASE, primary, 0.16);
  const surface4 = tonal(SURFACE_BASE, primary, 0.20);

  const outline = "rgba(255,255,255,0.10)";
  const outlineStrong = "rgba(255,255,255,0.16)";
  const textSecondary = "rgba(255,255,255,0.74)";

  return createTheme({
    palette: {
      mode: "dark",
      primary: { main: primary },
      secondary: { main: secondary },
      background: { default: BG_DEFAULT, paper: surface1 },
      text: { primary: "#ffffff", secondary: textSecondary },
      divider: outline,
      error: { main: "#FF6B6B" },
      success: { main: "#39d353" },
      warning: { main: "#FFB454" },
      info: { main: "#45B7D1" },
    },
    shape: { borderRadius: 16 },
    typography: {
      fontFamily: FONT_STACK,
      fontSize: 14,
      fontWeightRegular: 400,
      fontWeightMedium: 500,

      displayLarge: { fontSize: "57px", lineHeight: "64px", fontWeight: 400, letterSpacing: "-0.5px" },
      displayMedium: { fontSize: "45px", lineHeight: "52px", fontWeight: 400, letterSpacing: "-0.5px" },
      displaySmall: { fontSize: "36px", lineHeight: "44px", fontWeight: 400, letterSpacing: "-0.25px" },

      headlineLarge: { fontSize: "32px", lineHeight: "40px", fontWeight: 400, letterSpacing: "-0.25px" },
      headlineMedium: { fontSize: "28px", lineHeight: "36px", fontWeight: 400, letterSpacing: "-0.25px" },
      headlineSmall: { fontSize: "24px", lineHeight: "32px", fontWeight: 400, letterSpacing: "-0.25px" },

      titleLarge: { fontSize: "22px", lineHeight: "28px", fontWeight: 500, letterSpacing: "0px" },
      titleMedium: { fontSize: "16px", lineHeight: "24px", fontWeight: 500, letterSpacing: "0px" },
      titleSmall: { fontSize: "14px", lineHeight: "20px", fontWeight: 500, letterSpacing: "0px" },

      bodyLarge: { fontSize: "16px", lineHeight: "24px", fontWeight: 400, letterSpacing: "0.2px" },
      bodyMedium: { fontSize: "14px", lineHeight: "20px", fontWeight: 400, letterSpacing: "0.2px" },
      bodySmall: { fontSize: "12px", lineHeight: "16px", fontWeight: 400, letterSpacing: "0.2px" },

      labelLarge: { fontSize: "14px", lineHeight: "20px", fontWeight: 500, letterSpacing: "0.3px" },
      labelMedium: { fontSize: "12px", lineHeight: "16px", fontWeight: 500, letterSpacing: "0.3px" },
      labelSmall: { fontSize: "11px", lineHeight: "16px", fontWeight: 500, letterSpacing: "0.3px" },

      h1: { fontSize: "57px", lineHeight: "64px", fontWeight: 400, letterSpacing: "-0.5px" },
      h2: { fontSize: "45px", lineHeight: "52px", fontWeight: 400, letterSpacing: "-0.5px" },
      h3: { fontSize: "36px", lineHeight: "44px", fontWeight: 400, letterSpacing: "-0.25px" },
      h4: { fontSize: "32px", lineHeight: "40px", fontWeight: 400, letterSpacing: "-0.25px" },
      h5: { fontSize: "28px", lineHeight: "36px", fontWeight: 400, letterSpacing: "-0.25px" },
      h6: { fontSize: "24px", lineHeight: "32px", fontWeight: 400, letterSpacing: "-0.25px" },

      subtitle1: { fontSize: "16px", lineHeight: "24px", fontWeight: 500, letterSpacing: "0px" },
      subtitle2: { fontSize: "14px", lineHeight: "20px", fontWeight: 500, letterSpacing: "0px" },

      body1: { fontSize: "16px", lineHeight: "24px", fontWeight: 400, letterSpacing: "0.2px" },
      body2: { fontSize: "14px", lineHeight: "20px", fontWeight: 400, letterSpacing: "0.2px" },

      caption: { fontSize: "12px", lineHeight: "16px", fontWeight: 400, letterSpacing: "0.2px" },
      overline: { fontSize: "11px", lineHeight: "16px", fontWeight: 500, letterSpacing: "0.3px" },
      button: { fontSize: "14px", lineHeight: "20px", fontWeight: 500, letterSpacing: "0.3px" },
    },

    components: {
      MuiCssBaseline: {
        styleOverrides: {
          ":root": {
            "--color-primary": primary,
            "--color-seed": primary,
            "--surface-1": surface1,
            "--surface-2": surface2,
            "--surface-3": surface3,
            "--surface-4": surface4,
          },
          body: {
            fontFamily: FONT_STACK,
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",
            textRendering: "optimizeLegibility",
            fontOpticalSizing: "auto",
            fontVariationSettings: '"GRAD" 0',
            lineHeight: 1.5,
          },
          "@media (max-width:599.95px)": {
            body: {
              lineHeight: 1.55,
            },
          },
          "@media (min-width:960px)": {
            body: {
              lineHeight: 1.45,
            },
          },
          "*:focus-visible": {
            outline: "2px solid var(--color-primary)",
            outlineOffset: "2px",
          },
        },
      },
      MuiTypography: {
        defaultProps: {
          variantMapping: {
            displayLarge: "h1",
            displayMedium: "h2",
            displaySmall: "h3",
            headlineLarge: "h4",
            headlineMedium: "h5",
            headlineSmall: "h6",
            titleLarge: "div",
            titleMedium: "div",
            titleSmall: "div",
            bodyLarge: "p",
            bodyMedium: "p",
            bodySmall: "p",
            labelLarge: "span",
            labelMedium: "span",
            labelSmall: "span",
          },
        },
        styleOverrides: {
          root: {
            overflowWrap: "anywhere",
            wordBreak: "break-word",
          },
        },
      },

      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            border: `1px solid ${outline}`,
            transition: `background-color ${TRANSITION}, border-color ${TRANSITION}`,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            transition: `background-color ${TRANSITION}, border-color ${TRANSITION}`,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            backgroundColor: surface2,
            boxShadow: "none",
            borderBottom: `1px solid ${outline}`,
            transition: `background-color ${TRANSITION}, border-color ${TRANSITION}`,
          },
        },
      },

      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            boxShadow: "none",
            "&:hover": { boxShadow: "none" },
            transition: `background-color ${TRANSITION}, border-color ${TRANSITION}, color ${TRANSITION}`,
            borderRadius: 14,
          },
          contained: { borderRadius: 18 },
          outlined: {
            borderRadius: 12,
            borderColor: outlineStrong,
            "&:hover": { borderColor: "rgba(255,255,255,0.28)" },
          },
          text: { borderRadius: 10 },
        },
      },

      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: "rgba(255,255,255,0.05)",
            borderRadius: 16,
            transition: `background-color ${TRANSITION}, border-color ${TRANSITION}`,
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: outlineStrong,
              transition: `border-color ${TRANSITION}`,
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "rgba(255,255,255,0.28)",
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: primary,
              borderWidth: 2,
            },
          },
        },
      },

      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundColor: tonal(SURFACE_BASE, primary, 0.14),
            border: `1px solid ${outline}`,
            transition: `background-color ${TRANSITION}, border-color ${TRANSITION}, color ${TRANSITION}`,
          },
        },
      },

      MuiSnackbarContent: {
        styleOverrides: {
          root: {
            backgroundColor: surface3,
            border: `1px solid ${outline}`,
            boxShadow: "none",
            transition: `background-color ${TRANSITION}, border-color ${TRANSITION}`,
          },
        },
      },
    },
  });
}
