"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";

/** Mostra um toast de sucesso quando a página carrega com ?toast=<chave>, e limpa o parâmetro da URL. */
export function ToastFromQuery({ messages }: { messages: Record<string, string> }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const chave = searchParams.get("toast");

  useEffect(() => {
    if (!chave) return;
    const mensagem = messages[chave];
    if (mensagem) toast.success(mensagem);
    router.replace(pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  return null;
}
