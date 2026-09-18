CREATE TYPE "public"."cupom_tipo" AS ENUM('percentual', 'fixo', 'frete_gratis');--> statement-breakpoint
CREATE TYPE "public"."disponibilidade" AS ENUM('sempre', 'estoque', 'indisponivel');--> statement-breakpoint
CREATE TYPE "public"."pagamento_status" AS ENUM('pendente', 'aprovado', 'rejeitado', 'estornado', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."pedido_status" AS ENUM('rascunho', 'aguardando_pagamento', 'pago', 'em_preparo', 'pronto', 'em_entrega', 'entregue', 'cancelado');--> statement-breakpoint
CREATE TABLE "clientes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"telefone" text NOT NULL,
	"nome" text NOT NULL,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clientes_telefone_unique" UNIQUE("telefone")
);
--> statement-breakpoint
CREATE TABLE "cupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" text NOT NULL,
	"tipo" "cupom_tipo" NOT NULL,
	"valor_percentual" numeric(5, 2),
	"valor_centavos" integer,
	"minimo_centavos" integer DEFAULT 0 NOT NULL,
	"validade_inicio" timestamp with time zone,
	"validade_fim" timestamp with time zone,
	"limite_total" integer,
	"limite_por_cliente" integer DEFAULT 1 NOT NULL,
	"primeira_compra_apenas" boolean DEFAULT false NOT NULL,
	"usos" integer DEFAULT 0 NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cupons_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "enderecos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cliente_id" uuid NOT NULL,
	"cep" text,
	"logradouro" text NOT NULL,
	"numero" text NOT NULL,
	"complemento" text,
	"bairro" text NOT NULL,
	"referencia" text,
	"zona_id" uuid,
	"padrao" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pagamentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pedido_id" uuid NOT NULL,
	"provedor" text DEFAULT 'mercadopago' NOT NULL,
	"provider_payment_id" text,
	"status" "pagamento_status" DEFAULT 'pendente' NOT NULL,
	"status_detail" text,
	"metodo" text,
	"valor_centavos" integer NOT NULL,
	"payload_bruto" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pagamentos_provider_payment_id_unique" UNIQUE("provider_payment_id")
);
--> statement-breakpoint
CREATE TABLE "pedido_eventos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pedido_id" uuid NOT NULL,
	"de" "pedido_status",
	"para" "pedido_status" NOT NULL,
	"autor" text,
	"observacao" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pedido_itens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pedido_id" uuid NOT NULL,
	"prato_id" uuid,
	"nome_snapshot" text NOT NULL,
	"codigo_snapshot" integer,
	"preco_unitario_centavos" integer NOT NULL,
	"custo_unitario_snapshot_centavos" integer DEFAULT 0 NOT NULL,
	"quantidade" integer DEFAULT 1 NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pedidos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" integer GENERATED ALWAYS AS IDENTITY (sequence name "pedidos_codigo_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"cliente_id" uuid,
	"status" "pedido_status" DEFAULT 'rascunho' NOT NULL,
	"nome_cliente" text NOT NULL,
	"telefone_cliente" text NOT NULL,
	"endereco_snapshot" jsonb,
	"subtotal_centavos" integer DEFAULT 0 NOT NULL,
	"desconto_centavos" integer DEFAULT 0 NOT NULL,
	"frete_centavos" integer DEFAULT 0 NOT NULL,
	"total_centavos" integer DEFAULT 0 NOT NULL,
	"cupom_codigo" text,
	"janela_entrega_inicio" timestamp with time zone,
	"janela_entrega_fim" timestamp with time zone,
	"observacoes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pedidos_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "webhook_eventos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provedor" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"payload" jsonb,
	"processado_em" timestamp with time zone,
	"erro" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_eventos_provedor_evento_unq" UNIQUE("provedor","provider_event_id")
);
--> statement-breakpoint
CREATE TABLE "zonas_entrega" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"frete_centavos" integer DEFAULT 0 NOT NULL,
	"frete_gratis_acima_centavos" integer,
	"bairros" text[] DEFAULT '{}' NOT NULL,
	"ativa" boolean DEFAULT true NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pratos" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "pratos" ADD COLUMN "descricao" text;--> statement-breakpoint
ALTER TABLE "pratos" ADD COLUMN "foto_url" text;--> statement-breakpoint
ALTER TABLE "pratos" ADD COLUMN "categoria" text;--> statement-breakpoint
ALTER TABLE "pratos" ADD COLUMN "preco_venda_centavos" integer;--> statement-breakpoint
ALTER TABLE "pratos" ADD COLUMN "publicado" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "pratos" ADD COLUMN "disponibilidade" "disponibilidade" DEFAULT 'sempre' NOT NULL;--> statement-breakpoint
ALTER TABLE "pratos" ADD COLUMN "estoque_unidades" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "enderecos" ADD CONSTRAINT "enderecos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enderecos" ADD CONSTRAINT "enderecos_zona_id_zonas_entrega_id_fk" FOREIGN KEY ("zona_id") REFERENCES "public"."zonas_entrega"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido_eventos" ADD CONSTRAINT "pedido_eventos_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido_itens" ADD CONSTRAINT "pedido_itens_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido_itens" ADD CONSTRAINT "pedido_itens_prato_id_pratos_id_fk" FOREIGN KEY ("prato_id") REFERENCES "public"."pratos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pedidos_status_idx" ON "pedidos" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pedidos_cliente_idx" ON "pedidos" USING btree ("cliente_id");--> statement-breakpoint
ALTER TABLE "pratos" ADD CONSTRAINT "pratos_slug_unique" UNIQUE("slug");