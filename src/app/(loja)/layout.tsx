import Link from "next/link";
import { MapPin } from "lucide-react";

export default function LojaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-base font-bold text-primary-foreground">
              S
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold text-foreground">Safran</span>
              <span className="block text-xs text-muted-foreground">Congelados</span>
            </span>
          </Link>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5" />
            Maceió / AL
          </span>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-5xl px-4 py-8 text-xs text-muted-foreground sm:px-6">
          <p className="font-medium text-foreground">Safran Alimentos LTDA</p>
          <p className="mt-1">Refeições congeladas artesanais · Maceió/AL</p>
          <p className="mt-3">
            <a href="https://wa.me/5582999550922" className="text-primary hover:underline">
              (82) 99955-0922
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
