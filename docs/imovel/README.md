# Imóvel da cozinha — Barro Duro

Levantamento cadastral (situação existente) do imóvel da Rua Fernando Mendes
Pinto, 05 — Barro Duro, Maceió/AL.

| Arquivo | O que é |
|---|---|
| `croqui-levantamento.webp` | Croqui original da medição manual (trena) |
| `planta-baixa.pdf` / `.png` / `.svg` | Planta redesenhada, A3 retrato, escala 1:50 |
| `planta-baixa.dxf` | Mesma planta em metros, para AutoCAD/LibreCAD (camadas `A-*`) |
| `planta_baixa.py` | Gerador: todas as cotas do croqui ficam no dicionário `MEDIDAS` |
| `fluxos.pdf` / `.png` / `.svg` / `fluxos.py` | Antes × depois sobre a R01: fluxos, layout de equipamentos (medidas típicas) e intervenções. Premissa: o acesso externo da cozinha é pelo nicho |

Revisão **R01 — preliminar** (R01: janela, e não porta, entre Amb. 01 e
02; Amb. 02 e Amb. 03 com portas próprias para a circulação, junto à do WC). A planta usa só o que foi medido; o que foi
estimado ou ficou ambíguo no croqui aparece em laranja e está listado no
quadro "Pontos a confirmar in loco" da folha. Cotas com `*` diferem mais de
2 cm da geometria adotada (ex.: 3,00 medido × 2,94 resultante da soma
1,79 + 1,15).

Espessuras de parede não foram medidas: adotado 0,15 m (externas) e 0,12 m
(internas). A parede entre Amb. 01 e Amb. 02 sai com 0,25 m porque é ela que
fecha a cadeia de cima (4,36 + 2,71) com a de baixo (0,62 + 2,51 + 0,83).
Com essas espessuras, a área construída estimada é ≈ 79,2 m², coerente com
os ~80 m² do contrato.

## Regerar após corrigir uma medida

```bash
pip install cairosvg ezdxf
python3 docs/imovel/planta_baixa.py
```
