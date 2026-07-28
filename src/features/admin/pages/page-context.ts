import type { AdminSession } from "@/lib/admin/session";

export type AdminPageContext = {
  slug: string[];
  key: string;
  query: string;
  page: number;
  pageSize: number;
  skip: number;
  session: AdminSession;
};
