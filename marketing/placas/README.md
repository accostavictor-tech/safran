# Placas de identificação — 30 × 15 cm

Placas de porta da Safran Congelados, geradas a partir de `placas.html`
(uma placa por página, tamanho de página 30 cm × 15 cm, sem margem).

- `placas-safran-30x15.pdf` — arquivo pronto para gráfica (fontes embutidas).
- `placas.html` — fonte editável. Para trocar texto, edite a `<section class="placa">`
  correspondente e gere o PDF de novo.
- `logo/` — logo oficial recortado do PNG enviado pela Safran: `flor` (símbolo),
  `marca` (lettering) e `logo` (completo), cada um com variante `-branco`.
- `fonts/` — Epilogue e Plus Jakarta Sans (as mesmas do app, Google Fonts, licença OFL).

## Gerar o PDF

```bash
chromium --headless --no-sandbox --no-pdf-header-footer \
  --print-to-pdf=placas-safran-30x15.pdf "file://$PWD/placas.html"
```

## Placas incluídas

1. Entrada (fundo violeta)
2. Recepção
3. Cocção
4. Montagem
5. Estoque
6. Copa
7. Banheiro
8. Não fume
9. Saída de emergência (fundo verde, convenção de sinalização)


Violeta (#993399) e açafrão (#e0aa0f) sampleados do logo oficial; neutros e
tipografia dos tokens do design system em `src/app/globals.css`.
Sem sangria: se a gráfica pedir, aumentar `@page` para 30,6 × 15,6 cm e
manter o conteúdo centralizado.
