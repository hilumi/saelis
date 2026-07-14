/** Standard result shape for server actions. Error text is always calm and content-free. */
export type ActionResult = { ok: true } | { ok: false; error: string };
