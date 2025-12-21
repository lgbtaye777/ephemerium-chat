import React, { useEffect, useMemo, useRef } from "react";

type Speed = "slow" | "medium" | "fast";

interface Props {
  backgroundFill?: string;
  colors?: string[];
  waveWidth?: number; // меньше => чаще
  blur?: number;
  speed?: Speed;
  waveOpacity?: number;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export function WavyBackground({
  backgroundFill = "#1c1b1e",
  colors = ["#6B5CFF", "#3A4DFF", "#FF7AD9", "#FF8A6B", "#7EE0FF"],
  waveWidth = 40,
  blur = 12,
  speed = "slow",
  waveOpacity = 0.45,
  className,
  style,
  children,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  // Ключевой фикс: строковый ключ не меняется, если значения цветов те же,
  // даже если массив создаётся заново на каждом render.
  const colorsKey = useMemo(() => colors.join("|"), [colors.join("|")]);

  const speedMul = useMemo(() => {
    switch (speed) {
      case "slow":
        return 0.55;
      case "medium":
        return 0.85;
      case "fast":
      default:
        return 1.15;
    }
  }, [speed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    const resize = () => {
      const { clientWidth, clientHeight } = canvas;
      canvas.width = Math.floor(clientWidth * dpr);
      canvas.height = Math.floor(clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    let t = 0;
    let lastTs = performance.now();

    const drawRibbon = (color: string, idx: number, count: number, w: number, h: number) => {
      const center = h * 0.5;
      const spread = Math.min(140, h * 0.18);
      const offset = (idx - (count - 1) / 2) * (spread / Math.max(1, count - 1));

      const thickness = Math.min(120, Math.max(70, h * 0.12));
      const amp = Math.min(70, Math.max(34, h * 0.055)) + idx * 4;

      const baseW = Math.max(18, waveWidth);
      const freq = (Math.PI * 2) / (baseW * 20);

      const phase = t * 1.15 + idx * 0.9;

      ctx.save();
      ctx.globalAlpha = Math.min(1, Math.max(0, waveOpacity)) * 0.95;

      // "screen-like" эффект
      ctx.globalCompositeOperation = "lighter";

      ctx.filter = `blur(${blur}px)`;
      ctx.shadowBlur = blur * 2.2;
      ctx.shadowColor = color;

      ctx.strokeStyle = color;
      ctx.lineWidth = thickness;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const pad = 140;
      const step = 34;

      const points: Array<{ x: number; y: number }> = [];
      for (let x = -pad; x <= w + pad; x += step) {
        const y =
          center +
          offset +
          Math.sin(x * freq + phase) * amp +
          Math.sin(x * freq * 0.55 + phase * 1.7) * (amp * 0.55);
        points.push({ x, y });
      }

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);

      for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }

      const last = points[points.length - 1];
      ctx.lineTo(last.x, last.y);
      ctx.stroke();

      ctx.restore();
    };

    const draw = (ts: number) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      // delta-time для плавного движения даже при просадках FPS
      const dt = Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;

      // 1) Фон
      ctx.globalCompositeOperation = "source-over";
      ctx.filter = "none";
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      ctx.fillStyle = backgroundFill;
      ctx.fillRect(0, 0, w, h);

      // 2) Ленты
      for (let i = 0; i < colors.length; i++) {
        drawRibbon(colors[i], i, colors.length, w, h);
      }

      // 3) time
      t += dt * 2.0 * speedMul;

      rafRef.current = window.requestAnimationFrame(draw);
    };

    rafRef.current = window.requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };

    // colorsKey нужен, чтобы эффект перезапускался ТОЛЬКО когда реально поменялись значения цветов
  }, [backgroundFill, blur, speedMul, waveOpacity, waveWidth, colorsKey]);

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
      />
      <div style={{ position: "relative", zIndex: 1, width: "100%", height: "100%" }}>
        {children}
      </div>
    </div>
  );
}
