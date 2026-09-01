import {
  pgTable,
  uuid,
  text,
  numeric,
  boolean,
  integer,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";

export const unidadeMedidaEnum = pgEnum("unidade_medida", ["g", "ml", "un"]);

// Os 3 sócios que operam o sistema. Sem cadastro público — contas criadas via seed.
export const usuarios = pgTable("usuarios", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull(),
  email: text("email").notNull().unique(),
  senhaHash: text("senha_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insumos = pgTable("insumos", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull(),
  unidadeMedida: unidadeMedidaEnum("unidade_medida").notNull().default("g"),
  // Preço: R$ por 100g (g), R$ por 100ml (ml), ou R$ por unidade (un)
  custo: numeric("custo", { precision: 12, scale: 4, mode: "number" }).notNull().default(0),
  fatorCorrecao: numeric("fator_correcao", { precision: 6, scale: 3, mode: "number" })
    .notNull()
    .default(1),
  temGluten: boolean("tem_gluten").notNull().default(false),
  temLactose: boolean("tem_lactose").notNull().default(false),
  // Macronutrientes por 100g/100ml/unidade — opcionais
  energiaKcal: numeric("energia_kcal", { precision: 10, scale: 2, mode: "number" }),
  carboidratos: numeric("carboidratos", { precision: 10, scale: 2, mode: "number" }),
  acucaresTotais: numeric("acucares_totais", { precision: 10, scale: 2, mode: "number" }),
  proteinas: numeric("proteinas", { precision: 10, scale: 2, mode: "number" }),
  gordurasTotais: numeric("gorduras_totais", { precision: 10, scale: 2, mode: "number" }),
  gordurasSaturadas: numeric("gorduras_saturadas", { precision: 10, scale: 2, mode: "number" }),
  gordurasTrans: numeric("gorduras_trans", { precision: 10, scale: 2, mode: "number" }),
  fibraAlimentar: numeric("fibra_alimentar", { precision: 10, scale: 2, mode: "number" }),
  sodio: numeric("sodio", { precision: 10, scale: 2, mode: "number" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insumoPrecoHistorico = pgTable("insumo_preco_historico", {
  id: uuid("id").primaryKey().defaultRandom(),
  insumoId: uuid("insumo_id")
    .notNull()
    .references(() => insumos.id, { onDelete: "cascade" }),
  precoAnterior: numeric("preco_anterior", { precision: 12, scale: 4, mode: "number" }).notNull(),
  precoNovo: numeric("preco_novo", { precision: 12, scale: 4, mode: "number" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const receitas = pgTable("receitas", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull(),
  rendimentoTotalG: numeric("rendimento_total_g", { precision: 10, scale: 2, mode: "number" })
    .notNull()
    .default(0),
  pesoPorcaoG: numeric("peso_porcao_g", { precision: 10, scale: 2, mode: "number" })
    .notNull()
    .default(0),
  modoPreparo: text("modo_preparo"),
  ativa: boolean("ativa").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const receitaInsumos = pgTable("receita_insumos", {
  id: uuid("id").primaryKey().defaultRandom(),
  receitaId: uuid("receita_id")
    .notNull()
    .references(() => receitas.id, { onDelete: "cascade" }),
  insumoId: uuid("insumo_id")
    .notNull()
    .references(() => insumos.id, { onDelete: "restrict" }),
  // Quantidade líquida (como entra na receita, já limpa/pronta) em g/ml/un
  quantidadeLiquida: numeric("quantidade_liquida", { precision: 10, scale: 3, mode: "number" })
    .notNull()
    .default(0),
  ordem: integer("ordem").notNull().default(0),
});

export const pratos = pgTable("pratos", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull(),
  custoEmbalagem: numeric("custo_embalagem", { precision: 10, scale: 2, mode: "number" })
    .notNull()
    .default(0),
  margemLucro: numeric("margem_lucro", { precision: 5, scale: 2, mode: "number" })
    .notNull()
    .default(45),
  taxaCartao: numeric("taxa_cartao", { precision: 5, scale: 2, mode: "number" })
    .notNull()
    .default(0),
  imposto: numeric("imposto", { precision: 5, scale: 2, mode: "number" }).notNull().default(0),
  comissao: numeric("comissao", { precision: 5, scale: 2, mode: "number" }).notNull().default(0),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pratoReceitas = pgTable("prato_receitas", {
  id: uuid("id").primaryKey().defaultRandom(),
  pratoId: uuid("prato_id")
    .notNull()
    .references(() => pratos.id, { onDelete: "cascade" }),
  receitaId: uuid("receita_id")
    .notNull()
    .references(() => receitas.id, { onDelete: "restrict" }),
  // Quantidade em gramas da receita usada nesta porção do prato
  quantidadeG: numeric("quantidade_g", { precision: 10, scale: 2, mode: "number" })
    .notNull()
    .default(0),
  ordem: integer("ordem").notNull().default(0),
});
