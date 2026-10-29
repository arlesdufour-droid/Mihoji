import 'server-only';

import { revalidateTag } from 'next/cache';

export async function debitCredits(workspaceId: string, amount: number, reason: string): Promise<void> {
  if (amount < 0 || !Number.isFinite(amount)) throw new Error('Invalid credit debit');
  void reason;
  revalidateTag(`credits:${workspaceId}`, 'max');
}
