import Link from "next/link";
import { notFound } from "next/navigation";

import { ScreenHeader } from "@/components/layout/screen-header";
import { requireUser } from "@/lib/auth/require-user";
import { getActiveEnrollmentForPathway } from "@/lib/db/queries/wellness/enrollments";
import { createClient } from "@/lib/supabase/server";
import { getPathway, isPathwayKey } from "@/lib/wellness/pathways";
import { PATHWAY_KEYS } from "@/lib/wellness/pathways/types";

import type { Metadata } from "next";

export function generateStaticParams() {
  return PATHWAY_KEYS.map((key) => ({ key }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>;
}): Promise<Metadata> {
  const { key } = await params;
  return {
    title: isPathwayKey(key) ? `Saelis Her — ${getPathway(key).displayName}` : "Saelis Her",
  };
}

export default async function PathwayLandingPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!isPathwayKey(key)) notFound();
  const pathway = getPathway(key);

  const user = await requireUser();
  const supabase = await createClient();
  let enrolled = false;
  try {
    enrolled = (await getActiveEnrollmentForPathway(supabase, user.id, key)) !== null;
  } catch {
    enrolled = false;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader title={pathway.displayName} subtitle={pathway.shortDescription} />
      <div
        className={
          key === "restore"
            ? "flex flex-col gap-4 rounded-3xl bg-cloud-pink/30 p-6"
            : "glass-surface flex flex-col gap-4 p-6"
        }
      >
        <p className="text-ink">{pathway.longDescription}</p>
        <p className="text-sm text-ink-soft">
          {enrolled
            ? "This pathway is active for you."
            : "Not part of your plan yet — it can be, whenever you like."}
        </p>
        <div className="flex flex-wrap gap-3">
          {!enrolled ? (
            <Link
              href="/wellness/her/onboarding?step=pathways"
              className="inline-flex min-h-11 items-center rounded-full bg-accent-lilac px-6 text-base font-medium text-white hover:opacity-90"
            >
              {key === "restore" ? "Begin Restore setup" : `Add ${pathway.displayName}`}
            </Link>
          ) : null}
          <Link
            href="/wellness/her/pathways"
            className="inline-flex min-h-11 items-center rounded-full bg-cloud-lilac px-5 text-sm font-medium text-ink hover:bg-sky-lilac"
          >
            All pathways
          </Link>
        </div>
      </div>
    </div>
  );
}
