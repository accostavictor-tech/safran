-- Preços de venda e publicação inicial dos 19 pratos do cardápio.
--
-- Os valores saem de scripts/simular-precos.mts: o preço que entrega o piso de
-- 45% de margem de contribuição com deduções de 11% (cartão 5 + imposto 5 +
-- cashback 1), arredondado para cima terminando em ,90 e agrupado em três
-- faixas. Decisão de preço é dos sócios; isto grava a decisão tomada, não
-- calcula nada em tempo de migration.
--
-- Idempotente em duas frentes: só preenche preço onde ainda não há (uma
-- correção feita pelo admin não é desfeita por um redeploy) e só publica prato
-- que já tem preço, slug e está ativo.

-- Faixa Cardápio — R$ 29,90 (16 pratos)
UPDATE "pratos" SET "preco_venda_centavos" = 2990
WHERE "codigo" IN (1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17)
  AND "preco_venda_centavos" IS NULL;
--> statement-breakpoint

-- Faixa Especial — R$ 39,90 (carne de sol com pirão de queijo coalho, tilápia com crosta de gergelim)
UPDATE "pratos" SET "preco_venda_centavos" = 3990
WHERE "codigo" IN (5, 18)
  AND "preco_venda_centavos" IS NULL;
--> statement-breakpoint

-- Faixa Premium — R$ 47,90 (camarão grelhado)
UPDATE "pratos" SET "preco_venda_centavos" = 4790
WHERE "codigo" = 19
  AND "preco_venda_centavos" IS NULL;
--> statement-breakpoint

-- A comissão de 10% nas fichas é de marketplace e não existe no canal próprio;
-- no lugar dela entra o cashback de 1%, que é dedução de verdade (o crédito é
-- gasto na própria loja). Sem isto, a margem exibida no admin não bate com o
-- preço que acabou de ser gravado.
UPDATE "pratos" SET "comissao" = 1 WHERE "comissao" = 10;
--> statement-breakpoint

-- Publica. Prato sem preço, sem slug ou inativo fica de fora.
UPDATE "pratos" SET "publicado" = true
WHERE "preco_venda_centavos" IS NOT NULL
  AND "slug" IS NOT NULL
  AND "ativo" = true
  AND "publicado" = false;
