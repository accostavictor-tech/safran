CREATE TYPE "public"."parceiro_tipo" AS ENUM('empresa', 'afiliado', 'nutricionista');--> statement-breakpoint
CREATE TABLE "parceiros" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" integer GENERATED ALWAYS AS IDENTITY (sequence name "parceiros_codigo_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tipo" "parceiro_tipo" NOT NULL,
	"nome" text NOT NULL,
	"contato_nome" text,
	"telefone" text,
	"email" text,
	"documento" text,
	"codigo_indicacao" text NOT NULL,
	"desconto_pct" numeric(5, 2) DEFAULT 0 NOT NULL,
	"comissao_pct" numeric(5, 2) DEFAULT 0 NOT NULL,
	"observacoes" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "parceiros_codigo_unique" UNIQUE("codigo"),
	CONSTRAINT "parceiros_codigo_indicacao_unique" UNIQUE("codigo_indicacao")
);
--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "parceiro_id" uuid;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "parceiro_codigo_snapshot" text;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "comissao_centavos" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_parceiro_id_parceiros_id_fk" FOREIGN KEY ("parceiro_id") REFERENCES "public"."parceiros"("id") ON DELETE set null ON UPDATE no action;