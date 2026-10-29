import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const plan = new URL(request.url).searchParams.get('plan');
  if (!plan) return NextResponse.json({ error: 'plan_required' }, { status: 400 });
  return NextResponse.json({ error: 'stripe_not_configured', message: `Stripe checkout for ${plan} is not configured for this workspace.` }, { status: 503 });
}
