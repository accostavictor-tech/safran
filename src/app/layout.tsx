import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { obterSessao } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { Toaster } from "@/components/ui/sonner";

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
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        {sessao ? (
          <>
            <AppSidebar nome={sessao.nome} />
            <main className="min-h-screen md:pl-60">{children}</main>
          </>
        ) : (
          <main className="min-h-screen">{children}</main>
        )}
        <Toaster />
      </body>
    </html>
  );
}
