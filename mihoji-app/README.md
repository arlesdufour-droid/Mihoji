# Mihoji

Mihoji is a dark-first Next.js App Router workspace for turning product ideas into web apps with an AI-assisted Studio.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. In development, the generation route streams a demo response when `GROQ_API_KEY` is absent. In production, it returns `503 ai_not_configured` until a key is configured.

## Groq configuration

Copy `.env.example` to `.env.local` and set `GROQ_API_KEY`. For Codespaces, define `GROQ_API_KEY` as a repository Codespaces secret. It is consumed only by the server route and is never prefixed with `NEXT_PUBLIC_`.

AI models are selected by task. Override `AI_MODEL_FAST`, `AI_MODEL_STRONG`, or
`AI_MODEL_FALLBACK` only when needed.

## Main surfaces

- `/studio/demo/preview`: responsive AI Studio with URL-driven tabs, preview, source view, sharing, publishing, and account menu.
- `/settings/billing`: subscription, credit balance, resource gauges, plans, and invoices.
- `/settings/usage`: credit and workspace usage overview.
- `/settings/preferences`, `/settings/general`, `/settings/members`, `/settings/domains`, `/settings/connections`, `/settings/integrations`, `/settings/mcp`: functional settings surfaces ready for persistence providers.

The repository currently has no auth, database, or Stripe provider. Billing queries and mutations therefore expose an explicit server-side demo boundary in `src/lib/billing/` so those providers can be added without changing the screens.
