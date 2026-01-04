import React, { useEffect, useMemo, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import chroma from "chroma-js";

type BubbleStatic = {
  id: number;
  size: number;
  blur: number;
  opacity: number;
  dur: number;
  delay: number;
  driftX: number;
  driftY: number;
};

type BubblePos = { x: number; y: number };

function hashStringToU32(str: string) {
  // FNV-1a 32-bit
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return function rand() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function derivedAccents(seed: string) {
  const c = chroma(seed);
  const a = c.set("hsl.h", ((c.get("hsl.h") as number) + 25) % 360).saturate(0.25);
  const b = c.set("hsl.h", ((c.get("hsl.h") as number) + 70) % 360).desaturate(0.1);
  return { a: a.hex(), b: b.hex() };
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export default function BubbleBackground({
  seedColor,
  layoutKey,
  interactive = true,
}: {
  seedColor: string;
  layoutKey: string; // меняем при смене экрана
  interactive?: boolean;
}) {
  const prefersReducedMotion = useMemo(
    () => window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false,
    []
  );

  // Размеры окна (для раскладки)
  const [vp, setVp] = useState(() => ({
    w: window.innerWidth || 1,
    h: window.innerHeight || 1,
  }));

  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth || 1, h: window.innerHeight || 1 });
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const isSmallVp = vp.w <= 640;
  const allowInteractive = interactive && !prefersReducedMotion && !isSmallVp;

  // Статика пузырей (размер/blur/дрейф) — один раз
  const bubbles = useMemo<BubbleStatic[]>(() => {
    const isLite = prefersReducedMotion || isSmallVp;

    const count = isLite ? 5 : 10;
    const res: BubbleStatic[] = [];
    for (let i = 0; i < count; i += 1) {
      const sizeBase = isLite ? 420 : 520;
      const sizeJitter = isLite ? 380 : 620;
      const blurBase = isLite ? 12 : 18;
      const blurJitter = isLite ? 14 : 22;
      const opacityBase = isLite ? 0.14 : 0.18;
      const opacityJitter = isLite ? 0.14 : 0.18;
      const durBase = isLite ? 14 : 18;
      const durJitter = isLite ? 12 : 16;
      const driftScale = isLite ? 0.65 : 1;

      res.push({
        id: i,
        size: sizeBase + Math.random() * sizeJitter, // 420..800 (lite) / 520..1140 (default)
        blur: blurBase + Math.random() * blurJitter, // 12..26 (lite) / 18..40 (default)
        opacity: opacityBase + Math.random() * opacityJitter, // 0.14..0.28 (lite) / 0.18..0.36 (default)
        dur: durBase + Math.random() * durJitter, // 14..26 (lite) / 18..34 (default)
        delay: Math.random() * (isLite ? 1.5 : 2.5),
        driftX: (-180 + Math.random() * 360) * driftScale,
        driftY: (-160 + Math.random() * 320) * driftScale,
      });
    }
    return res;
  }, []);

  // Новая раскладка при смене layoutKey (и при resize)
  const layout = useMemo<BubblePos[]>(() => {
    const seed = hashStringToU32(layoutKey);
    const rnd = mulberry32(seed);

    // Распределяем “почти по всему экрану”
    const maxX = vp.w * 0.55;
    const maxY = vp.h * 0.55;

    return bubbles.map((_b, i) => {
      // слегка “кластеризуем” — выглядит более органично, чем полностью равномерно
      const r1 = rnd();
      const r2 = rnd();

      const x = (r1 * 2 - 1) * maxX;
      const y = (r2 * 2 - 1) * maxY;

      // маленький индексный сдвиг, чтобы пузыри не легли идеально друг на друга
      const jiggleX = (rnd() * 2 - 1) * 70 + i * 6;
      const jiggleY = (rnd() * 2 - 1) * 60 - i * 4;

      return {
        x: clamp(x + jiggleX, -maxX, maxX),
        y: clamp(y + jiggleY, -maxY, maxY),
      };
    });
  }, [layoutKey, vp.w, vp.h, bubbles]);

  const { a, b } = useMemo(() => derivedAccents(seedColor), [seedColor]);

  // Параллакс
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 90, damping: 22 });
  const sy = useSpring(my, { stiffness: 90, damping: 22 });

  const onMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!allowInteractive) return;
    const w = vp.w || 1;
    const h = vp.h || 1;
    const nx = (e.clientX / w - 0.5) * 30;
    const ny = (e.clientY / h - 0.5) * 30;
    mx.set(nx);
    my.set(ny);
  };

  const base = "#1c1b1e";

  const layoutTransition = {
    duration: 0.9,
    ease: [0.2, 0, 0, 1] as [number, number, number, number],
  };

  return (
    <div
      onMouseMove={onMove}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background: base,
        pointerEvents: "none", // фон не перехватывает клики
      }}
    >
      <motion.div style={{ position: "absolute", inset: 0, x: sx, y: sy }}>
        {/* общий подклад */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(1200px 900px at 20% 10%, ${chroma(a).alpha(0.18).css()}, transparent 55%),
                         radial-gradient(1100px 800px at 90% 30%, ${chroma(b).alpha(0.14).css()}, transparent 60%),
                         radial-gradient(900px 700px at 30% 90%, ${chroma(seedColor).alpha(0.12).css()}, transparent 55%)`,
            filter: "blur(10px)",
          }}
        />

        {bubbles.map((bb, idx) => {
          const pos = layout[idx];

          const g1 = chroma(seedColor).alpha(0.55).css();
          const g2 = chroma(a).alpha(0.45).css();
          const g3 = chroma(b).alpha(0.40).css();

          return (
            // OUTER: базовая позиция (меняется при смене layoutKey)
            <motion.div
              key={bb.id}
              animate={{ x: pos?.x ?? 0, y: pos?.y ?? 0 }}
              transition={layoutTransition}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                willChange: "transform",
              }}
            >
              {/* INNER: дрейф/пульсация бесконечно */}
              <motion.div
                initial={{ x: 0, y: 0, scale: 1 }}
                animate={{
                  x: [0, bb.driftX, 0],
                  y: [0, bb.driftY, 0],
                  scale: [1, 1.06, 1],
                }}
                transition={{
                  duration: bb.dur,
                  delay: bb.delay,
                  repeat: Infinity,
                  ease: [0.2, 0, 0, 1],
                }}
                style={{
                  width: bb.size,
                  height: bb.size,
                  borderRadius: 9999,
                  opacity: bb.opacity,
                  filter: `blur(${bb.blur}px)`,
                  mixBlendMode: "screen",
                  background: `radial-gradient(circle at 30% 30%, ${g1}, transparent 62%),
                               radial-gradient(circle at 70% 65%, ${g2}, transparent 64%),
                               radial-gradient(circle at 60% 25%, ${g3}, transparent 66%)`,
                }}
              />
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
