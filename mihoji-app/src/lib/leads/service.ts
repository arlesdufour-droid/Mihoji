import 'server-only';

import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { companies, leads, projects } from '@/db/schema';
import { getMailer } from '@/lib/mailer/provider';
import { leadNotificationEmail } from './email';
import { leadExtra, type LeadInput } from './schema';

export type ReceiveResult = { ok: true; id: string | null } | { ok: false; error: 'unknown_site' };

// Enregistre la demande (toujours, avant tout envoi) puis prévient le commerçant par email. Un échec d'email ne perd jamais la demande.
export async function receiveLead(input: LeadInput, options: { inboxUrl?: string } = {}): Promise<ReceiveResult> {
  const db = getDb();
  const [project] = await db.select({ id: projects.id, workspaceId: projects.workspaceId }).from(projects).where(eq(projects.id, input.site)).limit(1);
  if (!project) return { ok: false, error: 'unknown_site' };
  if (input.website) return { ok: true, id: null }; // robot : accepté en apparence, jamais enregistré
  const extra = leadExtra(input);
  const [row] = await db.insert(leads).values({ workspaceId: project.workspaceId, projectId: project.id, kind: input.kind, name: input.nom, email: input.email, phone: input.telephone, service: input.prestation, message: input.message, extra }).returning({ id: leads.id });
  const [company] = await db.select().from(companies).where(eq(companies.workspaceId, project.workspaceId)).limit(1);
  const fields = company?.missingFields && typeof company.missingFields === 'object' ? company.missingFields as Record<string, string> : {};
  const to = (fields.email ?? '').trim();
  let notification = 'no_recipient';
  if (to) {
    try {
      await getMailer().send(leadNotificationEmail({ to, companyName: company?.name ?? 'votre entreprise', kind: input.kind, name: input.nom, email: input.email, phone: input.telephone, service: input.prestation, message: input.message, extra, inboxUrl: options.inboxUrl }));
      notification = process.env.BREVO_API_KEY ? 'sent' : 'simulated';
    } catch (error) {
      console.error('Lead notification failed.', error);
      notification = 'failed';
    }
  }
  await db.update(leads).set({ notification }).where(eq(leads.id, row.id));
  return { ok: true, id: row.id };
}

export async function listLeads(workspaceId: string, projectId: string) {
  return getDb().select().from(leads).where(and(eq(leads.workspaceId, workspaceId), eq(leads.projectId, projectId))).orderBy(desc(leads.createdAt)).limit(200);
}

export async function setLeadStatus(workspaceId: string, projectId: string, id: string, status: 'new' | 'handled'): Promise<boolean> {
  const rows = await getDb().update(leads).set({ status }).where(and(eq(leads.id, id), eq(leads.workspaceId, workspaceId), eq(leads.projectId, projectId))).returning({ id: leads.id });
  return rows.length > 0;
}
