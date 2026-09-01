import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { obterSessao } from "@/lib/auth";
import { NavHeader } from "@/components/nav-header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Safran — Precificação",
  description: "Insumos, receitas e precificação de pratos da Safran Alimentos",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const sessao = await obterSessao();

  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-900">
        {sessao ? <NavHeader nome={sessao.nome} /> : null}
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
