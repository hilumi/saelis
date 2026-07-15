"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { TheLight, type LightState } from "@/components/brand/the-light";
import { useSky } from "@/components/sky/use-sky";
import { Button } from "@/components/ui/button";
import { getGreetingPeriod, GREETINGS, type HomeData } from "@/lib/home/loader";
import { createSeededRandom } from "@/lib/sky/stars";

/**
 * Home — a sanctuary, not a dashboard. One greeting, four quiet doors, at
 * most one gentle continuation, and two small glimpses. Nothing competes,
 * nothing counts against you, nothing is urgent.
 */

const PRIMARY_ACTIONS = [
  { href: "/conversation", label: "Talk", description: "Share what is on your mind." },
  { href: "/arrival", label: "Arrive", description: "Notice how you are arriving." },
  { href: "/stay-here", label: "Stay Here", description: "Nothing to solve." },
  { href: "/guidance", label: "Find one step", description: "Make room for what comes next." },
] as const;

const CLOSING_LINES = [
  "Take only what feels useful.",
  "One clear step is enough.",
  "May the rest of today meet you gently.",
  "A little lighter.",
] as const;

type ReturnContext = "first-visit" | "today" | "returning" | "long-absence" | null;

const RETURN_LINES: Record<Exclude<ReturnContext, null | "today">, string> = {
  "first-visit": "Welcome to a quiet place of your own.",
  returning: "It is good to see you again.",
  "long-absence": "We can begin again.",
};

/** Development-only fictional fixtures for `?preview=` states. */
function previewData(preview: string, base: HomeData): HomeData {
  const empty: HomeData = {
    preferredName: "River",
    latestArrival: null,
    horizon: { activeCount: 0, completedTodayCount: 0, nextStep: null },
    memories: { constellationCount: 0, northStarCount: 0 },
    hasRecentConversation: false,
    privacy: { saveConversationHistory: true, allowCompanionMemory: true },
    continuation: null,
  };
  switch (preview) {
    case "empty":
    case "first-visit":
    case "returning":
      return empty;
    case "horizon":
      return {
        ...empty,
        horizon: {
          activeCount: 1,
          completedTodayCount: 0,
          nextStep: { id: "fixture", title: "Water the ferns", estimatedMinutes: 10 },
        },
        continuation: {
          type: "horizon",
          label: "One step is waiting on your horizon.",
          detail: "Water the ferns · about 10 minutes",
          href: "/horizon",
        },
      };
    case "constellations":
      return { ...empty, memories: { constellationCount: 4, northStarCount: 0 } };
    case "north-star":
      return {
        ...empty,
        memories: { constellationCount: 2, northStarCount: 1 },
        continuation: {
          type: "north-star",
          label: "One direction you chose to remember.",
          detail: null,
          href: "/constellations",
        },
      };
    default:
      return base;
  }
}

export function HomeView({ data: serverData, preview }: { data: HomeData; preview?: string }) {
  const data = preview ? previewData(preview, serverData) : serverData;
  const { state: sky } = useSky();

  const [lightState, setLightState] = useState<LightState>("welcoming");
  const [greetingPeriod, setGreetingPeriod] = useState<ReturnType<typeof getGreetingPeriod> | null>(
    null,
  );
  const [returnContext, setReturnContext] = useState<ReturnContext>(null);
  const [dismissed, setDismissed] = useState(false);
  const [closingLine, setClosingLine] = useState<string | null>(null);

  // Client-only, hydration-safe enhancements: greeting time, quiet return
  // context (coarse local timestamp only — no counts, no streaks), and a
  // brief welcoming glow that settles to resting.
  useEffect(() => {
    setGreetingPeriod(getGreetingPeriod(new Date()));
    try {
      const last = localStorage.getItem("saelis-last-visit");
      if (preview === "first-visit") setReturnContext("first-visit");
      else if (preview === "returning") setReturnContext("returning");
      else if (!last) setReturnContext("first-visit");
      else {
        const days = (Date.now() - new Date(last).getTime()) / 86_400_000;
        setReturnContext(days < 1 ? "today" : days >= 14 ? "long-absence" : "returning");
      }
      localStorage.setItem("saelis-last-visit", new Date().toISOString());
      setDismissed(sessionStorage.getItem("saelis-home-dismissed") === "true");
    } catch {
      setReturnContext(null);
    }
    const timer = setTimeout(() => setLightState("resting"), 4000);
    return () => clearTimeout(timer);
  }, [preview]);

  const greeting = greetingPeriod ? GREETINGS[greetingPeriod] : null;
  const greetingTitle = greeting
    ? greetingPeriod === "night" || !data.preferredName
      ? greeting.title === "You made it here"
        ? "You made it here."
        : `${greeting.title}.`
      : `${greeting.title}, ${data.preferredName}.`
    : "Welcome.";
  const greetingLine = greeting?.line ?? "Come as you are.";

  function dismissContinuation() {
    setDismissed(true);
    try {
      sessionStorage.setItem("saelis-home-dismissed", "true");
    } catch {
      // session-only nicety
    }
  }

  function stepAway() {
    const random = createSeededRandom(`last-light:${new Date().toDateString()}`);
    setClosingLine(CLOSING_LINES[Math.floor(random() * CLOSING_LINES.length)] ?? CLOSING_LINES[0]);
  }

  const memoryTotal = data.memories.constellationCount + data.memories.northStarCount;

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-8 pt-6 text-center">
      {preview ? (
        <p className="rounded-full bg-cloud-lilac px-4 py-1 text-xs text-ink-soft">
          Development preview: {preview} (fictional content, never persisted)
        </p>
      ) : null}

      <TheLight state={lightState} skyTone={sky.lightTone} size={130} />

      <header>
        <h1 className="text-3xl font-semibold text-ink">{greetingTitle}</h1>
        <p className="mt-1 text-ink-soft">{greetingLine}</p>
        {returnContext && returnContext !== "today" ? (
          <p className="mt-2 text-sm text-ink-muted">{RETURN_LINES[returnContext]}</p>
        ) : null}
      </header>

      <nav aria-label="Begin" className="grid w-full gap-3 sm:grid-cols-2">
        {PRIMARY_ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            onFocus={() => setLightState("listening")}
            onBlur={() => setLightState("resting")}
            className="glass-surface flex min-h-11 flex-col items-start gap-0.5 px-5 py-4 text-left hover:bg-cloud-lilac/50"
          >
            <span className="font-semibold text-ink">{action.label}</span>
            <span className="text-sm text-ink-soft">{action.description}</span>
          </Link>
        ))}
      </nav>

      {data.continuation && !dismissed ? (
        <section
          aria-label="A gentle continuation"
          className="glass-surface flex w-full flex-col gap-2 p-5 text-left"
        >
          <p className="text-ink">{data.continuation.label}</p>
          {data.continuation.detail ? (
            <p className="text-sm text-ink-soft">{data.continuation.detail}</p>
          ) : null}
          <div className="flex gap-2">
            <Link
              href={data.continuation.href}
              className="inline-flex min-h-11 items-center rounded-full bg-cloud-lilac px-5 text-sm font-medium text-ink hover:bg-sky-lilac"
            >
              {data.continuation.type === "conversation" ? "Continue" : "Open"}
            </Link>
            <Button variant="ghost" onClick={dismissContinuation}>
              Not now
            </Button>
          </div>
        </section>
      ) : null}

      <section aria-labelledby="horizon-glimpse" className="w-full text-left">
        <h2
          id="horizon-glimpse"
          className="mb-2 text-sm font-medium uppercase tracking-wide text-ink-muted"
        >
          On your horizon
        </h2>
        {data.horizon.nextStep ? (
          <div className="glass-surface flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-ink">{data.horizon.nextStep.title}</p>
              <p className="text-sm text-ink-soft">
                about {data.horizon.nextStep.estimatedMinutes} minutes
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/horizon"
                className="inline-flex min-h-11 items-center rounded-full bg-cloud-lilac px-4 text-sm font-medium text-ink hover:bg-sky-lilac"
              >
                Begin
              </Link>
              <Link
                href="/horizon"
                className="inline-flex min-h-11 items-center rounded-full px-3 text-sm text-ink-soft hover:bg-cloud-lilac/60"
              >
                Open Horizon
              </Link>
            </div>
          </div>
        ) : (
          <p className="text-ink-soft">The horizon is open.</p>
        )}
      </section>

      <section aria-labelledby="constellations-glimpse" className="w-full text-left">
        <h2
          id="constellations-glimpse"
          className="mb-2 text-sm font-medium uppercase tracking-wide text-ink-muted"
        >
          Your sky
        </h2>
        {!data.privacy.allowCompanionMemory ? (
          <p className="text-ink-soft">Saelis will support you without retained memories.</p>
        ) : memoryTotal > 0 ? (
          <p className="text-ink-soft">
            Your sky holds {memoryTotal} {memoryTotal === 1 ? "memory" : "memories"} you chose to
            keep
            {data.memories.northStarCount > 0
              ? `, including ${data.memories.northStarCount} North ${data.memories.northStarCount === 1 ? "Star" : "Stars"}`
              : ""}
            .{" "}
            <Link href="/constellations" className="underline underline-offset-4 hover:text-ink">
              Open Constellations
            </Link>
          </p>
        ) : (
          <p className="text-ink-soft">
            Your sky is still open.{" "}
            <Link href="/constellations" className="underline underline-offset-4 hover:text-ink">
              Open Constellations
            </Link>
          </p>
        )}
      </section>

      <footer className="flex flex-col items-center gap-2 pb-4">
        {closingLine ? (
          <p className="text-sm italic text-ink-soft" role="status">
            {closingLine}
          </p>
        ) : (
          <Button variant="ghost" onClick={stepAway}>
            Step away for now
          </Button>
        )}
      </footer>
    </div>
  );
}
