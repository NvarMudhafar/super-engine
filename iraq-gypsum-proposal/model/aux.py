import json
# ---------------- DEMAND MODEL (bottom-up, 2026) ----------------
POP, POP_G = 46.0e6, 0.025
SEG = [
 ("New formal residential completions", 135000, 47.0, "units/yr x m2/unit (55% drywall penetration)"),
 ("Residential renovation & re-ceiling", 140000, 45.0, "2% of ~7.0M dwelling stock x m2"),
 ("Commercial, retail, offices, hotels",  1.0,  2500000.0, "fit-out m2"),
 ("Institutional (schools, health, govt)",1.0,  2000000.0, "m2"),
 ("Post-conflict reconstruction",         1.0,  3500000.0, "Mosul/Anbar/Salah al-Din, m2"),
 ("Informal & self-build",                1.0,  4000000.0, "m2"),
]
tot = 0.0
print("="*76); print("IRAQ PLASTERBOARD DEMAND MODEL, 2026 (bottom-up)"); print("="*76)
for n,a,b,note in SEG:
    v=a*b; tot+=v
    print(f"  {n:<40}{v/1e6:>8.2f} M m2   {note}")
print(f"  {'TOTAL ADDRESSABLE DEMAND':<40}{tot/1e6:>8.2f} M m2")
print(f"  Implied per-capita consumption          {tot/POP:>8.2f} m2/capita")
print(f"  (US ~11 · Asia 1-2 · Iraq est. 0.5-0.8)")
CAGR=0.065
print(f"\n  Market projection @ {CAGR:.1%} CAGR")
for i,y in enumerate(range(2026,2034)):
    print(f"    {y}   {tot*(1+CAGR)**i/1e6:>6.2f} M m2")
mkt2032 = tot*(1+CAGR)**6

# ---------------- SITE SELECTION ----------------
CRIT = [("Gypsum resource proximity & quality",0.22),("Market access (Baghdad + national)",0.20),
        ("Power & fuel availability",0.15),("Security & operating stability",0.15),
        ("Road logistics & infrastructure",0.10),("Labour availability & skills",0.08),
        ("Investment incentives & land",0.06),("Water availability",0.04)]
SITES = {
 "Kubaisa / Hit (Anbar)":            [10,5,4,6,5,5,8,6],
 "Ramadi outskirts (Hwy 11)":        [8,7,6,7,8,7,8,8],
 "Amiriyat al-Fallujah (Anbar)":     [6,9,7,7,9,8,8,8],
 "Karbala industrial zone":          [3,8,7,9,8,8,7,7],
 "Baghdad (Taji / Abu Ghraib)":      [2,10,7,7,9,9,6,8],
}
print("\n"+"="*76); print("SITE SELECTION - WEIGHTED SCORING"); print("="*76)
print(f"  {'Criterion':<38}{'Wt':>5}"+"".join(f"{k.split(' (')[0][:11]:>13}" for k in SITES))
scores={k:0.0 for k in SITES}
for i,(c,w) in enumerate(CRIT):
    row=f"  {c:<38}{w*100:>4.0f}%"
    for k in SITES:
        row+=f"{SITES[k][i]:>13}"; scores[k]+=w*SITES[k][i]
    print(row)
print(f"  {'WEIGHTED SCORE':<38}{'':>5}"+"".join(f"{scores[k]:>13.2f}" for k in SITES))
rank=sorted(scores.items(),key=lambda t:-t[1])
print("\n  Ranking:")
for i,(k,v) in enumerate(rank,1): print(f"    {i}. {k:<36}{v:.2f}")

# ---------------- LANDED-COST COMPARISON vs TURKISH IMPORT ----------------
print("\n"+"="*76); print("LANDED COST: TURKISH IMPORT vs DOMESTIC PRODUCTION ($/m2, 12.5mm)"); print("="*76)
imp=[("Turkish ex-works",1.85),("Road freight to Baghdad (~1,300 km)",0.34),
     ("Customs duty (10%) + reconstruction levy (5%)",0.28),("Clearance, handling, demurrage",0.09),
     ("Importer margin",0.22)]
c=0
for n,v in imp: c+=v; print(f"  {n:<46}{v:>7.2f}{c:>9.2f}")
print(f"  {'LANDED WHOLESALE, BAGHDAD':<46}{'':>7}{c:>9.2f}")
dom_cash=1.2778; dom_px=2.212
print(f"\n  {'Domestic cash cost (this project)':<46}{'':>7}{dom_cash:>9.2f}")
print(f"  {'Domestic ex-works target price':<46}{'':>7}{dom_px:>9.2f}")
print(f"  {'Domestic margin per m2':<46}{'':>7}{dom_px-dom_cash:>9.2f}")
print(f"  {'Price umbrella vs import':<46}{'':>7}{c-dom_px:>9.2f}  ({(c-dom_px)/c*100:.0f}% below landed import)")

# ---------------- SHARE ----------------
print("\n"+"="*76); print("MARKET SHARE IMPLIED"); print("="*76)
print(f"  Sustainable output 9.98 M m2 as share of 2026 market  {9.98/(tot/1e6)*100:>5.1f}%")
print(f"  ... as share of 2032 market ({mkt2032/1e6:.1f} M m2)          {9.98/(mkt2032/1e6)*100:>5.1f}%")
print(f"  If ATS 40 M m2 also builds, total domestic capacity   {(40+9.98):.1f} M m2 vs {mkt2032/1e6:.1f} M m2 demand")
print(f"  => implied utilisation across industry               {mkt2032/1e6/(40+9.98)*100:>5.0f}%")

json.dump(dict(demand=dict(total=tot,percap=tot/POP,cagr=CAGR,
                           segments=[(n,a*b,note) for n,a,b,note in SEG],
                           proj={2026+i:tot*(1+CAGR)**i for i in range(8)}),
               sites=dict(criteria=CRIT,scores=scores,raw=SITES,rank=rank),
               landed=dict(items=imp,total=c,dom_cash=dom_cash,dom_px=dom_px)),
          open("aux_out.json","w"),indent=2,default=str)
