export type PlanId = 'free' | 'starter' | 'pro' | 'max';

export type Plan = {
  id: PlanId;
  name: string;
  price: number;
  publishedApps: number;
  credits: number;
  traffic: number | null;
  files: number | null;
  database: number | null;
  apiCalls: number | null;
  customDomain: boolean;
  agentUsage: 'Limited' | 'Unlimited';
  cloudActions: number;
  tone: string;
};

export const plans: Plan[] = [
  { id: 'free', name: 'Free', price: 0, publishedApps: 1, credits: 1_000_000, traffic: null, files: null, database: null, apiCalls: null, customDomain: false, agentUsage: 'Limited', cloudActions: 0, tone: 'slate' },
  { id: 'starter', name: 'Starter', price: 9, publishedApps: 1, credits: 1_000_000, traffic: 5, files: 5, database: 5, apiCalls: 100_000, customDomain: true, agentUsage: 'Unlimited', cloudActions: Infinity, tone: 'amber' },
  { id: 'pro', name: 'Pro', price: 27, publishedApps: 5, credits: 10_000_000, traffic: 10, files: 10, database: 10, apiCalls: 250_000, customDomain: true, agentUsage: 'Unlimited', cloudActions: Infinity, tone: 'lime' },
  { id: 'max', name: 'Max', price: 81, publishedApps: 15, credits: 30_000_000, traffic: 10, files: 30, database: 30, apiCalls: 750_000, customDomain: true, agentUsage: 'Unlimited', cloudActions: Infinity, tone: 'violet' },
];

export const currentPlan = plans[1];
