export type ActionResult<T = undefined> =
  | {
      ok: true;
      code: "SUCCESS";
      data: T;
      message: string;
      fieldErrors?: never;
    }
  | {
      ok: false;
      code: string;
      message: string;
      fieldErrors?: Record<string, string[]>;
      data?: never;
    };

export const initialActionResult: ActionResult = {
  ok: false,
  code: "IDLE",
  message: "",
};
