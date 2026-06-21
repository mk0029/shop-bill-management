"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface FloatingObject {
  symbol: string;
  layer: number;
  size: number;
  x: number;
  y: number;
  rotation: number;
  duration: number;
  delay: number;
  opacity: number;
}

const objects: FloatingObject[] = [
  { symbol: "⚡", layer: 1, size: 28, x: 5, y: 8, rotation: -15, duration: 14, delay: 0, opacity: 0.06 },
  { symbol: "⟳", layer: 2, size: 36, x: 12, y: 35, rotation: 10, duration: 18, delay: 1, opacity: 0.05 },
  { symbol: "⏚", layer: 1, size: 24, x: 22, y: 55, rotation: 0, duration: 16, delay: 2, opacity: 0.04 },
  { symbol: "⊞", layer: 3, size: 32, x: 8, y: 72, rotation: 25, duration: 20, delay: 0.5, opacity: 0.05 },
  { symbol: "⚙", layer: 2, size: 30, x: 18, y: 18, rotation: 0, duration: 22, delay: 3, opacity: 0.05 },
  { symbol: "◉", layer: 3, size: 26, x: 30, y: 45, rotation: 0, duration: 15, delay: 1.5, opacity: 0.04 },
  { symbol: "▽", layer: 1, size: 22, x: 28, y: 80, rotation: -20, duration: 19, delay: 0.8, opacity: 0.05 },
  { symbol: "⬡", layer: 2, size: 34, x: 35, y: 12, rotation: 30, duration: 17, delay: 2.5, opacity: 0.04 },
  { symbol: "⚡", layer: 3, size: 20, x: 42, y: 65, rotation: -10, duration: 13, delay: 0.3, opacity: 0.06 },
  { symbol: "⊟", layer: 1, size: 28, x: 48, y: 28, rotation: 45, duration: 21, delay: 4, opacity: 0.04 },
  { symbol: "⌁", layer: 2, size: 26, x: 52, y: 50, rotation: 0, duration: 16, delay: 1.2, opacity: 0.05 },
  { symbol: "⟐", layer: 3, size: 30, x: 58, y: 75, rotation: 15, duration: 18, delay: 0.7, opacity: 0.04 },
  { symbol: "◈", layer: 1, size: 24, x: 62, y: 15, rotation: -25, duration: 14, delay: 3.5, opacity: 0.05 },
  { symbol: "⚡", layer: 2, size: 32, x: 68, y: 42, rotation: 5, duration: 20, delay: 0.1, opacity: 0.06 },
  { symbol: "⌂", layer: 3, size: 28, x: 72, y: 62, rotation: -5, duration: 17, delay: 2, opacity: 0.04 },
  { symbol: "⊡", layer: 1, size: 22, x: 78, y: 85, rotation: 35, duration: 15, delay: 1.8, opacity: 0.05 },
  { symbol: "⟁", layer: 2, size: 30, x: 82, y: 10, rotation: -30, duration: 19, delay: 0.4, opacity: 0.04 },
  { symbol: "⏚", layer: 3, size: 26, x: 88, y: 38, rotation: 0, duration: 16, delay: 2.8, opacity: 0.05 },
  { symbol: "⊙", layer: 1, size: 34, x: 92, y: 58, rotation: 0, duration: 22, delay: 1.1, opacity: 0.04 },
  { symbol: "⚙", layer: 2, size: 24, x: 96, y: 22, rotation: 0, duration: 14, delay: 3.2, opacity: 0.05 },
  { symbol: "◉", layer: 1, size: 28, x: 15, y: 92, rotation: 0, duration: 18, delay: 0.6, opacity: 0.04 },
  { symbol: "▽", layer: 3, size: 22, x: 45, y: 88, rotation: 15, duration: 20, delay: 2.2, opacity: 0.05 },
  { symbol: "⬡", layer: 1, size: 30, x: 55, y: 95, rotation: -10, duration: 16, delay: 1.4, opacity: 0.04 },
  { symbol: "⟳", layer: 3, size: 26, x: 85, y: 90, rotation: 0, duration: 17, delay: 0.9, opacity: 0.05 },
  { symbol: "⊞", layer: 2, size: 32, x: 38, y: 5, rotation: -20, duration: 15, delay: 4.5, opacity: 0.04 },
  { symbol: "⌁", layer: 1, size: 24, x: 75, y: 48, rotation: 0, duration: 21, delay: 0.2, opacity: 0.05 },
  { symbol: "⟐", layer: 3, size: 28, x: 25, y: 68, rotation: 10, duration: 14, delay: 3.8, opacity: 0.04 },
  { symbol: "⚡", layer: 1, size: 36, x: 60, y: 32, rotation: -8, duration: 19, delay: 1.6, opacity: 0.06 },
  { symbol: "⊟", layer: 2, size: 22, x: 50, y: 78, rotation: 20, duration: 16, delay: 0.5, opacity: 0.05 },
  { symbol: "⌂", layer: 1, size: 28, x: 33, y: 55, rotation: -15, duration: 18, delay: 2.7, opacity: 0.04 },
];

export default function ElectricalBackground({ children }: { children: ReactNode }) {
  const layersRef = useRef<(HTMLDivElement | null)[]>([null, null, null]);

  useEffect(() => {
    let frameId: number;
    let scrollY = 0;

    const handleScroll = () => {
      scrollY = window.scrollY;
    };

    const animate = () => {
      layersRef.current.forEach((layer, i) => {
        if (!layer) return;
        const speed = [0.03, 0.06, 0.1][i] || 0.05;
        layer.style.transform = `translateY(${-scrollY * speed}px)`;
      });
      frameId = requestAnimationFrame(animate);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    frameId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" style={{ background: "#0B0D12" }}>
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 20% 50%, rgba(56,189,248,0.03) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.02) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(129,140,248,0.02) 0%, transparent 50%)" }} />
        <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        {[0, 1, 2].map((layer) => (
          <div
            key={layer}
            ref={(el) => { layersRef.current[layer] = el; }}
            className="absolute inset-0 parallax-layer"
            style={{ zIndex: layer + 1 }}
          >
            {objects
              .filter((o) => o.layer === layer + 1)
              .map((obj, i) => (
                <div
                  key={`${layer}-${i}`}
                  className="absolute"
                  style={{
                    left: `${obj.x}%`,
                    top: `${obj.y}%`,
                    fontSize: `${obj.size}px`,
                    opacity: obj.opacity,
                    color: "#38BDF8",
                    transform: `rotate(${obj.rotation}deg)`,
                    animation: `drift ${obj.duration}s ease-in-out ${obj.delay}s infinite`,
                    willChange: "transform",
                    textShadow: "0 0 20px rgba(56,189,248,0.1)",
                  }}
                >
                  {obj.symbol}
                </div>
              ))}
          </div>
        ))}
        <div className="absolute inset-0" style={{ backdropFilter: "blur(30px)", background: "rgba(10,10,15,0.45)", zIndex: 4 }} />
      </div>
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
