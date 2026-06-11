import { useEffect, useRef, useState } from "react";
import { Simulation } from "./simulation/Simulation";

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [_, setSelectedOrbId] = useState<number | null>(null);

  const simRef = useRef<Simulation | null>(null);
  const [, setTick] = useState(0);

  const mouseRef = useRef({ x: -1000, y: -1000 });

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

    if (!simRef.current) {
      const sim = new Simulation(canvas.width, canvas.height, 60);
      simRef.current = sim;
    }

    const sim = simRef.current;

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

      sim.selectOrb(selected);
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
      const sim = simRef.current;
      if (!sim) return;
      const orb = sim.orbs.find((o) => o.id === orbId);
      if (!orb) return;

      const alpha = orb.vitality / 100;

      if (alpha <= 0) {
        ctx!.fillStyle = "rgba(55, 58, 62, 0.15)";
        ctx!.beginPath();
        ctx!.arc(x, y, radius, 0, Math.PI * 2);
        ctx!.fill();
        return;
      }

      ctx!.save();

      const r = radius * 4;
      const base = ctx!.createRadialGradient(x, y, 0, x, y, r);
      base.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
      base.addColorStop(0.2, `rgba(160, 210, 255, ${alpha * 0.5})`);
      base.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx!.fillStyle = base;
      ctx!.beginPath();
      ctx!.arc(x, y, r, 0, Math.PI * 2);
      ctx!.fill();

      if (glow > 0.01) {
        const gR = r * 1.25;
        const g = ctx!.createRadialGradient(x, y, 0, x, y, gR);
        g.addColorStop(0, `rgba(180, 220, 255, ${0.45 * glow * alpha})`);
        g.addColorStop(0.35, `rgba(140, 200, 255, ${0.15 * glow * alpha})`);
        g.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx!.fillStyle = g;
        ctx!.beginPath();
        ctx!.arc(x, y, gR, 0, Math.PI * 2);
        ctx!.fill();
      }

      ctx!.restore();
    }

    function drawConnection(
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      alpha: number,
    ) {
      ctx!.save();
      ctx!.beginPath();
      ctx!.moveTo(x1, y1);
      ctx!.lineTo(x2, y2);
      ctx!.strokeStyle = `rgba(160, 210, 255, ${alpha * 0.4})`;
      ctx!.lineWidth = 1;
      ctx!.stroke();
      ctx!.restore();
    }

    function drawRelationship(
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      strength: number,
      stability: number,
      state: string,
    ) {
      ctx!.save();

      const alpha = Math.max(0, Math.min(1, strength / 100));

      let color = "160, 210, 255";

      if (state === "STABLE") {
        color = "120, 255, 180";
      } else if (state === "UNSTABLE") {
        color = "255, 180, 120";
      }

      const finalAlpha = alpha * (0.3 + stability);

      ctx!.strokeStyle = `rgba(${color}, ${finalAlpha})`;

      ctx!.lineWidth = 2.5;

      ctx!.beginPath();
      ctx!.moveTo(x1, y1);
      ctx!.lineTo(x2, y2);
      ctx!.stroke();

      ctx!.restore();
    }

    function clearScreen() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      ctx!.fillStyle = "rgb(20, 15, 30)";
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height);
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

      const isHovering = hoveredRef.current !== null;
      const isSelecting = selectedRef.current !== null;

      const SMOOTH = 0.18;

      const targetHover = isHovering ? 1 : 0;
      const targetSelect = isSelecting ? 1 : 0;

      hoverGlowRef.current += (targetHover - hoverGlowRef.current) * SMOOTH;
      selectGlowRef.current += (targetSelect - selectGlowRef.current) * SMOOTH;

      clearScreen();

      const activeObserverId = selectedRef.current ?? hoveredRef.current;

      if (activeObserverId !== null) {
        for (const rel of sim.relationships.values()) {
          if (rel.aId === activeObserverId || rel.bId === activeObserverId) {
            const a = sim.orbs.find((o) => o.id === rel.aId);
            const b = sim.orbs.find((o) => o.id === rel.bId);

            if (!a || !b) continue;

            if (rel.bondStrength <= 0) continue;

            drawRelationship(
              a.x,
              a.y,
              b.x,
              b.y,
              rel.bondStrength,
              rel.stability,
              rel.state,
            );
          }
        }
      }

      for (const orb of sim.orbs) {
        const isHovered = hoveredRef.current === orb.id;
        const isSelected = selectedRef.current === orb.id;

        const glow =
          (isHovered ? hoverGlowRef.current : 0) +
          (isSelected ? selectGlowRef.current : 0);

        drawOrb(orb.x, orb.y, orb.radius, orb.id, glow);
      }

      const activeIdForLines = selectedRef.current ?? hoveredRef.current;
      const activeOrbInstance =
        activeIdForLines !== null
          ? sim.orbs.find((o) => o.id === activeIdForLines)
          : null;

      if (activeOrbInstance && activeOrbInstance.vitality > 0) {
        const neighbors = activeOrbInstance.neighbors ?? [];
        const SENSE_RADIUS = 120;

        for (const n of neighbors) {
          const target = sim.orbs.find((o) => o.id === n.id);
          if (!target || target.vitality <= 0) continue;

          const baseAlpha = 1 - n.distance / SENSE_RADIUS;

          drawConnection(
            activeOrbInstance.x,
            activeOrbInstance.y,
            target.x,
            target.y,
            baseAlpha,
          );
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

  const activeIdForUI = selectedRef.current ?? hoveredRef.current;

  const activeOrb =
    activeIdForUI !== null
      ? simRef.current?.orbs.find((o) => o.id === activeIdForUI)
      : null;

  let profileColor = "#bfe6ff";
  if (activeOrb?.attachmentStyle === "ANXIOUS") profileColor = "#ff7575";
  if (activeOrb?.attachmentStyle === "AVOIDANT") profileColor = "#5cb3ff";
  if (activeOrb?.attachmentStyle === "BLASE") profileColor = "#a3a8b0";

  const getInspectorNarrative = (orb: any) => {
    if (orb.vitality <= 0) {
      return "INDIVIDUALITY_ERASED // RESIDUAL_TRACE_ONLY";
    }

    if (orb.isInspected && orb.surveillanceTimer > 180) {
      return "GAZE_PRESSURE_DETECTION // SUBJECT_IS_MASKING";
    }

    switch (orb.attachmentStyle) {
      case "ANXIOUS":
        return orb.lonelinessIndex > 50
          ? "ANXIOUS_COGNITIVE_PANIC // SEEKING_SIGNAL"
          : "PROXIMITY_SECURED // LOCKED_IN_UNSTABLE_ENMESHMENT";
      case "AVOIDANT":
        return orb.socialBattery < 45
          ? "PERIMETER_BREACH // EXECUTING_DEFENSIVE_FLIGHT"
          : "SOLITARY_STASIS // CONSERVING_POTENTIAL_STATE";
      case "BLASE":
        return "CRITICAL_SOCIAL_OVERLOAD // COMPLIANT_NUMBNESS_MUTATION";
      default:
        return "INTERFACE_EQUILIBRIUM // SUSTAINABLE_VOID_DISTANCE";
    }
  };

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

          <br />

          <div>
            PROFILE:&nbsp;
            <span style={{ color: profileColor }}>
              {activeOrb.attachmentStyle}
            </span>
          </div>

          <br />

          <div>
            <div>
              VITALITY:{" "}
              <span
                style={{
                  color: activeOrb.vitality < 40 ? "#ff7575" : "#bfe6ff",
                }}
              >
                {activeOrb.vitality.toFixed(1)}%
              </span>
            </div>
            <div>BATTERY: {activeOrb.socialBattery.toFixed(1)}%</div>
            <div>VOID_IDX: {activeOrb.lonelinessIndex.toFixed(1)}%</div>
          </div>

          <br />

          <div
            style={{
              marginTop: 6,
              paddingTop: 6,
              borderTop: "1px dashed rgba(140, 200, 255, 0.15)",
            }}
          >
            <div>
              GAZE_TIME: {(activeOrb.surveillanceTimer * 16.67).toFixed(0)} us
            </div>
            <div>
              GAZE_STAT:{" "}
              <span
                style={{ color: activeOrb.isInspected ? "#00a008" : "#bfe6ff" }}
              >
                {activeOrb.isInspected ? "INSPECTING" : "PASSIVE_SCAN"}
              </span>
            </div>
          </div>

          <br />

          <div style={{ marginTop: 8, opacity: 0.7 }}>
            NEIGHBORS: {activeOrb.neighbors?.length ?? 0}
          </div>

          <br />

          <div
            style={{
              marginTop: 10,
              paddingTop: 10,
              borderTop: "1px solid rgba(140, 200, 255, 0.25)",
              color: "#fff",
              lineHeight: "1.4em",
              fontStyle: "italic",
              opacity: 0.9,
            }}
          >
            {getInspectorNarrative(activeOrb)}
          </div>
        </div>
      )}

      <canvas ref={canvasRef} />
    </>
  );
}

export default App;
