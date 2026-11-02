-- Phase Q, lot 4 : les modifications du chat (tâche « edit ») sont aussi enregistrées dans le journal des générations, avec leur coût réel.

ALTER TABLE "site_generations" DROP CONSTRAINT IF EXISTS "site_generations_task_check";
ALTER TABLE "site_generations" ADD CONSTRAINT "site_generations_task_check" CHECK ("task" IN ('create', 'restyle', 'edit'));
