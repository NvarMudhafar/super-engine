RATE=0.05   # $/t-km, bulk road freight Iraq
ROCK_T, PROD_T = 166482.0, 130000.0     # ROM rock in, board+plaster out
ROCK_PER_STUCCO, STUCCO_T = 1.387, 110403.0
BOARD_M2 = 9.98e6
SITES=[("Kubaisa / Hit (at quarry)",       0, 185),
       ("Ramadi outskirts (Hwy 11)",      70, 110),
       ("Amiriyat al-Fallujah",          130,  60),
       ("Karbala industrial zone",       230, 105),
       ("Baghdad (Taji / Abu Ghraib)",   190,  25)]
print("="*94)
print("TOTAL ROAD LOGISTICS BY SITE  (rock inbound + finished goods outbound)")
print("="*94)
print(f"  {'Site':<30}{'km→rock':>9}{'km→mkt':>8}{'Rock $/yr':>12}{'Prod $/yr':>12}{'TOTAL $/yr':>12}{'$/m2 brd':>10}")
print("  "+"-"*90)
res=[]
for n,dr,dm in SITES:
    rc=ROCK_T*dr*RATE; pc=PROD_T*dm*RATE; tot=rc+pc
    res.append((n,dr,dm,rc,pc,tot))
    print(f"  {n:<30}{dr:>9}{dm:>8}{rc/1e6:>11.2f}M{pc/1e6:>11.2f}M{tot/1e6:>11.2f}M{tot/BOARD_M2:>10.3f}")
best=min(res,key=lambda r:r[5])
print(f"\n  Lowest total logistics: {best[0]}  (${best[5]/1e6:,.2f}M/yr)")
print(f"  Spread best→worst: ${(max(r[5] for r in res)-best[5])/1e6:,.2f}M/yr\n")
print("="*94)
print("EFFECT OF ROCK HAULAGE ON STUCCO COST ($/t)")
print("="*94)
base=15.76
for n,dr,dm,rc,pc,tot in res:
    add=dr*RATE*ROCK_PER_STUCCO
    print(f"  {n:<30} haul {dr:>3} km → +${add:>5.2f}/t stucco → ${base+add:>6.2f}/t   "
          f"board +${add*7.06/1000:>6.4f}/m2")
