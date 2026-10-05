# Safran — Precificação e fichas técnicas

Sistema interno da Safran Alimentos para cadastro de insumos, montagem de
fichas técnicas (receitas) e precificação de pratos/marmitas. Substitui o
protótipo feito no Lovable ("Tabela Fácil") por algo simples e focado 100% no
uso do dia a dia da Isabel, Victor e Glaucos — sem as camadas de SaaS
(assinatura, compartilhamento público, múltiplos clientes) que o protótipo
tinha.

## Módulos

1. **Insumos** (`/insumos`) — nome, unidade de medida, custo, fator de
   correção, glúten/lactose, macronutrientes por 100g/100ml/unidade
   (opcional), histórico de preço e contador de uso em receitas.
2. **Receitas** (`/receitas`) — fichas técnicas: seleciona insumos e
   quantidades, calcula custo total, CMV (R$/g), custo por porção, modo de
   preparo e nutrientes.
3. **Pratos** (`/pratos`) — monta a marmita a partir de uma ou mais receitas
   + embalagem, aplica margem/cartão/imposto/comissão para gerar o preço de
   venda sugerido e a tabela nutricional final da porção.

A fórmula de custo, fator de correção e precificação foi portada diretamente
da lógica já validada no protótipo anterior (ver `calcularCustoItem`,
`calcularCMV` e `calcularPrecificacao` em `src/lib/calculations.ts`).

## Stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack) + TypeScript
- [Drizzle ORM](https://orm.drizzle.team) + Postgres
- Autenticação simples por sessão (cookie assinado com `jose`, senha com
  `bcryptjs`) — 3 contas fixas, sem cadastro público
- Tailwind CSS

> **Importante:** este projeto está no Next.js 16, que tem mudanças
> significativas em relação a versões anteriores (ver `AGENTS.md` /
> `node_modules/next/dist/docs/`). `middleware.ts` virou `proxy.ts` e mora em
> `src/proxy.ts` (não na raiz), `params`/`searchParams` são assíncronos, etc.

## Rodando localmente

1. Tenha um Postgres rodando (local, Supabase, Neon — qualquer um serve).
2. Copie `.env.local.example` para `.env.local` e preencha `DATABASE_URL` e
   `SESSION_SECRET` (uma string aleatória longa).
3. Instale as dependências e aplique o schema:

   ```bash
   npm install
   npm run db:push
   npm run db:seed   # cria as 3 contas dos sócios com senha inicial "safran2026"
   ```

4. Suba o servidor:

   ```bash
   npm run dev
   ```

5. Acesse `http://localhost:3000`, faça login com um dos emails criados no
   seed (ver `src/db/seed.ts`) e a senha inicial. **Troque as senhas e os
   emails reais em produção** — o seed é só um ponto de partida.

## Scripts úteis

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe o servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run db:push` | Aplica o schema do Drizzle direto no banco (bom para dev) |
| `npm run db:generate` | Gera migrations SQL versionadas (`drizzle/`) |
| `npm run db:migrate` | Aplica migrations geradas |
| `npm run db:seed` | Cria as contas dos 3 sócios |
| `npm run db:studio` | Abre o Drizzle Studio (explorador visual do banco) |
| `npm run db:import-lovable -- <pasta> [--reset]` | Importa o export CSV do Lovable/Supabase (ver seção abaixo) |
| `npm run pluggy:sync [-- <itemId>]` | Sincroniza o extrato bancário da Pluggy (ver seção abaixo) |

## Deploy no Vercel

1. Crie um banco Postgres gerenciado (Supabase ou Neon têm plano gratuito
   suficiente para esse uso).
2. No Vercel, importe este repositório e configure as variáveis de ambiente
   `DATABASE_URL` e `SESSION_SECRET` (produção).
3. Antes do primeiro deploy (ou via `npm run db:push`/`db:migrate` apontando
   pra base de produção), aplique o schema e rode o seed.
4. Deploy. O `proxy.ts` (equivalente ao antigo middleware) protege todas as
   rotas exceto `/login`.

## Extrato bancário (Pluggy)

`/admin/extrato` mostra as movimentações dos bancos da Safran, puxadas da
[Pluggy](https://pluggy.ai) via Open Finance. Mesmo caminho do projeto
pessoal: os bancos são conectados no **Meu Pluggy**, e o sistema só lê o que
já está autorizado lá — não há widget de conexão no site.

### Configurar

1. **Credenciais.** Em [dashboard.pluggy.ai](https://dashboard.pluggy.ai),
   pegue o `Client ID` e o `Client Secret` da aplicação.
2. **Conectar o banco.** Em [meu.pluggy.ai](https://meu.pluggy.ai), com o
   cadastro do **CNPJ da Safran**, conecte cada banco (Mercado Pago, conta PJ,
   cartão) pelo Open Finance e copie o **ID do item** de cada conexão.
3. **Variáveis no Vercel** (Settings → Environment Variables, produção):
   `PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET` e `CRON_SECRET` (qualquer
   string longa e aleatória). Localmente, as mesmas no `.env.local`.
4. **Deploy.** A migration `0012_extrato_bancario` entra sozinha no build.
5. Em `/admin/extrato`, cole o ID do item e clique em **Conectar e puxar
   extrato**. As contas são criadas automaticamente, sem vínculo manual.

### Como o sync roda

- **Todo dia às 07:00 (Maceió)** pelo Vercel Cron (`vercel.json` →
  `/api/cron/pluggy`). A rota só aceita a chamada com o `CRON_SECRET`.
- **Na hora**, pelo botão *Sincronizar agora* ou por
  `npm run pluggy:sync` (`-- <itemId>` conecta e sincroniza um banco novo).
- É idempotente: tudo é upsert pelo ID da Pluggy.

### Regras do extrato

- `valor_centavos` tem o sinal do caixa: positivo entrou, negativo saiu —
  também no cartão, onde compra é saída.
- Transações **pendentes** ficam de fora até serem efetivadas.
- **Transferência entre contas da própria Safran** (contraparte com o CNPJ
  da empresa) aparece marcada e não entra em entradas/saídas.
- Entradas/saídas do mês contam só **contas**, não cartão: o dinheiro do
  cartão sai quando a fatura é paga, e esse pagamento já aparece na conta.
- O payload original de cada transação fica em `payload_bruto`, para a
  conciliação com pedidos e a apuração da receita.
- O consentimento do Open Finance expira. Quando o banco aparecer como
  *Reconectar*, renove a conexão no Meu Pluggy. Se a renovação gerar um
  item novo, conecte o novo ID na tela; o histórico já puxado continua.

## Migração dos dados do Lovable

`src/db/migrate-lovable.ts` importa o export CSV feito direto do Supabase do
protótipo anterior ("Tabela Fácil"). Ele espera uma pasta com os arquivos
`ingredientes-export*.csv`, `fichas_tecnicas-export*.csv`,
`ficha_ingredientes-export*.csv`, `rotulos-export*.csv`,
`rotulo_fichas-export*.csv` e `ingrediente_preco_historico-export*.csv`
(delimitador `;`, igual ao export padrão do Supabase).

```bash
npm run db:import-lovable -- /caminho/para/pasta/com/os/csvs
# ou, para apagar o que já existe e reimportar do zero:
npm run db:import-lovable -- /caminho/para/pasta/com/os/csvs --reset
```

Mapeamento: `ingredientes` → `insumos` (usa `nome_exibicao` como nome, já que
é o nome amigável usado no dia a dia), `fichas_tecnicas` → `receitas`,
`ficha_ingredientes` → `receita_insumos`, `rotulos` → `pratos`,
`rotulo_fichas` → `prato_receitas`, `ingrediente_preco_historico` →
`insumo_preco_historico`. Os UUIDs originais são preservados, então as
relações continuam íntegras.

**O que não é migrado** (o protótipo tinha camadas que este sistema não
tem):
- `ficha_custo_historico` (auditoria detalhada de variação de custo por
  ficha) — este sistema só guarda o histórico de preço por insumo.
- Alergênicos além de glúten/lactose (ex.: "Ovo") — o formulário de insumos
  só tem essas duas checkboxes; o script avisa no terminal quais insumos
  tinham outras marcações para revisão manual.
- Açúcares adicionados (separado de açúcares totais) — não faz parte da
  tabela nutricional simplificada deste sistema.
- O conceito de "sub-receita" (`is_sub_receita`) — no export atual nenhuma
  ficha era de fato usada como ingrediente de outra, então isso não afeta os
  dados; a flag em si só não é migrada.
