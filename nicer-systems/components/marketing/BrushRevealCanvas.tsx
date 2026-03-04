"use client";

import { useRef, useEffect, useState } from "react";
import { track, EVENTS } from "@/lib/analytics";

// --- Data structures for the reveal layer ---

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  r: number;
  g: number;
  b: number;
  alpha: number;
  phase: number;
  speed: number;
}

interface NebulaField {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  r: number;
  g: number;
  b: number;
  phase: number;
  pulseSpeed: number;
}

interface GlowNode {
  x: number;
  y: number;
  baseRadius: number;
  r: number;
  g: number;
  b: number;
  phase: number;
  pulseSpeed: number;
}

// --- Helper: parse hex color to RGB ---

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

// --- Initialization functions ---

function initParticles(
  w: number,
  h: number,
  primary: [number, number, number],
  secondary: [number, number, number],
  count: number
): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const usePrimary = Math.random() > 0.4;
    const [r, g, b] = usePrimary ? primary : secondary;
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.3,
      radius: 1 + Math.random() * 2,
      r,
      g,
      b,
      alpha: 0.3 + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.7,
    });
  }
  return particles;
}

function initNebulae(
  w: number,
  h: number,
  primary: [number, number, number],
  secondary: [number, number, number],
  count: number
): NebulaField[] {
  const nebulae: NebulaField[] = [];
  for (let i = 0; i < count; i++) {
    const usePrimary = i % 2 === 0;
    const [r, g, b] = usePrimary ? primary : secondary;
    nebulae.push({
      cx: w * 0.15 + Math.random() * w * 0.7,
      cy: h * 0.15 + Math.random() * h * 0.7,
      rx: 150 + Math.random() * 250,
      ry: 120 + Math.random() * 200,
      r,
      g,
      b,
      phase: Math.random() * Math.PI * 2,
      pulseSpeed: 0.2 + Math.random() * 0.4,
    });
  }
  return nebulae;
}

function initGlowNodes(
  w: number,
  h: number,
  primary: [number, number, number],
  secondary: [number, number, number],
  count: number
): GlowNode[] {
  const nodes: GlowNode[] = [];
  for (let i = 0; i < count; i++) {
    const usePrimary = Math.random() > 0.35;
    const [r, g, b] = usePrimary ? primary : secondary;
    nodes.push({
      x: Math.random() * w,
      y: Math.random() * h,
      baseRadius: 10 + Math.random() * 20,
      r,
      g,
      b,
      phase: Math.random() * Math.PI * 2,
      pulseSpeed: 0.4 + Math.random() * 0.6,
    });
  }
  return nodes;
}

// --- Reveal layer renderer ---

function renderRevealLayer(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  particles: Particle[],
  nebulae: NebulaField[],
  glowNodes: GlowNode[]
) {
  // Dark navy base
  ctx.fillStyle = "#0a0e1a";
  ctx.fillRect(0, 0, w, h);

  // Nebula fields (additive blending)
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const n of nebulae) {
    const pulse = Math.sin(time * n.pulseSpeed + n.phase) * 0.5 + 0.5;
    const alpha = 0.03 + pulse * 0.05;
    const grad = ctx.createRadialGradient(n.cx, n.cy, 0, n.cx, n.cy, Math.max(n.rx, n.ry));
    grad.addColorStop(0, `rgba(${n.r},${n.g},${n.b},${alpha})`);
    grad.addColorStop(0.5, `rgba(${n.r},${n.g},${n.b},${alpha * 0.4})`);
    grad.addColorStop(1, `rgba(${n.r},${n.g},${n.b},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(n.cx, n.cy, n.rx, n.ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Glow nodes
  for (const node of glowNodes) {
    const pulse = Math.sin(time * node.pulseSpeed + node.phase) * 0.5 + 0.5;
    const r = node.baseRadius + pulse * 6;
    const alpha = 0.15 + pulse * 0.25;
    const grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r);
    grad.addColorStop(0, `rgba(${node.r},${node.g},${node.b},${alpha})`);
    grad.addColorStop(0.6, `rgba(${node.r},${node.g},${node.b},${alpha * 0.3})`);
    grad.addColorStop(1, `rgba(${node.r},${node.g},${node.b},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Particles
  for (const p of particles) {
    // Drift
    p.x += p.vx;
    p.y += p.vy;
    // Wrap around
    if (p.x < 0) p.x += w;
    if (p.x > w) p.x -= w;
    if (p.y < 0) p.y += h;
    if (p.y > h) p.y -= h;

    const pulse = Math.sin(time * p.speed + p.phase) * 0.3 + 0.7;
    ctx.globalAlpha = p.alpha * pulse;
    ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// --- Textured overlay generator ---

function generateTexturedOverlay(
  w: number,
  h: number,
  primary: [number, number, number],
): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;

  // 1. Dark base fill (fully opaque)
  ctx.fillStyle = "#0a0e1a";
  ctx.fillRect(0, 0, w, h);

  // 2. Per-pixel noise (checkerboard for perf)
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  for (let y = 0; y < h; y += 2) {
    for (let x = (y % 4 === 0 ? 0 : 1); x < w; x += 2) {
      const idx = (y * w + x) * 4;
      const jitter = Math.floor(Math.random() * 14) - 7;
      data[idx] = Math.max(0, Math.min(255, data[idx] + jitter));
      data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + jitter));
      data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + jitter));
    }
  }
  ctx.putImageData(imageData, 0, 0);

  // 3. Broad semi-transparent brush sweeps (paint texture)
  for (let i = 0; i < 40; i++) {
    const bright = Math.random() > 0.5;
    ctx.strokeStyle = bright ? "rgba(14,19,32,0.05)" : "rgba(16,14,26,0.04)";
    ctx.lineWidth = 30 + Math.random() * 60;
    ctx.lineCap = "round";
    const startX = -50 + Math.random() * (w + 100);
    const startY = Math.random() * h;
    const endX = startX + (Math.random() - 0.3) * w * 0.6;
    const endY = startY + (Math.random() - 0.5) * 100;
    const cpX = (startX + endX) / 2 + (Math.random() - 0.5) * 200;
    const cpY = (startY + endY) / 2 + (Math.random() - 0.5) * 150;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(cpX, cpY, endX, endY);
    ctx.stroke();
  }

  // 4. Fine stipple dots for granularity
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    ctx.globalAlpha = 0.03 + Math.random() * 0.05;
    ctx.fillStyle = Math.random() > 0.5 ? "#141a2a" : "#0d0f1e";
    ctx.beginPath();
    ctx.arc(x, y, 0.5 + Math.random() * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // 5. Vignette (transparent center, dark edges)
  const vigGrad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.7);
  vigGrad.addColorStop(0, "rgba(0,0,0,0)");
  vigGrad.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = vigGrad;
  ctx.fillRect(0, 0, w, h);

  // 6. Ghost grid (subtle nod to original blueprint)
  ctx.strokeStyle = `rgba(${primary[0]},${primary[1]},${primary[2]},0.02)`;
  ctx.lineWidth = 1;
  const spacing = 60;
  for (let x = 0; x <= w; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  return c;
}

// --- Bristle brush stamp ---

function stampBristle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  pressure: number
) {
  const bristleCount = 14 + Math.floor(Math.random() * 8);
  const spreadRadius = 22 * pressure;

  ctx.globalCompositeOperation = "destination-out";

  for (let i = 0; i < bristleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    // Squared random = clusters toward center
    const dist = Math.random() * Math.random() * spreadRadius;
    const bx = x + Math.cos(angle) * dist;
    const by = y + Math.sin(angle) * dist;
    const bristleRadius = 2 + Math.random() * 4;
    const edgeFactor = 1 - dist / spreadRadius;
    ctx.globalAlpha = Math.max(0.25, edgeFactor * pressure);
    ctx.beginPath();
    ctx.arc(bx, by, bristleRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Solid core for satisfying center clear
  ctx.globalAlpha = pressure * 0.9;
  ctx.beginPath();
  ctx.arc(x, y, spreadRadius * 0.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

// --- Component ---

interface BrushRevealCanvasProps {
  className?: string;
}

export function BrushRevealCanvas({ className }: BrushRevealCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Offscreen canvases
  const revealCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Animation
  const animFrameRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const nebulaeRef = useRef<NebulaField[]>([]);
  const glowNodesRef = useRef<GlowNode[]>([]);

  // Interaction state
  const isDrawing = useRef(false);
  const hasStarted = useRef(false);
  const hasCompleted = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const w = container.offsetWidth;
    const h = container.offsetHeight;

    // Performance check
    const start = performance.now();
    const testCanvas = document.createElement("canvas");
    testCanvas.width = 100;
    testCanvas.height = 100;
    const testCtx = testCanvas.getContext("2d")!;
    for (let i = 0; i < 100; i++) {
      testCtx.beginPath();
      testCtx.arc(50, 50, 30, 0, Math.PI * 2);
      testCtx.fill();
    }
    if (performance.now() - start > 200) {
      setTimeout(() => setFallback(true), 0);
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = w * dpr;
    const ch = h * dpr;

    canvas.width = cw;
    canvas.height = ch;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    // Read theme colors from CSS variables
    const style = getComputedStyle(container);
    const primaryHex = style.getPropertyValue("--theme-primary").trim() || "#00d4ff";
    const secondaryHex = style.getPropertyValue("--theme-secondary").trim() || "#7c3aed";
    const primary = hexToRgb(primaryHex);
    const secondary = hexToRgb(secondaryHex);

    // Initialize reveal layer data
    particlesRef.current = initParticles(cw, ch, primary, secondary, 80);
    nebulaeRef.current = initNebulae(cw, ch, primary, secondary, 5);
    glowNodesRef.current = initGlowNodes(cw, ch, primary, secondary, 10);

    // Create offscreen reveal canvas
    const revealC = document.createElement("canvas");
    revealC.width = cw;
    revealC.height = ch;
    revealCanvasRef.current = revealC;

    // Generate textured overlay
    const overlayC = generateTexturedOverlay(cw, ch, primary);
    overlayCanvasRef.current = overlayC;

    // --- Animation loop ---
    const mainCtx = canvas.getContext("2d")!;

    function compositeFrame(time: number) {
      const t = time * 0.001;
      const revealCtx = revealCanvasRef.current!.getContext("2d")!;

      // Render animated reveal layer
      renderRevealLayer(
        revealCtx,
        cw,
        ch,
        t,
        particlesRef.current,
        nebulaeRef.current,
        glowNodesRef.current
      );

      // Composite: reveal layer + overlay
      mainCtx.clearRect(0, 0, cw, ch);
      mainCtx.drawImage(revealCanvasRef.current!, 0, 0);
      mainCtx.drawImage(overlayCanvasRef.current!, 0, 0);

      animFrameRef.current = requestAnimationFrame(compositeFrame);
    }

    animFrameRef.current = requestAnimationFrame(compositeFrame);

    // --- Brush interaction ---

    function getCanvasCoords(clientX: number, clientY: number) {
      const rect = canvas!.getBoundingClientRect();
      const scaleX = cw / rect.width;
      const scaleY = ch / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    }

    function drawStroke(clientX: number, clientY: number) {
      if (!overlayCanvasRef.current) return;
      const overlayCtx = overlayCanvasRef.current.getContext("2d")!;
      const { x: cx, y: cy } = getCanvasCoords(clientX, clientY);
      const prev = lastPoint.current;

      if (!prev) {
        stampBristle(overlayCtx, cx, cy, 1.0);
        lastPoint.current = { x: cx, y: cy };
        return;
      }

      const dx = cx - prev.x;
      const dy = cy - prev.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const stepSize = 6;
      const steps = Math.max(1, Math.floor(dist / stepSize));
      const pressure = Math.max(0.5, Math.min(1.0, 1.0 - dist / 300));

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const ix = prev.x + dx * t;
        const iy = prev.y + dy * t;
        stampBristle(overlayCtx, ix, iy, pressure);
      }

      lastPoint.current = { x: cx, y: cy };
    }

    function checkReveal() {
      if (!overlayCanvasRef.current || hasCompleted.current) return;
      const ctx = overlayCanvasRef.current.getContext("2d")!;
      const ow = overlayCanvasRef.current.width;
      const oh = overlayCanvasRef.current.height;
      const step = 20;
      let total = 0;
      let cleared = 0;
      const data = ctx.getImageData(0, 0, ow, oh).data;
      for (let y = 0; y < oh; y += step) {
        for (let x = 0; x < ow; x += step) {
          total++;
          const idx = (y * ow + x) * 4 + 3;
          if (data[idx] < 128) cleared++;
        }
      }
      if (cleared / total > 0.5) {
        hasCompleted.current = true;
        track(EVENTS.BRUSH_REVEAL_COMPLETE);
      }
    }

    function onPointerDown(e: PointerEvent) {
      isDrawing.current = true;
      if (!hasStarted.current) {
        hasStarted.current = true;
        track(EVENTS.BRUSH_REVEAL_START);
      }
      lastPoint.current = null;
      drawStroke(e.clientX, e.clientY);
    }

    function onPointerMove(e: PointerEvent) {
      if (!isDrawing.current) return;
      drawStroke(e.clientX, e.clientY);
    }

    function onPointerUp() {
      isDrawing.current = false;
      lastPoint.current = null;
      checkReveal();
    }

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    // --- Visibility optimization ---
    function onVisibilityChange() {
      if (document.hidden) {
        cancelAnimationFrame(animFrameRef.current);
      } else {
        animFrameRef.current = requestAnimationFrame(compositeFrame);
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (fallback) {
    return (
      <div className={className}>
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--theme-primary)] to-[var(--theme-secondary)] opacity-20" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`absolute inset-0 ${className ?? ""}`}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-crosshair"
        style={{ touchAction: "none" }}
      />
    </div>
  );
}
