# Integrated Gypsum Wallboard Plant — Iraq

Bankable feasibility study and investment memorandum for a vertically integrated
gypsum wallboard plant in the Anbar–Baghdad corridor.

**Deliverable:** `Iraq_Gypsum_Wallboard_Plant_Investment_Memorandum.pdf` (35 pages)

## Headline conclusions

| Metric | Value |
|---|---|
| Nameplate capacity | 12.0 M m²/yr (10.0 M m² sustainable at 70% OEE) |
| Total project cost, Phase 1 | $36.1M incl. working capital and IDC |
| Sponsor equity at 46% gearing | $19.6M |
| Project IRR (real, ungeared) | 15.5% vs 13.5% real WACC |
| NPV @ 13.5% | $5.5M |
| Steady-state EBITDA | $8.1M on $33.5M revenue (24%; 38% on board alone) |
| Cash break-even | 26% of nameplate; 41% price headroom |

Three findings drive the recommendation:

1. **The brief does not fit the budget.** A fully integrated 12 M m² plant with a
   complete wall system cannot be built for under $20M — it costs $36.1M. Capped at
   $20M, an integrated plant tops out at 4.6 M m² at 58% worse capital intensity.
   The resolution is financing, not downsizing: ECA-backed buyer credit against the
   Chinese equipment package brings the equity cheque to $19.6M.
2. **A named competitor is pursuing an identical project.** Al Tiraz Al Sharqi Global
   has published a $63.8M plan for an integrated mine at Hit and factory outside
   Ramadi at 40 M m²/yr — same corridor, same strategy, four times the scale.
3. **Returns are real but thin.** A 2.0 point spread over WACC leaves little tolerance
   for adverse movement; a 10% price miss takes IRR below cost of capital.

## Model

Constant 2026 USD, 20-year explicit forecast plus Gordon-growth terminal value.
Pure-stdlib Python — no external dependencies.

| File | Purpose |
|---|---|
| `model/model3.py` | Core model: mass/energy balance, CAPEX, OPEX, DCF, sensitivities, financing |
| `model/aux.py` | Demand model, site-selection matrix, landed-cost comparison |
| `model/haul.py` | Rock-haulage cost by candidate site |
| `model/charts.py` | SVG chart primitives (validated dataviz palette, light mode) |
| `model/build_report.py` | Assembles `report.html` from model outputs |
| `model/run.txt` | Full model console output |

## Reproducing

```sh
cd model
python3 model3.py > run.txt      # writes model_out.json
python3 aux.py                   # writes aux_out.json
python3 build_report.py          # writes report.html
chromium --headless --no-pdf-header-footer \
  --print-to-pdf=../Iraq_Gypsum_Wallboard_Plant_Investment_Memorandum.pdf \
  file://$PWD/report.html
```

## Caveats

Prepared from public sources, engineering first principles and industry benchmarks.
No vendor quotations, drill results, site visits or primary market surveys underpin it.
Iraqi market size, realised selling prices and equipment cost are explicitly flagged as
low-to-medium confidence in Appendix A and require verification before capital commitment.
