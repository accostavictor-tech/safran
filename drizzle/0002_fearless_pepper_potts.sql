CREATE TYPE "public"."macro_fonte" AS ENUM('taco', 'tbca', 'rotulo', 'manual');--> statement-breakpoint
ALTER TABLE "insumos" ADD COLUMN "macro_fonte" "macro_fonte";--> statement-breakpoint
ALTER TABLE "insumos" ADD COLUMN "macro_revisado_em" timestamp with time zone;