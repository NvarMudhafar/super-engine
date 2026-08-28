#!/usr/bin/env python3
"""
Integrated Gypsum Wallboard Plant - Iraq (Anbar / Baghdad corridor)
Bankable feasibility model, v2.

CONVENTION: all figures in CONSTANT 2026 USD (real terms).
  - No general inflation is applied. Nominal price growth is assumed to track
    nominal cost growth; only REAL divergences are modelled.
  - Real price erosion is a one-off competitive step-down over Y1-Y4 as
    importers and a potential domestic entrant respond, then flat.
  - Real labour escalation +1.5%/yr (Iraqi wage convergence). Other real costs flat.
  - Discount rate is therefore a REAL WACC.
FX: IQD 1,320 = USD 1 (official CBI rate).
"""
import json
from collections import OrderedDict

FX = 1320.0

# =============================================================================
# 1. TECHNICAL DESIGN BASIS
# =============================================================================
LINE_WIDTH_M     = 1.20
LINE_SPEED_M_MIN = 25.0
SCHEDULED_HOURS  = 7920.0        # 24 h x 330 d
OEE_NAMEPLATE    = 0.84
OEE_SUSTAINABLE  = 0.70

inst_rate = LINE_WIDTH_M * LINE_SPEED_M_MIN * 60.0
nameplate_m2 = inst_rate * SCHEDULED_HOURS * OEE_NAMEPLATE
sustain_m2   = inst_rate * SCHEDULED_HOURS * OEE_SUSTAINABLE

PRODUCTS = OrderedDict([
    ("12.5 mm standard (Type A)",  dict(share=0.62, price=2.15, stucco=7.40, paper=0.42)),
    ("9.5 mm standard (ceiling)",  dict(share=0.20, price=1.80, stucco=5.60, paper=0.40)),
    ("12.5 mm moisture-resistant", dict(share=0.12, price=2.80, stucco=7.45, paper=0.44)),
    ("12.5 mm fire-resistant",     dict(share=0.06, price=3.05, stucco=7.55, paper=0.44)),
])
wavg_price  = sum(p["share"]*p["price"]  for p in PRODUCTS.values())
wavg_stucco = sum(p["share"]*p["stucco"] for p in PRODUCTS.values())
wavg_paper  = sum(p["share"]*p["paper"]  for p in PRODUCTS.values())

HEMI_MW, DIHY_MW = 145.15, 172.17
set_gain    = DIHY_MW/HEMI_MW
calcin_loss = 1.0 - HEMI_MW/DIHY_MW
ORE_PURITY, PROC_YIELD, QUARRY_LOSS = 0.90, 0.95, 0.08
MERCHANT_PLASTER_T = 40000.0

ROCK_PER_T_STUCCO = (1.0/(1.0-calcin_loss))/(ORE_PURITY*PROC_YIELD)
stucco_board_t = sustain_m2*wavg_stucco/1000.0
stucco_total_t = stucco_board_t + MERCHANT_PLASTER_T
rock_t = stucco_total_t*ROCK_PER_T_STUCCO/(1.0-QUARRY_LOSS)

WSR, LATENT, SENS, DRYER_EFF = 0.80, 2.26, 0.30, 0.58
free_water = wavg_stucco*WSR - wavg_stucco*(set_gain-1.0)
thermal_MJ_m2 = free_water*(LATENT+SENS)/DRYER_EFF

# =============================================================================
# 2. INPUT PRICES
# =============================================================================
PX = dict(diesel_usd_l=0.28, diesel_LHV=35.9, grid=0.046, selfgen=0.090, grid_share=0.55,
          paper_t=680.0, starch_t=520.0, foam_t=1900.0, additives=0.014, glue=0.008,
          packaging=0.022, maint_var=0.030, mining_t=4.20, royalty_t=0.80, crush_t=1.60, haul_t=3.50,
          grind_kwh=22.0, calc_kwh=18.0, calc_GJ=0.24, stucco_lab_t=2.10,
          reject=0.03, freight=0.060, commission=0.025)
PX["fuel_GJ"] = PX["diesel_usd_l"]/PX["diesel_LHV"]*1000.0
PX["power"]   = PX["grid_share"]*PX["grid"] + (1-PX["grid_share"])*PX["selfgen"]
BOARD_KWH_M2 = 1.11

rock_cost_t = PX["mining_t"]+PX["royalty_t"]+PX["crush_t"]+PX["haul_t"]  # 70 km Hit->Ramadi @ $0.05/t-km
stucco_cost_t = (rock_cost_t*ROCK_PER_T_STUCCO + PX["grind_kwh"]*PX["power"]
                 + PX["calc_kwh"]*PX["power"] + PX["calc_GJ"]*PX["fuel_GJ"] + PX["stucco_lab_t"])

vc = OrderedDict()
vc["Stucco (self-produced)"]  = wavg_stucco/1000.0*stucco_cost_t
vc["Facing paper (imported)"] = wavg_paper*PX["paper_t"]/1000.0
vc["Starch"]                  = 0.050*PX["starch_t"]/1000.0
vc["Foaming agent"]           = 0.009*PX["foam_t"]/1000.0
vc["Other additives"]         = PX["additives"]
vc["Edge adhesive"]           = PX["glue"]
vc["Dryer thermal energy"]    = thermal_MJ_m2/1000.0*PX["fuel_GJ"]
vc["Electrical power"]        = BOARD_KWH_M2*PX["power"]
vc["Packaging"]               = PX["packaging"]
vc["Maintenance consumables"] = PX["maint_var"]
vc["Reject / waste"]          = PX["reject"]*(wavg_stucco/1000.0*stucco_cost_t
                                 + wavg_paper*PX["paper_t"]/1000.0
                                 + thermal_MJ_m2/1000.0*PX["fuel_GJ"])
vc["Outbound freight"]        = PX["freight"]
vc["Distributor commission"]  = PX["commission"]*wavg_price
total_vc = sum(vc.values())
contribution = wavg_price - total_vc

# =============================================================================
# 3. FIXED COSTS
# =============================================================================
LABOUR = OrderedDict([
    ("Expatriate technical directors (2)",  dict(n=2,  usd=200000)),
    ("Plant / production management",       dict(n=4,  usd=40000)),
    ("Shift supervisors",                   dict(n=4,  usd=18000)),
    ("Board line operators (4 shifts)",     dict(n=32, usd=8400)),
    ("Calcination & crushing operators",    dict(n=16, usd=8400)),
    ("Quarry supervision (contract-mined)", dict(n=4,  usd=7800)),
    ("Maintenance technicians",             dict(n=14, usd=10200)),
    ("Laboratory & QC",                     dict(n=6,  usd=9600)),
    ("Warehouse & logistics",               dict(n=12, usd=7200)),
    ("Admin, finance, HR, IT",              dict(n=10, usd=12000)),
    ("Sales & technical services",          dict(n=12, usd=14400)),
    ("Security",                            dict(n=12, usd=6600)),
    ("Drivers & general services",          dict(n=10, usd=6600)),
])
headcount = sum(v["n"] for v in LABOUR.values())
BURDEN = 1.22
labour_cost = sum(v["n"]*v["usd"] for v in LABOUR.values())*BURDEN

FIXED = OrderedDict([
    ("Labour (fully burdened)",              labour_cost),
    ("Maintenance materials & contracts",    400000),
    ("Insurance (property, BI, liability)",  250000),
    ("Security services (contracted)",       220000),
    ("Utilities standing charges & water",   100000),
    ("Admin, IT, professional fees, travel", 350000),
    ("Vehicle fleet operating",              150000),
    ("Environmental, permits, licences",      80000),
    ("Training & development",                80000),
    ("Marketing & specification programme",  280000),
])
total_fixed = sum(FIXED.values())

# =============================================================================
# 4. CAPEX
# =============================================================================
CAPEX = OrderedDict([
 ("A. Land & site development", OrderedDict([
    ("Land lease premium, registration, NIC allocation", 350000),
    ("Perimeter wall, gatehouse, guard towers",          250000),
    ("Earthworks, grading, compaction",                  680000),
    ("Internal roads, hardstanding, drainage",           770000),
    ("Site utilities trenching & culverts",              300000)])),
 ("B. Buildings & civil works", OrderedDict([
    ("Production hall, 12,000 m2 (heavy slab)",         1680000),
    ("Board warehouse, 6,000 m2",                        630000),
    ("Climate-controlled paper store, 1,500 m2",         210000),
    ("Calcination / stucco building, 1,200 m2",          180000),
    ("Rock storage & retaining structures",              100000),
    ("Profiles & compounds hall, 2,800 m2 [Ph2]",        340000),
    ("Workshop, laboratory, MCC rooms, 1,000 m2",        190000),
    ("Administration, canteen, clinic, 1,100 m2",        250000),
    ("Weighbridges, gatehouse, ancillary",               120000)])),
 ("C. Quarry & rock handling", OrderedDict([
    ("Concession acquisition, drilling, resource report",350000),
    ("Primary jaw crusher & feed hopper",                340000),
    ("Secondary impactor & screening",                   280000),
    ("Conveyors, stockpiles, transfer",                  330000),
    ("Quarry access road & site preparation",            400000),
    ("Retained mobile equipment (loader, service)",      250000)])),
 ("D. Calcination & stucco plant (120 kt/yr)", OrderedDict([
    ("Powder line: mill, kettle calciner, cooler",      1850000),
    ("Bagging & palletising line",                       450000),
    ("BMA accelerator ball mill",                         80000),
    ("Conveying, silos, storage",                        300000),
    ("Area electrical & instrumentation",                300000)])),
 ("E. Board line (12.0 M m2 nameplate)", OrderedDict([
    ("Chinese main line: mixer, forming, belt, cutter", 1950000),
    ("Multi-deck dryer (6-deck, gas/diesel fired)",     1250000),
    ("Dry end: takeoff, saw, bundler, stacker",          550000),
    ("EU forming station & slurry mixer [upgrade]",      420000),
    ("EU dryer burner & moisture control [upgrade]",     280000),
    ("EU weighing/dosing & foam generation [upgrade]",   220000),
    ("Siemens/ABB PLC, SCADA & drives [upgrade]",        300000),
    ("Edge paper, pasting & glue systems",               180000),
    ("Board handling, conveyors, forklifts",             420000),
    ("Quality laboratory & test equipment",              160000)])),
 ("F. Steel profiles line [Ph2]", OrderedDict([
    ("Roll forming lines (stud/track, furring, angle)",  750000),
    ("Decoiler & slitting line",                         350000),
    ("Packaging & installation",                         220000)])),
 ("G. Jointing compounds plant [Ph2]", OrderedDict([
    ("Dry mix plant 30 kt/yr, silos, dosing, bagging",   650000),
    ("Installation & electrical",                        100000)])),
 ("H. Utilities & power", OrderedDict([
    ("Captive generation 5 MW (N+1), dual-fuel",         900000),
    ("HV/MV substation, transformers, switchgear",       850000),
    ("Grid connection (33 kV)",                          450000),
    ("Fuel storage, pumps, bunding",                     280000),
    ("Boreholes, treatment, 2,000 m3 storage",           420000),
    ("Fire fighting system & sprinklers",                380000),
    ("Compressed air plant",                             160000),
    ("Effluent & waste handling",                        100000)])),
 ("I. Installation, erection & commissioning", OrderedDict([
    ("Mechanical erection, piping, structural steel",   1730000),
    ("Electrical installation & cabling",                740000),
    ("Supplier supervision (expat engineers)",           550000),
    ("Commissioning, trials, ramp-up waste",             450000)])),
 ("J. Freight, insurance & import", OrderedDict([
    ("Ocean freight & port handling",                    750000),
    ("Inland transport to Anbar",                        450000),
    ("Marine insurance",                                 120000),
    ("Customs clearance & agency (duty-exempt, NIC)",    180000)])),
 ("K. Engineering, project management & permits", OrderedDict([
    ("Feasibility, FEED, detailed engineering",          550000),
    ("Owner's project management team (24 months)",      450000),
    ("Legal, NIC licence, EIA, mining licence",          300000),
    ("Operator training (China/Turkey + on-site)",       220000),
    ("Construction all-risk insurance",                  180000)])),
 ("L. Pre-operating & start-up", OrderedDict([
    ("Recruitment & payroll during construction",        450000),
    ("Critical spares package (12 months)",              550000),
    ("Brand launch & specification programme",           250000),
    ("Certification (COSQC, EN 520 / ASTM C1396)",       150000)])),
])
capex_sub = OrderedDict((k, sum(v.values())) for k, v in CAPEX.items())
PH2_KEYS = ["F. Steel profiles line [Ph2]", "G. Jointing compounds plant [Ph2]"]
PH2_BUILD = 340000
ph2_direct = sum(capex_sub[k] for k in PH2_KEYS) + PH2_BUILD
ph1_direct = sum(capex_sub.values()) - ph2_direct
CONT = 0.10
phase1_fixed = ph1_direct*(1+CONT)
phase2_fixed = ph2_direct*(1+CONT)*1.06
total_capex = phase1_fixed + phase2_fixed

# =============================================================================
# 5. OPERATING BUILD-UP  (real terms)
# =============================================================================
RAMP        = [0.0, 0.0, 0.35, 0.55, 0.70, 0.80] + [0.83]*15
PRICE_PATH  = [1.0, 1.0, 1.00, 0.98, 0.96, 0.94] + [0.93]*15
YEARS = len(RAMP)
PH2_START = 5
LABOUR_REAL_ESC = 0.015

MERCH_PRICE_T = 38.0
PROF_T, PROF_PX, PROF_VC = 9000.0, 1020.0, 880.0
COMP_T, COMP_PX, COMP_VC = 18000.0, 185.0, 105.0
PH2_FIXED_ADD = 850000

def opex_fixed(y, p2):
    lab = labour_cost*((1+LABOUR_REAL_ESC)**max(0, y-2))
    other = total_fixed - labour_cost
    return lab + other + (PH2_FIXED_ADD if p2 else 0.0)

def build(price_mult=1.0, vc_mult=1.0, util_mult=1.0, fixed_mult=1.0):
    rows = []
    for y in range(YEARS):
        util = min(1.0, RAMP[y]*util_mult)
        vol = nameplate_m2*util
        px = wavg_price*PRICE_PATH[y]*price_mult
        rev_b = vol*px
        merch = MERCHANT_PLASTER_T*min(1.0, util/0.70) if util > 0 else 0.0
        rev_m = merch*MERCH_PRICE_T*PRICE_PATH[y]*price_mult
        vc_m  = merch*stucco_cost_t*1.25*vc_mult
        p2 = y >= PH2_START
        rev_p = PROF_T*PROF_PX*PRICE_PATH[y]*price_mult if p2 else 0.0
        rev_c = COMP_T*COMP_PX*PRICE_PATH[y]*price_mult if p2 else 0.0
        vc_p  = PROF_T*PROF_VC*vc_mult if p2 else 0.0
        vc_c  = COMP_T*COMP_VC*vc_mult if p2 else 0.0
        rev = rev_b+rev_m+rev_p+rev_c
        vcost = vol*total_vc*vc_mult + vc_m + vc_p + vc_c
        fx = opex_fixed(y, p2)*fixed_mult if util > 0 else 0.0
        rows.append(dict(year=y, util=util, vol=vol, price=px, revenue=rev, vcost=vcost,
                         fixed=fx, ebitda=rev-vcost-fx,
                         rev_b=rev_b, rev_m=rev_m, rev_p=rev_p, rev_c=rev_c,
                         ebitda_board=rev_b+rev_m-(vol*total_vc*vc_mult+vc_m)-fx*0.82))
    return rows

rows = build()

capex_sched = [0.0]*YEARS
capex_sched[0] = phase1_fixed*0.45
capex_sched[1] = phase1_fixed*0.55
capex_sched[PH2_START-1] = phase2_fixed

AR_D, INV_D, AP_D = 55, 60, 30
def nwc_of(rows):
    return [0.0 if r["revenue"] == 0 else
            r["revenue"]*AR_D/365.0 + r["vcost"]*(INV_D-AP_D)/365.0 for r in rows]
nwc = nwc_of(rows)
dnwc = [nwc[0]]+[nwc[i]-nwc[i-1] for i in range(1, YEARS)]

BUILD_LIFE, PLANT_LIFE = 20, 12
bshare = (capex_sub["A. Land & site development"]+capex_sub["B. Buildings & civil works"])/sum(capex_sub.values())
pshare = 1-bshare
FIRST_PROD = 2
def dep_of(y, mult=1.0):
    d = 0.0
    for i, c in enumerate(capex_sched):
        if c == 0: continue
        start = max(FIRST_PROD, i+1)
        if y < start: continue
        d += c*mult*(bshare/BUILD_LIFE + pshare/PLANT_LIFE)
    return d

# =============================================================================
# 6. DEBT
# =============================================================================
china_pkg = (capex_sub["D. Calcination & stucco plant (120 kt/yr)"]
             + 4350000  # Chinese portion of board line (excl. EU upgrades)
             + capex_sub["F. Steel profiles line [Ph2]"]
             + capex_sub["G. Jointing compounds plant [Ph2]"]
             + 900000)  # gensets
ECA_RATE, ECA_TENOR, ECA_GRACE = 0.065, 10, 3
LOC_RATE, LOC_TENOR = 0.130, 7
eca_debt = china_pkg*0.85
local_debt = 7750000.0
total_debt = eca_debt+local_debt
peak_nwc_ramp = max(nwc[2:5])

# Interest during construction (Y0-Y1) is capitalised into project cost, not
# serviced from equity. Debt service begins at first production (Y2).
def idc():
    eca_avg = eca_debt*0.45; loc_avg = local_debt*0.45
    y0 = (eca_avg*ECA_RATE + loc_avg*LOC_RATE)*0.5
    y1 = (eca_debt*ECA_RATE + local_debt*LOC_RATE)*0.85
    return y0 + y1
IDC = idc()
project_cost_p1 = phase1_fixed + peak_nwc_ramp + IDC
equity_req = project_cost_p1 - total_debt

def debt_schedule():
    sched = []; eca_bal, loc_bal = eca_debt, local_debt
    for y in range(YEARS):
        if y < FIRST_PROD:
            sched.append(dict(year=y, interest=0.0, principal=0.0,
                              balance=eca_bal+loc_bal)); continue
        k = y - FIRST_PROD                      # years since start-up
        ei, li = eca_bal*ECA_RATE, loc_bal*LOC_RATE
        ep = eca_debt/(ECA_TENOR-ECA_GRACE) if ECA_GRACE <= k < ECA_TENOR else 0.0
        lp = local_debt/LOC_TENOR if 0 <= k < LOC_TENOR else 0.0
        ep, lp = min(ep, eca_bal), min(lp, loc_bal)
        eca_bal -= ep; loc_bal -= lp
        sched.append(dict(year=y, interest=ei+li, principal=ep+lp,
                          balance=eca_bal+loc_bal))
    return sched
debt = debt_schedule()

# =============================================================================
# 7. CASH FLOW & RETURNS
# =============================================================================
TAX, HOLIDAY, WACC, G = 0.15, 10, 0.135, 0.02
MAINT_CAPEX_PCT = 0.02

def cashflows(rows, capex_sched, dep_mult=1.0):
    out = []
    nw = nwc_of(rows)
    dn = [nw[0]]+[nw[i]-nw[i-1] for i in range(1, YEARS)]
    for y in range(YEARS):
        r = rows[y]
        d = dep_of(y, dep_mult)
        ebit = r["ebitda"]-d
        tax = 0.0 if y < HOLIDAY else max(0.0, ebit)*TAX
        maint = sum(capex_sched)*MAINT_CAPEX_PCT if r["util"] > 0 else 0.0
        fcf = r["ebitda"]-tax-capex_sched[y]-dn[y]-maint
        out.append(dict(year=y, ebitda=r["ebitda"], dep=d, ebit=ebit, tax=tax,
                        capex=capex_sched[y], maint=maint, dnwc=dn[y], fcf=fcf))
    return out
fcf = cashflows(rows, capex_sched)

def npv(rate, fl): return sum(f/(1+rate)**i for i, f in enumerate(fl))
def irr(fl, lo=-0.95, hi=5.0):
    f = lambda r: npv(r, fl)
    if f(lo)*f(hi) > 0: return None
    for _ in range(500):
        mid = (lo+hi)/2
        if f(lo)*f(mid) <= 0: hi = mid
        else: lo = mid
    return (lo+hi)/2

def returns(fcf, debt=None, equity=None):
    fl = [f["fcf"] for f in fcf]
    norm = fl[-1]
    tv = norm*(1+G)/(WACC-G)
    pf = fl[:]; pf[-1] += tv
    res = dict(tv=tv, npv=npv(WACC, pf), irr=irr(pf))
    if debt is not None:
        efl = []
        for y in range(YEARS):
            ds = debt[y]["interest"]+debt[y]["principal"]
            if y < FIRST_PROD:
                e = -(equity*(0.45 if y == 0 else 0.55))
            else:
                e = fcf[y]["fcf"] - ds
            efl.append(e)
        efl[-1] += tv - debt[-1]["balance"]
        res["eq_irr"] = irr(efl); res["eq_npv"] = npv(0.18, efl); res["eq_flows"] = efl
    return res
R = returns(fcf, debt, equity_req)

cum, payback = 0.0, None
for i in range(YEARS):
    prev = cum; cum += fcf[i]["fcf"]
    if prev < 0 <= cum and fcf[i]["fcf"]:
        payback = (i-FIRST_PROD)+abs(prev)/fcf[i]["fcf"]; break

# =============================================================================
# 8. SENSITIVITY
# =============================================================================
def scen(**kw):
    cm = kw.pop("capex_mult", 1.0)
    r2 = build(**kw)
    cs = [c*cm for c in capex_sched]
    f2 = cashflows(r2, cs, dep_mult=cm)
    return returns(f2)

CASES = [
 ("Base case", {}),
 ("Realised price −10%", dict(price_mult=0.90)),
 ("Realised price −20% (ATS at scale)", dict(price_mult=0.80)),
 ("Variable cost +15%", dict(vc_mult=1.15)),
 ("Facing paper +40% (VC +13%)", dict(vc_mult=1.13)),
 ("CAPEX overrun +25%", dict(capex_mult=1.25)),
 ("Utilisation −20% (ramp failure)", dict(util_mult=0.80)),
 ("Fixed costs +20%", dict(fixed_mult=1.20)),
 ("BEAR: px −15%, capex +20%, util −15%", dict(price_mult=0.85, capex_mult=1.20, util_mult=0.85)),
 ("BULL: px +10%, pipeline gas, util +8%", dict(price_mult=1.10, vc_mult=0.93, util_mult=1.08)),
]
SENS = [(n, scen(**kw)) for n, kw in CASES]

# =============================================================================
# 9. BUDGET-CONSTRAINED VARIANTS - solved, not assumed
# =============================================================================
def variant(scale, integrated=True):
    """Scaled project cost. Power-law scaling on process equipment
    (0.65-0.70 exponent); civils and soft costs scale sub-linearly."""
    board = 4350000*(scale**0.70) + 2150000*(scale**0.35)   # EU upgrades barely scale
    calc  = capex_sub["D. Calcination & stucco plant (120 kt/yr)"]*(scale**0.65) if integrated else 550000
    quar  = capex_sub["C. Quarry & rock handling"]*(scale**0.30) if integrated else 0.0
    build = (capex_sub["B. Buildings & civil works"]-PH2_BUILD)*(scale**0.55)
    site  = capex_sub["A. Land & site development"]*(scale**0.40)
    util  = capex_sub["H. Utilities & power"]*(scale**0.55)
    inst  = (board+calc)*0.28
    frt   = capex_sub["J. Freight, insurance & import"]*(scale**0.60)
    eng   = capex_sub["K. Engineering, project management & permits"]*(scale**0.40)
    pre   = capex_sub["L. Pre-operating & start-up"]*(scale**0.45)
    direct= board+calc+quar+build+site+util+inst+frt+eng+pre
    fixed = direct*1.10
    wc    = peak_nwc_ramp*scale*(1.0 if integrated else 1.25)
    return dict(scale=scale, nameplate=nameplate_m2*scale, direct=direct,
                fixed=fixed, wc=wc, total=fixed+wc,
                intensity=fixed/(nameplate_m2*scale))

def solve_scale(budget, integrated=True):
    lo, hi = 0.05, 1.0
    for _ in range(200):
        mid = (lo+hi)/2
        if variant(mid, integrated)["total"] > budget: hi = mid
        else: lo = mid
    return (lo+hi)/2

BUDGET = 20e6
s_int = solve_scale(BUDGET, True)
s_non = solve_scale(BUDGET, False)
V_int, V_non = variant(s_int, True), variant(s_non, False)
V_full = variant(1.0, True)

# =============================================================================
# OUTPUT
# =============================================================================
W = 80
def hr(t=""):
    print("="*W);
    if t: print(t); print("="*W)

hr("1. TECHNICAL BASIS")
print(f"  Instantaneous rate              {inst_rate:,.0f} m2/h")
print(f"  Nameplate capacity              {nameplate_m2/1e6:,.2f} M m2/yr  (OEE {OEE_NAMEPLATE:.0%})")
print(f"  Sustainable output              {sustain_m2/1e6:,.2f} M m2/yr  (OEE {OEE_SUSTAINABLE:.0%})")
print(f"  Weighted realised price         ${wavg_price:,.3f}/m2")
print(f"  Weighted stucco intensity       {wavg_stucco:,.2f} kg/m2")
print(f"  Weighted paper intensity        {wavg_paper:,.3f} kg/m2")
print(f"  ROM rock per t stucco           {ROCK_PER_T_STUCCO:,.3f} t")
print(f"  Stucco for board                {stucco_board_t:,.0f} t/yr")
print(f"  Stucco incl. merchant plaster   {stucco_total_t:,.0f} t/yr")
print(f"  ROM rock required               {rock_t:,.0f} t/yr")
print(f"  Free water evaporated           {free_water:,.2f} kg/m2")
print(f"  Dryer thermal duty              {thermal_MJ_m2:,.1f} MJ/m2")
print(f"  Fuel cost                       ${PX['fuel_GJ']:,.2f}/GJ")
print(f"  Blended power cost              ${PX['power']:,.4f}/kWh")
print(f"  Rock cost at plant gate         ${rock_cost_t:,.2f}/t  (incl. 70 km haul)")
print(f"  Stucco cash cost                ${stucco_cost_t:,.2f}/t")

hr("2. VARIABLE COST ($/m2)")
for k, v in vc.items(): print(f"  {k:<34}{v:>8.4f}  {v/total_vc*100:>5.1f}%")
print(f"  {'TOTAL VARIABLE':<34}{total_vc:>8.4f}")
print(f"  {'Realised price':<34}{wavg_price:>8.4f}")
print(f"  {'CONTRIBUTION':<34}{contribution:>8.4f}  {contribution/wavg_price*100:>5.1f}%")

hr(f"3. FIXED COSTS  (headcount {headcount})")
for k, v in FIXED.items(): print(f"  {k:<42}{v:>12,.0f}")
print(f"  {'TOTAL FIXED':<42}{total_fixed:>12,.0f}")
print(f"  Fixed per m2 @ sustainable      ${total_fixed/sustain_m2:,.4f}")
print(f"  TOTAL CASH COST per m2          ${total_vc+total_fixed/sustain_m2:,.4f}")
print(f"  Cash margin per m2              ${wavg_price-(total_vc+total_fixed/sustain_m2):,.4f}")

hr("4. CAPEX ($M)")
for k, v in capex_sub.items(): print(f"  {k:<50}{v/1e6:>7.2f}")
print(f"  {'Direct sub-total':<50}{sum(capex_sub.values())/1e6:>7.2f}")
print(f"  {'Contingency @10%':<50}{sum(capex_sub.values())*CONT/1e6:>7.2f}")
print(f"  {'TOTAL FIXED CAPEX':<50}{total_capex/1e6:>7.2f}")
print(f"      Phase 1{'':<43}{phase1_fixed/1e6:>7.2f}")
print(f"      Phase 2{'':<43}{phase2_fixed/1e6:>7.2f}")
print(f"  CAPEX intensity  ${phase1_fixed/nameplate_m2:,.2f}/m2 of annual nameplate")

hr("5. CAPITAL STRUCTURE - PHASE 1")
print(f"  Phase 1 fixed capex                          {phase1_fixed/1e6:>7.2f}")
print(f"  Working capital at ramp                      {peak_nwc_ramp/1e6:>7.2f}")
print(f"  TOTAL PHASE 1 PROJECT COST                   {project_cost_p1/1e6:>7.2f}")
print(f"  ---")
print(f"  China-origin equipment package               {china_pkg/1e6:>7.2f}")
print(f"  ECA / Sinosure buyer credit @85%             {eca_debt/1e6:>7.2f}  ({ECA_RATE:.1%}, {ECA_TENOR}y, {ECA_GRACE}y grace)")
print(f"  Local bank / vendor facility                 {local_debt/1e6:>7.2f}  ({LOC_RATE:.1%}, {LOC_TENOR}y)")
print(f"  TOTAL DEBT                                   {total_debt/1e6:>7.2f}  ({total_debt/project_cost_p1:.0%} gearing)")
print(f"  SPONSOR EQUITY REQUIRED                      {equity_req/1e6:>7.2f}")
print(f"  Interest during construction (capitalised)   {IDC/1e6:>7.2f}")
_dscr=[(y, rows[y]["ebitda"]/(debt[y]["interest"]+debt[y]["principal"]))
       for y in range(FIRST_PROD, YEARS) if (debt[y]["interest"]+debt[y]["principal"])>10000]
print(f"  Min DSCR                                     {min(v for _,v in _dscr):>7.2f}x  (year {min(_dscr,key=lambda t:t[1])[0]})")
print(f"  Avg DSCR over debt life                      {sum(v for _,v in _dscr)/len(_dscr):>7.2f}x")

hr("6. P&L / CASH FLOW ($M, real 2026)")
h = f"{'Yr':<3}{'Util':>6}{'Vol':>7}{'Px':>6}{'Rev':>8}{'VC':>8}{'Fix':>7}{'EBITDA':>8}{'Mgn':>6}{'Dep':>7}{'Capex':>8}{'FCF':>8}"
print(h); print("-"*len(h))
for i in range(YEARS):
    r, f = rows[i], fcf[i]
    mg = r["ebitda"]/r["revenue"]*100 if r["revenue"] else 0
    print(f"{i:<3}{r['util']*100:>5.0f}%{r['vol']/1e6:>7.2f}{r['price']:>6.2f}{r['revenue']/1e6:>8.2f}"
          f"{r['vcost']/1e6:>8.2f}{r['fixed']/1e6:>7.2f}{r['ebitda']/1e6:>8.2f}{mg:>5.0f}%"
          f"{f['dep']/1e6:>7.2f}{f['capex']/1e6:>8.2f}{f['fcf']/1e6:>8.2f}")

hr("7. RETURNS")
ss = rows[-1]
print(f"  Real WACC                        {WACC:.1%}")
print(f"  Terminal growth (real)           {G:.1%}")
print(f"  Terminal value                   ${R['tv']/1e6:,.2f}M")
print(f"  PROJECT NPV @ {WACC:.1%}             ${R['npv']/1e6:,.2f}M")
print(f"  PROJECT IRR (real, ungeared)     {R['irr']*100:,.1f}%" if R['irr'] else "  n/a")
print(f"  EQUITY IRR (real, geared)        {R['eq_irr']*100:,.1f}%" if R.get('eq_irr') else "  n/a")
print(f"  Payback from start-up            {payback:,.1f} yrs" if payback else "  >horizon")
print(f"  Steady-state revenue             ${ss['revenue']/1e6:,.2f}M")
print(f"  Steady-state EBITDA              ${ss['ebitda']/1e6:,.2f}M  ({ss['ebitda']/ss['revenue']*100:.0f}%)")
b5 = rows[4]
print(f"  Board-only EBITDA margin (Y4)    {b5['ebitda_board']/(b5['rev_b']+b5['rev_m'])*100:,.0f}%")

hr("8. SENSITIVITY")
print(f"  {'Case':<44}{'IRR':>9}{'NPV $M':>11}")
print("  "+"-"*64)
for n, r in SENS:
    i = f"{r['irr']*100:,.1f}%" if r['irr'] else "n/m"
    print(f"  {n:<44}{i:>9}{r['npv']/1e6:>11.2f}")

hr("9. BREAK-EVEN")
be_v = total_fixed/contribution
be_p = total_vc+total_fixed/sustain_m2
print(f"  Cash break-even volume           {be_v/1e6:,.2f} M m2 ({be_v/nameplate_m2*100:.0f}% of nameplate)")
print(f"  Cash break-even price            ${be_p:,.3f}/m2  (vs ${wavg_price:,.3f} base)")
print(f"  Price headroom to cash loss      {(1-be_p/wavg_price)*100:,.0f}%")

hr("10. WHAT ACTUALLY FITS A $20M TOTAL-PROJECT-COST CEILING")
print(f"  {'Variant':<40}{'Nameplate':>12}{'Total $M':>11}{'$/m2':>8}")
print("  "+"-"*70)
print(f"  {'Full scope, integrated (recommended)':<40}{V_full['nameplate']/1e6:>10.2f}M{V_full['total']/1e6:>11.2f}{V_full['intensity']:>8.2f}")
print(f"  {'Integrated, scaled to fit $20M':<40}{V_int['nameplate']/1e6:>10.2f}M{V_int['total']/1e6:>11.2f}{V_int['intensity']:>8.2f}")
print(f"  {'Board-only (buy stucco), fit $20M':<40}{V_non['nameplate']/1e6:>10.2f}M{V_non['total']/1e6:>11.2f}{V_non['intensity']:>8.2f}")
print()
print(f"  => An INTEGRATED plant capped at $20M total cost tops out at")
print(f"     {V_int['nameplate']/1e6:,.2f} M m2/yr - only {s_int*100:,.0f}% of the {nameplate_m2/1e6:,.1f} M m2 target,")
print(f"     at a CAPEX intensity of ${V_int['intensity']:,.2f}/m2 vs ${V_full['intensity']:,.2f}/m2 at full scale.")
print(f"  => Equity required for the FULL project is ${equity_req/1e6:,.2f}M, which DOES")
print(f"     sit inside a $20M equity envelope once ${total_debt/1e6:,.2f}M of debt is raised.")

json.dump(dict(
    tech=dict(inst_rate=inst_rate, nameplate=nameplate_m2, sustainable=sustain_m2,
              price=wavg_price, stucco=wavg_stucco, paper=wavg_paper,
              rock_per_t=ROCK_PER_T_STUCCO, stucco_board=stucco_board_t,
              stucco_total=stucco_total_t, rock=rock_t, thermal=thermal_MJ_m2,
              free_water=free_water, stucco_cost=stucco_cost_t, power=PX["power"],
              fuel_GJ=PX["fuel_GJ"], headcount=headcount, ore_purity=ORE_PURITY),
    products={k: dict(v) for k, v in PRODUCTS.items()},
    vc=dict(vc), total_vc=total_vc, contribution=contribution,
    fixed=dict(FIXED), total_fixed=total_fixed, labour={k: dict(v) for k, v in LABOUR.items()},
    capex={k: dict(v) for k, v in CAPEX.items()}, capex_sub=dict(capex_sub),
    phase1=phase1_fixed, phase2=phase2_fixed, total_capex=total_capex,
    rows=rows, fcf=fcf, debt=debt, nwc=nwc,
    returns=dict(npv=R["npv"], irr=R["irr"], eq_irr=R.get("eq_irr"), tv=R["tv"],
                 payback=payback, wacc=WACC),
    capital=dict(china=china_pkg, eca=eca_debt, local=local_debt, debt=total_debt,
                 equity=equity_req, total=project_cost_p1, gearing=total_debt/project_cost_p1),
    sens=[(n, r["irr"], r["npv"]) for n, r in SENS],
    breakeven=dict(volume=be_v, price=be_p),
    variants=dict(full=V_full, integrated_20m=V_int, boardonly_20m=V_non,
                  budget=BUDGET),
    idc=IDC,
    dscr=dict(minimum=min(v for _,v in _dscr), average=sum(v for _,v in _dscr)/len(_dscr)),
), open("model_out.json", "w"), indent=2, default=str)
print("\n[written] model_out.json")
