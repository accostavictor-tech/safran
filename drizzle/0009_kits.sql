CREATE TABLE "kits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" integer GENERATED ALWAYS AS IDENTITY (sequence name "kits_codigo_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"nome" text NOT NULL,
	"slug" text NOT NULL,
	"descricao" text,
	"quantidade_pratos" integer NOT NULL,
	"preco_centavos" integer NOT NULL,
	"publicado" boolean DEFAULT false NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kits_codigo_unique" UNIQUE("codigo"),
	CONSTRAINT "kits_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "pedido_itens" ADD COLUMN "kit_id" uuid;--> statement-breakpoint
ALTER TABLE "pedido_itens" ADD COLUMN "composicao_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "pedido_itens" ADD CONSTRAINT "pedido_itens_kit_id_kits_id_fk" FOREIGN KEY ("kit_id") REFERENCES "public"."kits"("id") ON DELETE set null ON UPDATE no action;