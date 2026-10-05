#!/usr/bin/env python3
"""Antes × depois: fluxos, layout e intervenções sobre a planta R01.

Usa a geometria de planta_baixa.py e gera fluxos.svg / fluxos.png (A3
paisagem, 1:75). Premissa: a cozinha (Amb. 01) não tem porta para dentro do
prédio (só janela para a montagem), então o acesso a ela é pelo lado de fora,
presumido pelo nicho.

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
CONSTRUIR = "#d62828"
DEMOLIR = "#f2c300"
LIVRE = "#6c3483"

ZONAS = {
    "coccao": ("#fde3bf", "Cozinha (pré-preparo e cocção)"),
    "limpa": ("#cfeccb", "Montagem (área limpa)"),
    "transicao": ("#d8ecf8", "Antecâmara / barreira"),
    "armazem": ("#d6def3", "Armazenagem"),
    "pessoal": ("#e8dcf2", "Equipe (vestiário, copa, descanso)"),
    "recepcao": ("#f1ead2", "Recepção / expedição"),
    "misto": ("#f6d4d4", "Uso misto (problema)"),
    "neutro": ("#ececec", "WC / circulação"),
}
FLUXOS = {
    "mp": ("#c0392b", "none", 0.7, "Matéria-prima"),
    "prod": ("#1e8449", "none", 0.7, "Produto (cozido → embalado → expedido)"),
    "lixo": ("#555555", "2.2 1.4", 0.6, "Lixo"),
    "equipe": ("#7d3c98", "0.9 0.9", 0.55, "Equipe"),
}

# código: (zona, linhas do rótulo, subtítulo, posição do rótulo em m)
ANTES = {
    "01": ("coccao", ["COZINHA"], "acesso só por fora", (1.80, 2.35)),
    "01a": ("coccao", ["nicho"], "", (3.28, 4.95)),
    "02": ("limpa", ["MONTAGEM"], "", (6.05, 0.55)),
    "03": ("armazem", ["ESTOQUE"], "", (8.75, 1.20)),
    "WC": ("neutro", ["WC"], "", (4.55, 3.15)),
    "C": ("neutro", [], "", None),
    "04": ("pessoal", ["COPA"], "", (5.10, 4.95)),
    "05": ("misto", ["FUNCIONÁRIOS"], "freezer · descanso", (6.05, 8.55)),
    "06": ("recepcao", ["RECEPÇÃO"], "", (6.05, 10.90)),
}
DEPOIS = {
    "01": ("coccao", ["COZINHA"], "cru → cozido em sentido único", (1.95, 2.25)),
    "01a": ("transicao", ["antecâm."], "", (3.28, 5.42)),
    "02": ("limpa", ["MONTAGEM"], "", (6.15, 1.95)),
    "03": ("armazem", ["CÂMARA +", "EMBALAGENS"], "", (8.85, 2.35)),
    "WC": ("neutro", ["WC"], "", (4.25, 3.15)),
    "C": ("neutro", [], "", None),
    "04": ("pessoal", ["VESTIÁRIO"], "", (5.20, 5.05)),
    "05": ("pessoal", ["EQUIPE / COPA"], "", (6.05, 8.25)),
    "06": ("recepcao", ["RECEPÇÃO +", "EXPEDIÇÃO"], "", (5.85, 10.95)),
}

# Porta externa da cozinha, presumida no fundo do nicho
PORTA_COZINHA = (pb.X_NICHO + 0.06, pb.X_NICHO + 0.86)
# Intervenções (depois)
PORTA_NICHO_04 = (4.55, 5.35)                 # y, na parede nicho/Amb. 04
PORTA_WC_NOVA = (4.80, 5.50)                  # x, na parede inferior do WC
PORTA_WC_ATUAL = pb.D1                        # y, na parede direita do WC

# --- trajetos (m) ----------------------------------------------------------
ANTES_FLUXOS = [
    ("mp", [(6.10, 14.15), (6.10, 12.75), (4.60, 12.75), (4.60, 7.25),
            (6.70, 7.25), (6.70, 3.45), (8.40, 3.45)]),
    ("mp", [(8.40, 3.65), (6.92, 3.65), (6.92, 7.55), (4.95, 7.55),
            (4.95, 12.45), (6.35, 12.45), (6.35, 14.45), (3.25, 14.45),
            (3.25, 3.40), (2.00, 3.40)]),
    ("prod", [(1.20, 1.30), (7.12, 1.30), (7.12, 7.85), (5.25, 7.85),
              (5.25, 12.15), (6.60, 12.15), (6.60, 14.15)]),
    ("lixo", [(1.60, 4.05), (2.95, 4.05), (2.95, 6.30)]),
]
DEPOIS_FLUXOS = [
    ("mp", [(3.25, 6.70), (3.25, 3.55), (1.80, 3.55)]),
    ("prod", [(1.00, 3.00), (1.00, 1.30), (6.85, 1.30), (6.85, 3.30),
              (8.35, 3.30), (8.35, 1.80)]),
    ("prod", [(9.35, 1.80), (9.35, 3.55), (7.12, 3.55), (7.12, 7.85),
              (5.25, 7.85), (5.25, 12.15), (6.60, 12.15), (6.60, 14.15)]),
    ("lixo", [(2.95, 3.95), (2.95, 6.30)]),
    ("equipe", [(6.35, 14.15), (6.35, 12.45), (4.95, 12.45), (4.95, 7.25),
                (4.30, 7.25), (4.30, 4.95), (3.50, 4.95), (3.50, 3.85)]),
    ("equipe", [(5.30, 5.20), (4.55, 5.20), (4.55, 6.90), (6.62, 6.90),
                (6.62, 2.30)]),
]
# Trajetos só para medir (não desenhados)
COZINHA_WC_ANTES = [(2.00, 3.40), (3.40, 3.40), (3.40, 14.30), (6.20, 14.30),
                    (6.20, 12.30), (5.10, 12.30), (5.10, 7.40), (6.80, 7.40),
                    (6.80, 3.00), (6.40, 3.00)]
COZINHA_WC_DEPOIS = [(3.50, 3.85), (3.50, 4.95), (5.15, 4.95), (5.15, 3.90)]
MONTAGEM_FRIO_ANTES = [(5.90, 1.30), (7.12, 1.30), (7.12, 7.85), (5.60, 7.85),
                       (5.60, 8.60)]
MONTAGEM_FRIO_DEPOIS = [(5.90, 1.30), (6.85, 1.30), (6.85, 3.30), (8.35, 3.30),
                        (8.35, 1.80)]

ANTES_NOTAS = [
    ("1", (3.25, 10.40), "Cozinha sem porta para dentro: a MP do estoque e a "
                         "equipe (WC) dão a volta por fora do prédio."),
    ("2", (5.95, 3.40), "WC, montagem e estoque abrem no mesmo patamar de "
                        "≈1 m²; a MP cruza a porta da montagem."),
    ("3", (6.05, 9.55), "Produto congelado guardado na área de descanso."),
    ("4", (9.20, 2.90), "Estoque de MP colado na montagem e longe da cozinha."),
    ("5", (5.00, 0.45), "Montagem sem lavatório e sem lugar para "
                        "ultracongelador e seladora."),
]
DEPOIS_NOTAS = [
    ("1", (4.10, 4.22), "Abrir porta 0,80 entre o nicho e o Amb. 04 (parede "
                        "interna de 12 cm): cozinha ligada por dentro."),
    ("2", (5.20, 4.42), "WC: fechar a porta da circulação (0,60) e abrir porta "
                        "0,70 para o vestiário. O WC sai do patamar da montagem."),
    ("3", (4.48, 2.22), "Janela vira passa-prato (≈1,00 × 0,60, peitoril 0,90) "
                        "com bancada inox dos dois lados."),
    ("4", (3.00, 3.05), "Lavatórios na entrada da cozinha e da montagem, na "
                        "parede do WC (aproveita a hidráulica)."),
    ("5", (8.30, 0.40), "Câmara fria 2,00 × 1,60 no Amb. 03, condensadora na "
                        "parede externa; MP sai do Amb. 03 e vai para a cozinha."),
    ("6", (5.55, 10.55), "Balcão + meia-porta no vão de 1,79: recepção "
                         "separada da área interna."),
]

# Equipamentos (depois): (x0, y0, x1, y1, rótulo)
EQUIP = [
    # cozinha
    (0.05, 0.05, 1.25, 0.75, "bancada"),
    (1.30, 0.05, 2.50, 0.95, "fogão 6b 1,20×0,90"),
    (2.55, 0.05, 3.66, 0.75, "bancada"),
    (3.66, 0.05, 4.36, 2.45, "porcion."),
    (0.05, 1.40, 0.75, 3.20, "pré-preparo + cuba"),
    (0.05, 3.40, 0.80, 4.15, "MP fria"),
    (0.90, 3.70, 2.70, 4.15, "secos 1,80×0,45"),
    (3.39, 3.30, 3.74, 3.75, "lav."),
    (2.80, 3.75, 3.15, 4.10, "lixo"),
    # montagem
    (pb.X_A02_L, 0.05, pb.X_A02_L + 0.70, 2.45, "bancada 2,40"),
    (5.50, 0.05, 6.30, 0.70, "seladora"),
    (6.47, 0.05, 7.27, 0.90, "ultracong."),
    (5.95, 2.10, 6.40, 2.45, "lav."),
    # Amb. 03
    (8.00, 0.05, 10.00, 1.65, "câmara 2,00×1,60"),
    (7.49, 0.05, 7.94, 2.85, "embalagens"),
    (9.55, 1.95, 10.00, 3.80, "embalagens"),
    # vestiário
    (5.92, 4.00, 6.37, 5.40, "armários"),
    (4.90, 5.55, 5.85, 5.90, "banco"),
    # equipe / copa
    (5.85, 8.50, 6.65, 9.30, "mesa"),
    (5.70, 9.62, 6.75, 10.12, "copa"),
    (3.88, 7.60, 4.33, 9.90, "reserva"),
    # recepção / expedição
    (3.88, 10.60, 4.58, 12.40, "separação"),
    (6.10, 10.35, 6.78, 11.65, "freezer"),
    (3.88, 10.17, 4.85, 10.45, "balcão"),
]
COIFA = (1.20, 0.05, 2.60, 1.05)
CONDENSADORA = (pb.X_EXT_R + 0.05, 0.30, pb.X_EXT_R + 0.65, 1.10)
LIVRES = [  # cotas de espaço livre (depois)
    (0.75, 2.75, 3.39, 2.75, "livre"),
    (pb.X_A02_L + 0.70, 1.62, 6.47, 1.62, "livre"),
    (4.66, 4.75, 5.92, 4.75, "livre"),
    (8.15, 1.65, 8.15, 3.02, "livre"),
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
    """Cruzamentos entre fluxos de tipos diferentes."""
    pts = []
    for i, (k1, p1) in enumerate(flows):
        for k2, p2 in flows[i + 1:]:
            if k1 == k2:
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
    xm = pn.P((pb.X_A01_R + pb.X_A02_L) / 2, 0)[0]
    add(f'<line x1="{f(xm)}" y1="{f(pn.P(0, pb.JANELA_01_02[0])[1])}" x2="{f(xm)}" '
        f'y2="{f(pn.P(0, pb.JANELA_01_02[1])[1])}" stroke="{INK}" stroke-width="0.15"/>')
    # portas existentes
    door(pn, (pb.X_A03_L, pb.D2[1]), (0, -1), (1, 0), pb.DOOR_STD)
    door(pn, (pb.D4[1], pb.Y_WC_T), (-1, 0), (0, -1), pb.DOOR_STD)
    door(pn, (pb.D3[1], pb.Y_EXT_B), (-1, 0), (0, 1), pb.DOOR_STD)
    # porta externa da cozinha (presumida)
    rect(pn, PORTA_COZINHA[0], pb.Y_NICHO_B, PORTA_COZINHA[1], pb.Y_NICHO_B + pb.T_EXT,
         fill="#ffffff", stroke=pb.AMBER, stroke_width="0.3", stroke_dasharray="0.8 0.5")
    # linha "C" do croqui
    a, b = pn.P(pb.X_A06_R, pb.Y_A05_T)
    c, d = pn.P(pb.X_A06_R, pb.Y_A05_B)
    add(f'<line x1="{f(a)}" y1="{f(b)}" x2="{f(c)}" y2="{f(d)}" stroke="{pb.AMBER}" '
        f'stroke-width="0.25" stroke-dasharray="1.2 0.8"/>')


def draw_antes(pn):
    draw_base(pn, ANTES)
    door(pn, (pb.X_WC_R, pb.D1[0]), (0, 1), (-1, 0), pb.DOOR_WC)
    draw_flows(pn, ANTES_FLUXOS)
    labels(pn, ANTES)
    badges(pn, ANTES_NOTAS, VERMELHO)


def draw_depois(pn):
    draw_base(pn, DEPOIS)
    # porta do WC na circulação: fechar (a construir)
    rect(pn, pb.X_WC_R, PORTA_WC_ATUAL[0], pb.X_WC_R + pb.T_INT, PORTA_WC_ATUAL[1],
         fill=CONSTRUIR)
    # aberturas novas (a demolir) + folhas
    rect(pn, pb.X_ALA_FE, PORTA_NICHO_04[0], pb.X_ALA, PORTA_NICHO_04[1], fill=DEMOLIR)
    door(pn, (pb.X_ALA, PORTA_NICHO_04[1]), (0, -1), (1, 0), 0.80, VERDE)
    rect(pn, PORTA_WC_NOVA[0], pb.Y_WC_IN_B, PORTA_WC_NOVA[1], pb.Y_WC_B, fill=DEMOLIR)
    door(pn, (PORTA_WC_NOVA[0], pb.Y_WC_IN_B), (1, 0), (0, -1), 0.70, VERDE)
    # equipamentos
    for x0, y0, x1, y1, lab in EQUIP:
        rect(pn, x0, y0, x1, y1, fill="#ffffff", fill_opacity="0.85",
             stroke="#4a4a4a", stroke_width="0.2")
        (a, b), (c, d) = pn.P(x0, y0), pn.P(x1, y1)
        rot = -90 if (d - b) > (c - a) * 1.4 else 0
        size = 1.35 if len(lab) > 9 else 1.5
        text((a + c) / 2 + (0.5 if rot else 0), (b + d) / 2 + (0 if rot else 0.5),
             lab, size, color="#3a3a3a", rot=rot)
    rect(pn, *COIFA, fill="none", stroke="#4a4a4a", stroke_width="0.2",
         stroke_dasharray="0.8 0.6")
    rect(pn, *CONDENSADORA, fill="#ffffff", stroke="#4a4a4a", stroke_width="0.2")
    a, b = pn.P((CONDENSADORA[0] + CONDENSADORA[2]) / 2, (CONDENSADORA[1] + CONDENSADORA[3]) / 2)
    text(a + 0.5, b, "cond.", 1.3, rot=-90, color="#3a3a3a")
    # meia-porta no vão Amb. 05/06
    rect(pn, 4.86, pb.Y_A05_B, 5.65, pb.Y_A05_B + 0.05, fill=VERDE)
    for x1, y1, x2, y2, lab in LIVRES:
        (a, b), (c, d) = pn.P(x1, y1), pn.P(x2, y2)
        add(f'<line x1="{f(a)}" y1="{f(b)}" x2="{f(c)}" y2="{f(d)}" stroke="{LIVRE}" '
            f'stroke-width="0.18"/>')
        for px, py in ((a, b), (c, d)):
            add(f'<line x1="{f(px - 0.55)}" y1="{f(py + 0.55)}" x2="{f(px + 0.55)}" '
                f'y2="{f(py - 0.55)}" stroke="{LIVRE}" stroke-width="0.3"/>')
        val = pb.br(math.hypot(x2 - x1, y2 - y1))
        if abs(d - b) < 1e-6:
            text((a + c) / 2, b - 0.7, f"{val} {lab}", 1.45, color=LIVRE, halo=True)
        else:
            text(a - 0.7, (b + d) / 2, f"{val} {lab}", 1.45, color=LIVRE, halo=True,
                 rot=-90)
    draw_flows(pn, DEPOIS_FLUXOS)
    labels(pn, DEPOIS)
    badges(pn, DEPOIS_NOTAS, VERDE)


def labels(pn, usos):
    for code, (_, linhas, sub, pos) in usos.items():
        if not pos:
            continue
        px, py = pn.P(*pos)
        size = 1.6 if code == "01a" else 2.2
        for i, ln in enumerate(linhas):
            text(px, py + i * 2.7, ln, size, "bold", halo=True)
        if sub:
            text(px, py + len(linhas) * 2.7 - 0.3, sub, 1.55, color="#444444",
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
            text(x + 5.5, yy, ln, 1.85, anchor="start")
            yy += 2.65
        yy += 1.6
    return yy


def build():
    add(f'<svg xmlns="http://www.w3.org/2000/svg" width="{f(PAGE_W)}mm" '
        f'height="{f(PAGE_H)}mm" viewBox="0 0 {f(PAGE_W)} {f(PAGE_H)}">')
    add(f'<rect width="{f(PAGE_W)}" height="{f(PAGE_H)}" fill="#ffffff"/>')
    add(f'<rect x="8" y="6" width="404" height="285" fill="none" stroke="{INK}" '
        f'stroke-width="0.4"/>')
    text(14, 15.5, "ANTES × DEPOIS — FLUXOS, LAYOUT E INTERVENÇÕES", 4.4, "bold",
         anchor="start")
    text(14, 21.5, "Safran Congelados · imóvel do Barro Duro · sobre a planta R01 · "
         "escala 1:75 · equipamentos com medidas típicas (conferir com as "
         "propostas) · acesso externo da cozinha presumido pelo nicho",
         2.1, anchor="start", color="#555555")

    antes = Panel(14 + 0.15 * S, 36)
    depois = Panel(160 + 0.15 * S, 36)
    for pn, title, color in [(antes, "ANTES (hoje)", VERMELHO),
                             (depois, "DEPOIS (proposta)", VERDE)]:
        tx, ty = pn.P(-0.15, -0.15)
        text(tx, ty - 3.5, title, 3.3, "bold", anchor="start", color=color)

    draw_antes(antes)
    draw_depois(depois)

    x, y = antes.P(-0.15, 6.55)
    text(x, y, "PROBLEMAS", 2.5, "bold", anchor="start", color=VERMELHO)
    notes_block(x, y + 5, ANTES_NOTAS, VERMELHO, 21)
    x, y = depois.P(7.62, 4.55)
    text(x, y, "INTERVENÇÕES", 2.5, "bold", anchor="start", color=VERDE)
    yy = notes_block(x, y + 5, DEPOIS_NOTAS, VERDE, 24)
    for ln in pb.wrap("Sem demolir parede inteira: 2 aberturas em parede interna "
                      "de 12 cm, 1 vão fechado, marcenaria e equipamentos.", 28):
        text(x, yy + 1, ln, 1.8, anchor="start", color="#555555", style="italic")
        yy += 2.6
    x, y = depois.P(-0.15, 6.55)
    text(x, y, "COMO FICA O FLUXO", 2.5, "bold", anchor="start", color=VERDE)
    passos = [
        "MP entra pela porta da cozinha e vai direto para secos / MP fria.",
        "Pré-preparo (esq.) → cocção (fundo) → porcionamento (dir.).",
        "Passa-prato → montagem: porciona, sela, ultracongela.",
        "Produto selado → câmara (Amb. 03) → expedição (Amb. 06).",
        "Equipe entra pela recepção → vestiário/WC → lavatório → produção.",
        "Lixo da cozinha sai pela porta do nicho, no fim do turno.",
    ]
    yy = y + 5
    for i, p in enumerate(passos, 1):
        text(x, yy, f"{i}.", 1.85, "bold", anchor="start", color=VERDE)
        for ln in pb.wrap(p, 23):
            text(x + 3.2, yy, ln, 1.85, anchor="start")
            yy += 2.65
        yy += 1.2

    legend(318, 36)
    add("</svg>")
    return "\n".join(svg)


def legend(x, y):
    text(x, y - 1, "LEGENDA", 2.9, "bold", anchor="start")
    yy = y + 4.5
    for cor, nome in ZONAS.values():
        add(f'<rect x="{f(x)}" y="{f(yy - 2.5)}" width="6" height="3.2" fill="{cor}" '
            f'stroke="#999999" stroke-width="0.15"/>')
        text(x + 8.5, yy, nome, 1.95, anchor="start")
        yy += 4.3
    yy += 1
    for color, dash, w, nome in FLUXOS.values():
        da = f' stroke-dasharray="{dash}"' if dash != "none" else ""
        add(f'<line x1="{f(x)}" y1="{f(yy - 0.9)}" x2="{f(x + 6)}" y2="{f(yy - 0.9)}" '
            f'stroke="{color}" stroke-width="{w}"{da}/>')
        text(x + 8.5, yy, nome, 1.95, anchor="start")
        yy += 4.3
    add(f'<circle cx="{f(x + 3)}" cy="{f(yy - 0.9)}" r="1.2" fill="none" '
        f'stroke="{VERMELHO}" stroke-width="0.5"/>')
    text(x + 8.5, yy, "Cruzamento entre fluxos diferentes", 1.95, anchor="start")
    yy += 4.3
    items = [
        (DEMOLIR, "Abrir vão (a demolir)"),
        (CONSTRUIR, "Fechar vão (a construir)"),
    ]
    for cor, nome in items:
        add(f'<rect x="{f(x)}" y="{f(yy - 2.2)}" width="6" height="1.8" fill="{cor}"/>')
        text(x + 8.5, yy, nome, 1.95, anchor="start")
        yy += 4.3
    add(f'<rect x="{f(x)}" y="{f(yy - 2.4)}" width="6" height="2.4" fill="#ffffff" '
        f'stroke="{pb.AMBER}" stroke-width="0.3" stroke-dasharray="0.8 0.5"/>')
    text(x + 8.5, yy, "Porta / elemento a confirmar", 1.95, anchor="start")
    yy += 4.3
    add(f'<line x1="{f(x)}" y1="{f(yy - 0.9)}" x2="{f(x + 6)}" y2="{f(yy - 0.9)}" '
        f'stroke="{LIVRE}" stroke-width="0.3"/>')
    text(x + 8.5, yy, "Espaço livre entre equipamentos (m)", 1.95, anchor="start")

    # trajetos
    yy += 8
    text(x, yy, "TRAJETOS (m)", 2.6, "bold", anchor="start")
    yy += 4.5
    text(x + 52, yy, "Antes", 1.9, "bold", anchor="end", color="#555555")
    text(x + 84, yy, "Depois", 1.9, "bold", anchor="end", color="#555555")
    yy += 4
    def fmt(pts):
        t, fora = comprimento(pts)
        s = f"{pb.br(t, 0)}"
        return s + (f" ({pb.br(fora, 0)} fora)" if fora > 0.5 else "")
    rows = [
        ("MP estocada → pré-preparo", fmt(ANTES_FLUXOS[1][1]), "≈ 3"),
        ("Cozinha → WC", fmt(COZINHA_WC_ANTES), fmt(COZINHA_WC_DEPOIS)),
        ("Montagem → frio", fmt(MONTAGEM_FRIO_ANTES), fmt(MONTAGEM_FRIO_DEPOIS)),
        ("Cruzamentos no diagrama", str(len(crossings(ANTES_FLUXOS))),
         str(len(crossings(DEPOIS_FLUXOS)))),
    ]
    for a, b, c in rows:
        text(x, yy, a, 1.9, anchor="start")
        text(x + 52, yy, b, 1.9, anchor="end")
        text(x + 84, yy, c, 1.9, "bold", anchor="end", color=VERDE)
        yy += 3.8

    # áreas
    yy += 5
    text(x, yy, "ÁREA ÚTIL POR FUNÇÃO (m²)", 2.6, "bold", anchor="start")
    yy += 4.5
    text(x + 52, yy, "Antes", 1.9, "bold", anchor="end", color="#555555")
    text(x + 84, yy, "Depois", 1.9, "bold", anchor="end", color="#555555")
    yy += 4
    A = pb.ROOM_AREAS
    br = pb.br
    rows = [
        ("Cozinha + nicho", br(A["01"] + A["01a"]), br(A["01"] + A["01a"])),
        ("Montagem", br(A["02"]), br(A["02"])),
        ("Estoque / câmara + embal.", br(A["03"]), br(A["03"])),
        ("Equipe + circulação central", br(A["04"]), br(A["04"] + A["05"])),
        ("Uso misto (Amb. 05)", br(A["05"]), "—"),
        ("Recepção / expedição", br(A["06"]), br(A["06"])),
        ("WC + circulação", br(A["WC"] + A["C"]), br(A["WC"] + A["C"])),
    ]
    for a, b, c in rows:
        text(x, yy, a, 1.9, anchor="start")
        text(x + 52, yy, b, 1.9, anchor="end")
        text(x + 84, yy, c, 1.9, anchor="end")
        yy += 3.8
    yy += 2
    for ln in pb.wrap("A área não muda: o ganho vem de cada sala ter uma função só "
                      "e de os fluxos não se cruzarem.", 52):
        text(x, yy, ln, 1.8, anchor="start", color="#555555", style="italic")
        yy += 2.6

    # escala
    yy += 6
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
    print("cruzamentos antes:", len(crossings(ANTES_FLUXOS)))
    print("cruzamentos depois:", len(crossings(DEPOIS_FLUXOS)))
    for nome, pts in [("MP estoque→cozinha antes", ANTES_FLUXOS[1][1]),
                      ("cozinha→WC antes", COZINHA_WC_ANTES),
                      ("cozinha→WC depois", COZINHA_WC_DEPOIS),
                      ("montagem→frio antes", MONTAGEM_FRIO_ANTES),
                      ("montagem→frio depois", MONTAGEM_FRIO_DEPOIS)]:
        t, fora = comprimento(pts)
        print(f"  {nome}: {t:.1f} m ({fora:.1f} m fora)")


if __name__ == "__main__":
    main()
