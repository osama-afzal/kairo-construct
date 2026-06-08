import { useEffect, useRef, useState } from "react";
import { Simulation } from "./simulation/Simulation";

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [hoveredOrbId, setHoveredOrbId] = useState<number | null>(null);
  const [selectedOrbId, setSelectedOrbId] = useState<number | null>(null);

  const simRef = useRef<Simulation | null>(null);

  const [, setTick] = useState(0);

  const mouseRef = useRef({ x: 0, y: 0 });

  const hoveredRef = useRef<number | null>(null);
  const selectedRef = useRef<number | null>(null);

  const hoverFadeRef = useRef(0);

  const hoverGlowRef = useRef(0);
  const selectGlowRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    const sim = new Simulation(canvas.width, canvas.height, 100);
    simRef.current = sim;

    const FIXED_TIMESTEP = 1000 / 60;
    let lastTime = performance.now();
    let accumulator = 0;

    function getHoveredOrb(sim: Simulation, mouseX: number, mouseY: number) {
      let hovered: number | null = null;

      for (const orb of sim.orbs) {
        const dx = mouseX - orb.x;
        const dy = mouseY - orb.y;
        const distance = Math.hypot(dx, dy);

        if (distance <= orb.radius * 4) {
          hovered = orb.id;
          break;
        }
      }

      return hovered;
    }

    function handleMouseMove(event: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      mouseRef.current.x = event.clientX - rect.left;
      mouseRef.current.y = event.clientY - rect.top;
    }

    function handleClick(event: MouseEvent) {
      const sim = simRef.current;
      if (!canvas || !sim) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      let selected: number | null = null;

      for (const orb of sim.orbs) {
        const dx = mouseX - orb.x;
        const dy = mouseY - orb.y;
        const distance = Math.hypot(dx, dy);

        if (distance <= orb.radius * 4) {
          selected = orb.id;
          break;
        }
      }

      setSelectedOrbId(selected);
      selectedRef.current = selected;
    }

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("click", handleClick);

    function drawOrb(
      x: number,
      y: number,
      radius: number,
      orbId: number,
      glow: number,
    ) {
      const r = radius * 4;

      const base = ctx!.createRadialGradient(x, y, 0, x, y, r);
      base.addColorStop(0, "rgba(200, 230, 255, 1)");
      base.addColorStop(0.2, "rgba(140, 200, 255, 0.6)");
      base.addColorStop(1, "rgba(140, 200, 255, 0)");

      ctx!.fillStyle = base;
      ctx!.beginPath();
      ctx!.arc(x, y, r, 0, Math.PI * 2);
      ctx!.fill();

      if (glow > 0.01) {
        const gR = r * 1.25;

        const intensity = glow;

        const g = ctx!.createRadialGradient(x, y, 0, x, y, gR);

        g.addColorStop(0, `rgba(180, 220, 255, ${0.45 * intensity})`);
        g.addColorStop(0.35, `rgba(150, 200, 255, ${0.15 * intensity})`);
        g.addColorStop(1, "rgba(140, 200, 255, 0)");

        ctx!.fillStyle = g;
        ctx!.beginPath();
        ctx!.arc(x, y, gR, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    function drawConnection(
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      alpha: number,
    ) {
      ctx!.beginPath();
      ctx!.moveTo(x1, y1);
      ctx!.lineTo(x2, y2);
      ctx!.strokeStyle = `rgba(160,210,255,${alpha})`;
      ctx!.lineWidth = 1;
      ctx!.stroke();
    }

    function animate(now: number) {
      const delta = now - lastTime;
      lastTime = now;

      accumulator += delta;

      while (accumulator >= FIXED_TIMESTEP) {
        sim.update();
        accumulator -= FIXED_TIMESTEP;
      }

      const hovered = getHoveredOrb(
        sim,
        mouseRef.current.x,
        mouseRef.current.y,
      );

      if (hovered !== null) {
        hoveredRef.current = hovered;
        hoverFadeRef.current = 1;
      } else {
        hoverFadeRef.current *= 0.85;

        if (hoverFadeRef.current < 0.05) {
          hoveredRef.current = null;
          hoverFadeRef.current = 0;
        }
      }

      if (hoveredRef.current !== hoveredOrbId) {
        setHoveredOrbId(hoveredRef.current);
      }

      const isHovering = hoveredRef.current !== null;
      const isSelecting = selectedRef.current !== null;

      const SMOOTH = 0.18;

      const targetHover = isHovering ? 1 : 0;
      const targetSelect = isSelecting ? 1 : 0;

      hoverGlowRef.current += (targetHover - hoverGlowRef.current) * SMOOTH;
      selectGlowRef.current += (targetSelect - selectGlowRef.current) * SMOOTH;

      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      ctx!.fillStyle = "rgb(20, 15, 30)";
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height);

      for (const orb of sim.orbs) {
        const isHovered = hoveredRef.current === orb.id;
        const isSelected = selectedRef.current === orb.id;

        const glow =
          (isHovered ? hoverGlowRef.current : 0) +
          (isSelected ? selectGlowRef.current : 0);

        drawOrb(orb.x, orb.y, orb.radius, orb.id, glow);
      }

      const activeOrbId = selectedRef.current ?? hoveredRef.current;

      const activeOrb = activeOrbId
        ? sim.orbs.find((o) => o.id === activeOrbId)
        : null;

      if (activeOrb) {
        const neighbors = activeOrb.neighbors ?? [];
        const SENSE_RADIUS = 120;

        const closest = [...neighbors]
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 5);

        for (const n of closest) {
          const target = sim.orbs.find((o) => o.id === n.id);
          if (!target) continue;

          const baseAlpha = 1 - n.distance / SENSE_RADIUS;

          const isHover = hoveredRef.current === activeOrb.id;
          const isSelected = selectedRef.current === activeOrb.id;

          let alpha = baseAlpha;

          if (isHover && !isSelected) {
            alpha *= hoverFadeRef.current;
          }

          drawConnection(activeOrb.x, activeOrb.y, target.x, target.y, alpha);
        }
      }

      setTick((t) => t + 1);

      requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("click", handleClick);
    };
  }, []);

  const activeOrbId = selectedRef.current ?? hoveredRef.current;

  const activeOrb =
    activeOrbId !== null
      ? simRef.current?.orbs.find((o) => o.id === activeOrbId)
      : null;

  return (
    <>
      {activeOrb && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            width: 240,
            padding: 12,
            background: "rgba(10, 12, 18, 0.85)",
            border: "1px solid rgba(140, 200, 255, 0.3)",
            color: "#bfe6ff",
            fontFamily: "monospace",
            fontSize: 12,
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          <div style={{ color: "#fff", marginBottom: 8 }}>ORB INSPECTOR</div>

          <div>ID: {activeOrb.id}</div>
          <div>X: {activeOrb.x.toFixed(1)}</div>
          <div>Y: {activeOrb.y.toFixed(1)}</div>
          <div>VX: {activeOrb.vx.toFixed(2)}</div>
          <div>VY: {activeOrb.vy.toFixed(2)}</div>

          <div style={{ marginTop: 8, opacity: 0.7 }}>
            Neighbors: {activeOrb.neighbors?.length ?? 0}
          </div>
        </div>
      )}

      <canvas ref={canvasRef} />
    </>
  );
}

export default App;
