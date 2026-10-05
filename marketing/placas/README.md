# Placas de identificação — 30 × 15 cm

Placas de porta da Safran Congelados, geradas a partir de `placas.html`
(uma placa por página, tamanho de página 30 cm × 15 cm, sem margem).

- `placas-safran-30x15.pdf` — arquivo pronto para gráfica (fontes embutidas).
- `placas.html` — fonte editável. Para trocar texto, edite a `<section class="placa">`
  correspondente e gere o PDF de novo.
- `fonts/` — Epilogue e Plus Jakarta Sans (as mesmas do app, Google Fonts, licença OFL).

## Gerar o PDF

```bash
chromium --headless --no-sandbox --no-pdf-header-footer \
  --print-to-pdf=placas-safran-30x15.pdf "file://$PWD/placas.html"
```

## Placas incluídas

1. Fachada / entrada (fundo violeta)
2. Produção
3. Câmara fria
4. Estoque seco
5. Expedição
6. Higienização
7. Vestiário
8. Administrativo
9. Acesso restrito (fundo violeta)
10. Banheiro

Cores e tipografia seguem os tokens do design system em `src/app/globals.css`.
Sem sangria: se a gráfica pedir, aumentar `@page` para 30,6 × 15,6 cm e
manter o conteúdo centralizado.
