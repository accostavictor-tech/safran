CREATE TABLE "credito_movimentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cliente_id" uuid NOT NULL,
	"pedido_id" uuid,
	"centavos" integer NOT NULL,
	"motivo" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credito_pedido_motivo_unq" UNIQUE("pedido_id","motivo")
);
--> statement-breakpoint
ALTER TABLE "credito_movimentos" ADD CONSTRAINT "credito_movimentos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credito_movimentos" ADD CONSTRAINT "credito_movimentos_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "credito_cliente_idx" ON "credito_movimentos" USING btree ("cliente_id");