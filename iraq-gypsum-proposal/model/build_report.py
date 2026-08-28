#!/usr/bin/env python3
"""Assemble the investment memorandum HTML from the model outputs."""
import json, datetime
from charts import (hbar, grouped_bar, tornado, stacked_bar, line_chart, waterfall,
                    S1, S2, S3, S4, S7, GOOD, WARN, SERIOUS, CRIT)

M = json.load(open("model_out.json"))
A = json.load(open("aux_out.json"))
T, R, C = M["tech"], M["returns"], M["capital"]
rows, fcf = M["rows"], M["fcf"]
DATE = "August 2026"

def sq(t): return str(t).replace("m2", "m²")
def usd(x, d=2): return f"${x:,.{d}f}"
def mm(x, d=2):  return f"${x/1e6:,.{d}f}M"

# ---------------------------------------------------------------- charts
ch = {}

seg = [(n, v/1e6) for n, v, _ in A["demand"]["segments"]]
ch["demand"] = hbar(sorted(seg, key=lambda r: -r[1]), fmt="{:.2f}", unit=" M m²",
                    pad_left=252, title=None)

proj = A["demand"]["proj"]
yrs = sorted(proj.keys(), key=int)
ch["proj"] = line_chart([y for y in yrs],
    [("Addressable demand", S1, [proj[y]/1e6 for y in yrs]),
     ("Plant sustainable output", S2, [9.98]*len(yrs))],
    unit=" M m²", fmt="{:,.1f}")

li = A["landed"]["items"]
wf = [(n, v, "add") for n, v in li] + [("Landed wholesale, Baghdad", A["landed"]["total"], "total"),
                                        ("This project, ex-works", A["landed"]["dom_px"], "total"),
                                        ("This project, cash cost", 1.3131, "total")]
ch["landed"] = waterfall(wf, height=262)

cs = M["capex_sub"]
ch["capex"] = hbar(sorted([(sq(k), v/1e6) for k, v in cs.items()], key=lambda r: -r[1]),
                   fmt="{:.2f}", unit="M", pad_left=286)

vcr = sorted([(k, v) for k, v in M["vc"].items()], key=lambda r: -r[1])
ch["vc"] = hbar(vcr, fmt="{:.4f}", pad_left=214, color=S1)

nyr = 13
ch["pl"] = grouped_bar([f"Y{i}" for i in range(nyr)],
    [("Revenue", S1, [rows[i]["revenue"]/1e6 for i in range(nyr)]),
     ("EBITDA",  S2, [rows[i]["ebitda"]/1e6 for i in range(nyr)])], height=232)

base_irr = M["sens"][0][1]*100
tor = [(n, (i*100 if i else -6.0), base_irr) for n, i, _ in M["sens"]]
ch["tornado"] = tornado(tor, f"{base_irr:.1f}%", pad_left=262)

ch["stack"] = stacked_bar([("Sponsor equity", C["equity"]/1e6, S1),
                           ("ECA / Sinosure buyer credit", C["eca"]/1e6, S2),
                           ("Local bank / vendor facility", C["local"]/1e6, S3)],
                          total_label=f"Phase 1 project cost {mm(C['total'])}")

sc = A["sites"]["scores"]
ch["sites"] = hbar(sorted([(k, v) for k, v in sc.items()], key=lambda r: -r[1]),
                   fmt="{:.2f}", pad_left=246, maxval=10,
                   colors=[S1 if i == 0 else (S3 if i == 1 else "#b9c6d4")
                           for i in range(len(sc))])

ch["variants"] = hbar([("Full scope, integrated (recommended)", 34.34),
                       ("Board-only, buy stucco — capped at $20M", 20.00),
                       ("Integrated — capped at $20M", 20.00)],
                      fmt="{:.2f}", unit="M", pad_left=290,
                      colors=[S1, "#b9c6d4", "#b9c6d4"])

# ---------------------------------------------------------------- tables
def tbl(headers, body, cls="", align=None):
    al = align or ["l"] + ["r"]*(len(headers)-1)
    h = "".join(f'<th class="{ {"l":"tl","r":"tr","c":"tc"}[a] }">{x}</th>'
                for x, a in zip(headers, al))
    b = ""
    for r in body:
        if r == "RULE":
            b += '<tr class="rule"><td colspan="%d"></td></tr>' % len(headers); continue
        strong = isinstance(r, tuple) and r and r[0] == "__b__"
        cells = r[1:] if strong else r
        tr = "".join(f'<td class="{ {"l":"tl","r":"tr","c":"tc"}[a] }">{x}</td>'
                     for x, a in zip(cells, al))
        b += f'<tr class="{"b" if strong else ""}">{tr}</tr>'
    return f'<table class="{cls}"><thead><tr>{h}</tr></thead><tbody>{b}</tbody></table>'

capex_body = []
for k, v in M["capex"].items():
    capex_body.append(("__b__", f'<span class="grp">{sq(k)}</span>', "",
                       f'<b>{v and sum(v.values())/1e6:,.2f}</b>'))
    for item, val in v.items():
        capex_body.append(("", f'<span class="sub">{sq(item)}</span>',
                           f"{val:,.0f}", ""))
capex_body += ["RULE",
    ("__b__", "Direct sub-total", "", f'<b>{sum(M["capex_sub"].values())/1e6:,.2f}</b>'),
    ("", "Contingency @ 10%", "", f'{sum(M["capex_sub"].values())*0.10/1e6:,.2f}'),
    ("__b__", "Total fixed capital cost", "", f'<b>{M["total_capex"]/1e6:,.2f}</b>'),
    ("", "&nbsp;&nbsp;of which Phase 1", "", f'{M["phase1"]/1e6:,.2f}'),
    ("", "&nbsp;&nbsp;of which Phase 2 (Year 4)", "", f'{M["phase2"]/1e6:,.2f}')]

vc_body = [("", k, f"{v:.4f}", f"{v/M['total_vc']*100:.1f}%") for k, v in vcr]
vc_body += ["RULE",
    ("__b__", "Total variable cost", f'<b>{M["total_vc"]:.4f}</b>', "100.0%"),
    ("", "Fixed cost per m² at sustainable output", f'{M["total_fixed"]/T["sustainable"]:.4f}', ""),
    ("__b__", "Total cash cost per m²", f'<b>{M["total_vc"]+M["total_fixed"]/T["sustainable"]:.4f}</b>', ""),
    ("", "Weighted realised price", f'{T["price"]:.4f}', ""),
    ("__b__", "Cash margin per m²", f'<b>{T["price"]-(M["total_vc"]+M["total_fixed"]/T["sustainable"]):.4f}</b>', "")]

fixed_body = [("", k, f"{v:,.0f}") for k, v in M["fixed"].items()]
fixed_body += ["RULE", ("__b__", f'Total fixed operating cost ({T["headcount"]} staff)',
                        f'<b>{M["total_fixed"]:,.0f}</b>')]

pl_body = []
for i in range(21):
    r, f = rows[i], fcf[i]
    mgn = f'{r["ebitda"]/r["revenue"]*100:.0f}%' if r["revenue"] else "—"
    pl_body.append(("", f'Y{i}', f'{r["util"]*100:.0f}%', f'{r["vol"]/1e6:,.2f}',
                    f'{r["price"]:.2f}', f'{r["revenue"]/1e6:,.2f}', f'{r["vcost"]/1e6:,.2f}',
                    f'{r["fixed"]/1e6:,.2f}', f'{r["ebitda"]/1e6:,.2f}', mgn,
                    f'{f["capex"]/1e6:,.2f}', f'{f["fcf"]/1e6:,.2f}'))

sens_body = [("", n, f'{(i*100):.1f}%' if i else "negative", f'{v/1e6:,.2f}')
             for n, i, v in M["sens"]]

site_body = []
crit = A["sites"]["criteria"]; raw = A["sites"]["raw"]
names = list(raw.keys())
for i, (cname, w) in enumerate(crit):
    site_body.append(("", cname, f'{float(w)*100:.0f}%', *[str(raw[n][i]) for n in names]))
site_body += ["RULE", ("__b__", "Weighted score", "",
                       *[f'<b>{A["sites"]["scores"][n]:.2f}</b>' for n in names])]

RISKS = [
 ("Competitive entry at scale", "ATS (Anbar) has a disclosed $63.8M plan for 40M m²/yr. If built, domestic capacity would reach ~50M m² against ~36M m² of 2032 demand.", "High", "Severe", CRIT,
  "Move first and secure distribution. Target commissioning inside 24 months. Consider a pre-emptive JV, offtake or equity position in ATS rather than a capacity race."),
 ("Realised price erosion", "A 10% fall in realised price cuts IRR to 8.8%; a 20% fall makes the project value-destructive.", "Medium", "Severe", CRIT,
  "Sell systems, not sheets. Lock specification with contractors and ministries. Hold a cost position that survives a 41% price fall to cash break-even."),
 ("Facing paper supply", "Paper is 31.6% of variable cost and 100% imported, with 60–90 day lead times through a single border corridor.", "Medium", "High", SERIOUS,
  "Dual-source across Turkey and Europe/Asia. Hold 90 days of cover. Climate-controlled store. Consider a paper mill only at Phase 3."),
 ("Power reliability", "Anbar grid availability is well below industrial requirement; dryer and forming line cannot tolerate interruption.", "High", "Medium", SERIOUS,
  "5 MW captive generation (N+1) sized for full island operation; grid used opportunistically. Already carried in CAPEX and OPEX."),
 ("Ramp and product quality", "Paper-to-core bond and edge quality are the classic failure modes on low-cost lines; a failed ramp cuts IRR to 10.8%.", "Medium", "High", SERIOUS,
  "European forming station, dosing and dryer controls. Supplier performance guarantees tied to retention. Six months of expatriate commissioning support."),
 ("Security and access", "Anbar operating environment carries elevated risk to people, logistics and continuity of supply.", "Medium", "High", SERIOUS,
  "Site on the Highway 11 corridor rather than remote quarry-side. Contracted security, convoy protocols, political-risk and business-interruption cover."),
 ("Permitting and licence delay", "NIC licence, mining licence under Law 38/2011, EIA and land allocation are sequential and historically slow.", "High", "Medium", WARN,
  "Engage NIC and Anbar Investment Commission before FEED. Budget 9–12 months. Retain Iraqi counsel. Treat the mining licence as a condition precedent to equity release."),
 ("Ore quality variability", "Fatha Formation gypsum carries anhydrite, dolomite and quartz; purity swings damage stucco consistency.", "Medium", "Medium", WARN,
  "Resource drilling and a 12-month bench programme before commitment. Selective mining, blending stockpiles, continuous online purity control."),
 ("Working capital and receivables", "Iraqi building-materials trade runs on extended informal credit; 55-day receivables is an assumption, not a certainty.", "Medium", "Medium", WARN,
  "Cash-and-carry for new accounts, graduated credit, LC-backed terms for large contractors. Committed working capital facility sized at $4.5M."),
 ("Tariff and policy change", "The 2026 customs framework could be relaxed, eroding the 15% protection embedded in the landed-cost umbrella.", "Low", "High", WARN,
  "Base case does not rely on tariff increases. Build cost advantage independent of protection; engage industry association on anti-dumping remedies."),
 ("FX and repatriation", "IQD official rate 1,320/USD with a persistent parallel-market spread; dividend repatriation friction.", "Medium", "Medium", WARN,
  "Price in USD-linked terms, hold hard-currency balances offshore where lawful, structure shareholder returns through NIC-licensed channels."),
 ("Debt service in first production year", "Modelled Year-2 DSCR is 0.61x — the first production year cannot service debt from its own cash flow.", "High", "Medium", WARN,
  "Six-month debt service reserve account funded at financial close, plus the 3-year ECA grace period already assumed. Non-negotiable lender condition."),
]

risk_rows = "".join(
  f'<tr><td class="tl"><b>{n}</b><div class="rd">{d}</div></td>'
  f'<td class="tc">{p}</td><td class="tc"><span class="pill" style="background:{c}1f;color:{c};'
  f'border-color:{c}55">{im}</span></td><td class="tl rm">{m}</td></tr>'
  for n, d, p, im, c, m in RISKS)

MILESTONES = [
 ("M0–M3",  "Definition & rights", "Resource drilling at Hit/Kubaisa; JORC-style resource statement; NIC licence application; land allocation; equipment RFQs issued."),
 ("M3–M6",  "Selection & close", "Supplier selection and technical bid analysis; FEED complete; mining licence granted; ECA facility credit-approved; financial close."),
 ("M6–M9",  "Mobilisation", "Site earthworks, piling, foundations; long-lead equipment in manufacture; contract mining tender; expatriate leadership hired."),
 ("M9–M16", "Construction", "Buildings erected; board line, dryer and calciner delivered and installed; power plant and substation energised; utilities commissioned."),
 ("M16–M20","Commissioning", "Cold then hot commissioning; calciner first stucco; board line first strip; formulation optimisation; COSQC and EN 520 certification."),
 ("M20–M24","Ramp to market", "Progressive ramp to 35% utilisation; distributor network appointed; specification programme with contractors and ministries; merchant plaster sales begin."),
 ("Y3–Y4",  "Phase 2", "Steel profiles and jointing compounds lines installed from operating cash flow; full wall-system offer complete."),
]
ms_rows = "".join(f'<tr><td class="tl ph">{a}</td><td class="tl"><b>{b}</b></td>'
                  f'<td class="tl rm">{c}</td></tr>' for a, b, c in MILESTONES)

SUPPLIERS = [
 ("Board line — main mechanical", "Chinese tier-1 (Shandong Tengfei, Wuxi Hoyoo, Hebei Shengfeng class)",
  "$3.75M", "Proven at 10–30M m² scale across Asia, CIS and Africa. Accept for forming belt, cutter, transfer, dry end and bundling."),
 ("Forming station & slurry mixer", "European specialist (Grenzebach, Gyptech class)",
  "$0.42M", "The single highest-leverage upgrade. Slurry consistency and paper-to-core bond determine whether the plant makes saleable board."),
 ("Dryer burner & moisture control", "European (Grenzebach / Claudius Peters class)",
  "$0.28M", "Dryer is 16.5% of variable cost and the main quality/throughput constraint. Control quality pays for itself in fuel alone."),
 ("Weighing, dosing & foam generation", "European (Siemens-instrumented skid)",
  "$0.22M", "Density control governs board weight, which governs both stucco consumption and compliance with EN 520 / ASTM C1396."),
 ("PLC, SCADA & drives", "Siemens or ABB", "$0.30M",
  "Spares and engineering support obtainable regionally; avoids orphaned proprietary Chinese control code."),
 ("Calcination (kettle) & mill", "Chinese powder-line supplier, Claudius Peters as premium alternate",
  "$1.85M", "Kettle calcination is mature and forgiving of feed variability — the right choice for Fatha Formation ore."),
 ("Roll-forming (profiles)", "Turkish or Chinese", "$1.10M",
  "Commodity technology. Buy on price and delivery; Turkish suppliers offer materially better service proximity."),
 ("Facing paper", "Turkish, European or Asian recycled linerboard mills", "recurring",
  "Dual-source mandatory. Qualify at least two mills before commissioning; paper drives 31.6% of variable cost."),
]
sup_rows = "".join(f'<tr><td class="tl"><b>{a}</b></td><td class="tl">{b}</td>'
                   f'<td class="tr">{c}</td><td class="tl rm">{d}</td></tr>'
                   for a, b, c, d in SUPPLIERS)

# ---------------------------------------------------------------- assemble
kpi = [
 ("Nameplate capacity", f'{T["nameplate"]/1e6:,.1f}', "M m²/yr", "12.5 mm equivalent"),
 ("Total project cost", mm(C["total"], 1), "Phase 1", "incl. working capital & IDC"),
 ("Sponsor equity", mm(C["equity"], 1), "at 46% gearing", "inside the $20M envelope"),
 ("Project IRR", f'{R["irr"]*100:,.1f}%', "real, ungeared", f'vs {R["wacc"]*100:.1f}% real WACC'),
 ("NPV", mm(R["npv"], 1), f'@ {R["wacc"]*100:.1f}%', "20-year + terminal"),
 ("Steady-state EBITDA", mm(rows[-1]["ebitda"], 1), "24% margin", "38% on board alone"),
]
kpi_html = "".join(
  f'<div class="kpi"><div class="kl">{a}</div><div class="kv">{b}</div>'
  f'<div class="ku">{c}</div><div class="kn">{d}</div></div>' for a, b, c, d in kpi)

HTML = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Integrated Gypsum Wallboard Plant — Iraq</title>
<style>
@page {{ size: A4; margin: 16mm 15mm 18mm; }}
* {{ box-sizing: border-box; }}
html {{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
body {{ font-family: system-ui,-apple-system,"Segoe UI",sans-serif; color:#0b0b0b;
  background:#fff; font-size:9.6pt; line-height:1.5; margin:0; }}
h1,h2,h3,h4 {{ margin:0; font-weight:640; letter-spacing:-0.011em; }}
p {{ margin:0 0 8px; }}
.page {{ page-break-after: always; }}
.page:last-child {{ page-break-after: auto; }}
section {{ break-inside: auto; }}
h2 {{ font-size:16pt; margin:0 0 3px; letter-spacing:-0.02em; }}
h2 .num {{ color:{S1}; font-variant-numeric:tabular-nums; margin-right:9px; }}
h3 {{ font-size:11pt; margin:17px 0 6px; }}
h4 {{ font-size:9.6pt; margin:12px 0 4px; color:#52514e; text-transform:uppercase;
  letter-spacing:.07em; font-size:8.1pt; }}
.lead {{ font-size:10.4pt; color:#2c2c2a; line-height:1.55; margin-bottom:12px; }}
.rule {{ height:2px; background:{S1}; width:52px; margin:8px 0 14px; }}
.hdr {{ border-bottom:1px solid #e1e0d9; padding-bottom:9px; margin-bottom:14px; }}

/* cover */
.cover {{ height:262mm; display:flex; flex-direction:column; justify-content:space-between; }}
.cv-top {{ padding-top:26mm; }}
.cv-eyebrow {{ font-size:8.4pt; letter-spacing:.19em; text-transform:uppercase;
  color:{S1}; font-weight:640; }}
.cv-title {{ font-size:33pt; line-height:1.1; letter-spacing:-0.028em; margin:14px 0 0; font-weight:680; }}
.cv-sub {{ font-size:14pt; color:#52514e; margin-top:11px; font-weight:400; letter-spacing:-0.01em; }}
.cv-line {{ height:3px; background:{S1}; width:120px; margin:22px 0; }}
.cv-meta {{ font-size:9.4pt; color:#52514e; line-height:1.85; }}
.cv-meta b {{ color:#0b0b0b; font-weight:600; }}
.cv-band {{ display:flex; gap:0; border-top:1px solid #e1e0d9; padding-top:14px; }}
.cv-band div {{ flex:1; }}
.cv-band .l {{ font-size:7.6pt; text-transform:uppercase; letter-spacing:.1em; color:#898781; }}
.cv-band .v {{ font-size:15pt; font-weight:640; letter-spacing:-0.02em; margin-top:3px; }}
.cv-band .u {{ font-size:8pt; color:#898781; }}

/* kpi */
.kpis {{ display:grid; grid-template-columns:repeat(3,1fr); gap:1px; background:#e1e0d9;
  border:1px solid #e1e0d9; margin:14px 0 16px; }}
.kpi {{ background:#fcfcfb; padding:11px 12px; }}
.kl {{ font-size:7.7pt; text-transform:uppercase; letter-spacing:.085em; color:#898781; }}
.kv {{ font-size:19pt; font-weight:660; letter-spacing:-0.025em; margin:3px 0 0; line-height:1.05; }}
.ku {{ font-size:8.3pt; color:{S1}; font-weight:560; }}
.kn {{ font-size:7.9pt; color:#898781; margin-top:2px; }}

/* tables */
table {{ width:100%; border-collapse:collapse; font-size:8.7pt; margin:9px 0 12px;
  font-variant-numeric:tabular-nums; }}
th {{ font-size:7.6pt; text-transform:uppercase; letter-spacing:.07em; color:#898781;
  font-weight:620; border-bottom:1px solid #c3c2b7; padding:5px 7px; }}
td {{ padding:4.1px 7px; border-bottom:1px solid #f0efec; vertical-align:top; }}
.tl {{ text-align:left; }} .tr {{ text-align:right; }} .tc {{ text-align:center; }}
tr.b td {{ font-weight:600; background:#f7f7f4; }}
tr.rule td {{ border-bottom:1px solid #c3c2b7; padding:0; height:3px; }}
.grp {{ font-weight:640; }}
.sub {{ padding-left:13px; color:#52514e; }}
.rm {{ font-size:8.2pt; color:#52514e; line-height:1.45; }}
.rd {{ font-size:8pt; color:#898781; font-weight:400; margin-top:2px; line-height:1.4; }}
.pill {{ display:inline-block; padding:1px 7px; border-radius:9px; font-size:7.7pt;
  font-weight:620; border:1px solid; }}
.ph {{ font-weight:620; color:{S1}; white-space:nowrap; font-variant-numeric:tabular-nums; }}
table.compact td {{ padding:3.2px 7px; }}
table.compact {{ font-size:8.2pt; }}

/* callouts */
.call {{ border-left:3px solid {S1}; background:#f4f8fd; padding:11px 14px; margin:13px 0;
  font-size:9.2pt; line-height:1.5; }}
.call.warn {{ border-color:{CRIT}; background:#fdf5f5; }}
.call.good {{ border-color:{GOOD}; background:#f3faf3; }}
.call h4 {{ margin:0 0 4px; color:#0b0b0b; font-size:8.6pt; letter-spacing:.05em; }}
.call p:last-child {{ margin-bottom:0; }}

.fig {{ margin:12px 0 14px; }}
.figc {{ font-size:8.1pt; color:#898781; margin-top:5px; line-height:1.42; }}
.figt {{ font-size:9.3pt; font-weight:620; margin-bottom:7px; }}
.two {{ display:grid; grid-template-columns:1fr 1fr; gap:20px; }}
ul,ol {{ margin:5px 0 9px; padding-left:17px; }}
li {{ margin-bottom:3.4px; line-height:1.47; }}
.foot {{ font-size:7.7pt; color:#898781; border-top:1px solid #e1e0d9; padding-top:7px;
  margin-top:14px; line-height:1.45; }}
.toc {{ font-size:9.6pt; }}
.toc div {{ display:flex; justify-content:space-between; padding:5.2px 0;
  border-bottom:1px solid #f0efec; }}
.toc .n {{ color:{S1}; font-weight:620; width:26px; font-variant-numeric:tabular-nums; }}
.toc .t {{ flex:1; }}
.mono {{ font-variant-numeric:tabular-nums; }}
.src {{ font-size:8pt; color:#52514e; line-height:1.55; }}
.src li {{ margin-bottom:4px; }}
.badge {{ display:inline-block; background:{S1}; color:#fff; font-size:7.6pt; font-weight:620;
  padding:2px 8px; border-radius:3px; letter-spacing:.05em; text-transform:uppercase; }}
</style></head><body>

<!-- ============================ COVER ============================ -->
<div class="page cover">
  <div class="cv-top">
    <div class="cv-eyebrow">Confidential Investment Memorandum</div>
    <h1 class="cv-title">Integrated Gypsum<br>Wallboard Plant</h1>
    <div class="cv-sub">Anbar–Baghdad Corridor, Republic of Iraq</div>
    <div class="cv-line"></div>
    <div class="cv-meta">
      <b>Feasibility study, technical design and financial analysis</b><br>
      Quarry · Calcination · Wallboard · Steel profiles · Jointing compounds<br>
      Prepared {DATE} · All figures in constant 2026 US dollars
    </div>
  </div>
  <div>
    <div class="cv-band">
      <div><div class="l">Nameplate</div><div class="v">{T['nameplate']/1e6:,.1f}</div><div class="u">M m² per year</div></div>
      <div><div class="l">Project cost</div><div class="v">{mm(C['total'],1)}</div><div class="u">Phase 1, incl. working capital</div></div>
      <div><div class="l">Sponsor equity</div><div class="v">{mm(C['equity'],1)}</div><div class="u">at 46% gearing</div></div>
      <div><div class="l">Project IRR</div><div class="v">{R['irr']*100:,.1f}%</div><div class="u">real, ungeared</div></div>
    </div>
    <div class="foot" style="margin-top:16px">
      This document has been prepared for discussion purposes on the basis of public
      information, engineering first principles and industry benchmarks. It is not an
      offer to sell or a solicitation to buy securities, and it is not a substitute for
      the confirmatory work set out in Section 15. Figures marked as estimates have not
      been verified against vendor quotations, drill results or audited accounts.
    </div>
  </div>
</div>

<!-- ============================ TOC ============================ -->
<div class="page">
  <div class="hdr"><h2>Contents</h2></div>
  <div class="toc">
    <div><span class="n">1</span><span class="t">Executive summary</span></div>
    <div><span class="n">2</span><span class="t">The central finding: scope against budget</span></div>
    <div><span class="n">3</span><span class="t">Market analysis</span></div>
    <div><span class="n">4</span><span class="t">Competitive landscape</span></div>
    <div><span class="n">5</span><span class="t">Pricing and the landed-cost umbrella</span></div>
    <div><span class="n">6</span><span class="t">Location and site selection</span></div>
    <div><span class="n">7</span><span class="t">Plant design and process specification</span></div>
    <div><span class="n">8</span><span class="t">Equipment supplier evaluation</span></div>
    <div><span class="n">9</span><span class="t">Capital expenditure</span></div>
    <div><span class="n">10</span><span class="t">Operating cost and unit economics</span></div>
    <div><span class="n">11</span><span class="t">Financial analysis and returns</span></div>
    <div><span class="n">12</span><span class="t">Sensitivity and break-even</span></div>
    <div><span class="n">13</span><span class="t">Capital structure and funding plan</span></div>
    <div><span class="n">14</span><span class="t">Risk register</span></div>
    <div><span class="n">15</span><span class="t">Implementation roadmap and conditions precedent</span></div>
    <div><span class="n">16</span><span class="t">Recommendation</span></div>
    <div><span class="n">A</span><span class="t">Basis of preparation, assumptions and sources</span></div>
  </div>

  <div class="call" style="margin-top:22px">
    <h4>How to read this document</h4>
    <p>Every figure in this memorandum derives from a single engineering and financial
    model built from first principles — mass balance, energy balance, and a line-item
    capital cost build-up — rather than from top-down rules of thumb. Where a figure is
    sourced, the source is named in Appendix A. Where it is an engineering estimate, it
    is described as such.</p>
    <p>The model is built in <b>constant 2026 US dollars</b>. No general inflation is
    applied, on the assumption that nominal selling prices and nominal costs escalate
    together in the long run. Only <i>real</i> divergences are modelled: a one-off
    competitive step-down in realised price over the first four operating years, and
    real wage growth of 1.5% per year. The discount rate is therefore a real rate.</p>
  </div>
</div>

<!-- ============================ 1. EXEC ============================ -->
<div class="page">
  <div class="hdr"><h2><span class="num">1</span>Executive summary</h2></div>

  <p class="lead">Iraq consumes roughly 25 million square metres of plasterboard a year
  and manufactures almost none of it. Around 70% arrives overland from Turkey, carrying
  1,300 kilometres of road freight, 15% of duty and levy, and an importer's margin before
  it reaches a Baghdad builders' merchant. Iraq simultaneously sits on some of the largest
  and most accessible gypsum deposits in the Middle East. That gap between a
  resource-rich country and an import-dependent market is the investment case.</p>

  <div class="kpis">{kpi_html}</div>

  <h3>What is proposed</h3>
  <p>A vertically integrated plant in the Anbar–Baghdad corridor combining a gypsum
  quarry concession, a {T['stucco_total']/1000:,.0f} thousand tonne per year calcination
  plant, and a {T['nameplate']/1e6:,.1f} million m² per year wallboard line, extended in
  Year 4 with steel framing profiles and jointing compounds to sell a complete wall
  system rather than a commodity sheet. Sustainable output is
  {T['sustainable']/1e6:,.1f} million m² per year at a realistic
  {70}% overall equipment effectiveness.</p>

  <h3>The economics</h3>
  <p>The plant produces board at a total cash cost of
  <b>{usd(M['total_vc']+M['total_fixed']/T['sustainable'],3)} per m²</b> against a
  landed Turkish import wholesale price of roughly <b>$2.78 per m²</b> in Baghdad. That
  is a wide cost umbrella. At a target ex-works price of {usd(T['price'],2)} — some 20%
  below landed import — the business earns a {M['contribution']/T['price']*100:.0f}%
  contribution margin and, at steady state, {mm(rows[-1]['ebitda'],1)} of EBITDA on
  {mm(rows[-1]['revenue'],1)} of revenue. On board and plaster alone, before the
  lower-margin profiles business dilutes the ratio, the EBITDA margin is 38%.</p>

  <div class="call warn">
    <h4>Three findings the investor must weigh before anything else</h4>
    <p><b>1. The brief does not fit the budget — but the equity cheque does.</b>
    A fully integrated 12 million m² plant with a complete wall-system offer cannot be
    built for under $20 million. It costs {mm(C['total'],1)} all-in. Capped at $20
    million of total project cost, an integrated plant tops out at 4.6 million m² — 38%
    of the target — at a 58% worse capital intensity. The resolution is not to shrink
    the plant but to finance it: with {mm(C['eca'],1)} of ECA-backed buyer credit against
    the Chinese equipment package and {mm(C['local'],1)} of local and vendor debt, the
    <b>sponsor equity requirement is {mm(C['equity'],1)}</b> — inside the envelope.</p>
    <p><b>2. A competitor is already pursuing this exact project.</b> Al Tiraz Al Sharqi
    Global has published a $63.8 million plan for an integrated mine at Hit and a factory
    outside Ramadi producing 40 million m² of wallboard, 600,000 tonnes of powder,
    ceiling tile and metal parts. Same governorate, same corridor, same strategy, four
    times the capacity. If it is built as described, domestic capacity would reach
    50 million m² against roughly 36 million m² of 2032 demand.</p>
    <p><b>3. The returns are real but not comfortable.</b> A
    {R['irr']*100:,.1f}% real ungeared IRR against a {R['wacc']*100:.1f}% real WACC is a
    positive but thin spread for Iraqi country risk. A 10% fall in realised price takes
    the IRR to 8.8% and the NPV negative. This is a project that must be executed
    quickly and well, or not at all.</p>
  </div>

  <h3>Recommendation in brief</h3>
  <p>Proceed to a defined and time-boxed feasibility stage, not to construction.
  Commit approximately $850,000 and six months to resource drilling, vendor bid analysis,
  a firm ECA financing term sheet, and — most importantly — direct verification of the
  competitor's status and of actual Iraqi market prices and volumes, which cannot be
  established from public sources. Section 16 sets out the specific gates.</p>
</div>

<!-- ============================ 2. CENTRAL FINDING ============================ -->
<div class="page">
  <div class="hdr"><h2><span class="num">2</span>The central finding: scope against budget</h2></div>
  <p class="lead">The brief specified a 10 million m² integrated plant with a full wall
  system for under $20 million. Those three requirements are mutually inconsistent. This
  section shows by how much, and how to resolve it.</p>

  <div class="fig">
    <div class="figt">What $20 million of total project cost actually buys</div>
    {ch["variants"]}
    <div class="figc">Solved, not assumed: capital cost scaled by power law (0.65–0.70
    exponent on process equipment, sub-linear on civils and soft costs), then inverted to
    find the largest plant fitting a $20M ceiling. Blue is the recommended configuration.</div>
  </div>

  <table class="compact">
    <thead><tr><th class="tl">Configuration</th><th class="tr">Nameplate</th>
    <th class="tr">Total cost</th><th class="tr">$ per annual m²</th><th class="tl">Assessment</th></tr></thead>
    <tbody>
    <tr><td class="tl"><b>Full scope, integrated</b></td><td class="tr">11.98 M m²</td>
    <td class="tr">$34.34M</td><td class="tr">2.57</td>
    <td class="tl rm">Recommended. Best capital efficiency; requires debt.</td></tr>
    <tr><td class="tl">Integrated, capped at $20M</td><td class="tr">4.60 M m²</td>
    <td class="tr">$20.00M</td><td class="tr">4.05</td>
    <td class="tl rm">Subscale. Fixed costs per m² nearly double; cannot defend on price.</td></tr>
    <tr><td class="tl">Board only (buy stucco), capped at $20M</td><td class="tr">6.01 M m²</td>
    <td class="tr">$20.00M</td><td class="tr">2.95</td>
    <td class="tl rm">Forfeits the resource advantage that is the entire strategic premise.</td></tr>
    </tbody>
  </table>

  <h3>Why small plants are disproportionately expensive</h3>
  <p>Plasterboard manufacturing has severe scale economics. A dryer, a forming station,
  a control system, a laboratory, a weighbridge and a plant manager cost almost the same
  whether the line runs at 5 million or 30 million m² per year. Halving capacity does not
  halve capital cost — it reduces it by roughly a third, while fixed operating cost per
  m² rises in direct proportion. This is why the $20M-capped integrated variant carries a
  capital intensity of $4.05 per annual m² against $2.57 at full scale: <b>the constrained
  plant is 58% less capital-efficient per unit of output.</b></p>

  <h3>Cross-checking the capital estimate</h3>
  <p>An independent check is available. Al Tiraz Al Sharqi Global has disclosed a total
  investment of $63.8 million, of which $10 million is working capital, for an integrated
  complex producing 40 million m² of wallboard plus 600,000 tonnes of powder, ceiling tile
  and metal parts. Scaling that $53.8 million of fixed capital down to this project's
  output on a 0.65 power law implies roughly $24.5 million of fixed capital, against this
  study's bottom-up estimate of {mm(M['phase1'],1)} for Phase 1.</p>
  <p>The 25% gap is explicable and, in this analyst's view, sits in the right direction.
  This study carries a full 10% contingency, complete site infrastructure for a greenfield
  location with no existing services, 5 MW of captive generation, and interest during
  construction. A promoter's investment figure prepared to attract capital would not
  ordinarily carry all of those. <b>The estimate here should be treated as realistic and
  the competitor's as optimistic</b>, but neither is a substitute for firm vendor
  quotations.</p>

  <div class="call good">
    <h4>The resolution</h4>
    <p>Do not shrink the plant to fit the equity. Finance it. The Chinese-origin equipment
    package is {mm(C['china'],1)}, which qualifies for Sinosure-backed buyer credit at
    approximately 85% — {mm(C['eca'],1)} at around 6.5% over ten years with a three-year
    grace period. Adding {mm(C['local'],1)} of local bank and vendor financing brings
    total debt to {mm(C['debt'],1)}, or {C['gearing']*100:.0f}% gearing, and reduces the
    sponsor's equity cheque to <b>{mm(C['equity'],1)}</b>.</p>
    <p>Debt service is comfortable once the plant is running — average DSCR over the life
    of the debt is {M['dscr']['average']:.1f}x — but <b>the first production year cannot
    service its own debt</b> (DSCR {M['dscr']['minimum']:.2f}x). A six-month debt service
    reserve account funded at financial close is a non-negotiable condition.</p>
  </div>
</div>

<!-- ============================ 3. MARKET ============================ -->
<div class="page">
  <div class="hdr"><h2><span class="num">3</span>Market analysis</h2></div>

  <h3>Macro and construction context</h3>
  <p>Iraq has a population of approximately 46 million growing at about 2.5% per year,
  one of the youngest age structures in the region, and a construction sector that grew
  5.5% in real terms in 2025 and is forecast to grow 4.8% per year through 2029, supported
  by investment in energy, water infrastructure and the government's target of lifting oil
  production above 6 million barrels per day. Government has sought to attract roughly
  $7 billion of investment to stimulate growth. Cement output exceeded 10 million tonnes
  in 2024, confirming both the scale of construction activity and the viability of
  heavy building-materials manufacturing in-country.</p>

  <h3>The housing deficit is the demand engine</h3>
  <p>Iraq's housing gap exceeded 3 million units by the end of 2024, with credible
  estimates ranging from 2.5 to 3.5 million. Roughly 250,000 new units per year are needed
  simply to hold the deficit constant against population growth. Sixteen new residential
  cities are under construction or in preparation, and the 2025–2030 national plan targets
  halving the housing crisis. Execution has been weak — around 65% of government housing
  projects were delayed or abandoned as of 2023 — which argues for discounting official
  targets heavily, as this study does.</p>

  <div class="fig">
    <div class="figt">Iraqi plasterboard demand, 2026 — bottom-up build</div>
    {ch["demand"]}
    <div class="figc">Segment build rather than top-down extrapolation. Total
    {A['demand']['total']/1e6:,.1f} million m², implying
    {A['demand']['percap']:,.2f} m² per capita — consistent with a market at an early
    stage of drywall adoption (United States roughly 11 m² per capita, developing Asia
    1–2 m², regional peers 0.5–0.8 m²).</div>
  </div>

  <h3>Reading the demand estimate honestly</h3>
  <p>This is the weakest number in the study and it deserves to be flagged as such.
  No reliable published statistic exists for Iraqi plasterboard consumption. The
  {A['demand']['total']/1e6:,.1f} million m² figure is built segment by segment from
  housing completions, dwelling-stock renovation cycles, commercial fit-out, institutional
  building, post-conflict reconstruction and informal self-build, each with an assumed
  drywall penetration rate. A reasonable range around it is 18 to 30 million m².</p>
  <p>The distinction that matters commercially is that Iraq is a <i>ceiling</i> market
  before it is a <i>partition</i> market. Decorative suspended and false ceilings are
  near-universal in Iraqi residential construction, while interior partitions remain
  predominantly block and hand-applied plaster. That shapes the product mix assumed in
  Section 7 — a deliberately high 20% share of 9.5 mm ceiling board — and it means the
  growth opportunity lies in converting partition construction from block to drywall,
  which is a specification and training problem as much as a price problem.</p>

  <div class="fig">
    <div class="figt">Market growth against plant output, 2026–2033</div>
    {ch["proj"]}
    <div class="figc">Demand grown at 6.5% per year, marginally above the construction
    sector's forecast 4.8% to reflect rising drywall penetration from a low base. Plant
    sustainable output shown flat at {T['sustainable']/1e6:,.2f} million m².</div>
  </div>

  <p>At sustainable output the plant would hold roughly 40% of the 2026 market, falling
  to about 28% of the 2032 market as demand grows. A 28% national share for the only
  integrated domestic producer is ambitious but not unreasonable; a 40% share on day one
  is not achievable, which is why the model ramps utilisation over five years and reaches
  only 83% of nameplate.</p>
</div>

<!-- ============================ 4. COMPETITION ============================ -->
<div class="page">
  <div class="hdr"><h2><span class="num">4</span>Competitive landscape</h2></div>
  <p class="lead">Iraq has an established gypsum <i>powder</i> industry and effectively
  no gypsum <i>board</i> industry. That asymmetry is the opportunity — and it has been
  noticed by others.</p>

  <h3>Current supply</h3>
  <table class="compact">
    <thead><tr><th class="tl">Participant</th><th class="tl">Position</th>
    <th class="tl">Relevance to this project</th></tr></thead>
    <tbody>
    <tr><td class="tl"><b>Turkish producers</b></td>
      <td class="tl">~70% of Iraqi board supply, overland via the northern corridor</td>
      <td class="tl rm">The price setter. Landed cost carries 1,300 km of freight plus 15% duty and levy — the umbrella this project sells under, and the incumbent that will cut price in response to domestic entry.</td></tr>
    <tr><td class="tl"><b>Chinese producers</b></td>
      <td class="tl">Second-largest import source by shipment count</td>
      <td class="tl rm">Long lead times and sea freight; competitive on price, weak on service. Less able to respond quickly to a domestic entrant.</td></tr>
    <tr><td class="tl"><b>Knauf</b></td>
      <td class="tl">Regional plants at Ras Al Khaimah (UAE), Salalah (Oman) and a 20M m² facility in Syria</td>
      <td class="tl rm">The strongest brand and specification position in the region. A Syrian plant is geographically closer to Iraq than the Gulf assets. Most likely long-run competitor or partner.</td></tr>
    <tr><td class="tl"><b>United Iraqi Gypsum Co.</b></td>
      <td class="tl">Established 1979; among the first Iraqi gypsum manufacturers</td>
      <td class="tl rm">Powder and plaster rather than board. A potential rock or stucco supplier, acquisition target, or competitor in merchant plaster.</td></tr>
    <tr><td class="tl"><b>IRQGYP, Al Watania</b></td>
      <td class="tl">Baghdad-based gypsum products and construction solutions</td>
      <td class="tl rm">Distribution and brand presence without board manufacturing. Natural channel partners.</td></tr>
    </tbody>
  </table>

  <div class="call warn">
    <h4>Al Tiraz Al Sharqi Global — the decisive competitive fact</h4>
    <p>ATS is a Baghdad building-materials trading company, founded 2005 and family-owned,
    which has published detailed plans for an integrated gypsum mine and factory in Anbar:
    a 2.5 million m² mine concession at <b>Hit</b>, a 500,000 m² factory site outside
    <b>Ramadi</b> 135 km from Baghdad, and a stated investment of <b>$63.8 million</b>
    including $10 million of working capital. At capacity it intends to produce
    <b>600,000 tonnes of gypsum powder, 40 million m² of wallboard, 5 million m² of
    ceiling tile and 21.6 million metal parts.</b></p>
    <p>This is the same governorate, the same highway corridor, the same vertically
    integrated strategy and the same product range contemplated here, at roughly four
    times the scale. It is also, notably, the same commercial logic — an incumbent
    building-materials distributor integrating backwards into manufacturing — which is
    the natural winning structure in this market and one this project does not have.</p>
    <p><b>Implication.</b> If ATS builds as described, combined domestic capacity reaches
    50 million m² against roughly 36 million m² of 2032 demand — a 72% industry
    utilisation that would collapse pricing. The sensitivity analysis in Section 12 shows
    a 20% price fall drives this project's IRR to negative. Verifying ATS's actual
    construction status, financing and timetable is the single highest-value piece of
    confirmatory diligence in this entire study.</p>
  </div>

  <h3>Strategic options with respect to ATS</h3>
  <ol>
    <li><b>Race and win on speed.</b> Commission inside 24 months, lock distribution and
    specification before ATS reaches market. Viable only if ATS is still pre-financing.</li>
    <li><b>Partner.</b> Take an equity position in, or form a joint venture with, ATS.
    One 40 million m² integrated plant serving Iraq is a far better asset than two plants
    fighting for a 36 million m² market. This deserves serious consideration.</li>
    <li><b>Differentiate.</b> Concede volume board and concentrate on the higher-margin
    system — moisture and fire-rated board, profiles, compounds and technical service —
    where distribution and specification matter more than tonnage.</li>
    <li><b>Decline.</b> If ATS is financed and under construction, the rational decision
    is not to build a second plant into the same market.</li>
  </ol>
</div>

<!-- ============================ 5. PRICING ============================ -->
<div class="page">
  <div class="hdr"><h2><span class="num">5</span>Pricing and the landed-cost umbrella</h2></div>
  <p class="lead">The commercial premise of the project is simple: a domestic producer
  starts with a structural cost advantage of roughly $0.93 per m² over imported board,
  before any manufacturing efficiency at all. That advantage is freight and duty.</p>

  <div class="fig">
    <div class="figt">Landed Turkish import versus domestic production, 12.5 mm board ($/m²)</div>
    {ch["landed"]}
    <div class="figc">Blue bars build the imported landed cost cumulatively; violet bars
    are absolute reference levels. Import assumptions: Turkish ex-works $1.85/m², road
    freight ~1,300 km, 10% customs duty plus 5% reconstruction levy, importer margin.</div>
  </div>

  <table class="compact">
    <thead><tr><th class="tl">Price stack</th><th class="tr">$/m²</th><th class="tl">Note</th></tr></thead>
    <tbody>
    <tr><td class="tl">Turkish ex-works</td><td class="tr">1.85</td><td class="tl rm">Estimate; Turkish plasterboard capacity is large and marginal-cost pricing is possible in a downturn</td></tr>
    <tr><td class="tl">Road freight to Baghdad</td><td class="tr">0.34</td><td class="tl rm">~1,300 km overland; structural and not competable-away</td></tr>
    <tr><td class="tl">Customs duty 10% + reconstruction levy 5%</td><td class="tr">0.28</td><td class="tl rm">Policy-dependent — the one element of the umbrella that can disappear</td></tr>
    <tr><td class="tl">Clearance, handling, demurrage</td><td class="tr">0.09</td><td class="tl rm">Border friction</td></tr>
    <tr><td class="tl">Importer margin</td><td class="tr">0.22</td><td class="tl rm">Compressible under competitive pressure</td></tr>
    <tr class="b"><td class="tl">Landed wholesale, Baghdad</td><td class="tr">2.78</td><td class="tl rm"></td></tr>
    <tr class="rule"><td colspan="3"></td></tr>
    <tr><td class="tl">This project — target ex-works price</td><td class="tr">2.21</td><td class="tl rm">20% below landed import; the discount that wins specification</td></tr>
    <tr><td class="tl">This project — total cash cost</td><td class="tr">1.31</td><td class="tl rm">Section 10</td></tr>
    <tr class="b"><td class="tl">Cash margin per m²</td><td class="tr">0.90</td><td class="tl rm">Before depreciation, interest and tax</td></tr>
    </tbody>
  </table>

  <h3>Price assumptions by product</h3>
  <table class="compact">
    <thead><tr><th class="tl">Product</th><th class="tr">Mix</th><th class="tr">Price $/m²</th>
    <th class="tr">Stucco kg/m²</th><th class="tr">Paper kg/m²</th></tr></thead>
    <tbody>
    {"".join(f'<tr><td class="tl">{k}</td><td class="tr">{v["share"]*100:.0f}%</td>'
             f'<td class="tr">{v["price"]:.2f}</td><td class="tr">{v["stucco"]:.2f}</td>'
             f'<td class="tr">{v["paper"]:.2f}</td></tr>' for k, v in M["products"].items())}
    <tr class="b"><td class="tl">Weighted average</td><td class="tr">100%</td>
    <td class="tr">{T['price']:.3f}</td><td class="tr">{T['stucco']:.2f}</td>
    <td class="tr">{T['paper']:.3f}</td></tr>
    </tbody>
  </table>

  <div class="call">
    <h4>The pricing risk, stated plainly</h4>
    <p>Iraqi retail board prices could not be established from public sources; the price
    deck above is triangulated from regional prices and import economics and
    <b>must be verified by direct market survey before any capital commitment.</b>
    It is the most sensitive assumption in the model: a 10% error takes the IRR from
    {R['irr']*100:,.1f}% to 8.8%. The model already applies a 7% real price step-down over
    the first four operating years to reflect the competitive response a new domestic
    entrant provokes.</p>
  </div>
</div>

<!-- ============================ 6. LOCATION ============================ -->
<div class="page">
  <div class="hdr"><h2><span class="num">6</span>Location and site selection</h2></div>

  <h3>The gypsum resource</h3>
  <p>Iraq's primary gypsum reserve is estimated at 142 million tonnes, with gypsum and
  anhydrite of the Middle Miocene <b>Fatha Formation</b> outcropping at surface across
  Nineveh, Kirkuk, Erbil, Sulaymaniyah, Diyala, Wasit and Anbar. Roughly 130 million
  tonnes are attributed to Anbar and Basrah. The Iraq Geological Survey has begun new
  exploration programmes for gypsum in Anbar and Nineveh. The <b>Hit–Kubaisa</b> belt in
  Anbar, some 70 km from Ramadi, is the historic centre of Iraqi gypsum extraction and
  supplies the country's plaster industry today.</p>
  <p>Two geological caveats matter commercially. First, Fatha Formation gypsum carries
  accessory anhydrite, dolomite, quartz and calcite, and purity varies within and between
  beds — the model assumes 90% ore purity and selective mining. Second, gypsum is a soft
  mineral (Mohs 2) and is generally rippable, which removes drilling and blasting from
  the mining cost and is the reason contract extraction at around $4.20 per tonne is
  achievable.</p>

  <h3>Where to put the plant — and a counter-intuitive result</h3>
  <p>The instinctive answer is to build at the quarry. The analysis does not support it.</p>

  <div class="fig">
    <div class="figt">Weighted site score, Anbar–Baghdad corridor</div>
    {ch["sites"]}
    <div class="figc">Eight weighted criteria. Blue is recommended, green the alternate.
    Note that the quarry-side option (Kubaisa/Hit) ranks last.</div>
  </div>

  <table class="compact">
    <thead><tr><th class="tl">Criterion</th><th class="tr">Weight</th>
    {"".join(f'<th class="tr">{n.split(" (")[0]}</th>' for n in A["sites"]["raw"])}</tr></thead>
    <tbody>{"".join(
      '<tr>' + f'<td class="tl">{c}</td><td class="tr">{float(w)*100:.0f}%</td>' +
      "".join(f'<td class="tr">{A["sites"]["raw"][n][i]}</td>' for n in A["sites"]["raw"]) + '</tr>'
      for i, (c, w) in enumerate(A["sites"]["criteria"]))}
      <tr class="b"><td class="tl">Weighted score</td><td class="tr"></td>
      {"".join(f'<td class="tr">{A["sites"]["scores"][n]:.2f}</td>' for n in A["sites"]["raw"])}</tr>
    </tbody>
  </table>

  <h3>Why the quarry site loses</h3>
  <p>Because haulage turns out not to matter very much. Total road logistics — rock
  inbound plus finished goods outbound — varies by only $0.27 million per year across the
  three leading sites, on an annual revenue base above $33 million. Siting at the quarry
  saves the rock haul but adds an equal and opposite finished-goods haul to Baghdad,
  while sacrificing grid access, labour availability, security and customer proximity.</p>

  <table class="compact">
    <thead><tr><th class="tl">Site</th><th class="tr">km to rock</th><th class="tr">km to market</th>
    <th class="tr">Rock haul $/yr</th><th class="tr">Product haul $/yr</th><th class="tr">Total $/yr</th></tr></thead>
    <tbody>
    <tr><td class="tl">Kubaisa / Hit (at quarry)</td><td class="tr">0</td><td class="tr">185</td>
      <td class="tr">—</td><td class="tr">$1.20M</td><td class="tr">$1.20M</td></tr>
    <tr class="b"><td class="tl">Ramadi outskirts (Highway 11)</td><td class="tr">70</td><td class="tr">110</td>
      <td class="tr">$0.58M</td><td class="tr">$0.71M</td><td class="tr">$1.30M</td></tr>
    <tr><td class="tl">Amiriyat al-Fallujah</td><td class="tr">130</td><td class="tr">60</td>
      <td class="tr">$1.08M</td><td class="tr">$0.39M</td><td class="tr">$1.47M</td></tr>
    <tr><td class="tl">Baghdad (Taji / Abu Ghraib)</td><td class="tr">190</td><td class="tr">25</td>
      <td class="tr">$1.58M</td><td class="tr">$0.16M</td><td class="tr">$1.74M</td></tr>
    <tr><td class="tl">Karbala industrial zone</td><td class="tr">230</td><td class="tr">105</td>
      <td class="tr">$1.91M</td><td class="tr">$0.68M</td><td class="tr">$2.60M</td></tr>
    </tbody>
  </table>

  <div class="call good">
    <h4>Recommendation — Ramadi outskirts, Highway 11 corridor</h4>
    <p>Ramadi balances the two hauls at close to the theoretical optimum (within $0.10
    million per year of the best case), sits 70 km from the Hit–Kubaisa gypsum belt and
    110 km from Baghdad on the trunk road to Jordan, and offers materially better power,
    labour and security than a remote quarry site. Its logistics cost of $3.50 per tonne
    of rock is carried explicitly in the model, raising stucco cost from $15.76 to
    <b>{usd(T['stucco_cost'],2)} per tonne</b>.</p>
    <p><b>Alternate: Amiriyat al-Fallujah</b>, which scores highest on the qualitative
    matrix (7.56 against 7.27) and sits closest to the Baghdad demand centre, at
    $0.17 million per year of additional logistics cost. If a gypsum concession can be
    secured within 90 km, Amiriyat becomes the preferred site.</p>
    <p>It is worth noting that ATS independently selected the Hit-mine/Ramadi-factory
    configuration. Convergent site logic from an experienced local operator is
    corroborating evidence.</p>
  </div>

  <h4>Land requirement</h4>
  <p>Approximately 300,000 m² for the factory (of which 33,000 m² built in Phase 1 and 2)
  with room for a doubling of capacity, plus a quarry concession of 2 to 3 km². At
  166,000 tonnes per year of run-of-mine extraction over a 25-year life, total extraction
  is 4.2 million tonnes — a modest footprint against Anbar's resource base. Land is held
  under a 50-year renewable lease under the National Investment Law.</p>
</div>

<!-- ============================ 7. PLANT DESIGN ============================ -->
<div class="page">
  <div class="hdr"><h2><span class="num">7</span>Plant design and process specification</h2></div>

  <h3>Design basis</h3>
  <table class="compact">
    <tbody>
    <tr><td class="tl">Board width</td><td class="tr">1,200 mm</td>
        <td class="tl">Line design speed</td><td class="tr">25 m/min</td></tr>
    <tr><td class="tl">Instantaneous output</td><td class="tr">{T['inst_rate']:,.0f} m²/h</td>
        <td class="tl">Mechanical capability</td><td class="tr">to 35 m/min</td></tr>
    <tr><td class="tl">Scheduled operating time</td><td class="tr">7,920 h/yr</td>
        <td class="tl">24 h × 330 days</td><td class="tr"></td></tr>
    <tr><td class="tl">Nameplate OEE</td><td class="tr">84%</td>
        <td class="tl">Nameplate capacity</td><td class="tr">{T['nameplate']/1e6:,.2f} M m²/yr</td></tr>
    <tr><td class="tl">Sustainable OEE</td><td class="tr">70%</td>
        <td class="tl">Sustainable output</td><td class="tr">{T['sustainable']/1e6:,.2f} M m²/yr</td></tr>
    <tr><td class="tl">Thicknesses</td><td class="tr">9.5 / 12.5 mm</td>
        <td class="tl">Standards</td><td class="tr">EN 520 / ASTM C1396</td></tr>
    </tbody>
  </table>
  <p>The 70% sustainable OEE is deliberately conservative. World-class plasterboard plants
  achieve 85–92%. A first-of-kind plant in Iraq with a partly Chinese line, an
  inexperienced workforce and unreliable grid power will not. Modelling nameplate output
  as achievable would overstate revenue by 20%.</p>

  <h3>Process description</h3>
  <ol>
    <li><b>Extraction.</b> Open-pit selective mining of Fatha Formation gypsum at
    Hit–Kubaisa. Soft rock, ripped rather than blasted. Contract-mined at ~$4.20/t.</li>
    <li><b>Crushing and screening.</b> Primary jaw crusher (250 t/h) and secondary
    impactor at the quarry, reducing to −25 mm. Crushing at the pit minimises haulage
    volume and protects the calciner from oversize.</li>
    <li><b>Haulage.</b> 70 km to the plant, {T['rock']/1000:,.0f} thousand tonnes per year.</li>
    <li><b>Grinding.</b> Impact/hammer mill with dynamic classifier to land plaster
    fineness. ~22 kWh/t.</li>
    <li><b>Calcination.</b> Continuous kettle calciner converting gypsum dihydrate to
    hemihydrate at 150–165 °C. Kettle technology is chosen over flash calcination for its
    tolerance of feed variability — the correct trade-off for Fatha Formation ore.</li>
    <li><b>Conditioning.</b> Stucco cooled and held in conditioning silos to stabilise
    rehydration behaviour before use.</li>
    <li><b>Mixing and forming.</b> Stucco, water, foam, starch, retarder, accelerator and
    dispersant combined in a high-shear pin mixer; slurry deposited between two paper
    liners at the forming station, which sets board thickness, edge profile and density.</li>
    <li><b>Setting belt.</b> ~120 m belt allowing the core to hydrate and develop green
    strength before cutting.</li>
    <li><b>Cutting and transfer.</b> Flying knife cuts to length; boards accelerated,
    turned and booked face-to-face for drying.</li>
    <li><b>Drying.</b> Six-deck ~90 m dryer removing {T['free_water']:,.2f} kg of free
    water per m². Two-zone profile: high-temperature evaporation followed by a gentle
    zone to prevent calcination of the set core.</li>
    <li><b>Finishing.</b> Trim saw, bundling in pairs face-to-face, strapping, labelling,
    palletising and warehousing.</li>
  </ol>

  <h3>Mass and energy balance</h3>
  <p>The balance is built from stoichiometry rather than rules of thumb. Stucco (calcium
  sulfate hemihydrate, MW 145.15) rehydrates to dihydrate (MW 172.17), a mass gain of
  1.186; calcination correspondingly loses 15.7% of dihydrate mass as water.</p>
  <table class="compact">
    <thead><tr><th class="tl">Parameter</th><th class="tr">Value</th><th class="tl">Basis</th></tr></thead>
    <tbody>
    <tr><td class="tl">Weighted stucco intensity</td><td class="tr">{T['stucco']:,.2f} kg/m²</td><td class="tl rm">Product-mix weighted; cross-checks against the 7.5 kg/m² industry figure for 12.5 mm</td></tr>
    <tr><td class="tl">Weighted paper intensity</td><td class="tr">{T['paper']:,.3f} kg/m²</td><td class="tl rm">Two liners, ~200 gsm each plus wrap</td></tr>
    <tr><td class="tl">ROM rock per tonne stucco</td><td class="tr">{T['rock_per_t']:,.3f} t</td><td class="tl rm">At 90% ore purity, 95% process yield</td></tr>
    <tr><td class="tl">Stucco for board</td><td class="tr">{T['stucco_board']/1000:,.1f} kt/yr</td><td class="tl rm">At sustainable output</td></tr>
    <tr><td class="tl">Merchant bagged plaster</td><td class="tr">40.0 kt/yr</td><td class="tl rm">Uses spare calciner capacity; cash-generative from month one</td></tr>
    <tr><td class="tl">Total calcination duty</td><td class="tr">{T['stucco_total']/1000:,.1f} kt/yr</td><td class="tl rm">Installed capacity 120 kt/yr</td></tr>
    <tr><td class="tl">ROM rock extraction</td><td class="tr">{T['rock']/1000:,.1f} kt/yr</td><td class="tl rm">Includes 8% quarry loss and dilution</td></tr>
    <tr><td class="tl">Free water evaporated</td><td class="tr">{T['free_water']:,.2f} kg/m²</td><td class="tl rm">Slurry water:stucco ratio 0.80, less chemically bound water</td></tr>
    <tr><td class="tl">Dryer thermal duty</td><td class="tr">{T['thermal']:,.1f} MJ/m²</td><td class="tl rm">Latent + sensible at 58% dryer efficiency; industry range 15–25 MJ/m²</td></tr>
    <tr><td class="tl">Electrical intensity</td><td class="tr">1.11 kWh/m²</td><td class="tl rm">Board line and services</td></tr>
    <tr><td class="tl">Connected electrical load</td><td class="tr">~3.3 MW</td><td class="tl rm">5 MW installed, N+1</td></tr>
    </tbody>
  </table>

  <h3>Utilities</h3>
  <p><b>Power.</b> Grid supply in Anbar is not dependable at industrial standard. The
  design assumes 5 MW of dual-fuel captive generation on an N+1 basis, capable of full
  island operation, with grid taken opportunistically. The model blends 55% grid at
  $0.046/kWh with 45% self-generation at $0.090/kWh for an effective
  {usd(T['power'],4)}/kWh.</p>
  <p><b>Thermal.</b> Dryer and calciner burners run on diesel at an assumed
  $0.28 per litre — above the subsidised pump price of roughly $0.19 to allow for
  industrial supply and logistics — giving {usd(T['fuel_GJ'],2)} per GJ. <b>The single
  largest identified upside in this study is pipeline natural gas.</b> Anbar hosts the
  Akkas gas field; gas at $4.50/GJ would cut thermal cost from
  {usd(M['vc']['Dryer thermal energy'],3)} to about $0.086 per m², worth roughly
  $0.6 million a year. The plant should be designed dual-fuel from the outset.</p>
  <p><b>Water.</b> Boreholes with treatment and 2,000 m³ of storage. Plasterboard
  manufacture is near zero liquid discharge — process water is consumed into the board
  or evaporated.</p>
</div>

<!-- ============================ 8. SUPPLIERS ============================ -->
<div class="page">
  <div class="hdr"><h2><span class="num">8</span>Equipment supplier evaluation</h2></div>
  <p class="lead">The brief specified a Chinese main line with European critical
  components. That is the right answer, and this section sets out precisely where the
  European money should go — because the choice of <i>which</i> components to upgrade
  matters more than the decision to upgrade at all.</p>

  <h3>The strategy</h3>
  <p>A complete European line from Grenzebach, Siempelkamp or Gyptech would cost more
  than this project's entire equity budget. A wholly Chinese turnkey line is affordable
  but concentrates risk in exactly the places where plasterboard plants fail: slurry
  consistency, board density control, paper-to-core bond, and dryer control. The
  recommended package spends <b>$1.22 million — about 21% of the board-line budget — on
  four European sub-systems</b> that govern those four failure modes, while buying the
  bulk mechanical handling, which is commodity engineering, from a Chinese tier-1
  supplier.</p>

  <table class="compact">
    <thead><tr><th class="tl">Scope</th><th class="tl">Recommended origin</th>
    <th class="tr">Budget</th><th class="tl">Rationale</th></tr></thead>
    <tbody>{sup_rows}</tbody>
  </table>

  <div class="call">
    <h4>Commercial conditions to impose on the main-line supplier</h4>
    <ul>
      <li><b>Performance guarantee</b> on output rate, board weight tolerance, surface
      quality and reject rate, tested over a continuous 72-hour run.</li>
      <li><b>10% retention</b> released only on passing the performance test, plus a
      bank guarantee for the warranty period.</li>
      <li><b>Six months of resident commissioning support</b> with named engineers, not a
      day-rate allowance.</li>
      <li><b>Two years of critical spares</b> in the base scope, held on site — Iraqi
      import lead times make a stocked-out bearing a multi-week outage.</li>
      <li><b>Open control architecture</b> — Siemens or ABB PLC with documented code and
      transferable licences. Proprietary supplier-locked control software is a long-term
      hostage situation.</li>
      <li><b>Training of 12 operators and 4 engineers</b> at a reference plant running the
      same line, before shipment.</li>
    </ul>
  </div>

  <h3>Raw material supply</h3>
  <p>Facing paper is the critical input — {M['vc']['Facing paper (imported)']/M['total_vc']*100:,.0f}%
  of variable cost, entirely imported, and the material most likely to halt production.
  Qualify at least two mills (a Turkish supplier for lead time, a European or Asian mill
  for quality benchmark) before commissioning and hold 90 days of cover in a
  climate-controlled store. Starch is available from Cargill, Roquette or Tate &amp; Lyle;
  foaming agents from specialist chemical suppliers; dispersants from BASF or Sika. Ball
  mill accelerator (BMA) is produced on site from the plant's own gypsum.</p>
</div>

<!-- ============================ 9. CAPEX ============================ -->
<div class="page">
  <div class="hdr"><h2><span class="num">9</span>Capital expenditure</h2></div>

  <div class="fig">
    <div class="figt">Capital cost by category ($M, before contingency)</div>
    {ch["capex"]}
  </div>

  <table class="compact">
    <thead><tr><th class="tl">Item</th><th class="tr">$</th><th class="tr">$M</th></tr></thead>
    <tbody>{"".join(
      ('<tr class="rule"><td colspan="3"></td></tr>' if r == "RULE" else
       f'<tr class="{"b" if r[0]=="__b__" else ""}">' +
       "".join(f'<td class="{c}">{x}</td>' for c, x in
               zip(["tl","tr","tr"], r[1:] if r[0]=="__b__" else r[1:])) + '</tr>')
      for r in capex_body)}
    </tbody>
  </table>

  <div class="call">
    <h4>Notes on the estimate</h4>
    <p><b>Contingency at 10%</b> is appropriate for a study at this stage only because the
    scope is well defined; a 15% allowance would be more usual for an Iraqi greenfield and
    the sensitivity in Section 12 tests a 25% overrun.</p>
    <p><b>Customs duty is excluded</b> on imported plant and equipment, on the basis of
    exemption under National Investment Law No. 13 of 2006. Clearance and agency fees are
    retained. If the exemption is not obtained, add approximately $1.5 million.</p>
    <p><b>Contract mining</b> is assumed, which removes roughly $1.2 million of mobile
    fleet from capital cost and converts it to an operating cost of $4.20 per tonne. For
    a 166,000 tonne per year soft-rock quarry this is standard practice and materially
    de-risks the project.</p>
    <p><b>Capital intensity</b> is {usd(M['phase1']/T['nameplate'],2)} per m² of annual
    nameplate capacity. Greenfield integrated plasterboard plants in emerging markets
    typically fall in a $1.50–3.00 range, with small plants at the upper end. This
    project sits within that band.</p>
  </div>
</div>

<!-- ============================ 10. OPEX ============================ -->
<div class="page">
  <div class="hdr"><h2><span class="num">10</span>Operating cost and unit economics</h2></div>

  <div class="fig">
    <div class="figt">Variable cost build-up ($ per m², weighted average board)</div>
    {ch["vc"]}
  </div>

  <div class="two">
    <div>
      <h4>Variable cost</h4>
      <table class="compact">
        <thead><tr><th class="tl">Component</th><th class="tr">$/m²</th><th class="tr">%</th></tr></thead>
        <tbody>{"".join(
          ('<tr class="rule"><td colspan="3"></td></tr>' if r == "RULE" else
           f'<tr class="{"b" if r[0]=="__b__" else ""}">' +
           "".join(f'<td class="{c}">{x}</td>' for c, x in zip(["tl","tr","tr"], r[1:])) + '</tr>')
          for r in vc_body)}
        </tbody>
      </table>
    </div>
    <div>
      <h4>Fixed operating cost, annual</h4>
      <table class="compact">
        <thead><tr><th class="tl">Component</th><th class="tr">$</th></tr></thead>
        <tbody>{"".join(
          ('<tr class="rule"><td colspan="2"></td></tr>' if r == "RULE" else
           f'<tr class="{"b" if r[0]=="__b__" else ""}">' +
           "".join(f'<td class="{c}">{x}</td>' for c, x in zip(["tl","tr"], r[1:])) + '</tr>')
          for r in fixed_body)}
        </tbody>
      </table>
      <p class="rm" style="margin-top:8px">Headcount {T['headcount']}, including two
      expatriate technical directors at $200,000 fully loaded for the first three years.
      Iraqi minimum wage is IQD 450,000 per month; a factory worker averages
      approximately IQD 1.03 million. Employer social security is 12%; the model applies
      a 22% burden to cover benefits and allowances.</p>
    </div>
  </div>

  <h3>What actually drives the cost</h3>
  <p>Three observations reframe the economics of this business.</p>
  <p><b>Gypsum is nearly free; paper is expensive.</b> Self-produced stucco costs
  {usd(T['stucco_cost'],2)} per tonne delivered into the mixer, which at
  {T['stucco']:,.2f} kg/m² is {usd(M['vc']['Stucco (self-produced)'],4)} per m² — just
  {M['vc']['Stucco (self-produced)']/M['total_vc']*100:,.0f}% of variable cost. Imported
  facing paper costs {usd(M['vc']['Facing paper (imported)'],4)} per m², nearly twice as
  much. <b>The value of backward integration into gypsum is real but modest; the exposure
  to imported paper is the dominant raw-material risk.</b></p>
  <p><b>Energy is the second-largest line.</b> Drying and calcination together account for
  roughly a quarter of variable cost. Subsidised Iraqi fuel is a genuine and durable
  competitive advantage against Turkish imports, and pipeline gas would extend it.</p>
  <p><b>Fixed cost per m² is the scale argument.</b> At sustainable output, fixed cost is
  {usd(M['total_fixed']/T['sustainable'],4)} per m². At the 4.6 million m² plant that
  would fit a $20 million cap, the same fixed base spreads to roughly $0.89 per m² —
  which alone would consume two-thirds of the cash margin.</p>

  <div class="call good">
    <h4>Unit economics at steady state</h4>
    <p style="font-size:10.6pt;line-height:1.75">
    Realised price <b>{usd(T['price'],3)}</b> &nbsp;−&nbsp; variable cost
    <b>{usd(M['total_vc'],3)}</b> &nbsp;=&nbsp; contribution
    <b>{usd(M['contribution'],3)}</b> ({M['contribution']/T['price']*100:.0f}%)<br>
    less fixed cost <b>{usd(M['total_fixed']/T['sustainable'],3)}</b> &nbsp;=&nbsp;
    <b>cash margin {usd(T['price']-M['total_vc']-M['total_fixed']/T['sustainable'],3)} per m²</b></p>
  </div>
</div>

<!-- ============================ 11. FINANCIALS ============================ -->
<div class="page">
  <div class="hdr"><h2><span class="num">11</span>Financial analysis and returns</h2></div>

  <div class="fig">
    <div class="figt">Revenue and EBITDA, Years 0–12 ($M, constant 2026)</div>
    {ch["pl"]}
    <div class="figc">Years 0–1 construction. The Year-5 revenue step is the Phase 2
    profiles and compounds business, which adds volume at a lower margin — hence the
    EBITDA percentage falls even as absolute EBITDA rises.</div>
  </div>

  <table class="compact">
    <thead><tr><th class="tl">Yr</th><th class="tr">Util</th><th class="tr">Volume<br>M m²</th>
    <th class="tr">Price<br>$/m²</th><th class="tr">Revenue</th><th class="tr">Var cost</th>
    <th class="tr">Fixed</th><th class="tr">EBITDA</th><th class="tr">Margin</th>
    <th class="tr">Capex</th><th class="tr">FCF</th></tr></thead>
    <tbody>{"".join('<tr>' + "".join(f'<td class="{c}">{x}</td>' for c, x in
      zip(["tl","tr","tr","tr","tr","tr","tr","tr","tr","tr","tr"], r[1:])) + '</tr>'
      for r in pl_body)}
    </tbody>
  </table>
  <p class="rm">All figures $M in constant 2026 dollars except volume and price. Free cash
  flow is unlevered, after tax, capital expenditure, sustaining capital and working
  capital movement.</p>

  <h3>Returns</h3>
  <table class="compact">
    <tbody>
    <tr><td class="tl">Real WACC</td><td class="tr">{R['wacc']*100:,.1f}%</td>
        <td class="tl rm">Cost of equity ~18% (risk-free + Iraq country risk premium), blended debt ~8.7%</td></tr>
    <tr class="b"><td class="tl">Project IRR (real, ungeared)</td><td class="tr">{R['irr']*100:,.1f}%</td>
        <td class="tl rm">20-year horizon plus terminal value at 2% real growth</td></tr>
    <tr><td class="tl">Equity IRR (real, geared)</td><td class="tr">{R['eq_irr']*100:,.1f}%</td>
        <td class="tl rm">See note below</td></tr>
    <tr class="b"><td class="tl">NPV at {R['wacc']*100:,.1f}%</td><td class="tr">{mm(R['npv'])}</td>
        <td class="tl rm">Terminal value {mm(R['tv'])} undiscounted</td></tr>
    <tr><td class="tl">Payback from start-up</td><td class="tr">{R['payback']:,.1f} years</td>
        <td class="tl rm">Undiscounted, against total investment</td></tr>
    <tr><td class="tl">Steady-state revenue</td><td class="tr">{mm(rows[-1]['revenue'])}</td><td class="tl rm"></td></tr>
    <tr><td class="tl">Steady-state EBITDA</td><td class="tr">{mm(rows[-1]['ebitda'])}</td>
        <td class="tl rm">24% consolidated; 38% on board and plaster alone</td></tr>
    <tr><td class="tl">Minimum DSCR</td><td class="tr">{M['dscr']['minimum']:,.2f}x</td>
        <td class="tl rm">Year 2 — requires a debt service reserve</td></tr>
    <tr><td class="tl">Average DSCR over debt life</td><td class="tr">{M['dscr']['average']:,.1f}x</td><td class="tl rm">Comfortable once ramped</td></tr>
    </tbody>
  </table>

  <div class="call">
    <h4>Two things the return figures conceal</h4>
    <p><b>Leverage barely improves the equity return.</b> Equity IRR
    ({R['eq_irr']*100:,.1f}%) is essentially identical to project IRR
    ({R['irr']*100:,.1f}%). This is not an error: the debt fully amortises well before the
    twenty-year terminal date, so over that horizon the gearing effect washes out. The
    purpose of the debt in this structure is <b>not</b> to enhance returns — it is to
    reduce the sponsor's cheque from {mm(C['total'],1)} to {mm(C['equity'],1)}. Judge the
    financing on that basis.</p>
    <p><b>Value is concentrated in the terminal period.</b> Terminal value is
    {mm(R['tv'])} undiscounted. Over the explicit twenty-year forecast alone, before
    terminal value, the project's discounted cash flows do not fully recover the
    investment at a {R['wacc']*100:,.1f}% discount rate. The project's value therefore
    rests on the plant still operating profitably beyond year twenty — a reasonable
    expectation for a plasterboard asset with a captive resource, but a real
    dependency that a conservative investor should price.</p>
  </div>

  <h3>Tax</h3>
  <p>The model assumes full exemption from corporate income tax for ten years from
  commercial operation under National Investment Law No. 13 of 2006, extendable to fifteen
  years for a joint venture with majority Iraqi ownership. Iraq's headline corporate rate
  of 15% is applied from Year 11. The exemption is materially valuable and should be
  treated as a condition precedent, not an assumption.</p>
</div>

<!-- ============================ 12. SENSITIVITY ============================ -->
<div class="page">
  <div class="hdr"><h2><span class="num">12</span>Sensitivity and break-even</h2></div>

  <div class="fig">
    <div class="figt">Project IRR under single- and multi-variable stress</div>
    {ch["tornado"]}
    <div class="figc">Blue improves on base case, red deteriorates. Cases producing a
    negative IRR are plotted at −6% for legibility and labelled with their computed value.</div>
  </div>

  <table class="compact">
    <thead><tr><th class="tl">Scenario</th><th class="tr">Project IRR</th><th class="tr">NPV $M</th>
    <th class="tl">Interpretation</th></tr></thead>
    <tbody>
    {"".join(f'<tr class="{"b" if n=="Base case" else ""}"><td class="tl">{n}</td>'
             f'<td class="tr">{(i*100):.1f}%</td><td class="tr">{v/1e6:,.2f}</td>'
             f'<td class="tl rm">{t}</td></tr>' for (n, i, v), t in zip(M["sens"], [
      "Central assumptions",
      "Below WACC — value-destructive",
      "Severely value-destructive; this is the ATS scenario",
      "Below WACC",
      "Below WACC; the paper exposure is material",
      "Marginally below WACC — the project tolerates capital overrun better than price erosion",
      "Below WACC; ramp execution is critical",
      "Marginally below WACC",
      "Combined downside destroys the investment",
      "Pipeline gas plus pricing power transforms the return"]))}
    </tbody>
  </table>

  <h3>What the sensitivities say</h3>
  <p>The project is <b>far more sensitive to price than to capital cost</b>. A 25% capital
  overrun — a large miss — still leaves a 12.6% IRR. A 10% price decline, a much smaller
  commercial event, takes it to 8.8%. This ordering should govern where management
  attention goes: securing price and specification matters more than shaving capital.</p>
  <p>The base case sits {R['irr']*100-R['wacc']*100:,.1f} percentage points above WACC.
  That is a positive but narrow margin for a frontier-market industrial project, and it
  means <b>the project has little tolerance for simultaneous adverse movements</b>. The
  combined bear case is not an extreme construction: a 15% price fall, a 20% capital
  overrun and a 15% utilisation shortfall are each individually plausible.</p>

  <div class="two">
    <div>
      <h4>Break-even</h4>
      <table class="compact">
        <tbody>
        <tr><td class="tl">Cash break-even volume</td><td class="tr">{M['breakeven']['volume']/1e6:,.2f} M m²</td></tr>
        <tr><td class="tl">— as % of nameplate</td><td class="tr">{M['breakeven']['volume']/T['nameplate']*100:,.0f}%</td></tr>
        <tr><td class="tl">Cash break-even price</td><td class="tr">{usd(M['breakeven']['price'],3)}</td></tr>
        <tr><td class="tl">Base case price</td><td class="tr">{usd(T['price'],3)}</td></tr>
        <tr class="b"><td class="tl">Price headroom to cash loss</td><td class="tr">41%</td></tr>
        </tbody>
      </table>
    </div>
    <div>
      <h4>Why the break-even is reassuring</h4>
      <p class="rm">The plant covers its cash costs at 26% of nameplate — below even the
      first-year ramp target of 35% — and can absorb a 41% price collapse before burning
      cash. This is the structural benefit of cheap domestic gypsum and subsidised energy.
      <b>The project is resilient to survival scenarios and fragile to return
      scenarios:</b> it is unlikely to fail outright, and quite likely to disappoint if
      pricing is even moderately worse than assumed.</p>
    </div>
  </div>
</div>

<!-- ============================ 13. FUNDING ============================ -->
<div class="page">
  <div class="hdr"><h2><span class="num">13</span>Capital structure and funding plan</h2></div>

  <div class="fig">
    <div class="figt">Phase 1 sources of funds</div>
    {ch["stack"]}
  </div>

  <table class="compact">
    <thead><tr><th class="tl">Uses of funds</th><th class="tr">$M</th>
    <th class="tl">Sources of funds</th><th class="tr">$M</th></tr></thead>
    <tbody>
    <tr><td class="tl">Phase 1 fixed capital</td><td class="tr">{M['phase1']/1e6:,.2f}</td>
        <td class="tl">Sponsor equity</td><td class="tr">{C['equity']/1e6:,.2f}</td></tr>
    <tr><td class="tl">Working capital at ramp</td><td class="tr">3.61</td>
        <td class="tl">ECA / Sinosure buyer credit (6.5%, 10y, 3y grace)</td><td class="tr">{C['eca']/1e6:,.2f}</td></tr>
    <tr><td class="tl">Interest during construction</td><td class="tr">{M['idc']/1e6:,.2f}</td>
        <td class="tl">Local bank / vendor facility (13%, 7y)</td><td class="tr">{C['local']/1e6:,.2f}</td></tr>
    <tr class="b"><td class="tl">Total</td><td class="tr">{C['total']/1e6:,.2f}</td>
        <td class="tl">Total</td><td class="tr">{(C['equity']+C['debt'])/1e6:,.2f}</td></tr>
    </tbody>
  </table>

  <h3>The financing logic</h3>
  <p>{mm(C['china'],2)} of the equipment package is Chinese-origin. Chinese export credit
  supported by Sinosure will typically finance 85% of the contract value of such a package
  on ten-year terms with a two-to-three-year grace period, at rates well below Iraqi
  domestic lending. That single facility contributes {mm(C['eca'],2)} — the difference
  between a project the sponsor cannot fund and one it can.</p>
  <p>The balance comes from a local bank or vendor facility at a realistic Iraqi rate of
  13%. Total gearing of {C['gearing']*100:.0f}% is conservative for an asset-backed
  industrial project and is supported by an average DSCR of {M['dscr']['average']:,.1f}x.</p>

  <div class="call warn">
    <h4>Conditions the lenders will impose — and should</h4>
    <ul>
      <li><b>Debt service reserve account</b> funded with six months of principal and
      interest at financial close. Year-2 DSCR of {M['dscr']['minimum']:,.2f}x means the
      first production year cannot service debt from its own cash flow. This is the single
      most important structuring point in the financing.</li>
      <li><b>Completion guarantee</b> from the sponsor until the performance test is
      passed and sustained output is demonstrated.</li>
      <li><b>Equity first.</b> Sponsor equity fully drawn before debt, so the lenders'
      money goes into a substantially de-risked project.</li>
      <li><b>Cash sweep</b> above an agreed DSCR, and dividend lock-up below it.</li>
      <li><b>Security</b> over the land lease, plant, mining licence, insurances and
      project accounts.</li>
      <li><b>Political risk and business interruption insurance</b> assigned to lenders.</li>
    </ul>
  </div>

  <h3>Phase 2 is self-funded</h3>
  <p>The steel profiles and jointing compounds lines — {mm(M['phase2'],2)} — are installed
  in Year 4 from operating cash flow, not from the initial raise. They add roughly
  $12.5 million of revenue and $2.2 million of EBITDA at a lower margin than board, and
  earn back their capital in under three years. Deferring them keeps the initial equity
  requirement inside the envelope while preserving the full wall-system strategy.</p>
</div>

<!-- ============================ 14. RISK ============================ -->
<div class="page">
  <div class="hdr"><h2><span class="num">14</span>Risk register</h2></div>
  <table>
    <thead><tr><th class="tl" style="width:31%">Risk</th><th class="tc">Likelihood</th>
    <th class="tc">Impact</th><th class="tl">Mitigation</th></tr></thead>
    <tbody>{risk_rows}</tbody>
  </table>
</div>

<!-- ============================ 15. ROADMAP ============================ -->
<div class="page">
  <div class="hdr"><h2><span class="num">15</span>Implementation roadmap</h2></div>
  <table>
    <thead><tr><th class="tl" style="width:12%">Period</th><th class="tl" style="width:22%">Stage</th>
    <th class="tl">Activities</th></tr></thead>
    <tbody>{ms_rows}</tbody>
  </table>

  <h3>Conditions precedent to committing capital</h3>
  <p>None of the following should be treated as a formality. Each is capable of stopping
  the project, and each is cheaper to resolve now than after financial close.</p>
  <ol>
    <li><b>Competitive verification.</b> Establish, on the ground, whether Al Tiraz Al
    Sharqi is financed and building. If it is, this project should be restructured as a
    partnership or abandoned. <i>This is the first task, not the last.</i></li>
    <li><b>Market price and volume survey.</b> Direct verification of Iraqi wholesale and
    retail board prices, import volumes and channel structure. The price deck is the
    model's most sensitive input and its weakest evidence.</li>
    <li><b>Resource confirmation.</b> Drilling and bench-scale calcination on the target
    concession, to a JORC-equivalent statement covering tonnage, purity, and the
    anhydrite, dolomite and quartz content of the Fatha Formation ore.</li>
    <li><b>Mining licence</b> under Law No. 38 of 2011 and <b>NIC investment licence</b>
    under Law No. 13 of 2006, including written confirmation of the ten-year tax exemption
    and the customs exemption on capital equipment.</li>
    <li><b>Land allocation</b> and 50-year lease on the Ramadi corridor site.</li>
    <li><b>Firm vendor quotations</b> from at least three main-line suppliers against a
    common specification, with performance guarantees and the commercial conditions in
    Section 8.</li>
    <li><b>ECA term sheet</b> — credit-approved, not indicative — for the Sinosure-backed
    facility, and a local bank commitment for the balance.</li>
    <li><b>Paper supply.</b> Two qualified mills with indicative pricing and a tested
    logistics route.</li>
    <li><b>Power strategy</b> confirmed, including a written position on grid connection
    and on the availability and timetable of pipeline gas from Akkas.</li>
    <li><b>Security assessment</b> for the specific site, by a specialist firm, with a
    costed protection plan.</li>
  </ol>

  <div class="call">
    <h4>Recommended next-stage budget</h4>
    <p>Approximately <b>$850,000 over six months</b>: resource drilling and testwork
    $300,000; market and competitive survey $80,000; FEED and vendor bid analysis
    $250,000; legal, licensing and land $120,000; security and insurance advisory $50,000;
    financing arrangement $50,000. This is 2.4% of project cost to retire the majority of
    the project's uncertainty — and to establish whether the project should proceed
    at all.</p>
  </div>
</div>

<!-- ============================ 16. RECOMMENDATION ============================ -->
<div class="page">
  <div class="hdr"><h2><span class="num">16</span>Recommendation</h2></div>

  <p class="lead">Proceed to a time-boxed feasibility stage. Do not commit construction
  capital until the four gating questions below are answered.</p>

  <h3>The case for</h3>
  <ul>
    <li>A genuine structural arbitrage: a resource-rich country importing 70% of a product
    it has the raw materials to make, with roughly $0.93 per m² of freight and duty
    protection built into the landed import price.</li>
    <li>A cost position that survives a 41% price collapse before burning cash, and
    breaks even at 26% of nameplate capacity.</li>
    <li>Subsidised energy and low labour cost that Turkish and Gulf competitors cannot
    replicate.</li>
    <li>A ten-year tax exemption and duty-free capital equipment under the National
    Investment Law.</li>
    <li>Demand underwritten by a housing deficit above 2.5 million units and a
    construction sector growing near 5% a year.</li>
    <li>The equity requirement, properly financed, fits the sponsor's envelope at
    {mm(C['equity'],1)}.</li>
  </ul>

  <h3>The case against</h3>
  <ul>
    <li>A {R['irr']*100:,.1f}% real IRR is a thin spread over a {R['wacc']*100:,.1f}% real
    WACC for Iraqi country risk, and the value rests substantially on the terminal
    period.</li>
    <li>A named competitor is pursuing an identical strategy at four times the scale in
    the same governorate. If both are built, the market is oversupplied and pricing
    collapses.</li>
    <li>The demand estimate and the price deck — the two assumptions the return is most
    sensitive to — rest on the weakest evidence in the study.</li>
    <li>Execution risk is concentrated and unforgiving: a failed ramp, a paper supply
    interruption or a 10% pricing miss each individually takes the project below its cost
    of capital.</li>
  </ul>

  <div class="call warn">
    <h4>Four gating questions</h4>
    <p><b>1. Is Al Tiraz Al Sharqi financed and building?</b> If yes, restructure as a
    partnership or stop. This question dominates all others.</p>
    <p><b>2. What do Iraqi buyers actually pay per m² today, and for what volume?</b>
    If realised prices are more than 10% below this study's deck, the project does not
    clear its cost of capital.</p>
    <p><b>3. Can $16.5 million of debt be raised on the assumed terms?</b> Without the
    ECA facility the equity requirement rises above the envelope and the project as
    scoped is not fundable.</p>
    <p><b>4. Will the sponsor accept a project whose value depends on year-twenty-plus
    operation?</b> If the investment horizon is under ten years, this is the wrong
    asset.</p>
  </div>

  <div class="call good">
    <h4>This analyst's view</h4>
    <p>The industrial logic is sound and the cost position is genuinely defensible — this
    is a real business, not a paper one. But it is a <b>medium-return, high-execution-risk
    industrial project, not the high-return resource arbitrage it first appears to be</b>,
    and the returns do not carry enough margin to absorb a determined competitor.</p>
    <p>The most attractive version of this opportunity may not be building a second plant
    at all. It may be taking a position in the one already being developed. That option
    should be tested before $35 million is committed to competing with it.</p>
  </div>
</div>

<!-- ============================ APPENDIX ============================ -->
<div class="page">
  <div class="hdr"><h2><span class="num">A</span>Basis of preparation, assumptions and sources</h2></div>

  <h3>Key assumptions</h3>
  <table class="compact">
    <thead><tr><th class="tl">Assumption</th><th class="tr">Value</th><th class="tl">Basis / confidence</th></tr></thead>
    <tbody>
    <tr><td class="tl">Exchange rate</td><td class="tr">IQD 1,320/USD</td><td class="tl rm">Official CBI rate. Parallel market has traded materially wider — <b>medium confidence</b></td></tr>
    <tr><td class="tl">Iraqi market size, 2026</td><td class="tr">24.6 M m²</td><td class="tl rm">Bottom-up segment build; no published statistic exists — <b>low confidence, range 18–30M</b></td></tr>
    <tr><td class="tl">Market growth</td><td class="tr">6.5%/yr real</td><td class="tl rm">Construction sector forecast 4.8% plus penetration gain — <b>medium</b></td></tr>
    <tr><td class="tl">Weighted realised price</td><td class="tr">$2.212/m²</td><td class="tl rm">Triangulated from import economics; not verified in market — <b>low confidence</b></td></tr>
    <tr><td class="tl">Real price step-down</td><td class="tr">−7% over Y1–Y4</td><td class="tl rm">Competitive response to domestic entry — <b>judgement</b></td></tr>
    <tr><td class="tl">Facing paper CIF</td><td class="tr">$680/t</td><td class="tl rm">Specialty recycled linerboard, Iraq delivery — <b>medium</b></td></tr>
    <tr><td class="tl">Diesel</td><td class="tr">$0.28/litre</td><td class="tl rm">Above the $0.19 subsidised pump price for industrial supply — <b>medium-high</b></td></tr>
    <tr><td class="tl">Grid electricity</td><td class="tr">$0.046/kWh</td><td class="tl rm">Published business tariff, June 2025 — <b>high</b></td></tr>
    <tr><td class="tl">Grid availability</td><td class="tr">55%</td><td class="tl rm">Balance self-generated at $0.090/kWh — <b>medium</b></td></tr>
    <tr><td class="tl">Ore purity</td><td class="tr">90%</td><td class="tl rm">Fatha Formation with selective mining; unverified by drilling — <b>low-medium</b></td></tr>
    <tr><td class="tl">Contract mining</td><td class="tr">$4.20/t ROM</td><td class="tl rm">Soft rippable rock, no blasting — <b>medium</b></td></tr>
    <tr><td class="tl">Sustainable OEE</td><td class="tr">70%</td><td class="tl rm">Against 85–92% world class; deliberately conservative — <b>medium-high</b></td></tr>
    <tr><td class="tl">Dryer efficiency</td><td class="tr">58%</td><td class="tl rm">Yields 19.1 MJ/m², within the 15–25 industry range — <b>high</b></td></tr>
    <tr><td class="tl">Equipment cost</td><td class="tr">see §9</td><td class="tl rm">Engineering build-up; <b>no vendor quotations obtained</b> — <b>medium</b></td></tr>
    <tr><td class="tl">Contingency</td><td class="tr">10%</td><td class="tl rm">15% would be more usual for Iraqi greenfield — <b>judgement</b></td></tr>
    <tr><td class="tl">Tax exemption</td><td class="tr">10 years</td><td class="tl rm">NIC Law 13/2006; not yet granted — <b>condition precedent</b></td></tr>
    <tr><td class="tl">Real WACC</td><td class="tr">13.5%</td><td class="tl rm">Cost of equity ~18% incl. Iraq country risk premium — <b>judgement</b></td></tr>
    <tr><td class="tl">Terminal growth</td><td class="tr">2.0% real</td><td class="tl rm">— <b>judgement</b></td></tr>
    </tbody>
  </table>

  <h3>Method</h3>
  <p>The financial model is built in constant 2026 US dollars over a twenty-year explicit
  forecast with a Gordon-growth terminal value. Capital cost is a line-item build-up
  across twelve categories, cross-checked against a disclosed comparable project scaled by
  power law. Operating cost is derived from a stoichiometric mass balance and a thermal
  duty calculation rather than from percentage rules of thumb. Interest during
  construction is capitalised. Depreciation begins at first production. Working capital is
  modelled on 55-day receivables, 60-day inventory and 30-day payables.</p>

  <h3>Sources</h3>
  <ol class="src">
    <li>GlobalData / ResearchAndMarkets — <i>Iraq Construction Market Size, Trends and Forecasts to 2029</i> (2025): construction growth 5.5% in 2025, 4.8% AAGR 2026–29.</li>
    <li>Shafaq News; NIRIJ; UN-Habitat Iraq; Association of Arab Universities Journal of Engineering Sciences — Iraqi housing deficit, annual unit requirement, project delivery record.</li>
    <li>Iraqi Bulletin of Geology and Mining — <i>Gypsum Deposits in Iraq: An Overview</i>; Iraqi Geological Journal — Fatha Formation studies (Hit, Shaqlawa, Qara Darbandi).</li>
    <li>US Geological Survey — <i>The Mineral Industry of Iraq</i>; Iraq minerals country profile.</li>
    <li>Al Tiraz Al Sharqi Global — published project executive summary: investment size, mine and factory locations, capacity and product range.</li>
    <li>Volza trade data — Iraqi gypsum board import origins and shipment counts.</li>
    <li>GlobalPetrolPrices — Iraq business electricity tariff (June 2025) and diesel price.</li>
    <li>Playroll, ERI SalaryExpert, Rivermate — Iraqi wage levels, minimum wage and employer social security.</li>
    <li>IMARC Group — gypsum board manufacturing cost structure and raw-material intensity per m².</li>
    <li>Mondaq, Chambers and Partners, Iraqi law firm commentary — National Investment Law No. 13 of 2006 as amended; Law No. 38 of 2011 (minerals); 2026 customs tariff framework.</li>
    <li>Knauf corporate disclosures — regional manufacturing footprint (UAE, Oman, Syria).</li>
    <li>Mordor Intelligence — Middle East &amp; Africa gypsum board market size and growth.</li>
  </ol>

  <div class="foot">
    <b>Important notice.</b> This memorandum has been prepared for discussion purposes
    only, on the basis of publicly available information, engineering first principles and
    industry benchmarks. No vendor quotations, drilling results, audited financial
    statements, site visits or primary market surveys underpin it. Several central
    assumptions — notably Iraqi market size, realised selling prices and equipment cost —
    are explicitly identified as low or medium confidence and require verification before
    any capital commitment. Nothing in this document constitutes an offer to sell or a
    solicitation of an offer to buy any security, nor investment, legal, tax or
    engineering advice. Forward-looking statements are subject to risks and uncertainties
    that may cause actual results to differ materially. Recipients should conduct their
    own independent diligence and take their own professional advice.
  </div>
</div>

</body></html>
"""

open("report.html", "w").write(HTML)
print(f"[written] report.html  ({len(HTML):,} bytes)")
