import { automaticDailyRoi } from "@/inngest/functions/daily-roi";
import { automaticMonthlyReferralCommissions } from "@/inngest/functions/monthly-referral-commissions";

export const inngestFunctions = [
  automaticDailyRoi,
  automaticMonthlyReferralCommissions,
];
