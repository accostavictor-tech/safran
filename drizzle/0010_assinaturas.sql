CREATE TYPE "public"."assinatura_frequencia" AS ENUM('semanal', 'quinzenal', 'mensal');--> statement-breakpoint
CREATE TYPE "public"."assinatura_status" AS ENUM('ativa', 'pausada', 'cancelada');--> statement-breakpoint
CREATE TYPE "public"."ciclo_status" AS ENUM('gerado', 'pulado');--> statement-breakpoint
CREATE TABLE "assinatura_ciclos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assinatura_id" uuid NOT NULL,
	"data_entrega" timestamp with time zone NOT NULL,
	"status" "ciclo_status" DEFAULT 'gerado' NOT NULL,
	"composicao" jsonb NOT NULL,
	"pedido_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ciclo_assinatura_data_unq" UNIQUE("assinatura_id","data_entrega")
);
--> statement-breakpoint
CREATE TABLE "assinaturas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" integer GENERATED ALWAYS AS IDENTITY (sequence name "assinaturas_codigo_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"cliente_id" uuid NOT NULL,
	"kit_id" uuid NOT NULL,
	"endereco_id" uuid,
	"frequencia" "assinatura_frequencia" NOT NULL,
	"status" "assinatura_status" DEFAULT 'ativa' NOT NULL,
	"proxima_entrega" timestamp with time zone NOT NULL,
	"composicao_padrao" jsonb NOT NULL,
	"composicao_proxima" jsonb,
	"observacoes" text,
	"pausada_em" timestamp with time zone,
	"cancelada_em" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assinaturas_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
ALTER TABLE "assinatura_ciclos" ADD CONSTRAINT "assinatura_ciclos_assinatura_id_assinaturas_id_fk" FOREIGN KEY ("assinatura_id") REFERENCES "public"."assinaturas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assinatura_ciclos" ADD CONSTRAINT "assinatura_ciclos_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_kit_id_kits_id_fk" FOREIGN KEY ("kit_id") REFERENCES "public"."kits"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_endereco_id_enderecos_id_fk" FOREIGN KEY ("endereco_id") REFERENCES "public"."enderecos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assinatura_cliente_idx" ON "assinaturas" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "assinatura_proxima_idx" ON "assinaturas" USING btree ("proxima_entrega");