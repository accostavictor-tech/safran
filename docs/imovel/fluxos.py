#!/usr/bin/env python3
"""Diagrama de fluxos (atual × proposta) sobre a planta do Barro Duro.

Usa a geometria de planta_baixa.py e gera fluxos.svg / fluxos.png (A3 paisagem).
Fluxos desenhados: matéria-prima (MP), produto e lixo. A porta entre Amb. 01 e
Amb. 02 não aparece no croqui e está desenhada como presumida.

    python3 docs/imovel/fluxos.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import planta_baixa as pb  # noqa: E402

OUT = Path(__file__).resolve().parent
S = 1000 / 75                     # 1:75 em mm de papel por metro
PAGE_W, PAGE_H = 420.0, 297.0
FONT = pb.FONT
INK = "#1f1f1f"

ZONAS = {
    "coccao": ("#fde3bf", "Produção — cocção / pré-preparo"),
    "limpa": ("#cfeccb", "Produção — área limpa (montagem)"),
    "transicao": ("#d8ecf8", "Transição / higiene (barreira)"),
    "armazem": ("#d6def3", "Armazenagem"),
    "pessoal": ("#e8dcf2", "Apoio à equipe"),
    "recepcao": ("#f1ead2", "Recepção / expedição"),
    "misto": ("#f6d4d4", "Uso misto (problema)"),
    "neutro": ("#ececec", "WC / circulação"),
}
FLUXOS = {
    "mp": ("#c0392b", "none", "Matéria-prima (entra)"),
    "prod": ("#1e8449", "none", "Produto (cozido → embalado → expedido)"),
    "lixo": ("#555555", "2.2 1.4", "Lixo / resíduos (sai)"),
}

# código: (zona, linhas do rótulo, subtítulo, posição do rótulo em m)
ATUAL = {
    "01": ("coccao", ["COZINHA"], "cocção", (1.75, 3.00)),
    "01a": ("coccao", ["nicho"], "", (3.28, 4.95)),
    "02": ("limpa", ["MONTAGEM"], "e passagem de tudo", (5.85, 0.50)),
    "03": ("armazem", ["ESTOQUE"], "", (8.75, 2.75)),
    "WC": ("neutro", ["WC"], "", (4.55, 3.15)),
    "C": ("neutro", [], "", None),
    "04": ("pessoal", ["COPA"], "", (5.00, 5.00)),
    "05": ("misto", ["FUNCIONÁRIOS"], "freezer · descanso", (6.00, 8.55)),
    "06": ("recepcao", ["RECEPÇÃO"], "", (6.05, 10.90)),
}
PROPOSTA = {
    "01": ("coccao", ["COCÇÃO +", "PRÉ-PREPARO"], "cru × cozido separados", (1.75, 2.85)),
    "01a": ("coccao", ["lavagem"], "", (3.28, 4.95)),
    "02": ("transicao", ["TRANSIÇÃO"], "lavatório · nada parado", (5.90, 0.50)),
    "03": ("limpa", ["MONTAGEM"], "sem passagem", (8.35, 0.50)),
    "WC": ("neutro", ["WC"], "", (4.55, 3.15)),
    "C": ("neutro", [], "", None),
    "04": ("pessoal", ["VESTIÁRIO + COPA"], "", (5.00, 5.00)),
    "05": ("armazem", ["ARMAZENAGEM"], "", (5.95, 8.02)),
    "06": ("recepcao", ["RECEBIMENTO", "+ EXPEDIÇÃO"], "por horário", (6.10, 10.80)),
}

# Porta presumida Amb. 01/02 (não desenhada no croqui)
PORTA_01_02 = (1.30, 2.10)

# Trajetos (m, coordenadas da planta). As faixas são deslocadas para não se
# sobreporem; onde dois fluxos distintos se cruzam o desenho marca um ponto.
ATUAL_FLUXOS = [
    ("mp", [(6.10, 14.15), (6.10, 12.75), (4.60, 12.75), (4.60, 7.25),
            (6.70, 7.25), (6.70, 1.15), (8.70, 1.15)]),
    ("mp", [(8.70, 1.45), (2.30, 1.45)]),
    ("prod", [(2.30, 1.75), (6.92, 1.75), (6.92, 7.55), (4.95, 7.55),
              (4.95, 12.45), (6.35, 12.45), (6.35, 14.15)]),
    ("lixo", [(2.30, 2.00), (7.12, 2.00), (7.12, 7.85), (5.25, 7.85),
              (5.25, 12.15), (6.60, 12.15), (6.60, 14.15)]),
]
PROPOSTA_FLUXOS = [
    ("mp", [(6.10, 14.15), (6.10, 12.75), (4.60, 12.75), (4.60, 8.70)]),
    ("mp", [(4.60, 7.25), (6.65, 7.25), (6.65, 1.85), (2.30, 1.85)]),
    ("prod", [(2.30, 1.40), (8.80, 1.40)]),
    ("prod", [(8.80, 2.05), (7.10, 2.05), (7.10, 8.05)]),
    ("prod", [(5.65, 9.40), (5.25, 9.40), (5.25, 12.15), (6.60, 12.15),
              (6.60, 14.15)]),
    ("lixo", [(2.30, 1.65), (6.88, 1.65), (6.88, 7.55), (4.95, 7.55),
              (4.95, 12.45), (6.35, 12.45), (6.35, 14.15)]),
]

ATUAL_NOTAS = [
    ("1", (4.90, 0.45), "Montagem é corredor: MP, lixo, produto e equipe "
                        "atravessam a área onde o alimento pronto fica exposto."),
    ("2", (5.95, 3.45), "WC abre na passagem que dá direto na montagem, "
                        "sem porta nem lavatório no caminho."),
    ("3", (6.00, 9.55), "Produto congelado guardado na área de descanso, "
                        "junto de pertences e refeições da equipe."),
    ("4", (6.05, 11.75), "MP e lixo entram e saem pela recepção, onde o "
                         "pedido é entregue."),
    ("5", (1.30, 3.45), "Cozinha sem pré-preparo nem lavagem definidos; "
                        "MP vai do estoque à cozinha cruzando a montagem."),
]
PROPOSTA_NOTAS = [
    ("A", (6.10, 2.27), "Porta + lavatório entre Amb. 02 e circulação: "
                        "WC e área de apoio ficam fora da produção."),
    ("B", (8.75, 3.25), "Montagem vira sala sem passagem (+49% de área), "
                        "com ultracongelador e seladora ao lado."),
    ("C", (8.25, 4.45), "Porta externa do Amb. 03 fica trancada (só "
                        "emergência) ou é vedada."),
    ("D", (6.50, 9.40), "Câmara fria e freezers juntos, perto da expedição; "
                        "condensadora na parede externa."),
    ("E", (6.45, 11.75), "Recebimento de manhã, expedição à tarde, lixo "
                         "no fim do turno (separação por horário)."),
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


def seg_intersection(a, b, c, d):
    """Interseção de dois segmentos ortogonais (um H e um V), se houver."""
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
    pts = []
    for i, (k1, p1) in enumerate(flows):
        for k2, p2 in flows[i + 1:]:
            for a, b in zip(p1, p1[1:]):
                for c, d in zip(p2, p2[1:]):
                    hit = seg_intersection(a, b, c, d)
                    if hit:
                        pts.append(hit)
    return pts


def draw_plan(pn, usos, flows, notas, proposta):
    for code, _, poly, _, _ in pb.ROOMS:
        zona = usos[code][0]
        pts = [pn.P(x, y) for x, y in poly]
        d = "M" + " L".join(f"{f(x)},{f(y)}" for x, y in pts) + " Z"
        add(f'<path d="{d}" fill="{ZONAS[zona][0]}" stroke="none"/>')

    for x0, y0, x1, y1 in pb.WALLS:
        (a, b), (c, d) = pn.P(x0, y0), pn.P(x1, y1)
        add(f'<rect x="{f(min(a, c))}" y="{f(min(b, d))}" width="{f(abs(c - a))}" '
            f'height="{f(abs(d - b))}" fill="#333333"/>')

    # porta presumida Amb. 01/02
    (a, b), (c, d) = pn.P(pb.X_A01_R, PORTA_01_02[0]), pn.P(pb.X_A02_L, PORTA_01_02[1])
    add(f'<rect x="{f(a)}" y="{f(b)}" width="{f(c - a)}" height="{f(d - b)}" '
        f'fill="#ffffff" stroke="{pb.AMBER}" stroke-width="0.3" stroke-dasharray="0.8 0.5"/>')

    if proposta:
        # barreira: porta nova entre Amb. 02 e circulação
        x0, x1 = pb.X_WC_R + pb.T_INT, pb.X_A02_R
        y0 = pb.Y_WC_T
        for xa, xb in [(x0, x0 + 0.06), (x1 - 0.06, x1)]:
            (a, b), (c, d) = pn.P(xa, y0), pn.P(xb, y0 + pb.T_INT)
            add(f'<rect x="{f(a)}" y="{f(b)}" width="{f(c - a)}" height="{f(d - b)}" '
                f'fill="#1e8449"/>')
        hx, hy = pn.P(x0 + 0.06, y0 + pb.T_INT / 2)
        w = (x1 - x0 - 0.12) * S
        add(f'<line x1="{f(hx)}" y1="{f(hy)}" x2="{f(hx)}" y2="{f(hy + w)}" '
            f'stroke="#1e8449" stroke-width="0.45"/>')
        add(f'<path d="M{f(hx + w)},{f(hy)} A{f(w)},{f(w)} 0 0 1 {f(hx)},{f(hy + w)}" '
            f'fill="none" stroke="#1e8449" stroke-width="0.25"/>')
        # porta externa do Amb. 03 trancada
        (a, b), (c, d) = pn.P(pb.D2[0], pb.Y_A03_B), pn.P(pb.D2[1], pb.Y_A03_B + pb.T_EXT)
        add(f'<rect x="{f(a)}" y="{f(b)}" width="{f(c - a)}" height="{f(d - b)}" '
            f'fill="#c0392b"/>')
        # equipamentos indicativos
        equip = [
            (pb.X_A03_R - 0.85, 0.05, pb.X_A03_R - 0.05, 0.90, "UC"),
            (pb.X_A03_R - 0.75, 1.10, pb.X_A03_R - 0.05, 3.00, "bancada"),
            (pb.X_A03_L + 0.05, 2.85, pb.X_A03_L + 0.75, 3.55, "selad."),
            (pb.X_A06_R + 0.52 - 1.60, pb.Y_A05_B - 2.00, pb.X_CIRC_R - 0.02,
             pb.Y_A05_B - 0.02, "câmara"),
            (4.85, pb.Y_A05_T + 0.02, 6.30, pb.Y_A05_T + 0.72, "freezers"),
            (pb.X_ALA + 0.02, 7.40, pb.X_ALA + 0.47, 9.90, "secos"),
        ]
        for x0, y0, x1, y1, lab in equip:
            (a, b), (c, d) = pn.P(x0, y0), pn.P(x1, y1)
            add(f'<rect x="{f(a)}" y="{f(b)}" width="{f(c - a)}" height="{f(d - b)}" '
                f'fill="#ffffff" fill-opacity="0.75" stroke="#4a4a4a" stroke-width="0.2"/>')
            rot = -90 if (d - b) > (c - a) * 1.6 else 0
            text((a + c) / 2 + (0.6 if rot else 0), (b + d) / 2 + (0 if rot else 0.6),
                 lab, 1.6, color="#4a4a4a", rot=rot)
    else:
        # porta externa do Amb. 03 (destino desconhecido)
        pass

    for k, pts in flows:
        color, dash, _ = FLUXOS[k]
        d = "M" + " L".join(f"{f(x)},{f(y)}" for x, y in (pn.P(*p) for p in pts))
        da = f' stroke-dasharray="{dash}"' if dash != "none" else ""
        add(f'<path d="{d}" fill="none" stroke="#ffffff" stroke-width="1.5" '
            f'stroke-linejoin="round"/>')
        add(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="0.7" '
            f'stroke-linejoin="round"{da}/>')
        for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
            L = abs(x2 - x1) + abs(y2 - y1)
            if L < 0.9:
                continue
            t = 0.55 if (x2, y2) != pts[-1] else 1.0
            mx, my = x1 + (x2 - x1) * t, y1 + (y2 - y1) * t
            ux, uy = (x2 - x1) / L, (y2 - y1) / L
            ax, ay = pn.P(mx, my)
            sz = 1.5
            p1 = (ax, ay)
            p2 = (ax - ux * sz * 1.6 + uy * sz * 0.8, ay - uy * sz * 1.6 - ux * sz * 0.8)
            p3 = (ax - ux * sz * 1.6 - uy * sz * 0.8, ay - uy * sz * 1.6 + ux * sz * 0.8)
            add(f'<path d="M{f(p1[0])},{f(p1[1])} L{f(p2[0])},{f(p2[1])} '
                f'L{f(p3[0])},{f(p3[1])} Z" fill="{color}"/>')

    for x, y in crossings(flows):
        px, py = pn.P(x, y)
        add(f'<circle cx="{f(px)}" cy="{f(py)}" r="1.25" fill="none" '
            f'stroke="#c0392b" stroke-width="0.5"/>')

    for code, (_, linhas, sub, pos) in usos.items():
        if not pos:
            continue
        px, py = pn.P(*pos)
        size = 1.7 if code == "01a" else 2.3
        for i, ln in enumerate(linhas):
            text(px, py + i * 2.8, ln, size, "bold", halo=True)
        if sub:
            text(px, py + len(linhas) * 2.8 - 0.2, sub, 1.65, color="#444444",
                 halo=True, style="italic")

    for k, (x, y), _ in notas:
        px, py = pn.P(x, y)
        color = "#1e8449" if proposta else "#c0392b"
        add(f'<circle cx="{f(px)}" cy="{f(py)}" r="2.3" fill="{color}"/>')
        text(px, py + 0.85, k, 2.3, "bold", color="#ffffff")


def wrap(s, n):
    return pb.wrap(s, n)


def notes_block(x, y, notas, proposta, w=52):
    color = "#1e8449" if proposta else "#c0392b"
    yy = y
    for k, _, t in notas:
        add(f'<circle cx="{f(x + 2.3)}" cy="{f(yy - 0.8)}" r="2.0" fill="{color}"/>')
        text(x + 2.3, yy - 0.05, k, 2.0, "bold", color="#ffffff")
        for ln in wrap(t, w):
            text(x + 6, yy, ln, 2.0, anchor="start")
            yy += 2.85
        yy += 1.8


def build():
    add(f'<svg xmlns="http://www.w3.org/2000/svg" width="{f(PAGE_W)}mm" '
        f'height="{f(PAGE_H)}mm" viewBox="0 0 {f(PAGE_W)} {f(PAGE_H)}">')
    add(f'<rect width="{f(PAGE_W)}" height="{f(PAGE_H)}" fill="#ffffff"/>')
    add(f'<rect x="10" y="8" width="400" height="281" fill="none" stroke="{INK}" '
        f'stroke-width="0.4"/>')
    text(16, 18, "FLUXOS E SETORIZAÇÃO — SITUAÇÃO ATUAL × PROPOSTA", 4.6, "bold",
         anchor="start")
    text(16, 24, "Safran Congelados · imóvel do Barro Duro · diagrama sobre a planta "
         "R00 (escala 1:75) · porta Amb. 01/02 presumida", 2.4, anchor="start",
         color="#555555")

    left = Panel(18 + 0.15 * S, 44)
    right = Panel(168 + 0.15 * S, 44)
    for pn, title in [(left, "SITUAÇÃO ATUAL"), (right, "PROPOSTA — sem demolição")]:
        tx, ty = pn.P(-0.15, -0.15)
        text(tx, ty - 4, title, 3.3, "bold", anchor="start",
             color="#c0392b" if pn is left else "#1e8449")

    draw_plan(left, ATUAL, ATUAL_FLUXOS, ATUAL_NOTAS, False)
    draw_plan(right, PROPOSTA, PROPOSTA_FLUXOS, PROPOSTA_NOTAS, True)

    # notas no espaço livre abaixo do Amb. 01 de cada painel
    for pn, notas, prop in [(left, ATUAL_NOTAS, False), (right, PROPOSTA_NOTAS, True)]:
        x, y = pn.P(-0.15, 6.10)
        text(x, y, "CONFLITOS" if not prop else "O QUE MUDA", 2.6, "bold",
             anchor="start", color="#c0392b" if not prop else "#1e8449")
        notes_block(x, y + 5.5, notas, prop, w=26)

    legend(318, 44)
    add("</svg>")
    return "\n".join(svg)


def legend(x, y):
    text(x, y - 4, "LEGENDA", 3.0, "bold", anchor="start")
    yy = y + 2
    text(x, yy, "Zonas", 2.3, "bold", anchor="start", color="#555555")
    yy += 4.5
    for cor, nome in ZONAS.values():
        add(f'<rect x="{f(x)}" y="{f(yy - 2.6)}" width="7" height="3.4" fill="{cor}" '
            f'stroke="#999999" stroke-width="0.15"/>')
        text(x + 9.5, yy, nome, 2.1, anchor="start")
        yy += 5
    yy += 2
    text(x, yy, "Fluxos", 2.3, "bold", anchor="start", color="#555555")
    yy += 4.5
    for color, dash, nome in FLUXOS.values():
        da = f' stroke-dasharray="{dash}"' if dash != "none" else ""
        add(f'<line x1="{f(x)}" y1="{f(yy - 0.9)}" x2="{f(x + 7)}" y2="{f(yy - 0.9)}" '
            f'stroke="{color}" stroke-width="0.7"{da}/>')
        text(x + 9.5, yy, nome, 2.1, anchor="start")
        yy += 5
    add(f'<circle cx="{f(x + 3.5)}" cy="{f(yy - 0.9)}" r="1.25" fill="none" '
        f'stroke="#c0392b" stroke-width="0.5"/>')
    text(x + 9.5, yy, "Cruzamento entre fluxos diferentes", 2.1, anchor="start")
    yy += 5
    add(f'<rect x="{f(x)}" y="{f(yy - 2.6)}" width="7" height="3" fill="#ffffff" '
        f'stroke="{pb.AMBER}" stroke-width="0.3" stroke-dasharray="0.8 0.5"/>')
    text(x + 9.5, yy, "Porta presumida (não está no croqui)", 2.1, anchor="start")
    yy += 5
    add(f'<rect x="{f(x)}" y="{f(yy - 2.2)}" width="7" height="1.6" fill="#1e8449"/>')
    text(x + 9.5, yy, "Porta nova (proposta)", 2.1, anchor="start")
    yy += 5
    add(f'<rect x="{f(x)}" y="{f(yy - 2.2)}" width="7" height="1.6" fill="#c0392b"/>')
    text(x + 9.5, yy, "Porta trancada / vedada", 2.1, anchor="start")

    yy += 11
    text(x, yy, "ÁREA ÚTIL POR FUNÇÃO (m²)", 2.8, "bold", anchor="start")
    yy += 5
    rows = [
        ("", "Atual", "Proposta"),
        ("Produção (01+nicho+02+03*)", "25,24", "35,34"),
        ("  dos quais montagem", "6,78", "10,10"),
        ("Armazenagem", "10,10 + 05 misto", "14,08"),
        ("Apoio à equipe", "5,17 + 05 misto", "5,17"),
        ("Uso misto (Amb. 05)", "14,08", "—"),
        ("Recepção / expedição", "8,53", "8,53"),
        ("WC + circulação", "5,91", "5,91"),
    ]
    for i, (a, b, c) in enumerate(rows):
        w = "bold" if i == 0 else "normal"
        text(x, yy, a, 2.0, w, anchor="start")
        text(x + 66, yy, b, 2.0, w, anchor="end")
        text(x + 88, yy, c, 2.0, w, anchor="end")
        yy += 4.2
    yy += 1
    for ln in wrap("* Na proposta o Amb. 03 deixa de ser estoque e vira montagem; "
                   "o Amb. 02 vira transição.", 52):
        text(x, yy, ln, 1.8, anchor="start", color="#555555")
        yy += 2.7
    yy += 4
    text(x, yy, "EQUIPAMENTOS DO PEDIDO BNB", 2.8, "bold", anchor="start")
    yy += 5
    for ln in [
        "Ultracongelador (UC) e seladora a vácuo: Amb. 03,",
        "colados na bancada de montagem.",
        "Câmara frigorífica: Amb. 05, canto junto à parede",
        "externa; cabe até ≈ 2,0 × 1,6 m mantendo a passagem.",
        "Liquidificador: Amb. 01 (cocção).",
    ]:
        text(x, yy, ln, 2.0, anchor="start")
        yy += 3.0


def main():
    s = build()
    (OUT / "fluxos.svg").write_text(s, encoding="utf-8")
    import cairosvg
    cairosvg.svg2png(bytestring=s.encode(), write_to=str(OUT / "fluxos.png"),
                     output_width=3508)
    print("cruzamentos atual:", len(crossings(ATUAL_FLUXOS)))
    print("cruzamentos proposta:", len(crossings(PROPOSTA_FLUXOS)))


if __name__ == "__main__":
    main()
