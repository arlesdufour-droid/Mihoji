# Mihoji UI implementation plan

The repository is a minimal Next.js 16 App Router prototype with Tailwind CSS v4. It has no authentication, database, Stripe, shadcn/ui, or existing shared UI layer, so the first implementation will use server-side demo data behind clearly named billing/AI boundaries.

## Delivery order

1. Establish shared tokens, `SignatureCard`, English/French messages, formatting helpers, plans, and billing types.
2. Add cached demo billing queries and an atomic-shaped debit mutation boundary.
3. Replace the generation route with a validated, streamed Groq-compatible route and development mock mode.
4. Add the Studio shell, URL-driven tabs, composer, credit counter, preview toolbar, and account menu.
5. Add settings layout plus billing, usage, preferences, general, members, connections, integrations, MCP, and simple domains pages.
6. Update the root navigation, README, and `.env.example`.
7. Validate with focused ESLint, TypeScript, production build, and route smoke checks.

## Demo boundary

Until an auth/database/Stripe provider is selected, `lib/billing/demo-data.ts` is the only demo-value source. Server query functions expose that data through the same API the future persistence layer will use. Stripe, workspace actions, browser notification permission, and external integrations remain functional UI stubs with explicit feedback.
