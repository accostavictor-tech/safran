import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const sessao = await obterSessao();
  // O proxy já barra o acesso sem sessão; isto cobre o caso de cookie expirado
  // entre a checagem do proxy e a renderização.
  if (!sessao) redirect("/login");

  return (
    <>
      <AppSidebar nome={sessao.nome} />
      <main className="min-h-screen md:pl-60">{children}</main>
    </>
  );
}
