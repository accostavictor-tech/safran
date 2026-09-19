// Envio de mensagem ao cliente.
//
// O provedor fica atrás desta função porque a Safran ainda não tem credencial
// de WhatsApp Business (a verificação junto à Meta, ou uma conta em provedor
// pago, não depende de código). Enquanto não houver, o texto vai para o log do
// servidor: o desenvolvimento e o teste seguem, e trocar de provedor depois é
// mexer só aqui.

export interface ResultadoEnvio {
  entregue: boolean;
  /** true quando não há provedor configurado e a mensagem só foi registrada. */
  somenteLog: boolean;
}

function configurado(): boolean {
  return Boolean(process.env.WHATSAPP_API_URL && process.env.WHATSAPP_API_TOKEN);
}

export async function enviarWhatsapp(telefone: string, texto: string): Promise<ResultadoEnvio> {
  if (!configurado()) {
    // Nunca devolver o conteúdo para o cliente: o código precisa chegar pelo
    // canal que prova a posse do telefone, senão não autentica nada.
    console.info(`[whatsapp:sem-provedor] para=${telefone} texto=${texto}`);
    return { entregue: false, somenteLog: true };
  }

  try {
    const resposta = await fetch(process.env.WHATSAPP_API_URL!, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
      },
      body: JSON.stringify({ messaging_product: "whatsapp", to: telefone, type: "text", text: { body: texto } }),
    });
    if (!resposta.ok) {
      console.error(`[whatsapp] falha ${resposta.status} ao enviar para ${telefone}`);
      return { entregue: false, somenteLog: false };
    }
    return { entregue: true, somenteLog: false };
  } catch (err) {
    console.error("[whatsapp] erro de rede", err);
    return { entregue: false, somenteLog: false };
  }
}
