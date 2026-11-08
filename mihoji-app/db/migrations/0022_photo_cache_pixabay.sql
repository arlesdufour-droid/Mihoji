-- Phase Q, lot Q3 (correctif) : la contrainte de la migration 0017 n'autorisait que 'unsplash' et 'local'.
-- Le cache écrit aussi 'pixabay' : sans ce correctif, chaque résultat Pixabay était perdu (code 23514) et le banc retombait sur Unsplash.
ALTER TABLE "photo_cache" DROP CONSTRAINT IF EXISTS "photo_cache_source_check";
ALTER TABLE "photo_cache" ADD CONSTRAINT "photo_cache_source_check" CHECK ("source" IN ('unsplash', 'pixabay', 'local'));
