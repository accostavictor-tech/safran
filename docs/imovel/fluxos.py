#!/usr/bin/env python3
"""Antes × depois: fluxos, layout e intervenções sobre a planta R02.

Usa a geometria de planta_baixa.py e gera fluxos.svg / .png / .pdf (A3
paisagem, 1:75). Fatos de campo: a cozinha (Amb. 01) tem portão de 2,32 para
a rua principal e só uma janela para a montagem; o nicho é fechado.

Medidas de equipamento são típicas de mercado e precisam ser conferidas com
as propostas dos fornecedores.

    python3 docs/imovel/fluxos.py
"""

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import planta_baixa as pb  # noqa: E402

OUT = Path(__file__).resolve().parent
S = 1000 / 75                     # 1:75 em mm de papel por metro
PAGE_W, PAGE_H = 420.0, 297.0
FONT = pb.FONT
INK = "#1f1f1f"
VERDE = "#1e8449"
VERMELHO = "#c0392b"
DEMOLIR = "#f2c300"
LIVRE = "#6c3483"

ZONAS = {
    "coccao": ("#fde3bf", "Cozinha (pré-preparo, cocção, lavagem)"),
    "limpa": ("#cfeccb", "Montagem e frio (área limpa)"),
    "transicao": ("#d8ecf8", "Passagem / barreira"),
    "armazem": ("#d6def3", "Armazenagem"),
    "pessoal": ("#e8dcf2", "Equipe (vestiário, copa, descanso)"),
    "recepcao": ("#f1ead2", "Recepção / expedição"),
    "misto": ("#f6d4d4", "Uso misto (problema)"),
    "neutro": ("#ececec", "WC / circulação"),
}
FLUXOS = {
    "mp": ("#c0392b", "none", 0.7, "Matéria-prima"),
    "prod": ("#1e8449", "none", 0.7, "Alimento / produto"),
    "lixo": ("#555555", "2.2 1.4", 0.6, "Lixo"),
    "equipe": ("#7d3c98", "0.9 0.9", 0.55, "Equipe"),
}
SUJO, LIMPO = {"mp", "lixo"}, {"prod"}

# código: (zona, linhas do rótulo, subtítulo, posição do rótulo em m)
ANTES = {
    "01": ("coccao", ["COZINHA"], "portão p/ a rua principal", (2.00, 2.85)),
    "01a": ("coccao", ["nicho"], "", (3.28, 4.95)),
    "02": ("limpa", ["MONTAGEM"], "", (5.95, 0.55)),
    "03": ("armazem", ["ESTOQUE"], "", (8.75, 1.60)),
    "WC": ("neutro", ["WC"], "", (4.55, 3.15)),
    "C": ("neutro", [], "", None),
    "04": ("pessoal", ["COPA"], "", (5.10, 4.95)),
    "05": ("misto", ["FUNCIONÁRIOS"], "freezer · descanso", (6.05, 8.55)),
    "06": ("recepcao", ["RECEPÇÃO"], "", (6.05, 10.90)),
}
DEPOIS = {
    "01": ("coccao", ["COZINHA"], "cocção + lavagem", (1.70, 2.15)),
    "01a": ("transicao", ["passagem"], "", (3.28, 5.45)),
    "02": ("limpa", ["MONTAGEM"], "", (6.15, 1.95)),
    "03": ("limpa", ["SELAGEM + FRIO"], "", (9.20, 2.25)),
    "WC": ("neutro", ["WC"], "", (4.25, 3.15)),
    "C": ("neutro", [], "", None),
    "04": ("coccao", ["PRÉ-PREPARO"], "", (5.05, 5.12)),
    "05": ("pessoal", ["EQUIPE"], "vestiário · copa · estoque seco", (6.05, 8.20)),
    "06": ("recepcao", ["RECEPÇÃO +", "EXPEDIÇÃO"], "", (5.70, 11.05)),
}

PORTA_NICHO_04 = (4.60, 5.40)                 # y, parede nicho/Amb. 04 (nova)
PORTA_02_03 = (0.15, 0.95)                    # y, parede Amb. 02/03 (nova)

# --- trajetos (m) ----------------------------------------------------------
ANTES_FLUXOS = [
    ("mp", [(6.10, 14.15), (6.10, 12.75), (4.60, 12.75), (4.60, 7.25),
            (6.70, 7.25), (6.70, 3.45), (8.40, 3.45)]),
    ("mp", [(8.40, 3.65), (6.92, 3.65), (6.92, 7.55), (4.95, 7.55),
            (4.95, 12.45), (6.35, 12.45), (6.35, 14.45), (-0.90, 14.45),
            (-0.90, 1.60), (1.30, 1.60)]),
    ("prod", [(1.30, 1.20), (7.12, 1.20), (7.12, 7.85), (5.25, 7.85),
              (5.25, 12.15), (6.60, 12.15), (6.60, 14.15)]),
    ("lixo", [(1.30, 2.05), (-0.60, 2.05)]),
]
DEPOIS_FLUXOS = [
    ("mp", [(6.18, 14.15), (6.18, 12.75), (4.60, 12.75), (4.60, 5.25),
            (5.45, 5.25)]),
    ("prod", [(5.40, 4.80), (3.25, 4.80), (3.25, 1.50), (2.30, 1.50),
              (2.30, 1.10), (6.90, 1.10), (6.90, 0.55), (7.80, 0.55),
              (7.80, 1.30), (9.40, 1.30)]),
    ("prod", [(8.10, 1.60), (8.10, 2.70), (8.40, 2.70)]),
    ("prod", [(8.40, 3.35), (7.12, 3.35), (7.12, 7.85), (5.25, 7.85),
              (5.25, 12.15), (6.58, 12.15), (6.58, 14.15)]),
    ("lixo", [(0.25, 2.45), (0.25, 2.05), (-0.60, 2.05)]),
    ("lixo", [(6.65, 1.90), (6.65, 7.55), (4.95, 7.55), (4.95, 12.45),
              (6.38, 12.45), (6.38, 14.15)]),
    ("lixo", [(4.42, 5.50), (4.42, 13.00), (6.00, 13.00), (6.00, 14.15)]),
    ("equipe", [(5.60, 6.75), (4.05, 6.75), (4.05, 5.00), (3.00, 5.00),
                (3.00, 3.30)]),
    ("equipe", [(5.60, 6.75), (6.88, 6.75), (6.88, 2.30)]),
]
# Trajetos só para medir (não desenhados)
MP_PREPARO_DEPOIS = [(5.45, 5.25), (5.45, 4.80)]
COZINHA_WC_ANTES = [(1.30, 1.80), (-0.70, 1.80), (-0.70, 14.30), (6.20, 14.30),
                    (6.20, 12.30), (5.10, 12.30), (5.10, 7.40), (6.80, 7.40),
                    (6.80, 3.00), (6.40, 3.00)]
COZINHA_WC_DEPOIS = [(2.50, 2.60), (3.00, 2.60), (3.00, 5.00), (4.05, 5.00),
                     (4.05, 6.75), (6.88, 6.75), (6.88, 3.00), (6.40, 3.00)]
PORCION_FRIO_ANTES = [(5.90, 1.20), (7.12, 1.20), (7.12, 7.85), (5.60, 7.85),
                      (5.60, 8.60)]
PORCION_FRIO_DEPOIS = [(5.90, 1.10), (6.90, 1.10), (6.90, 0.55), (7.80, 0.55),
                       (7.80, 1.30), (9.40, 1.30)]

ANTES_NOTAS = [
    ("1", (-0.90, 9.00), "A cozinha só se liga ao resto pela janela: MP do "
                         "estoque e quem vai ao WC saem pelo portão e dão a "
                         "volta pela rua."),
    ("2", (5.95, 3.40), "WC, montagem e estoque abrem no mesmo patamar de "
                        "≈1 m²; a MP cruza a porta da montagem."),
    ("3", (6.05, 9.55), "Produto congelado guardado na área de descanso."),
    ("4", (4.95, 0.50), "Montagem com 6,8 m² (ideal 9–10) e sem lavatório: "
                        "não cabem ultracongelador e seladora."),
    ("5", (4.20, 9.20), "Amb. 05 tem 14 m² sem função definida enquanto "
                        "cozinha e montagem estão abaixo do ideal."),
]
DEPOIS_NOTAS = [
    ("1", (4.10, 4.62), "Abrir porta 0,80 entre o nicho e o Amb. 04 (parede "
                        "interna de 12 cm). É o que liga a cozinha ao resto "
                        "do prédio — confirmar se a parede pode ser aberta."),
    ("2", (7.70, 0.25), "Abrir porta 0,80 entre montagem e Amb. 03 (parede "
                        "interna de 12 cm): porciona → sela → ultracongela → "
                        "câmara, em linha."),
    ("3", (4.48, 2.22), "Janela vira passa-prato (≈1,00 × 0,60, peitoril "
                        "0,90), bancada inox dos dois lados."),
    ("4", (2.80, 2.75), "Lavatórios na entrada da produção (Amb. 04), na "
                        "cozinha e na montagem (os dois últimos na parede do WC)."),
    ("5", (9.75, 3.55), "Câmara 1,60 × 2,00 no Amb. 03, condensadora na "
                        "parede externa."),
    ("6", (5.40, 5.70), "Amb. 04 vira pré-preparo + MP do dia (amplia a pia "
                        "da copa): a cozinha passa a 23,6 m²."),
    ("7", (4.10, 10.04), "Amb. 05 vira vestiário + copa + estoque seco; o "
                        "freezer sai da área de descanso."),
]

# Equipamentos (depois): (x0, y0, x1, y1, rótulo)
EQUIP = [
    # cozinha
    (1.20, 0.05, 2.40, 0.95, "fogão 6b 1,20×0,90"),
    (2.45, 0.05, 3.66, 0.75, "apoio"),
    (3.66, 0.05, 4.36, 2.45, "porcion."),
    (0.05, 3.49, 1.25, 4.15, "lavagem"),
    (1.30, 3.49, 2.80, 4.15, "bancada"),
    (3.39, 2.95, 3.74, 3.40, "lav."),
    (0.05, 2.45, 0.45, 2.85, "lixo"),
    # pré-preparo
    (4.50, 3.92, 6.35, 4.62, "pré-preparo + cuba"),
    (5.60, 4.75, 6.35, 5.95, "MP fria"),
    (3.88, 3.92, 4.40, 4.45, "secos"),
    (4.75, 5.60, 5.20, 5.95, "lav."),
    # montagem
    (pb.X_A02_L, 0.05, pb.X_A02_L + 0.70, 2.45, "bancada 2,40"),
    (5.40, 0.05, 6.45, 0.65, "rotulagem"),
    (5.95, 2.10, 6.40, 2.45, "lav."),
    # selagem + frio
    (8.00, 0.05, 8.80, 0.70, "seladora"),
    (9.15, 0.05, 9.95, 0.90, "ultracong."),
    (8.40, 1.85, 10.00, 3.85, "câmara 1,60×2,00"),
    # equipe
    (4.90, 6.10, 6.30, 6.55, "armários"),
    (5.85, 8.50, 6.65, 9.30, "mesa"),
    (5.70, 9.62, 6.75, 10.12, "copa"),
    (3.88, 7.40, 4.30, 9.90, "embal. + secos"),
    # recepção / expedição
    (6.10, 10.35, 6.78, 11.65, "freezer"),
]
COIFA = (1.10, 0.05, 2.50, 1.05)
CONDENSADORA = (pb.X_EXT_R + 0.05, 2.40, pb.X_EXT_R + 0.65, 3.20)
LIVRES = [  # cotas de espaço livre (depois)
    (0.0, 3.22, 3.39, 3.22),
    (pb.X_A02_L + 0.70, 1.45, pb.X_A02_R, 1.45),
    (9.55, 0.90, 9.55, 1.85),
]

COMO_FICA = [
    "MP entra pelos fundos (Amb. 06) e vai direto ao Amb. 04. Papelão de "
    "fornecedor fica na recepção.",
    "Pré-preparo (Amb. 04) → passagem → cocção (Amb. 01).",
    "Passa-prato → montagem: porciona e rotula.",
    "Amb. 03: sela, ultracongela e guarda na câmara.",
    "Expedição: câmara → circulação → Amb. 06.",
    "Equipe: fundos → vestiário (Amb. 05) → lavatório → produção.",
    "Lixo da cozinha sai pelo portão; o resto sai pelos fundos. Sempre no "
    "fim do turno.",
]


class Panel:
    def __init__(self, ox, oy):
        self.ox, self.oy = ox, oy

    def P(self, x, y):
        return self.ox + x * S, self.oy + y * S


svg = []


def add(s):
    svg.append(s)


def f(v):
    return f"{v:.2f}".rstrip("0").rstrip(".")


def text(x, y, s, size=2.2, weight="normal", anchor="middle", color=INK,
         halo=False, style="normal", rot=0):
    s = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    tr = f' transform="rotate({rot} {f(x)} {f(y)})"' if rot else ""
    base = (f'x="{f(x)}" y="{f(y)}" font-family="{FONT}" font-size="{size}" '
            f'font-weight="{weight}" font-style="{style}" text-anchor="{anchor}"{tr}')
    if halo:
        add(f'<text {base} fill="none" stroke="#ffffff" stroke-width="{size*0.4:.2f}" '
            f'stroke-linejoin="round">{s}</text>')
    add(f'<text {base} fill="{color}">{s}</text>')


def rect(pn, x0, y0, x1, y1, **attrs):
    (a, b), (c, d) = pn.P(x0, y0), pn.P(x1, y1)
    extra = " ".join(f'{k.replace("_", "-")}="{v}"' for k, v in attrs.items())
    add(f'<rect x="{f(min(a, c))}" y="{f(min(b, d))}" width="{f(abs(c - a))}" '
        f'height="{f(abs(d - b))}" {extra}/>')


def line(pn, x1, y1, x2, y2, color=INK, w=0.25, dash=None):
    (a, b), (c, d) = pn.P(x1, y1), pn.P(x2, y2)
    da = f' stroke-dasharray="{dash}"' if dash else ""
    add(f'<line x1="{f(a)}" y1="{f(b)}" x2="{f(c)}" y2="{f(d)}" stroke="{color}" '
        f'stroke-width="{w}"{da}/>')


def door(pn, hinge, closed_dir, open_dir, width, color=INK):
    hx, hy = pn.P(*hinge)
    w = width * S
    cx, cy = hx + closed_dir[0] * w, hy + closed_dir[1] * w
    ox_, oy_ = hx + open_dir[0] * w, hy + open_dir[1] * w
    add(f'<line x1="{f(hx)}" y1="{f(hy)}" x2="{f(ox_)}" y2="{f(oy_)}" '
        f'stroke="{color}" stroke-width="0.35"/>')
    cross = closed_dir[0] * open_dir[1] - closed_dir[1] * open_dir[0]
    sweep = 1 if cross > 0 else 0
    add(f'<path d="M{f(cx)},{f(cy)} A{f(w)},{f(w)} 0 0 {sweep} {f(ox_)},{f(oy_)}" '
        f'fill="none" stroke="{color}" stroke-width="0.18"/>')


def seg_intersection(a, b, c, d):
    (ax, ay), (bx, by) = a, b
    (cx, cy), (dx, dy) = c, d
    if ay == by and cx == dx:
        h, v = (a, b), (c, d)
    elif ax == bx and cy == dy:
        h, v = (c, d), (a, b)
    else:
        return None
    (hx1, hy), (hx2, _) = h
    (vx, vy1), (_, vy2) = v
    if min(hx1, hx2) < vx < max(hx1, hx2) and min(vy1, vy2) < hy < max(vy1, vy2):
        return (vx, hy)
    return None


def crossings(flows):
    """Cruzamentos sujo × limpo (matéria-prima ou lixo cruzando alimento)."""
    pts = []
    for i, (k1, p1) in enumerate(flows):
        for k2, p2 in flows[i + 1:]:
            if not ((k1 in SUJO and k2 in LIMPO) or (k2 in SUJO and k1 in LIMPO)):
                continue
            for a, b in zip(p1, p1[1:]):
                for c, d in zip(p2, p2[1:]):
                    hit = seg_intersection(a, b, c, d)
                    if hit:
                        pts.append(hit)
    return pts


def inside(pt, poly):
    x, y = pt
    ok = False
    for (x1, y1), (x2, y2) in zip(poly, poly[1:] + poly[:1]):
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            ok = not ok
    return ok


def comprimento(pts):
    """(comprimento total, trecho fora da edificação) em metros."""
    total = fora = 0.0
    for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
        L = math.hypot(x2 - x1, y2 - y1)
        total += L
        n = max(1, int(L / 0.05))
        for i in range(n):
            t = (i + 0.5) / n
            if not inside((x1 + (x2 - x1) * t, y1 + (y2 - y1) * t), pb.OUTLINE):
                fora += L / n
    return total, fora


def draw_flows(pn, flows):
    for k, pts in flows:
        color, dash, w, _ = FLUXOS[k]
        d = "M" + " L".join(f"{f(x)},{f(y)}" for x, y in (pn.P(*p) for p in pts))
        da = f' stroke-dasharray="{dash}"' if dash != "none" else ""
        add(f'<path d="{d}" fill="none" stroke="#ffffff" stroke-width="{w + 0.8}" '
            f'stroke-linejoin="round" stroke-opacity="0.85"/>')
        add(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{w}" '
            f'stroke-linejoin="round"{da}/>')
        for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
            L = abs(x2 - x1) + abs(y2 - y1)
            last = (x2, y2) == pts[-1]
            if L < 0.9 and not last:
                continue
            t = 1.0 if last else 0.55
            mx, my = x1 + (x2 - x1) * t, y1 + (y2 - y1) * t
            ux, uy = (x2 - x1) / L, (y2 - y1) / L
            ax, ay = pn.P(mx, my)
            sz = 1.3
            p2 = (ax - ux * sz * 1.6 + uy * sz * 0.8, ay - uy * sz * 1.6 - ux * sz * 0.8)
            p3 = (ax - ux * sz * 1.6 - uy * sz * 0.8, ay - uy * sz * 1.6 + ux * sz * 0.8)
            add(f'<path d="M{f(ax)},{f(ay)} L{f(p2[0])},{f(p2[1])} '
                f'L{f(p3[0])},{f(p3[1])} Z" fill="{color}"/>')
    for x, y in crossings(flows):
        px, py = pn.P(x, y)
        add(f'<circle cx="{f(px)}" cy="{f(py)}" r="1.3" fill="none" '
            f'stroke="{VERMELHO}" stroke-width="0.5"/>')


def draw_base(pn, usos):
    for code, _, poly, _, _ in pb.ROOMS:
        pts = [pn.P(x, y) for x, y in poly]
        d = "M" + " L".join(f"{f(x)},{f(y)}" for x, y in pts) + " Z"
        add(f'<path d="{d}" fill="{ZONAS[usos[code][0]][0]}" stroke="none"/>')
    for x0, y0, x1, y1 in pb.WALLS:
        rect(pn, x0, y0, x1, y1, fill="#333333")
    # janela cozinha/montagem
    rect(pn, pb.X_A01_R, pb.JANELA_01_02[0], pb.X_A02_L, pb.JANELA_01_02[1],
         fill="#ffffff", stroke=INK, stroke_width="0.15")
    xm = (pb.X_A01_R + pb.X_A02_L) / 2
    line(pn, xm, pb.JANELA_01_02[0], xm, pb.JANELA_01_02[1], INK, 0.15)
    # portão para a rua principal
    y0, y1 = pb.PORTAO_A01
    line(pn, -pb.T_EXT / 2, y0, -pb.T_EXT / 2, y1, INK, 0.3, "1.2 0.7")
    a, b = pn.P(-0.45, 3.30)
    text(a, b, "RUA PRINCIPAL", 1.9, "bold", rot=-90, color="#555555")
    a, b = pn.P(-0.45, (y0 + y1) / 2)
    text(a, b, "portão", 1.6, rot=-90, color="#555555", halo=True)
    # portas existentes
    door(pn, (pb.X_WC_R, pb.D1[0]), (0, 1), (-1, 0), pb.DOOR_WC)
    door(pn, (pb.X_A03_L, pb.D2[1]), (0, -1), (1, 0), pb.DOOR_STD)
    door(pn, (pb.D4[1], pb.Y_WC_T), (-1, 0), (0, -1), pb.DOOR_STD)
    door(pn, (pb.D3[1], pb.Y_EXT_B), (-1, 0), (0, 1), pb.DOOR_STD)
    # linha "C" do croqui
    line(pn, pb.X_A06_R, pb.Y_A05_T, pb.X_A06_R, pb.Y_A05_B, pb.AMBER, 0.25, "1.2 0.8")


def draw_antes(pn):
    draw_base(pn, ANTES)
    draw_flows(pn, ANTES_FLUXOS)
    a, b = pn.P(-0.90, 14.45)
    text(a + 1.5, b + 3.2, "volta pela rua (esquemático)", 1.6, anchor="start",
         color=VERMELHO, style="italic")
    labels(pn, ANTES)
    badges(pn, ANTES_NOTAS, VERMELHO)


def draw_depois(pn):
    draw_base(pn, DEPOIS)
    # aberturas novas (a demolir) + folhas
    rect(pn, pb.X_ALA_FE, PORTA_NICHO_04[0], pb.X_ALA, PORTA_NICHO_04[1], fill=DEMOLIR)
    door(pn, (pb.X_ALA_FE, PORTA_NICHO_04[1]), (0, -1), (-1, 0), 0.80, VERDE)
    rect(pn, pb.X_A02_R, PORTA_02_03[0], pb.X_A03_L, PORTA_02_03[1], fill=DEMOLIR)
    door(pn, (pb.X_A02_R, PORTA_02_03[1]), (0, -1), (-1, 0), 0.80, VERDE)
    for x0, y0, x1, y1, lab in EQUIP:
        rect(pn, x0, y0, x1, y1, fill="#ffffff", fill_opacity="0.85",
             stroke="#4a4a4a", stroke_width="0.2")
        (a, b), (c, d) = pn.P(x0, y0), pn.P(x1, y1)
        rot = -90 if (d - b) > (c - a) * 1.4 else 0
        size = 1.3 if len(lab) > 9 else 1.5
        ty = (b + d) / 2 + (0 if rot else 0.5)
        if lab.startswith("câmara"):
            ty = d - 2.2
        text((a + c) / 2 + (0.5 if rot else 0), ty, lab, size, color="#3a3a3a", rot=rot)
    rect(pn, *COIFA, fill="none", stroke="#4a4a4a", stroke_width="0.2",
         stroke_dasharray="0.8 0.6")
    rect(pn, *CONDENSADORA, fill="#ffffff", stroke="#4a4a4a", stroke_width="0.2")
    a, b = pn.P((CONDENSADORA[0] + CONDENSADORA[2]) / 2, (CONDENSADORA[1] + CONDENSADORA[3]) / 2)
    text(a + 0.5, b, "cond.", 1.3, rot=-90, color="#3a3a3a")
    for x1, y1, x2, y2 in LIVRES:
        line(pn, x1, y1, x2, y2, LIVRE, 0.18)
        (a, b), (c, d) = pn.P(x1, y1), pn.P(x2, y2)
        for px, py in ((a, b), (c, d)):
            add(f'<line x1="{f(px - 0.55)}" y1="{f(py + 0.55)}" x2="{f(px + 0.55)}" '
                f'y2="{f(py - 0.55)}" stroke="{LIVRE}" stroke-width="0.3"/>')
        val = pb.br(math.hypot(x2 - x1, y2 - y1)) + " livre"
        if abs(d - b) < 1e-6:
            text((a + c) / 2, b - 0.7, val, 1.4, color=LIVRE, halo=True)
        else:
            text(a - 0.7, (b + d) / 2, val, 1.4, color=LIVRE, halo=True, rot=-90)
    draw_flows(pn, DEPOIS_FLUXOS)
    labels(pn, DEPOIS)
    badges(pn, DEPOIS_NOTAS, VERDE)


def labels(pn, usos):
    for code, (_, linhas, sub, pos) in usos.items():
        if not pos:
            continue
        px, py = pn.P(*pos)
        size = 1.6 if code == "01a" else (1.8 if code == "04" else 2.1)
        for i, ln in enumerate(linhas):
            text(px, py + i * 2.6, ln, size, "bold", halo=True)
        if sub:
            text(px, py + len(linhas) * 2.6 - 0.3, sub, 1.5, color="#444444",
                 halo=True, style="italic")


def badges(pn, notas, color):
    for k, (x, y), _ in notas:
        px, py = pn.P(x, y)
        add(f'<circle cx="{f(px)}" cy="{f(py)}" r="2.1" fill="{color}" '
            f'stroke="#ffffff" stroke-width="0.4"/>')
        text(px, py + 0.8, k, 2.1, "bold", color="#ffffff")


def notes_block(x, y, notas, color, w):
    yy = y
    for k, _, t in notas:
        add(f'<circle cx="{f(x + 2.1)}" cy="{f(yy - 0.75)}" r="1.9" fill="{color}"/>')
        text(x + 2.1, yy - 0.05, k, 1.9, "bold", color="#ffffff")
        for ln in pb.wrap(t, w):
            text(x + 5.5, yy, ln, 1.8, anchor="start")
            yy += 2.55
        yy += 1.5
    return yy


def build():
    add(f'<svg xmlns="http://www.w3.org/2000/svg" width="{f(PAGE_W)}mm" '
        f'height="{f(PAGE_H)}mm" viewBox="0 0 {f(PAGE_W)} {f(PAGE_H)}">')
    add(f'<rect width="{f(PAGE_W)}" height="{f(PAGE_H)}" fill="#ffffff"/>')
    add(f'<rect x="8" y="6" width="404" height="285" fill="none" stroke="{INK}" '
        f'stroke-width="0.4"/>')
    text(14, 15.5, "ANTES × DEPOIS — FLUXOS, LAYOUT E INTERVENÇÕES (v2)", 4.4,
         "bold", anchor="start")
    text(14, 21.5, "Safran Congelados · imóvel do Barro Duro · sobre a planta R02 · "
         "escala 1:75 · equipamentos com medidas típicas (conferir com as "
         "propostas) · nicho fechado; cozinha com portão para a rua principal",
         2.1, anchor="start", color="#555555")

    antes = Panel(12 + 0.95 * S, 36)
    depois = Panel(166 + 0.75 * S, 36)
    for pn, title, color in [(antes, "ANTES (hoje)", VERMELHO),
                             (depois, "DEPOIS (proposta)", VERDE)]:
        tx, ty = pn.P(-0.15, -0.15)
        text(tx, ty - 3.5, title, 3.3, "bold", anchor="start", color=color)

    draw_antes(antes)
    draw_depois(depois)

    x, y = antes.P(-0.15, 6.55)
    text(x, y, "PROBLEMAS", 2.5, "bold", anchor="start", color=VERMELHO)
    notes_block(x, y + 5, ANTES_NOTAS, VERMELHO, 21)

    x, y = depois.P(7.62, 4.45)
    text(x, y, "INTERVENÇÕES", 2.5, "bold", anchor="start", color=VERDE)
    yy = notes_block(x, y + 5, DEPOIS_NOTAS, VERDE, 22)
    for ln in pb.wrap("Obra: 2 aberturas em parede interna de 12 cm, ponto de "
                      "água e esgoto no Amb. 04, 3 lavatórios e passa-prato. O "
                      "resto é mudança de uso e equipamento.", 27):
        text(x, yy + 1, ln, 1.75, anchor="start", color="#555555", style="italic")
        yy += 2.5

    x, y = depois.P(-0.15, 6.55)
    text(x, y, "COMO FICA O FLUXO", 2.5, "bold", anchor="start", color=VERDE)
    yy = y + 5
    for i, p in enumerate(COMO_FICA, 1):
        text(x, yy, f"{i}.", 1.8, "bold", anchor="start", color=VERDE)
        for ln in pb.wrap(p, 25):
            text(x + 3.2, yy, ln, 1.8, anchor="start")
            yy += 2.55
        yy += 1.1

    legend(327, 36)
    add("</svg>")
    return "\n".join(svg)


def fmt(pts):
    t, fora = comprimento(pts)
    return f"{pb.br(t, 0)}" + (f" ({pb.br(fora, 0)} na rua)" if fora > 0.5 else "")


def legend(x, y):
    text(x, y - 1, "LEGENDA", 2.9, "bold", anchor="start")
    yy = y + 4.5
    for cor, nome in ZONAS.values():
        add(f'<rect x="{f(x)}" y="{f(yy - 2.5)}" width="6" height="3.2" fill="{cor}" '
            f'stroke="#999999" stroke-width="0.15"/>')
        text(x + 8.5, yy, nome, 1.9, anchor="start")
        yy += 4.1
    yy += 1
    for color, dash, w, nome in FLUXOS.values():
        da = f' stroke-dasharray="{dash}"' if dash != "none" else ""
        add(f'<line x1="{f(x)}" y1="{f(yy - 0.9)}" x2="{f(x + 6)}" y2="{f(yy - 0.9)}" '
            f'stroke="{color}" stroke-width="{w}"{da}/>')
        text(x + 8.5, yy, nome, 1.9, anchor="start")
        yy += 4.1
    add(f'<circle cx="{f(x + 3)}" cy="{f(yy - 0.9)}" r="1.2" fill="none" '
        f'stroke="{VERMELHO}" stroke-width="0.5"/>')
    text(x + 8.5, yy, "Cruzamento sujo × limpo", 1.9, anchor="start")
    yy += 4.1
    add(f'<rect x="{f(x)}" y="{f(yy - 2.2)}" width="6" height="1.8" fill="{DEMOLIR}"/>')
    text(x + 8.5, yy, "Abrir vão (porta nova em verde)", 1.9, anchor="start")
    yy += 4.1
    add(f'<line x1="{f(x)}" y1="{f(yy - 0.9)}" x2="{f(x + 6)}" y2="{f(yy - 0.9)}" '
        f'stroke="{LIVRE}" stroke-width="0.3"/>')
    text(x + 8.5, yy, "Espaço livre entre equipamentos (m)", 1.9, anchor="start")

    yy += 8
    text(x, yy, "TRAJETOS (m)", 2.6, "bold", anchor="start")
    yy += 4.5
    text(x + 58, yy, "Antes", 1.8, "bold", anchor="end", color="#555555")
    text(x + 80, yy, "Depois", 1.8, "bold", anchor="end", color="#555555")
    yy += 3.8
    rows = [
        ("MP estocada → pré-preparo", fmt(ANTES_FLUXOS[1][1]), "< 1"),
        ("Cozinha → WC", fmt(COZINHA_WC_ANTES), fmt(COZINHA_WC_DEPOIS)),
        ("Porcionamento → frio", fmt(PORCION_FRIO_ANTES), fmt(PORCION_FRIO_DEPOIS)),
        ("Cruzamentos sujo × limpo", str(len(crossings(ANTES_FLUXOS))),
         str(len(crossings(DEPOIS_FLUXOS)))),
    ]
    for a, b, c in rows:
        text(x, yy, a, 1.8, anchor="start")
        text(x + 58, yy, b, 1.8, anchor="end")
        text(x + 80, yy, c, 1.8, "bold", anchor="end", color=VERDE)
        yy += 3.6
    yy += 1
    for ln in pb.wrap("Trechos na rua são esquemáticos (mínimo): a volta real "
                      "depende do quarteirão.", 50):
        text(x, yy, ln, 1.6, anchor="start", color="#555555", style="italic")
        yy += 2.4

    yy += 5
    text(x, yy, "ÁREA POR SETOR (m²)", 2.6, "bold", anchor="start")
    yy += 4.5
    for col, lab in ((44, "Ideal*"), (62, "Antes"), (80, "Depois")):
        text(x + col, yy, lab, 1.8, "bold", anchor="end", color="#555555")
    yy += 3.8
    A = pb.ROOM_AREAS
    br = pb.br
    rows = [
        ("Cozinha", "20–24", br(A["01"] + A["01a"]), br(A["01"] + A["01a"] + A["04"])),
        ("Montagem + selagem/UC", "9–10", br(A["02"]), "≈ 11"),
        ("Armazenagem", "11–12", br(A["03"]), "≈ 9 (3 salas)"),
        ("Recepção / expedição", "6–8", br(A["06"]), br(A["06"])),
        ("Equipe (sem WC)", "6–10", br(A["04"]), "≈ 11"),
        ("Uso misto", "—", br(A["05"]), "—"),
    ]
    for a, i, b, c in rows:
        text(x, yy, a, 1.8, anchor="start")
        text(x + 44, yy, i, 1.8, anchor="end", color="#555555")
        text(x + 62, yy, b, 1.8, anchor="end")
        text(x + 80, yy, c, 1.8, "bold", anchor="end", color=VERDE)
        yy += 3.6
    yy += 1
    for ln in pb.wrap("* Estimativa para ~150 refeições/dia (capacidade já "
                      "demonstrada), com equipamentos ocupando ≈ 40% da área "
                      "de produção e ≈ 60% da de armazenagem.", 50):
        text(x, yy, ln, 1.6, anchor="start", color="#555555", style="italic")
        yy += 2.4

    yy += 5
    text(x, yy, "ESCALA 1:75", 2.0, "bold", anchor="start")
    yy += 2.5
    for i in range(5):
        fill = INK if i % 2 == 0 else "#ffffff"
        add(f'<rect x="{f(x + i * S)}" y="{f(yy)}" width="{f(S)}" height="1.4" '
            f'fill="{fill}" stroke="{INK}" stroke-width="0.2"/>')
        text(x + i * S, yy + 4, str(i), 1.7)
    text(x + 5 * S, yy + 4, "5 m", 1.7)


def main():
    s = build()
    (OUT / "fluxos.svg").write_text(s, encoding="utf-8")
    import cairosvg
    cairosvg.svg2png(bytestring=s.encode(), write_to=str(OUT / "fluxos.png"),
                     output_width=3508)
    cairosvg.svg2pdf(bytestring=s.encode(), write_to=str(OUT / "fluxos.pdf"))
    print("cruzamentos sujo × limpo — antes:", len(crossings(ANTES_FLUXOS)),
          "depois:", len(crossings(DEPOIS_FLUXOS)))
    for nome, pts in [("MP estoque→cozinha antes", ANTES_FLUXOS[1][1]),
                      ("cozinha→WC antes", COZINHA_WC_ANTES),
                      ("cozinha→WC depois", COZINHA_WC_DEPOIS),
                      ("porcion→frio antes", PORCION_FRIO_ANTES),
                      ("porcion→frio depois", PORCION_FRIO_DEPOIS)]:
        t, fora = comprimento(pts)
        print(f"  {nome}: {t:.1f} m ({fora:.1f} m fora)")


if __name__ == "__main__":
    main()
