CREATE TYPE "public"."unidade_medida" AS ENUM('g', 'ml', 'un');--> statement-breakpoint
CREATE TABLE "insumo_preco_historico" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"insumo_id" uuid NOT NULL,
	"preco_anterior" numeric(12, 4) NOT NULL,
	"preco_novo" numeric(12, 4) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "insumos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"unidade_medida" "unidade_medida" DEFAULT 'g' NOT NULL,
	"custo" numeric(12, 4) DEFAULT 0 NOT NULL,
	"fator_correcao" numeric(6, 3) DEFAULT 1 NOT NULL,
	"tem_gluten" boolean DEFAULT false NOT NULL,
	"tem_lactose" boolean DEFAULT false NOT NULL,
	"energia_kcal" numeric(10, 2),
	"carboidratos" numeric(10, 2),
	"acucares_totais" numeric(10, 2),
	"proteinas" numeric(10, 2),
	"gorduras_totais" numeric(10, 2),
	"gorduras_saturadas" numeric(10, 2),
	"gorduras_trans" numeric(10, 2),
	"fibra_alimentar" numeric(10, 2),
	"sodio" numeric(10, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prato_receitas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prato_id" uuid NOT NULL,
	"receita_id" uuid NOT NULL,
	"quantidade_g" numeric(10, 2) DEFAULT 0 NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pratos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"custo_embalagem" numeric(10, 2) DEFAULT 0 NOT NULL,
	"margem_lucro" numeric(5, 2) DEFAULT 45 NOT NULL,
	"taxa_cartao" numeric(5, 2) DEFAULT 0 NOT NULL,
	"imposto" numeric(5, 2) DEFAULT 0 NOT NULL,
	"comissao" numeric(5, 2) DEFAULT 0 NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receita_insumos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"receita_id" uuid NOT NULL,
	"insumo_id" uuid NOT NULL,
	"quantidade_liquida" numeric(10, 3) DEFAULT 0 NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receitas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"rendimento_total_g" numeric(10, 2) DEFAULT 0 NOT NULL,
	"peso_porcao_g" numeric(10, 2) DEFAULT 0 NOT NULL,
	"modo_preparo" text,
	"ativa" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"senha_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "insumo_preco_historico" ADD CONSTRAINT "insumo_preco_historico_insumo_id_insumos_id_fk" FOREIGN KEY ("insumo_id") REFERENCES "public"."insumos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prato_receitas" ADD CONSTRAINT "prato_receitas_prato_id_pratos_id_fk" FOREIGN KEY ("prato_id") REFERENCES "public"."pratos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prato_receitas" ADD CONSTRAINT "prato_receitas_receita_id_receitas_id_fk" FOREIGN KEY ("receita_id") REFERENCES "public"."receitas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receita_insumos" ADD CONSTRAINT "receita_insumos_receita_id_receitas_id_fk" FOREIGN KEY ("receita_id") REFERENCES "public"."receitas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receita_insumos" ADD CONSTRAINT "receita_insumos_insumo_id_insumos_id_fk" FOREIGN KEY ("insumo_id") REFERENCES "public"."insumos"("id") ON DELETE restrict ON UPDATE no action;