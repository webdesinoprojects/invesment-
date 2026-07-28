export type AdminActionResult<T = undefined> =
  | { ok: true; data: T; message: string }
  | { ok: false; code: string; message: string; fieldErrors?: Record<string, string[]> };

export const initialAdminActionResult: AdminActionResult = {
  ok: true,
  data: undefined,
  message: "",
};
