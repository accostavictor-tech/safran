import type { Metadata } from "next";
import { Epilogue, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

// Epilogue carrega a energia do sabor caseiro nos títulos; Plus Jakarta Sans
// tem altura-x generosa e segura a leitura de gramatura e macro no celular.
const epilogue = Epilogue({
  variable: "--font-epilogue",
  weight: ["600", "700"],
  subsets: ["latin"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Safran Congelados",
  description: "Refeições congeladas artesanais, prontas para o seu dia. Maceió/AL.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${epilogue.variable} ${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
