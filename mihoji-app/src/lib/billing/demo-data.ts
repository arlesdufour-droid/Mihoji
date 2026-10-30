import type { CreditBalance, Invoice, UsageSnapshot, Subscription } from '@/lib/billing/types';

export const demoWorkspaceId = 'demo-workspace';

export const demoCreditBalance: CreditBalance = {
  remaining: 136_400,
  used: 2_500_000,
  monthlyAllowance: 1_000_000,
  resetAt: '2026-11-28T22:41:00.000Z',
};

export const demoSubscription: Subscription = {
  planId: 'starter',
  periodEnd: '2026-11-28T22:41:00.000Z',
};

export const demoUsage: UsageSnapshot = {
  publishedApps: { used: 0, limit: 1 },
  cloudActions: { used: 0, limit: Infinity },
  fileStorage: { used: 19_710, limit: 5_000_000_000 },
  database: { used: 85_460_000, limit: 5_000_000_000 },
  apiCalls: { used: 1_657, limit: 100_000 },
  breakdown: [
    { label: 'Chat', description: 'Building apps, responses, and other tasks in conversation', credits: 2_100_000 },
    { label: 'Web search', description: 'Research performed by the agent', credits: 240_000 },
    { label: 'AI assistant', description: 'Planning and code assistance', credits: 120_000 },
    { label: 'Transcription', description: 'Audio converted into prompts', credits: 40_000 },
  ],
  projects: [
    { name: 'Marketing dashboard', credits: 1_400_000, database: 85_830_000, apiCalls: 1_657 },
    { name: 'Portfolio refresh', credits: 1_100_000, database: 0, apiCalls: 0 },
  ],
};

export const demoInvoices: Invoice[] = [
  { date: '2026-10-28T10:41:00.000Z', number: 'INV-2026-1028', product: 'Starter', type: 'subscription', credits: 1_000_000, status: 'Paid', amount: 9, pdfUrl: '#' },
  { date: '2026-09-28T10:41:00.000Z', number: 'INV-2026-0928', product: 'Starter', type: 'subscription', credits: 1_000_000, status: 'Paid', amount: 9, pdfUrl: '#' },
];
