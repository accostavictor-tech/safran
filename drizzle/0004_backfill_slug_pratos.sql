-- Preenche o slug dos pratos já cadastrados a partir do nome.
-- translate() em vez da extensão unaccent, que não está garantida no Postgres
-- gerenciado. Idempotente: só toca em linha sem slug.
UPDATE "pratos"
SET "slug" = trim(both '-' from regexp_replace(
  translate(lower("nome"), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn'),
  '[^a-z0-9]+', '-', 'g'))
WHERE "slug" IS NULL;
