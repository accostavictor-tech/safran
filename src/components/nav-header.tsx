"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/actions/auth";

const LINKS = [
  { href: "/insumos", label: "Insumos" },
  { href: "/receitas", label: "Receitas" },
  { href: "/pratos", label: "Pratos" },
];

export function NavHeader({ nome }: { nome: string }) {
  const pathname = usePathname();

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-semibold text-purple-800">
            Safran
          </Link>
          <nav className="flex gap-1">
            {LINKS.map((link) => {
              const ativo = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    ativo
                      ? "bg-purple-100 text-purple-800"
                      : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-neutral-500 sm:inline">{nome}</span>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            >
              Sair
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
