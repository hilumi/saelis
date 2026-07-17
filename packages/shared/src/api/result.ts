/**
 * Standard result shapes. Error text is always calm and content-free.
 * `ActionResult` mirrors `src/types/actions.ts` in the web app.
 */

export type ActionResult = { ok: true } | { ok: false; error: string };

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = { ok: false; error: string };
export type ApiResult<T> = ApiSuccess<T> | ApiFailure;
