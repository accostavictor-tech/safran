CREATE TABLE "conexoes_bancarias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provedor" text DEFAULT 'pluggy' NOT NULL,
	"provider_item_id" text NOT NULL,
	"instituicao" text,
	"status" text,
	"dados_atualizados_em" timestamp with time zone,
	"ultimo_sync_em" timestamp with time zone,
	"ultimo_sync_ok" boolean,
	"ultimo_sync_detalhe" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conexoes_bancarias_provider_item_id_unique" UNIQUE("provider_item_id")
);
--> statement-breakpoint
CREATE TABLE "contas_bancarias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conexao_id" uuid NOT NULL,
	"provider_account_id" text NOT NULL,
	"nome" text NOT NULL,
	"numero" text,
	"tipo" text NOT NULL,
	"subtipo" text,
	"saldo_centavos" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contas_bancarias_provider_account_id_unique" UNIQUE("provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "movimentacoes_bancarias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conta_id" uuid NOT NULL,
	"provider_transaction_id" text NOT NULL,
	"data" date NOT NULL,
	"descricao" text NOT NULL,
	"valor_centavos" integer NOT NULL,
	"tipo" text,
	"meio" text,
	"contraparte" text,
	"contraparte_documento" text,
	"categoria_pluggy" text,
	"payload_bruto" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "movimentacoes_bancarias_provider_transaction_id_unique" UNIQUE("provider_transaction_id")
);
--> statement-breakpoint
ALTER TABLE "contas_bancarias" ADD CONSTRAINT "contas_bancarias_conexao_id_conexoes_bancarias_id_fk" FOREIGN KEY ("conexao_id") REFERENCES "public"."conexoes_bancarias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentacoes_bancarias" ADD CONSTRAINT "movimentacoes_bancarias_conta_id_contas_bancarias_id_fk" FOREIGN KEY ("conta_id") REFERENCES "public"."contas_bancarias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conta_bancaria_conexao_idx" ON "contas_bancarias" USING btree ("conexao_id");--> statement-breakpoint
CREATE INDEX "movimentacao_conta_data_idx" ON "movimentacoes_bancarias" USING btree ("conta_id","data");