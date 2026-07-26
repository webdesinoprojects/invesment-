export type RoiCreditResult =
  | { status: "CREDITED"; amount: string }
  | { status: "ALREADY_CREDITED" }
  | { status: "NOT_ELIGIBLE" }
  | { status: "COMPLETED" };

export type RoiRunResult = {
  status: "RUNNING" | "COMPLETED" | "FAILED";
  date: string;
  processed: number;
  credited: number;
  failed: number;
  alreadyCompleted: boolean;
};
