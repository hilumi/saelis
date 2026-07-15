/**
 * @deprecated Evolved into the Living Sky (src/components/sky/living-sky.tsx),
 * which is mounted once in the root layout and provides the global atmosphere
 * for every route. This component now renders nothing and exists only so any
 * stray import keeps compiling. The cloud-layer, horizon-glow, and
 * pearl-particles primitives remain available for reuse.
 */
export function CelestialEnvironment() {
  return null;
}
