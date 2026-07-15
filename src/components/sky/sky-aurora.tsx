/**
 * Rare aurora: muted lilac, mint, and pale cyan bands moving extremely
 * slowly. Never announced, never a reward, static under reduced motion.
 */
export function SkyAurora() {
  return (
    <div aria-hidden="true" data-testid="sky-aurora" className="sky-aurora">
      <div className="sky-aurora__band sky-aurora__band--high" />
      <div className="sky-aurora__band sky-aurora__band--low" />
    </div>
  );
}
