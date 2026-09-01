ALTER TABLE "insumos" ADD COLUMN "codigo" integer NOT NULL GENERATED ALWAYS AS IDENTITY (sequence name "insumos_codigo_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1);--> statement-breakpoint
ALTER TABLE "pratos" ADD COLUMN "codigo" integer NOT NULL GENERATED ALWAYS AS IDENTITY (sequence name "pratos_codigo_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1);--> statement-breakpoint
ALTER TABLE "receitas" ADD COLUMN "codigo" integer NOT NULL GENERATED ALWAYS AS IDENTITY (sequence name "receitas_codigo_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1);--> statement-breakpoint
ALTER TABLE "insumos" ADD CONSTRAINT "insumos_codigo_unique" UNIQUE("codigo");--> statement-breakpoint
ALTER TABLE "pratos" ADD CONSTRAINT "pratos_codigo_unique" UNIQUE("codigo");--> statement-breakpoint
ALTER TABLE "receitas" ADD CONSTRAINT "receitas_codigo_unique" UNIQUE("codigo");