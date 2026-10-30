import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ error: 'stripe_not_configured', message: 'Stripe billing portal is not configured for this workspace.' }, { status: 503 });
}
