"use client";

import { useContext } from "react";

import { SkyContext, type SkyContextValue } from "@/components/sky/sky-provider";

/** Read the global sky. Safe without a provider (returns the stable default). */
export function useSky(): SkyContextValue {
  return useContext(SkyContext);
}
