import { TheLight } from "@/components/brand/the-light";

export default function Loading() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <TheLight state="resting" size={80} />
      <p className="text-ink-soft" role="status">
        One moment…
      </p>
    </div>
  );
}
