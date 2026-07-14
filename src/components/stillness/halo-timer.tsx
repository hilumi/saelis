"use client";

import { useEffect, useRef, useState } from "react";

import { TheLight } from "@/components/brand/the-light";
import { Button } from "@/components/ui/button";

const DURATIONS = [
  { minutes: 2, label: "2 minutes" },
  { minutes: 5, label: "5 minutes" },
  { minutes: 10, label: "10 minutes" },
] as const;

/**
 * A quiet timer for Stillness. Leaving early is always fine, and nothing is
 * tracked or scored.
 */
export function HaloTimer() {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function start(minutes: number) {
    setFinished(false);
    setSecondsLeft(minutes * 60);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setSecondsLeft((current) => {
        if (current === null) return null;
        if (current <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setFinished(true);
          return null;
        }
        return current - 1;
      });
    }, 1000);
  }

  function end() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSecondsLeft(null);
    setFinished(false);
  }

  const active = secondsLeft !== null;
  const minutes = active ? Math.floor(secondsLeft / 60) : 0;
  const seconds = active ? secondsLeft % 60 : 0;

  return (
    <div className="flex flex-col items-center gap-8 py-6 text-center">
      <div
        className={`halo-ring ${active ? "halo-ring--active" : ""} flex items-center justify-center p-8`}
      >
        <TheLight state={active ? "still" : "resting"} size={120} />
      </div>

      {active ? (
        <>
          <p className="text-2xl tabular-nums text-ink" aria-hidden="true">
            {minutes}:{seconds.toString().padStart(2, "0")}
          </p>
          <p className="sr-only" aria-live="polite">
            Stillness in progress.
          </p>
          <Button variant="ghost" onClick={end}>
            End early — that&apos;s fine
          </Button>
        </>
      ) : (
        <>
          <p aria-live="polite" className="max-w-md text-ink">
            {finished
              ? "That's the full stretch of quiet. Welcome back."
              : "A few minutes of nothing at all. Choose a length, or simply sit."}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {DURATIONS.map((duration) => (
              <Button key={duration.minutes} variant="soft" onClick={() => start(duration.minutes)}>
                {duration.label}
              </Button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
