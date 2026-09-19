import {
  pgTable,
  uuid,
  text,
  numeric,
  boolean,
  integer,
  timestamp,
  jsonb,
  pgEnum,
  unique,
  index,
} from "drizzle-orm/pg-core";

export const unidadeMedidaEnum = pgEnum("unidade_medida", ["g", "ml", "un"]);
export const tipoInsumoEnum = pgEnum("tipo_insumo", ["in_natura", "industrializado"]);
export const macroFonteEnum = pgEnum("macro_fonte", ["taco", "tbca", "fabricante"]);

/**
 * Como a vitrine decide se um prato pode ser pedido:
 * - sempre: produzido sob encomenda, sempre disponível
 * - estoque: controlado por unidade, some da vitrine quando zera
 * - indisponivel: desligado manualmente
 */
export const disponibilidadeEnum = pgEnum("disponibilidade", ["sempre", "estoque", "indisponivel"]);

export const pedidoStatusEnum = pgEnum("pedido_status", [
  "rascunho",
  "aguardando_pagamento",
  "pago",
  "em_preparo",
  "pronto",
  "em_entrega",
  "entregue",
  "cancelado",
]);

export const pagamentoStatusEnum = pgEnum("pagamento_status", [
  "pendente",
  "aprovado",
  "rejeitado",
  "estornado",
  "cancelado",
]);

export const cupomTipoEnum = pgEnum("cupom_tipo", ["percentual", "fixo", "frete_gratis"]);

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
  // Código curto e sequencial para referência humana (ex: INS-0007) — não é a chave primária.
  codigo: integer("codigo").generatedAlwaysAsIdentity().notNull().unique(),
  nome: text("nome").notNull(),
  // Nulo nos insumos migrados que ainda não foram classificados; obrigatório para novos/editados.
  tipo: tipoInsumoEnum("tipo"),
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
  // De onde vieram os valores de macronutrientes, e quando foram conferidos pela última vez.
  macroFonte: macroFonteEnum("macro_fonte"),
  macroRevisadoEm: timestamp("macro_revisado_em", { withTimezone: true }),
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
  // Código curto e sequencial para referência humana (ex: REC-0014) — não é a chave primária.
  codigo: integer("codigo").generatedAlwaysAsIdentity().notNull().unique(),
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
  // Código curto e sequencial para referência humana (ex: PRT-0003) — não é a chave primária.
  codigo: integer("codigo").generatedAlwaysAsIdentity().notNull().unique(),
  nome: text("nome").notNull(),

  // --- Vitrine (o que o cliente vê) ---
  slug: text("slug").unique(),
  descricao: text("descricao"),
  fotoUrl: text("foto_url"),
  categoria: text("categoria"),
  /**
   * Preço que o cliente paga, em centavos. Definido por uma pessoa — NÃO é
   * derivado da margem. A fórmula de precificação só sugere; quem decide é o
   * sócio. Nulo = prato ainda sem preço de venda, não pode ser publicado.
   */
  precoVendaCentavos: integer("preco_venda_centavos"),
  publicado: boolean("publicado").notNull().default(false),
  disponibilidade: disponibilidadeEnum("disponibilidade").notNull().default("sempre"),
  estoqueUnidades: integer("estoque_unidades").notNull().default(0),

  // --- Precificação interna (base da sugestão de preço) ---
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

// ---------------------------------------------------------------------------
// Loja: clientes, entrega, pedidos, pagamentos.
//
// Regra de ouro destas tabelas: todo valor em dinheiro é INTEIRO EM CENTAVOS.
// As tabelas de custo acima usam numeric/float porque são estimativa interna;
// aqui o valor é cobrado de gente de verdade e conciliado com o provedor de
// pagamento, onde diferença de centavo é bug.
// ---------------------------------------------------------------------------

export const clientes = pgTable("clientes", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Telefone é a identidade do cliente (login por OTP no WhatsApp). E.164, ex: +5582999550922
  telefone: text("telefone").notNull().unique(),
  nome: text("nome").notNull(),
  email: text("email"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const zonasEntrega = pgTable("zonas_entrega", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull(),
  freteCentavos: integer("frete_centavos").notNull().default(0),
  // Acima deste subtotal o frete desta zona sai de graça. Nulo = nunca grátis.
  freteGratisAcimaCentavos: integer("frete_gratis_acima_centavos"),
  // Bairros atendidos por esta zona. É decisão comercial, não recorte postal.
  bairros: text("bairros").array().notNull().default([]),
  ativa: boolean("ativa").notNull().default(true),
  ordem: integer("ordem").notNull().default(0),
});

export const enderecos = pgTable("enderecos", {
  id: uuid("id").primaryKey().defaultRandom(),
  clienteId: uuid("cliente_id")
    .notNull()
    .references(() => clientes.id, { onDelete: "cascade" }),
  cep: text("cep"),
  logradouro: text("logradouro").notNull(),
  numero: text("numero").notNull(),
  complemento: text("complemento"),
  bairro: text("bairro").notNull(),
  referencia: text("referencia"),
  zonaId: uuid("zona_id").references(() => zonasEntrega.id, { onDelete: "set null" }),
  padrao: boolean("padrao").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pedidos = pgTable(
  "pedidos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Código que se fala no WhatsApp: PED-0001
    codigo: integer("codigo").generatedAlwaysAsIdentity().notNull().unique(),
    // Nulo em compra de convidado (primeira compra sem cadastro).
    clienteId: uuid("cliente_id").references(() => clientes.id, { onDelete: "set null" }),
    status: pedidoStatusEnum("status").notNull().default("rascunho"),

    // Snapshots de contato: convidado não tem cliente, e nome/telefone podem mudar depois.
    nomeCliente: text("nome_cliente").notNull(),
    telefoneCliente: text("telefone_cliente").notNull(),
    enderecoSnapshot: jsonb("endereco_snapshot"),

    // Totais resolvidos no momento do fechamento. Nunca recalculados na renderização.
    subtotalCentavos: integer("subtotal_centavos").notNull().default(0),
    descontoCentavos: integer("desconto_centavos").notNull().default(0),
    freteCentavos: integer("frete_centavos").notNull().default(0),
    totalCentavos: integer("total_centavos").notNull().default(0),
    cupomCodigo: text("cupom_codigo"),

    janelaEntregaInicio: timestamp("janela_entrega_inicio", { withTimezone: true }),
    janelaEntregaFim: timestamp("janela_entrega_fim", { withTimezone: true }),
    observacoes: text("observacoes"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // A fila da cozinha filtra por status o tempo todo.
    index("pedidos_status_idx").on(t.status),
    index("pedidos_cliente_idx").on(t.clienteId),
  ]
);

export const pedidoItens = pgTable("pedido_itens", {
  id: uuid("id").primaryKey().defaultRandom(),
  pedidoId: uuid("pedido_id")
    .notNull()
    .references(() => pedidos.id, { onDelete: "cascade" }),
  // Referência solta de propósito: o prato pode ser renomeado ou excluído depois
  // sem reescrever o histórico do pedido — quem manda são os snapshots abaixo.
  pratoId: uuid("prato_id").references(() => pratos.id, { onDelete: "set null" }),
  nomeSnapshot: text("nome_snapshot").notNull(),
  codigoSnapshot: integer("codigo_snapshot"),
  precoUnitarioCentavos: integer("preco_unitario_centavos").notNull(),
  // Custo no momento da venda: permite margem histórica real, sem depender do custo atual.
  custoUnitarioSnapshotCentavos: integer("custo_unitario_snapshot_centavos").notNull().default(0),
  quantidade: integer("quantidade").notNull().default(1),
  ordem: integer("ordem").notNull().default(0),
});

/** Log de toda transição de status — base da notificação e de qualquer disputa. */
export const pedidoEventos = pgTable("pedido_eventos", {
  id: uuid("id").primaryKey().defaultRandom(),
  pedidoId: uuid("pedido_id")
    .notNull()
    .references(() => pedidos.id, { onDelete: "cascade" }),
  de: pedidoStatusEnum("de"),
  para: pedidoStatusEnum("para").notNull(),
  autor: text("autor"),
  observacao: text("observacao"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pagamentos = pgTable("pagamentos", {
  id: uuid("id").primaryKey().defaultRandom(),
  pedidoId: uuid("pedido_id")
    .notNull()
    .references(() => pedidos.id, { onDelete: "cascade" }),
  provedor: text("provedor").notNull().default("mercadopago"),
  // Um pedido pode ter várias tentativas (cartão recusado, depois Pix).
  providerPaymentId: text("provider_payment_id").unique(),
  status: pagamentoStatusEnum("status").notNull().default("pendente"),
  statusDetail: text("status_detail"),
  metodo: text("metodo"),
  valorCentavos: integer("valor_centavos").notNull(),
  payloadBruto: jsonb("payload_bruto"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Idempotência de webhook: o Mercado Pago reenvia o mesmo evento, fora de ordem
 * e mais de uma vez. A chave única (provedor, providerEventId) garante que cada
 * evento é processado uma vez só.
 */
export const webhookEventos = pgTable(
  "webhook_eventos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provedor: text("provedor").notNull(),
    providerEventId: text("provider_event_id").notNull(),
    payload: jsonb("payload"),
    processadoEm: timestamp("processado_em", { withTimezone: true }),
    erro: text("erro"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("webhook_eventos_provedor_evento_unq").on(t.provedor, t.providerEventId)]
);

/**
 * Cashback como livro-caixa em centavos, não como saldo mutável numa coluna: o
 * saldo é a soma dos movimentos. Assim dá para auditar de onde veio cada
 * centavo, e duas escritas concorrentes não perdem crédito como aconteceria
 * com um `saldo = saldo + x` lido antes e escrito depois.
 *
 * É dinheiro do cliente para gastar na loja, então nada aqui é apagado:
 * gasto entra como movimento negativo.
 */
export const creditoMovimentos = pgTable(
  "credito_movimentos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clienteId: uuid("cliente_id")
      .notNull()
      .references(() => clientes.id, { onDelete: "cascade" }),
    pedidoId: uuid("pedido_id").references(() => pedidos.id, { onDelete: "set null" }),
    /** Positivo credita (cashback ganho), negativo debita (crédito gasto). */
    centavos: integer("centavos").notNull(),
    motivo: text("motivo").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("credito_cliente_idx").on(t.clienteId),
    // Trava de idempotência: se a transição para "entregue" rodar duas vezes,
    // o segundo crédito do mesmo pedido é recusado pelo banco.
    unique("credito_pedido_motivo_unq").on(t.pedidoId, t.motivo),
  ]
);

export const cupons = pgTable("cupons", {
  id: uuid("id").primaryKey().defaultRandom(),
  codigo: text("codigo").notNull().unique(),
  tipo: cupomTipoEnum("tipo").notNull(),
  // Só um dos dois é usado, conforme o tipo. Separados para não haver ambiguidade de unidade.
  valorPercentual: numeric("valor_percentual", { precision: 5, scale: 2, mode: "number" }),
  valorCentavos: integer("valor_centavos"),
  minimoCentavos: integer("minimo_centavos").notNull().default(0),
  validadeInicio: timestamp("validade_inicio", { withTimezone: true }),
  validadeFim: timestamp("validade_fim", { withTimezone: true }),
  limiteTotal: integer("limite_total"),
  limitePorCliente: integer("limite_por_cliente").notNull().default(1),
  primeiraCompraApenas: boolean("primeira_compra_apenas").notNull().default(false),
  usos: integer("usos").notNull().default(0),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
