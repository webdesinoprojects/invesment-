export type DashboardIncome = {
  dailyRoi: string;
  directReferral: string;
  levelIncome: string;
  rankRewards: string;
  salary: string;
  total: string;
};

export type DashboardData = {
  walletBalance: string;
  activeInvestment: string;
  todayBusiness: string;
  totalBusiness: string;
  directTeamCount: number;
  totalDownlineCount: number;
  referralUrl: string;
  isReferralActive: boolean;
  income: DashboardIncome;
};
