#!/usr/bin/env python3
"""Planta baixa (levantamento cadastral) do imóvel da Safran — Barro Duro.

Redesenha o croqui de medição manual (croqui-levantamento.webp) e gera:
  planta-baixa.svg / .pdf / .png   folha A3 retrato, escala 1:50
  planta-baixa.dxf                 unidades em metros, para abrir em CAD

As cotas lidas do croqui ficam em MEDIDAS; toda a geometria é derivada
delas mais as espessuras de parede adotadas (não medidas). Para corrigir uma
medida, troque o valor e rode de novo:

    pip install cairosvg ezdxf
    python3 docs/imovel/planta_baixa.py

Convenção: origem na face interna do canto superior esquerdo do Amb. 01,
x para a direita, y para baixo (como no croqui).
"""

from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
import math

OUT = Path(__file__).resolve().parent

# ---------------------------------------------------------------------------
# Medidas do croqui (m). "?" no comentário = leitura incerta.
# ---------------------------------------------------------------------------
MEDIDAS = {
    "a01_larg": 4.36,
    "a01_esq_1": 2.32,  # parede esquerda, trecho superior (linha tripla)
    "a01_esq_2": 1.87,  # parede esquerda, trecho inferior
    "a01_ate_wc": 2.51,  # parede superior -> face do bloco do WC (lado Amb. 01)
    "wc_recuo": 0.62,  # bloco do WC avançando no Amb. 01
    "nicho_larg": 0.92,
    "nicho_ate_fundo": 5.54,  # parede superior -> fundo do nicho
    "a02_larg": 2.71,
    "a02_prof": 2.50,
    "a03_larg": 2.61,
    "a03_prof": 3.87,
    "a03_marca": 2.00,  # marca "T" na parede direita, medida do canto inferior (?)
    "wc_larg": 2.42,
    "wc_prof": 1.16,
    "a04_larg": 2.51,
    "a04_prof": 2.00,  # "2,0" (?) — ver PENDENCIAS
    "circ_larg": 0.83,
    "circ_comp": 2.18,
    "a05_larg": 3.46,
    "a05_prof": 4.07,
    "a06_vao": 1.79,
    "a06_trecho": 1.15,
    "a06_prof": 2.90,
    "a06_larg_inf": 3.00,  # "30" junto à parede inferior
}
m = MEDIDAS

# Espessuras adotadas (não medidas)
T_EXT = 0.15
T_INT = 0.12
# Parede Amb. 01/02: espessura que fecha a cadeia de cima (4,36 + 2,71) com a
# de baixo (0,62 + 2,51 + 0,83), mantendo alinhada a parede direita da ala.
T_DIV = round(
    (m["a01_larg"] - m["wc_recuo"]) + T_INT + m["a04_larg"] + T_INT + m["circ_larg"]
    - m["a01_larg"] - m["a02_larg"],
    2,
)

# ---------------------------------------------------------------------------
# Geometria derivada (faces internas)
# ---------------------------------------------------------------------------
X_A01_R = m["a01_larg"]                      # 4,36
X_ALA_FE = X_A01_R - m["wc_recuo"]           # face externa esq. do WC/ala
X_ALA = X_ALA_FE + T_INT                     # face interna esq. da ala
X_NICHO = X_ALA_FE - m["nicho_larg"]
X_A02_L = X_A01_R + T_DIV
X_A02_R = X_A02_L + m["a02_larg"]
X_WC_R = X_ALA + m["wc_larg"]
X_A04_R = X_ALA + m["a04_larg"]
X_CIRC_L = X_A04_R + T_INT
X_CIRC_R = X_CIRC_L + m["circ_larg"]
X_A03_L = X_A02_R + T_INT
X_A03_R = X_A03_L + m["a03_larg"]
X_A06_STUB = X_ALA + m["a06_vao"]
X_A06_R = X_A06_STUB + m["a06_trecho"]
assert abs(X_CIRC_R - X_A02_R) < 0.005
assert abs((X_ALA + m["a05_larg"]) - X_CIRC_R) < 0.005

Y_WC_T = m["a02_prof"]                        # face superior do bloco do WC
Y_WC_IN_T = Y_WC_T + T_INT
Y_WC_IN_B = Y_WC_IN_T + m["wc_prof"]
Y_WC_B = Y_WC_IN_B + T_INT                    # face inferior do bloco do WC
Y_A01_B = m["a01_esq_1"] + m["a01_esq_2"]     # 4,19
Y_NICHO_B = m["nicho_ate_fundo"]
Y_A03_B = m["a03_prof"]
Y_CIRC_B = Y_WC_B + m["circ_comp"]
Y_A04_B = Y_CIRC_B - T_INT                    # profundidade do Amb. 04 = 2,06
Y_A05_T = Y_CIRC_B
Y_A05_B = Y_A05_T + m["a05_prof"]
Y_A06_T = Y_A05_B + T_INT
Y_A06_B = Y_A06_T + m["a06_prof"]

# Vãos/portas: posições não cotadas no croqui são estimadas pela proporção
# do desenho e marcadas "a confirmar".
DOOR_WC = 0.60
DOOR_STD = 0.80
VAO_A04 = (X_ALA, X_ALA + 0.80)               # estimado
JANELA_01_02 = (0.80, 1.80)                   # janela cozinha/montagem (posição estimada)
PORTAO_A01 = (0.0, m["a01_esq_1"])            # portão da cozinha para a rua principal

# ---------------------------------------------------------------------------
# Paredes: retângulos (x0, y0, x1, y1). Vãos são lacunas entre retângulos.
# ---------------------------------------------------------------------------
def split_h(x0, x1, y0, y1, gaps=()):
    """Parede horizontal de x0 a x1, interrompida pelos vãos (a, b)."""
    out, cur = [], x0
    for a, b in sorted(gaps):
        out.append((cur, y0, a, y1))
        cur = b
    out.append((cur, y0, x1, y1))
    return out


def split_v(x0, x1, y0, y1, gaps=()):
    out, cur = [], y0
    for a, b in sorted(gaps):
        out.append((x0, cur, x1, a))
        cur = b
    out.append((x0, cur, x1, y1))
    return out


D2 = (Y_A03_B - 0.05 - DOOR_STD, Y_A03_B - 0.05)        # porta Amb. 03 (para a circulação)
D4 = (X_WC_R + T_INT + 0.06, X_WC_R + T_INT + 0.06 + DOOR_STD)  # porta Amb. 02
D3 = (X_A06_R - 0.05 - DOOR_STD, X_A06_R - 0.05)        # porta externa Amb. 06
D1 = (Y_WC_IN_T + 0.06, Y_WC_IN_T + 0.06 + DOOR_WC)     # porta do WC

X_EXT_R = X_A03_R + T_EXT
Y_EXT_B = Y_A06_B + T_EXT
WALLS = [
    # externas
    (-T_EXT, -T_EXT, X_EXT_R, 0),                                   # superior
    (-T_EXT, PORTAO_A01[1], 0, Y_A01_B + T_EXT),                    # esquerda Amb. 01
    (-T_EXT, Y_A01_B, X_NICHO, Y_A01_B + T_EXT),                    # inferior Amb. 01
    (X_NICHO - T_EXT, Y_A01_B, X_NICHO, Y_NICHO_B + T_EXT),         # esquerda nicho
    (X_NICHO - T_EXT, Y_NICHO_B, X_ALA, Y_NICHO_B + T_EXT),         # fundo nicho
    (X_ALA - T_EXT, Y_NICHO_B, X_ALA, Y_EXT_B),                     # esquerda da ala
    *split_h(X_ALA - T_EXT, X_A06_R + T_EXT, Y_A06_B, Y_EXT_B, [D3]),  # fundo Amb. 06
    (X_A06_R, Y_A05_B, X_A06_R + T_EXT, Y_EXT_B),                   # direita Amb. 06
    (X_A06_R, Y_A05_B, X_CIRC_R + T_EXT, Y_A05_B + T_EXT),          # degrau da fachada
    (X_CIRC_R, Y_A03_B, X_CIRC_R + T_EXT, Y_A05_B + T_EXT),         # direita circ./Amb. 05
    (X_A02_R, Y_A03_B, X_EXT_R, Y_A03_B + T_EXT),                   # inferior Amb. 03
    (X_A03_R, -T_EXT, X_EXT_R, Y_A03_B + T_EXT),                    # direita Amb. 03
    # internas
    *split_v(X_A01_R, X_A02_L, 0, Y_WC_T, [JANELA_01_02]),          # Amb. 01 / 02
    *split_v(X_A02_R, X_A03_L, 0, Y_A03_B, [D2]),                   # Amb. 02 / 03
    *split_h(X_WC_R + T_INT, X_A02_R, Y_WC_T, Y_WC_IN_T, [D4]),     # Amb. 02 / circ.
    (X_ALA_FE, Y_WC_T, X_WC_R + T_INT, Y_WC_IN_T),                  # WC superior
    (X_ALA_FE, Y_WC_T, X_ALA, Y_NICHO_B),                           # WC/Amb. 04 esquerda
    *split_v(X_WC_R, X_WC_R + T_INT, Y_WC_T, Y_WC_B, [D1]),         # WC direita
    (X_ALA_FE, Y_WC_IN_B, X_CIRC_L, Y_WC_B),                        # WC inferior
    (X_A04_R, Y_WC_IN_B, X_CIRC_L, Y_CIRC_B),                       # Amb. 04 direita
    *split_h(X_ALA, X_CIRC_L, Y_A04_B, Y_CIRC_B, [VAO_A04]),        # Amb. 04 inferior
    (X_A06_STUB, Y_A05_B, X_A06_R, Y_A06_T),                        # trecho 1,15
]

OUTLINE = [  # contorno externo, para a área construída
    (-T_EXT, -T_EXT), (X_EXT_R, -T_EXT), (X_EXT_R, Y_A03_B + T_EXT),
    (X_CIRC_R + T_EXT, Y_A03_B + T_EXT), (X_CIRC_R + T_EXT, Y_A05_B + T_EXT),
    (X_A06_R + T_EXT, Y_A05_B + T_EXT), (X_A06_R + T_EXT, Y_EXT_B),
    (X_ALA - T_EXT, Y_EXT_B), (X_ALA - T_EXT, Y_NICHO_B + T_EXT),
    (X_NICHO - T_EXT, Y_NICHO_B + T_EXT), (X_NICHO - T_EXT, Y_A01_B + T_EXT),
    (-T_EXT, Y_A01_B + T_EXT),
]

# ---------------------------------------------------------------------------
# Ambientes (polígonos internos). Nomes neutros: a setorização vem depois.
# ---------------------------------------------------------------------------
def rect(x0, y0, x1, y1):
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


ROOMS = [
    # (código, nome, polígono, posição do rótulo, dimensões p/ quadro)
    ("01", "Amb. 01",
     [(0, 0), (X_A01_R, 0), (X_A01_R, Y_WC_T), (X_ALA_FE, Y_WC_T),
      (X_ALA_FE, Y_A01_B), (0, Y_A01_B)],
     (1.75, 2.55), "4,36 × 4,19 (–WC)"),
    ("01a", "Nicho", rect(X_NICHO, Y_A01_B, X_ALA_FE, Y_NICHO_B),
     (X_NICHO + 0.40, 4.62), "0,92 × 1,35"),
    ("02", "Amb. 02", rect(X_A02_L, 0, X_A02_R, Y_WC_T),
     (6.20, 1.45), "2,71 × 2,50"),
    ("03", "Amb. 03", rect(X_A03_L, 0, X_A03_R, Y_A03_B),
     (8.30, 1.55), "2,61 × 3,87"),
    ("WC", "WC", rect(X_ALA, Y_WC_IN_T, X_WC_R, Y_WC_IN_B),
     (4.55, 3.12), "2,42 × 1,16"),
    ("C", "Circulação",
     [(X_WC_R + T_INT, Y_WC_IN_T), (X_A02_R, Y_WC_IN_T), (X_A02_R, Y_CIRC_B),
      (X_CIRC_L, Y_CIRC_B), (X_CIRC_L, Y_WC_B), (X_WC_R + T_INT, Y_WC_B)],
     None, "0,92 / 0,83 × 3,46"),
    ("04", "Amb. 04", rect(X_ALA, Y_WC_B, X_A04_R, Y_A04_B),
     (4.95, 5.05), "2,51 × 2,06"),
    ("05", "Amb. 05", rect(X_ALA, Y_A05_T, X_CIRC_R, Y_A05_B),
     (5.05, 7.55), "3,46 × 4,07"),
    ("06", "Amb. 06", rect(X_ALA, Y_A06_T, X_A06_R, Y_A06_B),
     (5.00, 11.55), "2,94 × 2,90"),
]


def area(poly):
    s = 0.0
    for (x1, y1), (x2, y2) in zip(poly, poly[1:] + poly[:1]):
        s += x1 * y2 - x2 * y1
    return abs(s) / 2


def br(v, nd=2):
    q = Decimal(str(v)).quantize(Decimal(1).scaleb(-nd), rounding=ROUND_HALF_UP)
    return f"{q:,}".replace(",", "X").replace(".", ",").replace("X", ".")


ROOM_AREAS = {code: area(poly) for code, _, poly, _, _ in ROOMS}
AREA_UTIL = sum(round(a, 2) for a in ROOM_AREAS.values())
AREA_CONSTR = area(OUTLINE)

# ---------------------------------------------------------------------------
# Cotas: (x1, y1, x2, y2, texto medido, opções). A linha de cota é desenhada
# exatamente entre os pontos dados. Se o valor medido diferir da geometria
# adotada em mais de 2 cm, a cota recebe "*".
# ---------------------------------------------------------------------------
DIMS = [
    (0, 1.25, X_A01_R, 1.25, m["a01_larg"], {}),
    (0.35, 0, 0.35, m["a01_esq_1"], m["a01_esq_1"], {}),
    (0.35, m["a01_esq_1"], 0.35, Y_A01_B, m["a01_esq_2"], {}),
    (4.22, 0, 4.22, Y_WC_T, m["a01_ate_wc"], {}),
    (X_ALA_FE, 2.30, X_A01_R, 2.30, m["wc_recuo"], {}),
    (3.58, 0, 3.58, Y_NICHO_B, m["nicho_ate_fundo"], {"t": 0.62}),
    (X_NICHO, 5.30, X_ALA_FE, 5.30, m["nicho_larg"], {}),
    (X_A02_L, 0.55, X_A02_R, 0.55, m["a02_larg"], {}),
    (5.00, 0, 5.00, Y_WC_T, m["a02_prof"], {"t": 0.62}),
    (X_A03_L, 2.70, X_A03_R, 2.70, m["a03_larg"], {}),
    (8.95, 0, 8.95, Y_A03_B, m["a03_prof"], {"t": 0.28}),
    (9.72, Y_A03_B - m["a03_marca"], 9.72, Y_A03_B, m["a03_marca"],
     {"confirmar": True}),
    (X_ALA, 3.55, X_WC_R, 3.55, m["wc_larg"], {"t": 0.72}),
    (6.92, Y_WC_IN_T, 6.92, Y_WC_IN_B, m["wc_prof"], {}),
    (X_ALA, 4.35, X_A04_R, 4.35, m["a04_larg"], {}),
    (5.95, Y_WC_B, 5.95, Y_A04_B, m["a04_prof"], {}),
    (X_CIRC_L, 5.70, X_CIRC_R, 5.70, m["circ_larg"], {}),
    (7.17, Y_WC_B, 7.17, Y_CIRC_B, m["circ_comp"], {"t": 0.30}),
    (X_ALA, 8.95, X_CIRC_R, 8.95, m["a05_larg"], {}),
    (6.30, Y_A05_T, 6.30, Y_A05_B, m["a05_prof"], {}),
    (X_ALA, 10.58, X_A06_STUB, 10.58, m["a06_vao"], {}),
    (X_A06_STUB, 10.58, X_A06_R, 10.58, m["a06_trecho"], {}),
    (6.55, Y_A06_T, 6.55, Y_A06_B, m["a06_prof"], {"t": 0.62}),
    (X_ALA, 12.85, X_A06_R, 12.85, m["a06_larg_inf"], {}),
]

# Marcas "a confirmar" (letra, x, y) e linhas tracejadas correspondentes
TAGS = [
    ("B", X_A03_R - 0.38, Y_A03_B - m["a03_marca"] - 0.32),
    ("C", X_A06_R, Y_A05_T + 0.40),
    ("?", X_ALA + 0.40, Y_CIRC_B + 0.30),
    ("?", X_A01_R - 0.42, JANELA_01_02[0] - 0.30),
]

PENDENCIAS = [
    ("1", "Porta do Amb. 06: dá para qual rua? O portão do Amb. 01 (2,32) "
          "dá para a rua principal; o nicho é fechado, sem acesso externo."),
    ("B", "Amb. 03: marca em \"T\" na parede direita, a 2,00 m do canto "
          "inferior — o que é (janela, ponto hidráulico, pilar)?"),
    ("C", "Amb. 05: linha paralela à parede direita, alinhada com a parede "
          "do Amb. 06 (≈0,52 m dela) — bancada, mureta ou parede?"),
    ("?", "Posição e largura estimadas: janela Amb. 01/02, portas do Amb. 02, "
          "do Amb. 03 e do WC (as três se encontram no trecho de 0,92 da "
          "circulação) e vão Amb. 04/05 (≈0,80)."),
    ("2", "Amb. 04: profundidade com leitura incerta (\"2,0\"); a geometria "
          "usa 2,06 para fechar com os 2,18 da circulação."),
    ("3", "Amb. 06: 1,79 + 1,15 = 2,94 no topo × 3,00 medido junto à "
          "parede inferior — conferir esquadro."),
    ("4", f"Paredes não medidas: adotado {br(T_EXT)} (externas) e "
          f"{br(T_INT)} (internas). A parede Amb. 01/02 ficou com "
          f"{br(T_DIV)} para fechar 4,36 + 2,71 com 0,62 + 2,51 + 0,83."),
    ("5", "Não constam no croqui: pé-direito, janelas, norte, pontos de "
          "água/esgoto/elétrica/gás e a área a lápis à esquerda da ala "
          "(com um elemento de 1,207 × 0,594)."),
]

# ===========================================================================
# SVG (mm de papel, A3 retrato, 1:50)
# ===========================================================================
PAGE_W, PAGE_H = 297.0, 420.0
S = 20.0                      # mm de papel por metro (1:50)
OX, OY = 45.0, 52.0           # posição da origem do modelo na folha
FONT = "Liberation Sans, Arial, Helvetica, sans-serif"
INK = "#1f1f1f"
WALL = "#262626"
DIMC = "#1f3a5f"
AMBER = "#c2410c"
GRAY = "#8a8a8a"
ROXO = "#5b2a86"
ACAFRAO = "#e8a317"


def P(x, y):
    return OX + x * S, OY + y * S


def f(v):
    return f"{v:.2f}".rstrip("0").rstrip(".")


svg = []


def add(s):
    svg.append(s)


def text(x, y, s, size=2.2, weight="normal", anchor="middle", rot=0,
         color=INK, halo=True, style="normal"):
    s = (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))
    tr = f' transform="rotate({rot} {f(x)} {f(y)})"' if rot else ""
    base = (f'x="{f(x)}" y="{f(y)}" font-family="{FONT}" font-size="{size}" '
            f'font-weight="{weight}" font-style="{style}" text-anchor="{anchor}"{tr}')
    if halo:
        add(f'<text {base} fill="none" stroke="#ffffff" stroke-width="{size*0.35:.2f}" '
            f'stroke-linejoin="round">{s}</text>')
    add(f'<text {base} fill="{color}">{s}</text>')


def line(x1, y1, x2, y2, color=INK, w=0.25, dash=None, cap="butt"):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    add(f'<line x1="{f(x1)}" y1="{f(y1)}" x2="{f(x2)}" y2="{f(y2)}" '
        f'stroke="{color}" stroke-width="{w}" stroke-linecap="{cap}"{d}/>')


def poly_path(pts):
    return "M" + " L".join(f"{f(x)},{f(y)}" for x, y in pts) + " Z"


def draw_dim(x1, y1, x2, y2, value, opts):
    (a, b), (c, d) = P(x1, y1), P(x2, y2)
    horizontal = abs(d - b) < 1e-6
    geo = math.hypot(x2 - x1, y2 - y1)
    flagged = abs(geo - value) > 0.02
    color = AMBER if opts.get("confirmar") else DIMC
    label = br(value) + ("*" if flagged else "")
    if horizontal:
        line(min(a, c) - 0.8, b, max(a, c) + 0.8, d, color, 0.18)
    else:
        line(a, min(b, d) - 0.8, c, max(b, d) + 0.8, color, 0.18)
    for px, py in ((a, b), (c, d)):
        line(px - 0.65, py + 0.65, px + 0.65, py - 0.65, color, 0.35)
    t = opts.get("t", 0.5)
    tx, ty = a + (c - a) * t, b + (d - b) * t
    if horizontal:
        text(tx, ty - 0.8, label, 2.1, color=color)
    else:
        text(tx - 0.8, ty, label, 2.1, rot=-90, color=color)


def door(hinge, closed_dir, open_dir, width, color=INK):
    hx, hy = P(*hinge)
    w = width * S
    cx, cy = hx + closed_dir[0] * w, hy + closed_dir[1] * w
    ox_, oy_ = hx + open_dir[0] * w, hy + open_dir[1] * w
    line(hx, hy, ox_, oy_, color, 0.35)
    cross = closed_dir[0] * open_dir[1] - closed_dir[1] * open_dir[0]
    sweep = 1 if cross > 0 else 0
    add(f'<path d="M{f(cx)},{f(cy)} A{f(w)},{f(w)} 0 0 {sweep} {f(ox_)},{f(oy_)}" '
        f'fill="none" stroke="{color}" stroke-width="0.18"/>')


def draw_portao():
    """Portão do Amb. 01 (de enrolar): vão na parede + linha tracejada."""
    (a, b), (_, d) = P(-T_EXT, PORTAO_A01[0]), P(0, PORTAO_A01[1])
    line(a + 0.4, b, a + 0.4, d, INK, 0.3, "1.4 0.8")
    line(a - 0.6, b, a + 3.6, b, INK, 0.3)
    line(a - 0.6, d, a + 3.6, d, INK, 0.3)
    text(a - 2.6, (b + d) / 2, "RUA PRINCIPAL", 2.3, "bold", rot=-90,
         color="#555555", halo=False)
    text(a + 6.2, (b + d) / 2, "portão 2,32", 2.0, rot=-90, color=INK)


def draw_window(x0, x1, y0, y1):
    """Janela em parede vertical: três linhas finas no vão."""
    (a, b), (c, d) = P(x0, y0), P(x1, y1)
    add(f'<rect x="{f(a)}" y="{f(b)}" width="{f(c - a)}" height="{f(d - b)}" '
        f'fill="#ffffff" stroke="{INK}" stroke-width="0.2"/>')
    line((a + c) / 2, b, (a + c) / 2, d, INK, 0.2)


def tag(letter, x, y):
    px, py = P(x, y)
    add(f'<circle cx="{f(px)}" cy="{f(py)}" r="2.1" fill="#ffffff" '
        f'stroke="{AMBER}" stroke-width="0.35"/>')
    text(px, py + 0.85, letter, 2.4, "bold", color=AMBER, halo=False)


def wrap(s, n):
    words, lines, cur = s.split(), [], ""
    for w in words:
        if len(cur) + len(w) + (1 if cur else 0) > n:
            lines.append(cur)
            cur = w
        else:
            cur = f"{cur} {w}" if cur else w
    if cur:
        lines.append(cur)
    return lines


def build_svg():
    add(f'<svg xmlns="http://www.w3.org/2000/svg" width="{f(PAGE_W)}mm" '
        f'height="{f(PAGE_H)}mm" viewBox="0 0 {f(PAGE_W)} {f(PAGE_H)}">')
    add('<defs><pattern id="molhada" patternUnits="userSpaceOnUse" width="1.4" '
        'height="1.4" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" '
        'y2="1.4" stroke="#9fb3c8" stroke-width="0.14"/></pattern></defs>')
    add(f'<rect width="{f(PAGE_W)}" height="{f(PAGE_H)}" fill="#ffffff"/>')
    # moldura
    add(f'<rect x="20" y="10" width="267" height="400" fill="none" '
        f'stroke="{INK}" stroke-width="0.5"/>')

    # título do desenho
    text(25, 21, "PLANTA BAIXA — LEVANTAMENTO CADASTRAL", 4.6, "bold",
         anchor="start", halo=False)
    text(25, 27.5, "Situação existente, redesenhada a partir do croqui de "
         "medição · cotas em metros · escala 1:50 em A3", 2.4, anchor="start",
         color="#555555", halo=False)

    # ambientes (fundo + WC hachurado)
    for code, _, poly, _, _ in ROOMS:
        pts = [P(x, y) for x, y in poly]
        fill = "url(#molhada)" if code == "WC" else "#ffffff"
        add(f'<path d="{poly_path(pts)}" fill="{fill}" stroke="none"/>')

    # divisões virtuais entre espaços abertos
    for x1, y1, x2, y2 in [
        (X_NICHO, Y_A01_B, X_ALA_FE, Y_A01_B),
        (X_CIRC_L, Y_CIRC_B, X_CIRC_R, Y_CIRC_B),
        (X_ALA, Y_A05_B + T_INT / 2, X_A06_STUB, Y_A05_B + T_INT / 2),
    ]:
        line(*P(x1, y1), *P(x2, y2), GRAY, 0.2, "1.2 0.9")

    # linha "C" (a confirmar) no Amb. 05
    line(*P(X_A06_R, Y_A05_T), *P(X_A06_R, Y_A05_B), AMBER, 0.3, "1.6 1")

    # paredes
    for x0, y0, x1, y1 in WALLS:
        (a, b), (c, d) = P(x0, y0), P(x1, y1)
        add(f'<rect x="{f(min(a, c))}" y="{f(min(b, d))}" width="{f(abs(c - a))}" '
            f'height="{f(abs(d - b))}" fill="{WALL}"/>')

    # marca na parede (B)
    for x, y0, x1 in [(X_A03_R, Y_A03_B - m["a03_marca"], X_EXT_R)]:
        (a, b), (c, _) = P(x, y0), P(x1, y0)
        line(a - 1.2, b, c + 1.2, b, AMBER, 0.45)

    # portas
    door((X_WC_R, D1[0]), (0, 1), (-1, 0), DOOR_WC)
    door((X_A03_L, D2[1]), (0, -1), (1, 0), DOOR_STD)
    door((D4[1], Y_WC_T), (-1, 0), (0, -1), DOOR_STD)
    draw_window(X_A01_R, X_A02_L, *JANELA_01_02)
    door((D3[1], Y_EXT_B), (-1, 0), (0, 1), DOOR_STD)
    draw_portao()

    # vãos estimados: contorno tracejado laranja
    for (x0, y0, x1, y1) in [
        (VAO_A04[0], Y_A04_B, VAO_A04[1], Y_CIRC_B),
    ]:
        (a, b), (c, d) = P(x0, y0), P(x1, y1)
        add(f'<rect x="{f(a)}" y="{f(b)}" width="{f(c - a)}" height="{f(d - b)}" '
            f'fill="none" stroke="{AMBER}" stroke-width="0.25" stroke-dasharray="0.8 0.6"/>')

    # cotas
    for x1, y1, x2, y2, v, o in DIMS:
        draw_dim(x1, y1, x2, y2, v, o)

    # rótulos dos ambientes
    for code, name, poly, pos, _ in ROOMS:
        a = br(ROOM_AREAS[code]) + " m²"
        if code == "C":
            px, py = P(X_CIRC_L + 0.30, 4.70)
            text(px, py, "CIRCULAÇÃO", 2.4, "bold", rot=-90)
            text(px + 3.0, py, a, 2.0, rot=-90, color="#444444")
            continue
        px, py = P(*pos)
        size = 2.4 if code in ("01a", "WC") else 3.0
        text(px, py, name.upper(), size, "bold")
        text(px, py + size * 1.05, a, size * 0.75, color="#444444")

    # identificação das áreas externas (não levantadas)
    for x, y in [(1.25, 4.95), (8.75, 4.40)]:
        px, py = P(x, y)
        text(px, py, "ÁREA EXTERNA", 2.0, "bold", color=GRAY, halo=False)
        text(px, py + 2.6, "(não levantada)", 1.9, color=GRAY, halo=False,
             style="italic")

    for letter, x, y in TAGS:
        tag(letter, x, y)

    draw_scale_bar(25, 352)
    draw_areas_panel(203, 151)
    draw_pending_panel(24, 178)
    draw_title_block()
    add("</svg>")
    return "\n".join(svg)


def draw_scale_bar(x, y):
    text(x, y - 3, "ESCALA 1:50", 2.2, "bold", anchor="start", halo=False)
    for i in range(5):
        fill = INK if i % 2 == 0 else "#ffffff"
        add(f'<rect x="{f(x + i * S)}" y="{f(y)}" width="{f(S)}" height="1.6" '
            f'fill="{fill}" stroke="{INK}" stroke-width="0.2"/>')
        text(x + i * S, y + 4.4, str(i), 1.9, halo=False)
    text(x + 5 * S, y + 4.4, "5 m", 1.9, halo=False)


def draw_areas_panel(x, y):
    w = 80
    add(f'<rect x="{f(x)}" y="{f(y)}" width="{w}" height="118" fill="#ffffff" '
        f'stroke="{INK}" stroke-width="0.3"/>')
    text(x + 3, y + 6, "QUADRO DE ÁREAS (área útil)", 2.6, "bold",
         anchor="start", halo=False)
    yy = y + 12
    text(x + 3, yy, "Ambiente", 1.9, "bold", anchor="start", halo=False,
         color="#555555")
    text(x + 42, yy, "Dimensões (m)", 1.9, "bold", halo=False, color="#555555")
    text(x + w - 3, yy, "Área (m²)", 1.9, "bold", anchor="end", halo=False,
         color="#555555")
    line(x + 2, yy + 1.4, x + w - 2, yy + 1.4, GRAY, 0.15)
    yy += 5.2
    for code, name, _, _, dims in ROOMS:
        text(x + 3, yy, name, 2.1, anchor="start", halo=False)
        text(x + 42, yy, dims, 2.0, halo=False, color="#444444")
        text(x + w - 3, yy, br(ROOM_AREAS[code]), 2.1, anchor="end", halo=False)
        yy += 4.6
    line(x + 2, yy - 2.6, x + w - 2, yy - 2.6, INK, 0.2)
    yy += 1
    text(x + 3, yy, "Total área útil", 2.2, "bold", anchor="start", halo=False)
    text(x + w - 3, yy, br(AREA_UTIL), 2.2, "bold", anchor="end", halo=False)
    yy += 4.8
    text(x + 3, yy, "Área construída (estimada*)", 2.1, anchor="start", halo=False)
    text(x + w - 3, yy, "≈ " + br(AREA_CONSTR, 1), 2.1, anchor="end", halo=False)
    yy += 4.2
    ext_w = X_EXT_R + T_EXT
    ext_h = Y_EXT_B + T_EXT
    text(x + 3, yy, f"Envolvente externa ≈ {br(ext_w)} × {br(ext_h)} m",
         1.9, anchor="start", halo=False, color="#555555")
    yy += 3.4
    for ln in wrap("* com as espessuras de parede adotadas (não medidas).", 58):
        text(x + 3, yy, ln, 1.8, anchor="start", halo=False, color="#555555")
        yy += 2.8

    # legenda
    yy += 3.5
    line(x + 2, yy - 3, x + w - 2, yy - 3, GRAY, 0.15)
    text(x + 3, yy + 1, "LEGENDA", 2.4, "bold", anchor="start", halo=False)
    yy += 6
    items = [
        ("wall", "Parede (espessura adotada)"),
        ("door", "Porta (posição aproximada)"),
        ("window", "Janela"),
        ("virtual", "Divisa entre espaços sem parede"),
        ("vao", "Vão estimado — confirmar"),
        ("amber", "Elemento / cota a confirmar"),
        ("hatch", "Área molhada (WC)"),
    ]
    for kind, label in items:
        sx = x + 4
        if kind == "wall":
            add(f'<rect x="{f(sx)}" y="{f(yy - 2)}" width="8" height="2" fill="{WALL}"/>')
        elif kind == "door":
            add(f'<path d="M{f(sx)},{f(yy)} L{f(sx)},{f(yy - 3)} A3,3 0 0 1 {f(sx + 3)},{f(yy)}" '
                f'fill="none" stroke="{INK}" stroke-width="0.25"/>')
        elif kind == "window":
            add(f'<rect x="{f(sx)}" y="{f(yy - 2)}" width="8" height="2" fill="#fff" '
                f'stroke="{INK}" stroke-width="0.2"/>')
            line(sx, yy - 1, sx + 8, yy - 1, INK, 0.2)
        elif kind == "virtual":
            line(sx, yy - 1, sx + 8, yy - 1, GRAY, 0.2, "1.2 0.9")
        elif kind == "vao":
            add(f'<rect x="{f(sx)}" y="{f(yy - 2.2)}" width="8" height="2.2" fill="none" '
                f'stroke="{AMBER}" stroke-width="0.25" stroke-dasharray="0.8 0.6"/>')
        elif kind == "amber":
            add(f'<circle cx="{f(sx + 2)}" cy="{f(yy - 1)}" r="1.8" fill="#fff" '
                f'stroke="{AMBER}" stroke-width="0.3"/>')
            text(sx + 2, yy - 0.2, "A", 2.0, "bold", color=AMBER, halo=False)
        elif kind == "hatch":
            add(f'<rect x="{f(sx)}" y="{f(yy - 2.4)}" width="8" height="2.6" '
                f'fill="url(#molhada)" stroke="{GRAY}" stroke-width="0.15"/>')
        text(x + 15, yy, label, 2.0, anchor="start", halo=False)
        yy += 4.6
    text(x + 4, yy, "2,18*", 2.0, color=DIMC, anchor="start", halo=False)
    text(x + 15, yy, "cota medida ≠ geometria adotada", 2.0, anchor="start",
         halo=False)


def draw_pending_panel(x, y):
    w, n = 86, 50
    blocks = [(k, wrap(t, n)) for k, t in PENDENCIAS]
    h = 14 + sum(len(ls) * 2.9 + 2.2 for _, ls in blocks)
    add(f'<rect x="{f(x)}" y="{f(y)}" width="{w}" height="{f(h)}" fill="#ffffff" '
        f'stroke="{AMBER}" stroke-width="0.35"/>')
    text(x + 3, y + 6, "PONTOS A CONFIRMAR IN LOCO", 2.6, "bold", anchor="start",
         color=AMBER, halo=False)
    yy = y + 12
    for k, ls in blocks:
        add(f'<circle cx="{f(x + 5)}" cy="{f(yy - 0.8)}" r="1.7" fill="#fff" '
            f'stroke="{AMBER}" stroke-width="0.3"/>')
        text(x + 5, yy - 0.05, k, 1.9, "bold", color=AMBER, halo=False)
        for ln in ls:
            text(x + 9, yy, ln, 1.95, anchor="start", halo=False)
            yy += 2.9
        yy += 2.2


def draw_title_block():
    x0, y0, x1, y1 = 20, 362, 287, 410
    add(f'<rect x="{x0}" y="{y0}" width="{x1 - x0}" height="{y1 - y0}" fill="#ffffff" '
        f'stroke="{INK}" stroke-width="0.5"/>')
    add(f'<rect x="{x0}" y="{y0}" width="3" height="{y1 - y0}" fill="{ROXO}"/>')
    add(f'<rect x="{x0 + 3}" y="{y0}" width="1.2" height="{y1 - y0}" fill="{ACAFRAO}"/>')
    for xv in (105, 205):
        line(xv, y0, xv, y1, INK, 0.3)
    text(28, y0 + 9, "SAFRAN ALIMENTOS LTDA", 3.4, "bold", anchor="start",
         color=ROXO, halo=False)
    text(28, y0 + 15, "Safran Congelados", 2.5, anchor="start", halo=False)
    text(28, y0 + 20.5, "CNPJ 31.511.591/0001-95", 2.2, anchor="start",
         halo=False, color="#444444")
    text(28, y0 + 26, "Isabel C. P. Cavalcante · Victor A. C. Costa ·", 1.9,
         anchor="start", halo=False, color="#444444")
    text(28, y0 + 29, "Glaucos A. C. Costa", 1.9, anchor="start", halo=False,
         color="#444444")

    text(109, y0 + 8.5, "LEVANTAMENTO CADASTRAL — PLANTA BAIXA", 3.0, "bold",
         anchor="start", halo=False)
    text(109, y0 + 14.5, "Imóvel da cozinha de produção (≈ 80 m²)", 2.3,
         anchor="start", halo=False)
    text(109, y0 + 19.5, "Rua Fernando Mendes Pinto, 05 — Barro Duro", 2.3,
         anchor="start", halo=False)
    text(109, y0 + 24, "Maceió/AL — CEP 57045-065", 2.3, anchor="start", halo=False)
    for i, ln in enumerate(wrap(
            "Redesenho do croqui de medição manual. Documento de trabalho: "
            "conferir in loco antes de usar em projeto, licenciamento ou obra.", 66)):
        text(109, y0 + 31 + i * 3.0, ln, 1.9, anchor="start", halo=False,
             color="#555555", style="italic")

    cells = [
        ("ESCALA", "1:50"), ("FOLHA", "A3"),
        ("UNIDADE", "metro"), ("REVISÃO", "R02"),
        ("DATA", "05/10/2026"), ("STATUS", "PRELIMINAR"),
    ]
    cw, ch = (x1 - 205) / 2, (y1 - y0) / 3
    for i, (k, v) in enumerate(cells):
        cx, cy = 205 + (i % 2) * cw, y0 + (i // 2) * ch
        add(f'<rect x="{f(cx)}" y="{f(cy)}" width="{f(cw)}" height="{f(ch)}" '
            f'fill="none" stroke="{INK}" stroke-width="0.2"/>')
        text(cx + 2.5, cy + 4.6, k, 1.8, anchor="start", halo=False, color="#666666")
        color = AMBER if v == "PRELIMINAR" else INK
        text(cx + 2.5, cy + 12, v, 3.0, "bold", anchor="start", halo=False,
             color=color)


# ===========================================================================
# DXF (metros; y invertido para ficar na mesma orientação do croqui)
# ===========================================================================
def build_dxf(path):
    import ezdxf
    from ezdxf.enums import TextEntityAlignment

    doc = ezdxf.new("R2010", setup=True)
    doc.units = ezdxf.units.M
    doc.header["$INSUNITS"] = 6
    doc.header["$MEASUREMENT"] = 1
    for name, color in [("A-PAREDE", 7), ("A-PORTA", 3), ("A-COTA", 5),
                        ("A-TEXTO", 7), ("A-AMBIENTE", 8), ("A-CONFIRMAR", 30),
                        ("A-DIVISA", 8), ("A-JANELA", 4)]:
        doc.layers.add(name, color=color)
    ds = doc.dimstyles.new("SAFRAN_50")
    ds.dxf.dimtxt = 0.10
    ds.dxf.dimasz = 0.07
    ds.dxf.dimexe = 0.05
    ds.dxf.dimexo = 0.03
    ds.dxf.dimgap = 0.03
    ds.dxf.dimdec = 2
    ds.dxf.dimdsep = ord(",")
    ds.dxf.dimtad = 1
    ds.dxf.dimtih = 0
    ds.dxf.dimtoh = 0
    ds.dxf.dimclrd = 5
    ds.dxf.dimclre = 5
    ds.dxf.dimclrt = 5
    ds.set_arrows(blk="ARCHTICK")

    msp = doc.modelspace()

    def q(x, y):
        return (x, -y)

    for x0, y0, x1, y1 in WALLS:
        pts = [q(x0, y0), q(x1, y0), q(x1, y1), q(x0, y1)]
        msp.add_lwpolyline(pts, close=True, dxfattribs={"layer": "A-PAREDE"})
        h = msp.add_hatch(color=7, dxfattribs={"layer": "A-PAREDE"})
        h.paths.add_polyline_path(pts, is_closed=True)

    for code, name, poly, pos, _ in ROOMS:
        msp.add_lwpolyline([q(*p) for p in poly], close=True,
                           dxfattribs={"layer": "A-AMBIENTE"})
        attribs = {"layer": "A-TEXTO", "char_height": 0.13}
        if pos is None:
            pos = (X_CIRC_L + 0.42, 4.70)
            attribs["rotation"] = 90
        label = f"{name.upper()}\\P{br(ROOM_AREAS[code])} m²"
        mt = msp.add_mtext(label, dxfattribs=attribs)
        mt.set_location(q(*pos), attachment_point=5)

    def dxf_door(hinge, closed_dir, open_dir, width):
        hx, hy = q(*hinge)
        cd = (closed_dir[0], -closed_dir[1])
        od = (open_dir[0], -open_dir[1])
        msp.add_line((hx, hy), (hx + od[0] * width, hy + od[1] * width),
                     dxfattribs={"layer": "A-PORTA"})
        a1 = math.degrees(math.atan2(cd[1], cd[0]))
        a2 = math.degrees(math.atan2(od[1], od[0]))
        start, end = (a1, a2) if (a2 - a1) % 360 == 90 else (a2, a1)
        msp.add_arc((hx, hy), width, start, end, dxfattribs={"layer": "A-PORTA"})

    dxf_door((X_WC_R, D1[0]), (0, 1), (-1, 0), DOOR_WC)
    dxf_door((X_A03_L, D2[1]), (0, -1), (1, 0), DOOR_STD)
    dxf_door((D4[1], Y_WC_T), (-1, 0), (0, -1), DOOR_STD)
    for xv in (X_A01_R, (X_A01_R + X_A02_L) / 2, X_A02_L):
        msp.add_line(q(xv, JANELA_01_02[0]), q(xv, JANELA_01_02[1]),
                     dxfattribs={"layer": "A-JANELA"})
    dxf_door((D3[1], Y_EXT_B), (-1, 0), (0, 1), DOOR_STD)
    msp.add_line(q(-T_EXT / 2, PORTAO_A01[0]), q(-T_EXT / 2, PORTAO_A01[1]),
                 dxfattribs={"layer": "A-PORTA", "linetype": "DASHED"})
    msp.add_text("portão 2,32 (rua principal)", height=0.10,
                 dxfattribs={"layer": "A-TEXTO", "rotation": 90}) \
        .set_placement(q(-0.35, PORTAO_A01[1]))

    for x1, y1, x2, y2 in [
        (X_NICHO, Y_A01_B, X_ALA_FE, Y_A01_B),
        (X_CIRC_L, Y_CIRC_B, X_CIRC_R, Y_CIRC_B),
        (X_ALA, Y_A05_B + T_INT / 2, X_A06_STUB, Y_A05_B + T_INT / 2),
    ]:
        msp.add_line(q(x1, y1), q(x2, y2), dxfattribs={"layer": "A-DIVISA"})
    msp.add_line(q(X_A06_R, Y_A05_T), q(X_A06_R, Y_A05_B),
                 dxfattribs={"layer": "A-CONFIRMAR"})
    for (x0, y0, x1, y1) in [
        (VAO_A04[0], Y_A04_B, VAO_A04[1], Y_CIRC_B),
    ]:
        msp.add_lwpolyline([q(x0, y0), q(x1, y0), q(x1, y1), q(x0, y1)], close=True,
                           dxfattribs={"layer": "A-CONFIRMAR"})
    for letter, x, y in TAGS:
        msp.add_circle(q(x, y), 0.105, dxfattribs={"layer": "A-CONFIRMAR"})
        msp.add_text(letter, height=0.12, dxfattribs={"layer": "A-CONFIRMAR"}) \
            .set_placement(q(x, y), align=TextEntityAlignment.MIDDLE_CENTER)

    for x1, y1, x2, y2, v, o in DIMS:
        horizontal = abs(y2 - y1) < 1e-9
        geo = math.hypot(x2 - x1, y2 - y1)
        label = br(v) + ("*" if abs(geo - v) > 0.02 else "")
        layer = "A-CONFIRMAR" if o.get("confirmar") else "A-COTA"
        dim = msp.add_linear_dim(
            base=q(x1, y1), p1=q(x1, y1), p2=q(x2, y2),
            angle=0 if horizontal else 90, text=label, dimstyle="SAFRAN_50",
            dxfattribs={"layer": layer},
        )
        dim.render()

    msp.add_text("PLANTA BAIXA — LEVANTAMENTO CADASTRAL — SAFRAN (R02, preliminar)",
                 height=0.22, dxfattribs={"layer": "A-TEXTO"}) \
        .set_placement(q(-0.15, -1.2))
    doc.saveas(path)


def main():
    svg_text = build_svg()
    (OUT / "planta-baixa.svg").write_text(svg_text, encoding="utf-8")
    try:
        import cairosvg
        cairosvg.svg2pdf(bytestring=svg_text.encode(), write_to=str(OUT / "planta-baixa.pdf"))
        cairosvg.svg2png(bytestring=svg_text.encode(), write_to=str(OUT / "planta-baixa.png"),
                         output_width=2480)
    except ImportError:
        print("cairosvg ausente: PDF/PNG não gerados")
    try:
        build_dxf(OUT / "planta-baixa.dxf")
    except ImportError:
        print("ezdxf ausente: DXF não gerado")

    print(f"Parede Amb. 01/02 (ajuste de fechamento): {br(T_DIV)} m")
    for code, name, *_ in ROOMS:
        print(f"  {name:<12} {br(ROOM_AREAS[code]):>6} m²")
    print(f"  {'Área útil':<12} {br(AREA_UTIL):>6} m²")
    print(f"  {'Construída':<12} {br(AREA_CONSTR):>6} m² (estimada)")


if __name__ == "__main__":
    main()
