-- Zonas de entrega iniciais. Idempotente: não duplica se a migration rodar de novo.
INSERT INTO "zonas_entrega" ("nome", "frete_centavos", "bairros", "ordem")
SELECT 'Orla', 1500, ARRAY['Ponta Verde', 'Jatiúca', 'Pajuçara'], 1
WHERE NOT EXISTS (SELECT 1 FROM "zonas_entrega" WHERE "nome" = 'Orla');
--> statement-breakpoint
INSERT INTO "zonas_entrega" ("nome", "frete_centavos", "bairros", "ordem")
SELECT 'Serraria', 1000, ARRAY['Serraria'], 2
WHERE NOT EXISTS (SELECT 1 FROM "zonas_entrega" WHERE "nome" = 'Serraria');
