import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ error: 'stripe_not_configured', message: 'Credit purchases require Stripe configuration.' }, { status: 503 });
}
