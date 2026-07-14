"use client";

import { useEffect, useState } from "react";

import { InlineNotice } from "@/components/ui/inline-notice";
import { detectPrototypeData } from "@/lib/prototype-import";

import type { PrototypeDetectionResult } from "@/types/prototype";

/**
 * Read-only preview of local prototype data (saelis_* localStorage keys).
 * NOTHING is uploaded. Actual import ships in a future phase and will require
 * per-item selection and explicit confirmation.
 */
export function PrototypeImportPreview() {
  const [detection, setDetection] = useState<PrototypeDetectionResult | null>(null);

  useEffect(() => {
    try {
      setDetection(detectPrototypeData(window.localStorage));
    } catch {
      setDetection({ found: false, entries: [] });
    }
  }, []);

  if (detection === null) return null;

  return (
    <section aria-labelledby="prototype-import-heading" className="flex flex-col gap-3">
      <h2 id="prototype-import-heading" className="text-lg font-semibold text-ink">
        Local prototype data
      </h2>
      {!detection.found ? (
        <p className="text-sm text-ink-soft">
          No data from the local Saelis prototype was found in this browser.
        </p>
      ) : (
        <>
          <p className="text-sm text-ink-soft">
            Data from the local Saelis prototype was found in this browser. Nothing has been
            uploaded.
          </p>
          <ul className="flex flex-col gap-2">
            {detection.entries.map((entry) => (
              <li
                key={entry.key}
                className="glass-surface flex items-center justify-between px-4 py-3 text-sm"
              >
                <span className="font-medium text-ink">{entry.key}</span>
                <span className="text-ink-soft">
                  {entry.parsed
                    ? `${entry.recordCount} record${entry.recordCount === 1 ? "" : "s"} (${entry.kind})`
                    : "unreadable — will be skipped"}
                </span>
              </li>
            ))}
          </ul>
          <InlineNotice tone="info">
            Importing into your account will arrive in a future update. You&apos;ll choose exactly
            what to bring over, and nothing moves without your confirmation.
          </InlineNotice>
        </>
      )}
    </section>
  );
}
