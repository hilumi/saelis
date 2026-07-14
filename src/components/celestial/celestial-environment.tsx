import { CloudLayer } from "@/components/celestial/cloud-layer";
import { HorizonGlow } from "@/components/celestial/horizon-glow";
import { PearlParticles } from "@/components/celestial/pearl-particles";

/**
 * The full-screen celestial backdrop: sky gradient, three cloud bands,
 * horizon glow, and pearl motes. Entirely decorative and hidden from
 * assistive technology. Motion stops under prefers-reduced-motion.
 */
export function CelestialEnvironment() {
  return (
    <div className="celestial-environment" aria-hidden="true">
      <CloudLayer variant="high" />
      <CloudLayer variant="mid" />
      <CloudLayer variant="low" />
      <HorizonGlow />
      <PearlParticles />
    </div>
  );
}
