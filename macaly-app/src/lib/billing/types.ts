import type { PlanId } from '@/lib/plans';

export type Subscription = {
  planId: PlanId;
  periodEnd: string;
  scheduledChange?: { toPlanId: PlanId; effectiveAt: string };
};

export type CreditBalance = {
  remaining: number;
  used: number;
  monthlyAllowance: number;
  resetAt: string;
};

export type UsageSnapshot = {
  publishedApps: { used: number; limit: number };
  cloudActions: { used: number; limit: number };
  fileStorage: { used: number; limit: number };
  database: { used: number; limit: number };
  apiCalls: { used: number; limit: number };
  breakdown: { label: string; description: string; credits: number }[];
  projects: { name: string; credits: number; database: number; apiCalls: number }[];
};

export type Invoice = {
  date: string;
  number: string;
  product: string;
  type: 'subscription' | 'credits';
  credits: number;
  status: 'Paid' | 'Open';
  amount: number;
  pdfUrl: string;
};
