CREATE TABLE "codigos_acesso" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"telefone" text NOT NULL,
	"codigo_hash" text NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"tentativas" integer DEFAULT 0 NOT NULL,
	"usado_em" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "codigos_telefone_idx" ON "codigos_acesso" USING btree ("telefone","created_at");