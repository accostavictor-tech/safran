CREATE TYPE "public"."macro_fonte" AS ENUM('taco', 'tbca', 'fabricante');--> statement-breakpoint
CREATE TYPE "public"."tipo_insumo" AS ENUM('in_natura', 'industrializado');--> statement-breakpoint
ALTER TABLE "insumos" ADD COLUMN "tipo" "tipo_insumo";--> statement-breakpoint
ALTER TABLE "insumos" ADD COLUMN "macro_fonte" "macro_fonte";--> statement-breakpoint
ALTER TABLE "insumos" ADD COLUMN "macro_revisado_em" timestamp with time zone;