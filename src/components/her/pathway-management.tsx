"use client";

import Link from "next/link";
import { useState } from "react";

import {
  archivePathway,
  enrollInPathway,
  pausePathway,
  resumePathway,
} from "@/app/(app)/wellness-actions";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { InlineNotice } from "@/components/ui/inline-notice";
import { listActivePathways, getPathway } from "@/lib/wellness/pathways";

import type { PathwayKey } from "@/lib/wellness/pathways/types";

export interface EnrollmentSummary {
  id: string;
  pathwayKey: PathwayKey;
  status: "active" | "paused" | "completed" | "archived";
  startedOn: string;
}

/** What each pathway reads and writes — shown so choices are informed. */
const DATA_USE: Record<PathwayKey, string> = {
  phoenix:
    "Uses your movement and nutrition preferences, optional weight and calorie estimates, workouts, and check-ins to shape daily plans.",
  restore:
    "Uses your private Restore intake and postpartum check-ins — visible only to you — to keep recovery guidance gentle and staged.",
  strong: "Uses your movement preferences, workouts, and check-ins to progress strength patiently.",
  nourish:
    "Uses your food preferences and optional nutrition estimates for meal ideas — calories never required.",
  rhythm:
    "Uses only the cycle preference you choose. Symptom-led, no fertility tracking, off whenever you like.",
  reset:
    "Uses your check-ins to keep plans small and kind. Your other pathways stay saved and waiting.",
};

const PLAN_EFFECT: Record<PathwayKey, string> = {
  phoenix: "Adds movement, nutrition, and hydration to your daily plan.",
  restore: "Adds staged recovery and gentle movement; pauses anything that outpaces recovery.",
  strong: "Adds progressive strength sessions to your daily plan.",
  nourish: "Adds meal and hydration guidance to your daily plan.",
  rhythm: "Softens plan intensity around low-energy days you report.",
  reset: "Temporarily simplifies your whole plan — your original program is kept, not deleted.",
};

export function PathwayManagement({ enrollments }: { enrollments: EnrollmentSummary[] }) {
  const [confirm, setConfirm] = useState<{
    action: "pause" | "archive";
    enrollment: EnrollmentSummary;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const byKey = new Map(enrollments.map((enrollment) => [enrollment.pathwayKey, enrollment]));

  async function run(action: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    setBusy(true);
    setNotice(null);
    const result = await action();
    setBusy(false);
    setConfirm(null);
    setNotice(
      result.ok
        ? { tone: "success", text: success }
        : { tone: "error", text: result.error ?? "That didn't save — please try again." },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {notice ? <InlineNotice tone={notice.tone}>{notice.text}</InlineNotice> : null}

      {listActivePathways().map((pathway) => {
        const enrollment = byKey.get(pathway.key);
        const status = enrollment?.status;
        return (
          <section
            key={pathway.key}
            aria-label={pathway.displayName}
            className="glass-surface flex flex-col gap-3 p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-ink">
                  <Link href={pathway.route} className="hover:underline">
                    {pathway.displayName}
                  </Link>
                </h2>
                <p className="text-sm text-ink-soft">{pathway.shortDescription}</p>
              </div>
              <span className="rounded-full bg-cloud-lilac px-3 py-1 text-xs font-medium text-ink">
                {status === "active"
                  ? "✓ Active"
                  : status === "paused"
                    ? "❚❚ Paused"
                    : status === "completed"
                      ? "Completed"
                      : status === "archived"
                        ? "Archived"
                        : "Not enrolled"}
              </span>
            </div>

            <details className="text-sm text-ink-soft">
              <summary className="min-h-6 cursor-pointer font-medium text-ink">
                What this pathway uses and does
              </summary>
              <p className="mt-2">{DATA_USE[pathway.key]}</p>
              <p className="mt-1">{PLAN_EFFECT[pathway.key]}</p>
            </details>

            <div className="flex flex-wrap gap-2">
              {!enrollment || status === "archived" || status === "completed" ? (
                pathway.key === "restore" ? (
                  // Adding Restore always goes through Restore onboarding.
                  <Link
                    href="/wellness/her/onboarding?step=pathways"
                    className="inline-flex min-h-11 items-center rounded-full bg-accent-lilac px-5 text-sm font-medium text-white hover:opacity-90"
                  >
                    Begin Restore setup
                  </Link>
                ) : (
                  <Button
                    disabled={busy}
                    onClick={() =>
                      run(
                        () => enrollInPathway({ pathwayKey: pathway.key }),
                        `${pathway.displayName} is now active.`,
                      )
                    }
                  >
                    Add {pathway.displayName}
                  </Button>
                )
              ) : null}
              {status === "active" && enrollment ? (
                <Button
                  variant="soft"
                  disabled={busy}
                  onClick={() => setConfirm({ action: "pause", enrollment })}
                >
                  Pause
                </Button>
              ) : null}
              {status === "paused" && enrollment ? (
                <Button
                  disabled={busy}
                  onClick={() =>
                    run(
                      () => resumePathway({ enrollmentId: enrollment.id }),
                      `${pathway.displayName} is active again. Welcome back.`,
                    )
                  }
                >
                  Resume
                </Button>
              ) : null}
              {(status === "active" || status === "paused") && enrollment ? (
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => setConfirm({ action: "archive", enrollment })}
                >
                  Set aside
                </Button>
              ) : null}
            </div>
          </section>
        );
      })}

      <Dialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={
          confirm?.action === "pause"
            ? `Pause ${getPathway(confirm.enrollment.pathwayKey).displayName}?`
            : confirm
              ? `Set ${getPathway(confirm.enrollment.pathwayKey).displayName} aside?`
              : ""
        }
      >
        {confirm ? (
          <div className="flex flex-col gap-4">
            <p className="text-ink-soft">
              {confirm.action === "pause"
                ? confirm.enrollment.pathwayKey === "restore"
                  ? "Pausing stops Restore plan modules and reminders. Everything you have shared stays saved, private, and exactly where you left it."
                  : "Pausing stops this pathway's plan modules and reminders. Nothing is deleted — resume whenever you are ready."
                : "Setting a pathway aside keeps every record safe. It simply steps out of your daily plans. You can start it again anytime."}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirm(null)} disabled={busy}>
                Keep it active
              </Button>
              <Button
                variant="soft"
                disabled={busy}
                onClick={() =>
                  confirm.action === "pause"
                    ? run(
                        () => pausePathway({ enrollmentId: confirm.enrollment.id }),
                        "Paused. Everything is saved for whenever you return.",
                      )
                    : run(
                        () => archivePathway({ enrollmentId: confirm.enrollment.id }),
                        "Set aside. Your records are safe.",
                      )
                }
              >
                {busy ? "Saving…" : confirm.action === "pause" ? "Pause" : "Set aside"}
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
