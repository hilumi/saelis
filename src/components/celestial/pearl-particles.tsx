/**
 * A handful of drifting pearl motes. Positions are fixed constants so server
 * and client renders always match (no random values at render time).
 */
const PARTICLES: Array<{ left: string; top: string; delay: string; scale: number }> = [
  { left: "12%", top: "22%", delay: "0s", scale: 1 },
  { left: "28%", top: "58%", delay: "-3s", scale: 0.8 },
  { left: "44%", top: "16%", delay: "-6s", scale: 1.2 },
  { left: "63%", top: "42%", delay: "-9s", scale: 0.9 },
  { left: "78%", top: "24%", delay: "-2s", scale: 1.1 },
  { left: "86%", top: "62%", delay: "-7s", scale: 0.7 },
  { left: "52%", top: "74%", delay: "-11s", scale: 1 },
  { left: "8%", top: "76%", delay: "-5s", scale: 0.85 },
];

export function PearlParticles() {
  return (
    <div aria-hidden="true">
      {PARTICLES.map((particle, index) => (
        <span
          key={index}
          className="pearl-particle"
          style={{
            left: particle.left,
            top: particle.top,
            animationDelay: particle.delay,
            transform: `scale(${particle.scale})`,
          }}
        />
      ))}
    </div>
  );
}
