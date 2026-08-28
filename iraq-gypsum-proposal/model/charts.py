#!/usr/bin/env python3
"""SVG chart primitives for the investment memorandum.
Palette per validated dataviz reference (light mode).
All charts are direct-labelled: print medium, no hover layer, and the
aqua slot sits below 3:1 contrast so the relief rule requires visible labels.
"""
S1, S2, S3 = "#2a78d6", "#eb6834", "#1baf7a"
S4, S7 = "#eda100", "#4a3aa7"
GOOD, WARN, SERIOUS, CRIT = "#0ca30c", "#fab219", "#ec835a", "#d03b3b"
INK, INK2, MUTED = "#0b0b0b", "#52514e", "#898781"
GRID, BASE, SURF = "#e1e0d9", "#c3c2b7", "#fcfcfb"
FONT = 'system-ui,-apple-system,"Segoe UI",sans-serif'


def _esc(t):
    return str(t).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def hbar(rows, width=680, rowh=26, pad_left=250, pad_right=95, fmt="{:.2f}",
         color=S1, title=None, unit="", maxval=None, colors=None, gap=6):
    """rows: [(label, value)] - horizontal bars, direct-labelled."""
    n = len(rows)
    top = 26 if title else 8
    h = top + n * rowh + 14
    plot_w = width - pad_left - pad_right
    mx = maxval or max(v for _, v in rows) or 1
    o = [f'<svg viewBox="0 0 {width} {h}" width="100%" role="img" '
         f'style="font-family:{FONT}">']
    if title:
        o.append(f'<text x="0" y="14" font-size="12.5" font-weight="600" fill="{INK}">{_esc(title)}</text>')
    for i, (lab, val) in enumerate(rows):
        y = top + i * rowh
        bw = max(1.5, plot_w * (val / mx))
        c = (colors[i] if colors else color)
        o.append(f'<text x="{pad_left-10}" y="{y+rowh/2+4}" font-size="11.5" '
                 f'text-anchor="end" fill="{INK2}">{_esc(lab)}</text>')
        o.append(f'<rect x="{pad_left}" y="{y+gap/2}" width="{bw:.2f}" height="{rowh-gap}" '
                 f'rx="4" fill="{c}"/>')
        o.append(f'<text x="{pad_left+bw+8}" y="{y+rowh/2+4}" font-size="11.5" '
                 f'fill="{INK}" style="font-variant-numeric:tabular-nums">'
                 f'{fmt.format(val)}{unit}</text>')
    o.append(f'<line x1="{pad_left}" y1="{top}" x2="{pad_left}" y2="{top+n*rowh}" '
             f'stroke="{BASE}" stroke-width="1"/>')
    o.append("</svg>")
    return "".join(o)


def grouped_bar(cats, series, width=680, height=250, pad_left=48, pad_bot=34,
                pad_top=34, fmt="{:.0f}", unit="", label_every=1):
    """series: [(name, color, [values])] - vertical grouped bars, one axis."""
    ns = len(series)
    plot_w = width - pad_left - 14
    plot_h = height - pad_top - pad_bot
    mx = max(max(v for v in s[2]) for s in series) or 1
    step = 10 ** (len(str(int(mx))) - 1)
    top = (int(mx / step) + 1) * step
    slot = plot_w / len(cats)
    bw = min(20, (slot - 10) / ns)
    o = [f'<svg viewBox="0 0 {width} {height}" width="100%" role="img" '
         f'style="font-family:{FONT}">']
    for g in range(5):
        v = top * g / 4
        y = pad_top + plot_h - plot_h * (v / top)
        o.append(f'<line x1="{pad_left}" y1="{y:.1f}" x2="{width-14}" y2="{y:.1f}" '
                 f'stroke="{GRID}" stroke-width="1"/>')
        o.append(f'<text x="{pad_left-7}" y="{y+3.5:.1f}" font-size="10" text-anchor="end" '
                 f'fill="{MUTED}" style="font-variant-numeric:tabular-nums">{v:,.0f}</text>')
    for i, c in enumerate(cats):
        cx = pad_left + slot * i + slot / 2
        if i % label_every == 0:
            o.append(f'<text x="{cx:.1f}" y="{height-pad_bot+15}" font-size="10" '
                     f'text-anchor="middle" fill="{MUTED}">{_esc(c)}</text>')
        for j, (nm, col, vals) in enumerate(series):
            v = vals[i]
            bh = plot_h * (v / top)
            x = cx - (ns * bw + (ns - 1) * 2) / 2 + j * (bw + 2)
            y = pad_top + plot_h - bh
            if bh > 0.4:
                o.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="{bw:.1f}" height="{bh:.1f}" '
                         f'rx="3" fill="{col}"/>')
    lx = pad_left
    for nm, col, _ in series:
        o.append(f'<rect x="{lx}" y="4" width="9" height="9" rx="2.5" fill="{col}"/>')
        o.append(f'<text x="{lx+13}" y="12.5" font-size="10.5" fill="{INK2}">{_esc(nm)}</text>')
        lx += 22 + len(nm) * 6.3
    o.append(f'<line x1="{pad_left}" y1="{pad_top+plot_h}" x2="{width-14}" '
             f'y2="{pad_top+plot_h}" stroke="{BASE}" stroke-width="1"/>')
    o.append("</svg>")
    return "".join(o)


def tornado(rows, base_label, width=680, rowh=27, pad_left=250, pad_right=70):
    """rows: [(label, value, base)] - deviation from base, diverging blue/red."""
    n = len(rows)
    h = 22 + n * rowh + 16
    plot_w = width - pad_left - pad_right
    base = rows[0][2]
    lo = min(min(v for _, v, _ in rows), base)
    hi = max(max(v for _, v, _ in rows), base)
    span = max(hi - lo, 1e-9)
    x0 = pad_left + plot_w * ((base - lo) / span)
    o = [f'<svg viewBox="0 0 {width} {h}" width="100%" role="img" style="font-family:{FONT}">']
    o.append(f'<text x="{x0:.1f}" y="12" font-size="10" text-anchor="middle" fill="{MUTED}">'
             f'base {base_label}</text>')
    for i, (lab, val, _) in enumerate(rows):
        y = 22 + i * rowh
        xv = pad_left + plot_w * ((val - lo) / span)
        left, w = min(x0, xv), abs(xv - x0)
        col = S1 if val >= base else CRIT
        o.append(f'<text x="{pad_left-10}" y="{y+rowh/2+4}" font-size="11.5" '
                 f'text-anchor="end" fill="{INK2}">{_esc(lab)}</text>')
        o.append(f'<rect x="{left:.1f}" y="{y+4}" width="{max(w,1.5):.1f}" height="{rowh-9}" '
                 f'rx="4" fill="{col}"/>')
        # Place the value label inside the bar when there is room; otherwise push it
        # to the OUTER side of the baseline so it can never collide with the
        # category label gutter on the left.
        if w > 46:
            tx = (xv - 7) if val >= base else (xv + 7)
            anc = "end" if val >= base else "start"
            fill = "#ffffff"; weight = "600"
        else:
            tx = (xv + 8) if val >= base else (x0 + 8)
            anc = "start"; fill = INK; weight = "400"
        o.append(f'<text x="{tx:.1f}" y="{y+rowh/2+4}" font-size="11.5" text-anchor="{anc}" '
                 f'fill="{fill}" font-weight="{weight}" '
                 f'style="font-variant-numeric:tabular-nums">{val:.1f}%</text>')
    o.append(f'<line x1="{x0:.1f}" y1="18" x2="{x0:.1f}" y2="{22+n*rowh}" '
             f'stroke="{INK2}" stroke-width="1.5" stroke-dasharray="3 2"/>')
    o.append("</svg>")
    return "".join(o)


def stacked_bar(segs, width=680, height=88, total_label="", fmt="${:.2f}M"):
    """segs: [(name, value, color)] - single horizontal stacked bar, 2px gaps."""
    tot = sum(v for _, v, _ in segs)
    plot_w = width - 4
    o = [f'<svg viewBox="0 0 {width} {height}" width="100%" role="img" style="font-family:{FONT}">']
    x = 2
    for i, (nm, v, col) in enumerate(segs):
        w = plot_w * (v / tot) - (2 if i < len(segs) - 1 else 0)
        o.append(f'<rect x="{x:.1f}" y="24" width="{max(w,2):.1f}" height="30" rx="4" fill="{col}"/>')
        cx = x + w / 2
        pct = v / tot * 100
        if w > 62:
            o.append(f'<text x="{cx:.1f}" y="43.5" font-size="11" text-anchor="middle" '
                     f'fill="#ffffff" font-weight="600" '
                     f'style="font-variant-numeric:tabular-nums">{fmt.format(v)}</text>')
        o.append(f'<text x="{cx:.1f}" y="70" font-size="10.5" text-anchor="middle" fill="{INK2}">'
                 f'{_esc(nm)}</text>')
        o.append(f'<text x="{cx:.1f}" y="83" font-size="10" text-anchor="middle" fill="{MUTED}" '
                 f'style="font-variant-numeric:tabular-nums">{pct:.0f}%</text>')
        x += w + 2
    if total_label:
        o.append(f'<text x="2" y="14" font-size="11.5" font-weight="600" fill="{INK}">'
                 f'{_esc(total_label)}</text>')
    o.append("</svg>")
    return "".join(o)


def line_chart(xs, series, width=680, height=230, pad_left=52, pad_bot=32, pad_top=30,
               unit="", fmt="{:,.0f}"):
    """series: [(name, color, [y])] - 2px lines, endpoint direct labels."""
    plot_w = width - pad_left - 62
    plot_h = height - pad_top - pad_bot
    mx = max(max(s[2]) for s in series)
    step = 10 ** (len(str(int(mx))) - 1)
    top = (int(mx / step) + 1) * step
    o = [f'<svg viewBox="0 0 {width} {height}" width="100%" role="img" style="font-family:{FONT}">']
    for g in range(5):
        v = top * g / 4
        y = pad_top + plot_h - plot_h * (v / top)
        o.append(f'<line x1="{pad_left}" y1="{y:.1f}" x2="{pad_left+plot_w}" y2="{y:.1f}" '
                 f'stroke="{GRID}" stroke-width="1"/>')
        o.append(f'<text x="{pad_left-7}" y="{y+3.5:.1f}" font-size="10" text-anchor="end" '
                 f'fill="{MUTED}" style="font-variant-numeric:tabular-nums">{v:,.0f}</text>')
    n = len(xs)
    for i, x in enumerate(xs):
        cx = pad_left + plot_w * (i / max(n - 1, 1))
        o.append(f'<text x="{cx:.1f}" y="{height-pad_bot+15}" font-size="10" '
                 f'text-anchor="middle" fill="{MUTED}">{_esc(x)}</text>')
    for nm, col, ys in series:
        pts = []
        for i, v in enumerate(ys):
            cx = pad_left + plot_w * (i / max(n - 1, 1))
            cy = pad_top + plot_h - plot_h * (v / top)
            pts.append(f"{cx:.1f},{cy:.1f}")
        o.append(f'<polyline points="{" ".join(pts)}" fill="none" stroke="{col}" '
                 f'stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>')
        lx, ly = pts[-1].split(",")
        o.append(f'<circle cx="{lx}" cy="{ly}" r="4" fill="{col}" stroke="{SURF}" stroke-width="2"/>')
        o.append(f'<text x="{float(lx)+9:.1f}" y="{float(ly)+4:.1f}" font-size="10.5" '
                 f'fill="{INK}" style="font-variant-numeric:tabular-nums">'
                 f'{fmt.format(ys[-1])}{unit}</text>')
    o.append(f'<line x1="{pad_left}" y1="{pad_top+plot_h}" x2="{pad_left+plot_w}" '
             f'y2="{pad_top+plot_h}" stroke="{BASE}" stroke-width="1"/>')
    o.append("</svg>")
    return "".join(o)


def waterfall(rows, width=680, height=250, pad_left=48, pad_bot=64, pad_top=18,
              fmt="{:.2f}"):
    """rows: [(label, delta, kind)] kind in {'add','total'} - cost build-up."""
    plot_w = width - pad_left - 14
    plot_h = height - pad_top - pad_bot
    cum, pts, mx = 0.0, [], 0.0
    for lab, d, kind in rows:
        if kind == "total":
            pts.append((lab, 0.0, d, "total")); mx = max(mx, d)
        else:
            pts.append((lab, cum, cum + d, "add")); cum += d; mx = max(mx, cum)
    top = mx * 1.15
    slot = plot_w / len(pts)
    bw = min(38, slot - 9)
    o = [f'<svg viewBox="0 0 {width} {height}" width="100%" role="img" style="font-family:{FONT}">']
    for g in range(5):
        v = top * g / 4
        y = pad_top + plot_h - plot_h * (v / top)
        o.append(f'<line x1="{pad_left}" y1="{y:.1f}" x2="{width-14}" y2="{y:.1f}" '
                 f'stroke="{GRID}" stroke-width="1"/>')
        o.append(f'<text x="{pad_left-7}" y="{y+3.5:.1f}" font-size="10" text-anchor="end" '
                 f'fill="{MUTED}" style="font-variant-numeric:tabular-nums">{v:.2f}</text>')
    # connectors between consecutive cumulative steps
    for i in range(len(pts) - 1):
        _, lo0, hi0, k0 = pts[i]
        _, lo1, hi1, k1 = pts[i + 1]
        if k0 != "add" or k1 != "add":
            continue
        cx0 = pad_left + slot * i + slot / 2
        cx1 = pad_left + slot * (i + 1) + slot / 2
        yv = pad_top + plot_h - plot_h * (hi0 / top)
        o.append(f'<line x1="{cx0+bw/2:.1f}" y1="{yv:.1f}" x2="{cx1-bw/2:.1f}" y2="{yv:.1f}" '
                 f'stroke="{BASE}" stroke-width="1" stroke-dasharray="2 2"/>')
    for i, (lab, lo, hi, kind) in enumerate(pts):
        cx = pad_left + slot * i + slot / 2
        y0 = pad_top + plot_h - plot_h * (hi / top)
        y1 = pad_top + plot_h - plot_h * (lo / top)
        col = S7 if kind == "total" else S1
        o.append(f'<rect x="{cx-bw/2:.1f}" y="{y0:.1f}" width="{bw:.1f}" '
                 f'height="{max(y1-y0,2):.1f}" rx="3" fill="{col}"/>')
        o.append(f'<text x="{cx:.1f}" y="{y0-5:.1f}" font-size="10" text-anchor="middle" '
                 f'fill="{INK}" style="font-variant-numeric:tabular-nums">'
                 f'{fmt.format(hi if kind=="total" else hi-lo)}</text>')
        words = lab.split(" ")
        lines, cur = [], ""
        for w in words:
            if len(cur + " " + w) > 13 and cur:
                lines.append(cur); cur = w
            else:
                cur = (cur + " " + w).strip()
        lines.append(cur)
        for k, ln in enumerate(lines[:3]):
            o.append(f'<text x="{cx:.1f}" y="{pad_top+plot_h+14+k*10.5:.1f}" font-size="9.5" '
                     f'text-anchor="middle" fill="{MUTED}">{_esc(ln)}</text>')
    o.append(f'<line x1="{pad_left}" y1="{pad_top+plot_h}" x2="{width-14}" '
             f'y2="{pad_top+plot_h}" stroke="{BASE}" stroke-width="1"/>')
    o.append("</svg>")
    return "".join(o)
