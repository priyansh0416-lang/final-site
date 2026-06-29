from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import logging
import math
import random
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
import uuid
from datetime import datetime, timezone

try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
except ModuleNotFoundError:
    LlmChat = None
    UserMessage = None
    TextDelta = None
    StreamDone = None

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

app = FastAPI(title="FOX I Portfolio Intelligence API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# -------------------------------------------------------------------
# Static institutional datasets (curated, deterministic)
# -------------------------------------------------------------------

ASSET_ASSUMPTIONS = {
    # annualized expected return, annualized vol, correlation buckets
    "equities":     {"mu": 0.085, "sigma": 0.165, "label": "Global Equities"},
    "bonds":        {"mu": 0.040, "sigma": 0.060, "label": "Global Bonds"},
    "gold":         {"mu": 0.055, "sigma": 0.150, "label": "Gold"},
    "real_estate":  {"mu": 0.070, "sigma": 0.140, "label": "Real Estate"},
    "cash":         {"mu": 0.030, "sigma": 0.010, "label": "Cash / T-Bills"},
    "fox_fx":       {"mu": 0.092, "sigma": 0.075, "label": "FOX I FX Strategy"},
}

# Curated historical stress scenarios (monthly index path, base = 100)
SCENARIOS = {
    "gfc_2008": {
        "id": "gfc_2008",
        "name": "Global Financial Crisis (2008–2009)",
        "summary": "Lehman collapse, credit freeze, USD funding squeeze. Equities -52%, USD strengthened, carry trades unwound violently.",
        "period": "Oct 2007 – Mar 2009",
        "months": 18,
        "equities_path": [100, 98, 96, 92, 88, 81, 78, 72, 66, 60, 54, 48, 51, 49, 47, 50, 54, 58],
        "bonds_path":    [100, 100, 101, 102, 103, 104, 104, 103, 105, 107, 109, 110, 108, 109, 110, 111, 112, 113],
        "fx_path":       [100, 101, 101, 102, 103, 103, 102, 103, 105, 106, 107, 107, 106, 106, 107, 108, 109, 110],
        "narrative": "USD funding stress and yen repatriation flows produced uncorrelated FX returns even as risk assets collapsed."
    },
    "covid_2020": {
        "id": "covid_2020",
        "name": "COVID-19 Crash & Recovery (Feb–Dec 2020)",
        "summary": "Fastest 30% drawdown in S&P history, EM FX shock, then unprecedented liquidity-driven rebound.",
        "period": "Feb 2020 – Dec 2020",
        "months": 11,
        "equities_path": [100, 88, 72, 79, 85, 88, 92, 95, 90, 96, 102, 108],
        "bonds_path":    [100, 102, 105, 103, 104, 105, 105, 104, 105, 106, 106, 107],
        "fx_path":       [100, 102, 104, 103, 102, 102, 103, 104, 105, 105, 106, 107],
        "narrative": "Macro positioning across DM/EM funding pairs and vol carry overlays cushioned the equity drawdown."
    },
    "inr_depreciation": {
        "id": "inr_depreciation",
        "name": "INR Depreciation Cycle (2013–2014 & 2022–2023)",
        "summary": "Taper tantrum + Fed hiking cycles drove USD/INR from 54 → 84. Indian investors saw 35%+ USD-asset uplift in local terms.",
        "period": "May 2013 – Dec 2023 (synthesized)",
        "months": 24,
        "equities_path": [100, 99, 97, 95, 96, 98, 100, 102, 104, 103, 105, 107, 109, 111, 110, 113, 116, 118, 121, 124, 127, 129, 131, 134],
        "bonds_path":    [100, 100, 99, 98, 99, 100, 100, 101, 102, 103, 103, 102, 101, 100, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108],
        "fx_path":       [100, 102, 104, 106, 107, 108, 110, 112, 114, 115, 117, 119, 121, 123, 125, 127, 129, 131, 134, 136, 138, 141, 143, 146],
        "narrative": "Strategic USD/EM-FX exposure converted local-currency erosion into a tailwind — a structural diversification benefit."
    },
    "fed_hikes_2022": {
        "id": "fed_hikes_2022",
        "name": "Fed Hiking Cycle (2022)",
        "summary": "75bp jumbo hikes, DXY +19%, 60/40 portfolios down 17% — the worst stock+bond year in a century.",
        "period": "Jan 2022 – Dec 2022",
        "months": 12,
        "equities_path": [100, 96, 92, 88, 85, 82, 84, 82, 78, 80, 83, 83],
        "bonds_path":    [100, 98, 95, 93, 91, 90, 89, 88, 86, 86, 87, 87],
        "fx_path":       [100, 102, 104, 107, 109, 111, 112, 114, 115, 113, 112, 110],
        "narrative": "When stocks and bonds fell together, USD strength and rate-differential carry were among the only positive contributors."
    },
    "geopolitical_2022": {
        "id": "geopolitical_2022",
        "name": "Russia–Ukraine Energy Shock (Feb 2022)",
        "summary": "Commodity spike, EUR -8%, CHF safe-haven bid. Macro FX overlays dominated returns in Q1 2022.",
        "period": "Feb 2022 – Aug 2022",
        "months": 8,
        "equities_path": [100, 94, 91, 89, 86, 85, 88, 90],
        "bonds_path":    [100, 99, 97, 96, 95, 94, 95, 96],
        "fx_path":       [100, 103, 105, 107, 108, 110, 111, 112],
        "narrative": "Long USD / short EUR and long CHF positioning provided clear convex protection vs traditional 60/40."
    },
    "inflation_2021": {
        "id": "inflation_2021",
        "name": "Inflation Cycle (2021–2023)",
        "summary": "Sticky CPI, real-yield rerating, currency winners/losers driven by central-bank divergence.",
        "period": "Jun 2021 – Dec 2023",
        "months": 30,
        "equities_path": [100, 102, 104, 103, 101, 99, 96, 94, 92, 90, 88, 86, 85, 88, 90, 92, 94, 96, 98, 100, 102, 104, 106, 108, 110, 112, 113, 115, 117, 119],
        "bonds_path":    [100, 99, 98, 97, 95, 93, 91, 90, 88, 87, 85, 84, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100],
        "fx_path":       [100, 101, 102, 103, 104, 106, 108, 110, 112, 114, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135],
        "narrative": "Central-bank divergence (Fed hiking, BoJ pinned) created persistent, exploitable carry and momentum signals."
    },
}

CASE_STUDIES = [
    {
        "id": "porsche-2008",
        "company": "Porsche AG",
        "year": 2008,
        "title": "How Porsche used FX & options to monetize a VW position",
        "sector": "Automotive",
        "summary": "Porsche used cash-settled options and aggressive currency hedging on USD revenue to fund its VW stake build-up — turning treasury into a profit center that briefly out-earned car sales.",
        "lesson": "FX & derivatives, when professionally managed, can convert a passive treasury function into a strategic alpha source."
    },
    {
        "id": "ge-1990s",
        "company": "General Electric",
        "year": 1995,
        "title": "GE's centralized FX desk saved $200M annually",
        "sector": "Industrial",
        "summary": "GE consolidated 100+ subsidiary FX exposures into a netted, centralized hedging program — reducing transaction costs and basis risk while standardizing risk metrics.",
        "lesson": "Netting and centralization is the single highest-ROI institutional FX practice."
    },
    {
        "id": "norges-bank",
        "company": "Norway's Sovereign Wealth Fund (NBIM)",
        "year": 2023,
        "title": "$1.4T fund's strategic currency allocation",
        "sector": "Sovereign Wealth",
        "summary": "NBIM holds a benchmark of ~70% equities + 30% bonds across 70+ currencies. Their public methodology shows currency risk is deliberately *not* fully hedged — it's an intentional diversifier.",
        "lesson": "The world's most sophisticated investors treat FX exposure as an asset class, not a residual."
    },
    {
        "id": "harvard-endowment",
        "company": "Harvard Management Company",
        "year": 2019,
        "title": "Endowment-style multi-currency overlay",
        "sector": "Endowment",
        "summary": "Harvard's endowment uses an active FX overlay on top of its global allocation, targeting independent currency alpha while hedging unwanted exposures.",
        "lesson": "Even pure long-term allocators run dedicated FX programs — separation of asset and currency decisions improves Sharpe."
    },
    {
        "id": "toyota-natural-hedge",
        "company": "Toyota Motor Corp",
        "year": 2015,
        "title": "Operational + financial FX hedging at scale",
        "sector": "Automotive",
        "summary": "Toyota matches manufacturing location to revenue currency (natural hedge) and layers rolling 3-year FX forwards on residual JPY exposure — protecting margins through 15-30% JPY swings.",
        "lesson": "Layered hedging horizons (operational + financial) outperform single-instrument approaches."
    },
    {
        "id": "ge-capital",
        "company": "Singapore GIC",
        "year": 2022,
        "title": "GIC's reference currency framework",
        "sector": "Sovereign Wealth",
        "summary": "GIC explicitly publishes that ~36% of returns over 20 years come from currency selection and timing decisions, not asset class allocation.",
        "lesson": "Currency selection contributes meaningfully to long-horizon returns — it is not noise to be neutralized."
    },
]

EDUCATION_CONTENT = [
    {
        "id": "hedging",
        "category": "Risk Management",
        "title": "Hedging vs. Speculation",
        "body": "Institutional FX hedging neutralizes unwanted currency risk on existing exposures — it is structurally different from directional speculation. Sovereign wealth funds hedge 0–100% of FX exposure based on liability matching, not market views. The decision framework is risk-budget driven, not P&L driven.",
        "data_points": [
            "Norway's NBIM: 0% FX hedge ratio (intentional diversifier)",
            "Canadian Pension Plan: 50% FX hedge ratio",
            "Average global pension fund: 30–70% hedge ratio",
        ]
    },
    {
        "id": "carry",
        "category": "Macro Strategy",
        "title": "The Carry Trade — Institutionally Managed",
        "body": "Carry trades earn the interest rate differential between two currencies. Retail carry is leveraged and ruined by reversals. Institutional carry is risk-managed via volatility filters, drawdown caps, and basket diversification — generating 4–7% annualized excess returns historically.",
        "data_points": [
            "DBV-G10 carry index: 5.8% annualized return 2000–2023",
            "Max drawdown with vol filter: -12% (vs -38% naive)",
            "Sharpe with risk overlay: 0.78"
        ]
    },
    {
        "id": "macro",
        "category": "Macro Strategy",
        "title": "Macro Positioning & Central Bank Divergence",
        "body": "FX is the cleanest expression of relative monetary policy. When the Fed hikes and the BoJ holds, USD/JPY moves in predictable, exploitable ways. Macro hedge funds extract returns from these policy gaps using a combination of spot, forwards, and options.",
        "data_points": [
            "USD/JPY 2022 move: +29% during Fed-BoJ divergence",
            "Macro hedge fund 2022 returns (HFRI): +9.3% vs -18% for 60/40",
            "Correlation of macro FX to equities: 0.05"
        ]
    },
    {
        "id": "volatility",
        "category": "Risk Management",
        "title": "Volatility Management",
        "body": "FX volatility is typically 30–50% lower than equity volatility, and FX vol regimes are more predictable than equity vol regimes. Institutional FX strategies adjust position sizing to vol targets — keeping risk constant and Sharpe ratios stable.",
        "data_points": [
            "G10 FX 1-yr realized vol: 7–11%",
            "S&P 500 1-yr realized vol: 15–25%",
            "FX vol regime persistence: 8–14 months"
        ]
    },
    {
        "id": "central-banks",
        "category": "Macro Strategy",
        "title": "Central Bank Impact on Currencies",
        "body": "Currencies are priced off real interest rate differentials, forward guidance, and balance-sheet dynamics. Reading central-bank communication (Fed dot plots, ECB minutes, BoJ YCC adjustments) is a core institutional skill — not chart-watching.",
        "data_points": [
            "% of major FX moves driven by central banks: ~62%",
            "Fed dot-plot surprises → DXY 1-day move: avg ±0.9%",
            "BoJ intervention threshold (2022–24): ~150–160 USDJPY"
        ]
    },
    {
        "id": "diversification",
        "category": "Portfolio Theory",
        "title": "Currency as a Diversifier",
        "body": "FX returns are structurally low-correlated with equity and bond returns. Allocating 10–20% to an actively managed FX strategy historically improved risk-adjusted returns of a 60/40 portfolio by 15–25% (Sharpe basis), while reducing max drawdown by 200–400bps.",
        "data_points": [
            "FX strategy correlation to S&P 500: 0.08",
            "FX strategy correlation to US Treasuries: -0.04",
            "60/40 Sharpe uplift with 15% FX: +0.18"
        ]
    },
    {
        "id": "institutions",
        "category": "Who Uses FX",
        "title": "Hedge Funds, Pensions & Sovereign Wealth",
        "body": "Macro hedge funds run dedicated FX books. Pension funds use FX overlays for liability matching. Sovereign wealth funds treat currency allocation as a primary policy lever. Across the institutional world, FX is not optional — it is a core building block.",
        "data_points": [
            "% of global macro fund AUM in FX: 35–50%",
            "Top 50 pensions running FX overlay: 78%",
            "Sovereign wealth currency-active mandates: $2.3T+"
        ]
    },
]

# -------------------------------------------------------------------
# Models
# -------------------------------------------------------------------

class Allocation(BaseModel):
    equities: float = 60.0
    bonds: float = 20.0
    gold: float = 5.0
    real_estate: float = 5.0
    cash: float = 10.0
    fox_fx: float = 0.0  # The "with FOX I" version sets this >0

class SimulateRequest(BaseModel):
    allocation: Allocation
    fox_fx_allocation: float = 15.0  # the slice reallocated into FOX I FX
    years: int = 10

class StressRequest(BaseModel):
    scenario_id: str
    allocation: Allocation
    fox_fx_allocation: float = 15.0

class CustomScenarioRequest(BaseModel):
    usd_shock_pct: float = 0.0     # e.g. +15 = USD up 15%
    rate_shock_bps: float = 0.0    # e.g. +200 = +200bps
    equity_vol_regime: float = 1.0 # multiplier
    allocation: Allocation
    fox_fx_allocation: float = 15.0

class OnboardingSubmission(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    answers: Dict[str, Any]
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NarratorRequest(BaseModel):
    allocation: Allocation
    fox_fx_allocation: float = 15.0
    baseline_metrics: Dict[str, float]
    foxi_metrics: Dict[str, float]
    onboarding_context: Optional[Dict[str, Any]] = None

# -------------------------------------------------------------------
# Simulation helpers
# -------------------------------------------------------------------

def _normalize(alloc: Dict[str, float]) -> Dict[str, float]:
    s = sum(alloc.values())
    if s <= 0:
        return alloc
    return {k: v / s for k, v in alloc.items()}

def _portfolio_metrics(weights: Dict[str, float], years: int = 10, seed: int = 7) -> Dict[str, Any]:
    """Deterministic multi-asset Monte-Carlo-lite returning institutional metrics."""
    rng = random.Random(seed)
    months = years * 12
    # Correlations matrix (simplified, institutionally plausible)
    corr = {
        ("equities", "bonds"): -0.10,
        ("equities", "gold"): 0.05,
        ("equities", "real_estate"): 0.65,
        ("equities", "cash"): 0.0,
        ("equities", "fox_fx"): 0.08,
        ("bonds", "gold"): 0.10,
        ("bonds", "real_estate"): 0.15,
        ("bonds", "cash"): 0.20,
        ("bonds", "fox_fx"): -0.04,
        ("gold", "fox_fx"): 0.12,
        ("real_estate", "fox_fx"): 0.10,
        ("cash", "fox_fx"): 0.0,
        ("gold", "real_estate"): 0.10,
        ("gold", "cash"): 0.0,
        ("real_estate", "cash"): 0.0,
    }
    def cmat(a, b):
        if a == b: return 1.0
        return corr.get((a, b), corr.get((b, a), 0.0))

    assets = list(weights.keys())
    # Generate uncorrelated normals, then apply pseudo-correlation by mixing pairs
    paths = {a: [] for a in assets}
    index = {a: 100.0 for a in assets}
    portfolio_index = 100.0
    portfolio_path = [100.0]
    monthly_returns: List[float] = []

    # base shocks
    for m in range(months):
        shocks = {a: rng.gauss(0, 1) for a in assets}
        # introduce correlation by mixing — simplified Cholesky-lite
        mixed = {}
        for a in assets:
            mix = shocks[a]
            for b in assets:
                if a == b: continue
                rho = cmat(a, b)
                mix += rho * 0.5 * shocks[b]
            mixed[a] = mix / (1 + 0.5 * (len(assets) - 1))

        total_r = 0.0
        for a in assets:
            mu = ASSET_ASSUMPTIONS[a]["mu"] / 12
            sigma = ASSET_ASSUMPTIONS[a]["sigma"] / math.sqrt(12)
            r = mu + sigma * mixed[a]
            index[a] *= (1 + r)
            paths[a].append(round(index[a], 2))
            total_r += weights[a] * r

        portfolio_index *= (1 + total_r)
        portfolio_path.append(round(portfolio_index, 2))
        monthly_returns.append(total_r)

    # Metrics
    final = portfolio_index
    cagr = (final / 100.0) ** (1 / years) - 1
    mean_m = sum(monthly_returns) / len(monthly_returns)
    var_m = sum((r - mean_m) ** 2 for r in monthly_returns) / len(monthly_returns)
    vol_a = math.sqrt(var_m) * math.sqrt(12)
    sharpe = (cagr - 0.03) / vol_a if vol_a > 0 else 0
    # Max drawdown
    peak = portfolio_path[0]
    max_dd = 0.0
    dd_start = 0
    dd_end = 0
    cur_peak_idx = 0
    for i, v in enumerate(portfolio_path):
        if v > peak:
            peak = v
            cur_peak_idx = i
        dd = (v - peak) / peak
        if dd < max_dd:
            max_dd = dd
            dd_start = cur_peak_idx
            dd_end = i
    # Recovery period: months from dd_end to recover to peak
    recovery_months = 0
    pre_dd_peak = portfolio_path[dd_start] if dd_start < len(portfolio_path) else peak
    for j in range(dd_end, len(portfolio_path)):
        if portfolio_path[j] >= pre_dd_peak:
            recovery_months = j - dd_end
            break
    else:
        recovery_months = len(portfolio_path) - dd_end

    return {
        "cagr": round(cagr * 100, 2),
        "volatility": round(vol_a * 100, 2),
        "sharpe": round(sharpe, 2),
        "max_drawdown": round(max_dd * 100, 2),
        "recovery_months": recovery_months,
        "final_value": round(final, 2),
        "portfolio_path": portfolio_path,
        "asset_paths": paths,
    }


def _build_two_portfolios(req_alloc: Allocation, fox_fx_alloc: float, years: int = 10):
    base = req_alloc.model_dump()
    # baseline: ensure fox_fx is 0, redistribute proportionally
    baseline = dict(base)
    baseline["fox_fx"] = 0.0
    bsum = sum(baseline.values())
    if bsum <= 0:
        baseline = {"equities": 60, "bonds": 20, "gold": 5, "real_estate": 5, "cash": 10, "fox_fx": 0}
        bsum = 100
    baseline = {k: v / bsum for k, v in baseline.items()}

    # foxi: take fox_fx_alloc% from equities (or bonds if equities small), give to fox_fx
    foxi = dict(baseline)
    slice_ = fox_fx_alloc / 100.0
    # take 60% of slice from equities, 30% from bonds, 10% from cash
    eq_take = min(foxi["equities"], slice_ * 0.6)
    bd_take = min(foxi["bonds"], slice_ * 0.3)
    ca_take = min(foxi["cash"], slice_ * 0.1)
    taken = eq_take + bd_take + ca_take
    # if not enough, take rest from largest
    remaining = slice_ - taken
    if remaining > 0:
        biggest = max(["equities", "bonds", "cash", "gold", "real_estate"], key=lambda k: foxi[k])
        foxi[biggest] -= min(remaining, foxi[biggest])
        taken = slice_
    foxi["equities"] -= eq_take
    foxi["bonds"] -= bd_take
    foxi["cash"] -= ca_take
    foxi["fox_fx"] = taken
    # renormalize defensively
    fs = sum(foxi.values())
    foxi = {k: v / fs for k, v in foxi.items()}

    baseline_metrics = _portfolio_metrics(baseline, years=years, seed=11)
    foxi_metrics = _portfolio_metrics(foxi, years=years, seed=11)
    return baseline, foxi, baseline_metrics, foxi_metrics


# -------------------------------------------------------------------
# Routes
# -------------------------------------------------------------------

@api_router.get("/")
async def root():
    return {"name": "FOX I Portfolio Intelligence API", "status": "operational"}


@api_router.post("/portfolio/simulate")
async def simulate(req: SimulateRequest):
    baseline_w, foxi_w, baseline_m, foxi_m = _build_two_portfolios(req.allocation, req.fox_fx_allocation, req.years)
    return {
        "baseline": {"weights": baseline_w, "metrics": baseline_m},
        "foxi": {"weights": foxi_w, "metrics": foxi_m},
        "delta": {
            "cagr_bps": round((foxi_m["cagr"] - baseline_m["cagr"]) * 100, 1),
            "sharpe_delta": round(foxi_m["sharpe"] - baseline_m["sharpe"], 2),
            "vol_delta_pct": round(foxi_m["volatility"] - baseline_m["volatility"], 2),
            "drawdown_improvement_pct": round(foxi_m["max_drawdown"] - baseline_m["max_drawdown"], 2),
            "recovery_improvement_months": baseline_m["recovery_months"] - foxi_m["recovery_months"],
        }
    }


@api_router.get("/scenarios")
async def list_scenarios():
    return [{"id": s["id"], "name": s["name"], "summary": s["summary"], "period": s["period"]} for s in SCENARIOS.values()]


@api_router.post("/stress-test")
async def stress_test(req: StressRequest):
    scenario = SCENARIOS.get(req.scenario_id)
    if not scenario:
        raise HTTPException(404, "Scenario not found")
    # Build two portfolio paths through the scenario
    base_w = req.allocation.model_dump()
    base_w["fox_fx"] = 0
    bs = sum(base_w.values()) or 1
    base_w = {k: v / bs for k, v in base_w.items()}

    foxi_w = dict(base_w)
    slice_ = req.fox_fx_allocation / 100
    eq_take = min(foxi_w["equities"], slice_ * 0.7)
    bd_take = min(foxi_w["bonds"], slice_ * 0.3)
    foxi_w["equities"] -= eq_take
    foxi_w["bonds"] -= bd_take
    foxi_w["fox_fx"] = eq_take + bd_take
    fs = sum(foxi_w.values()) or 1
    foxi_w = {k: v / fs for k, v in foxi_w.items()}

    months = scenario["months"]
    eq = scenario["equities_path"]
    bd = scenario["bonds_path"]
    fx = scenario["fx_path"]

    baseline_path = []
    foxi_path = []
    for i in range(months):
        bv = (base_w["equities"] * eq[i] + base_w["bonds"] * bd[i] +
              base_w["gold"] * (100 + (eq[i] - 100) * -0.3) +
              base_w["real_estate"] * (100 + (eq[i] - 100) * 0.55) +
              base_w["cash"] * 100)
        fv = (foxi_w["equities"] * eq[i] + foxi_w["bonds"] * bd[i] +
              foxi_w["gold"] * (100 + (eq[i] - 100) * -0.3) +
              foxi_w["real_estate"] * (100 + (eq[i] - 100) * 0.55) +
              foxi_w["cash"] * 100 +
              foxi_w["fox_fx"] * fx[i])
        baseline_path.append(round(bv, 2))
        foxi_path.append(round(fv, 2))

    def worst_dd(path):
        peak = path[0]
        worst = 0
        for v in path:
            peak = max(peak, v)
            worst = min(worst, (v - peak) / peak)
        return round(worst * 100, 2)

    return {
        "scenario": scenario,
        "baseline_path": baseline_path,
        "foxi_path": foxi_path,
        "baseline_drawdown": worst_dd(baseline_path),
        "foxi_drawdown": worst_dd(foxi_path),
        "baseline_final": baseline_path[-1],
        "foxi_final": foxi_path[-1],
    }


@api_router.post("/scenario/custom")
async def custom_scenario(req: CustomScenarioRequest):
    # Synthesize a 12-month path based on the shocks
    usd_shock = req.usd_shock_pct / 100
    rate_shock = req.rate_shock_bps / 10000  # to decimal
    vol_mult = max(0.5, req.equity_vol_regime)

    base_w = req.allocation.model_dump()
    base_w["fox_fx"] = 0
    bs = sum(base_w.values()) or 1
    base_w = {k: v / bs for k, v in base_w.items()}

    foxi_w = dict(base_w)
    slice_ = req.fox_fx_allocation / 100
    foxi_w["equities"] -= min(foxi_w["equities"], slice_ * 0.7)
    foxi_w["bonds"] -= min(foxi_w["bonds"], slice_ * 0.3)
    foxi_w["fox_fx"] = slice_
    fs = sum(foxi_w.values()) or 1
    foxi_w = {k: v / fs for k, v in foxi_w.items()}

    months = 12
    rng = random.Random(int(abs(usd_shock * 1000 + rate_shock * 10000 + vol_mult * 100)) + 17)
    eq, bd, fx = [100.0], [100.0], [100.0]
    eq_total_impact = -0.6 * rate_shock * 12 - 0.3 * usd_shock  # roughly
    bd_total_impact = -3.0 * rate_shock * 12
    fx_total_impact = 0.6 * usd_shock + 0.4 * rate_shock * 12

    for m in range(1, months + 1):
        eq_step = (eq_total_impact / months) + rng.gauss(0, 0.04 * vol_mult)
        bd_step = (bd_total_impact / months) + rng.gauss(0, 0.012)
        fx_step = (fx_total_impact / months) + rng.gauss(0, 0.015)
        eq.append(round(eq[-1] * (1 + eq_step), 2))
        bd.append(round(bd[-1] * (1 + bd_step), 2))
        fx.append(round(fx[-1] * (1 + fx_step), 2))

    baseline_path = []
    foxi_path = []
    for i in range(len(eq)):
        bv = (base_w["equities"] * eq[i] + base_w["bonds"] * bd[i] +
              base_w["gold"] * 100 + base_w["real_estate"] * (100 + (eq[i] - 100) * 0.6) +
              base_w["cash"] * 100)
        fv = (foxi_w["equities"] * eq[i] + foxi_w["bonds"] * bd[i] +
              foxi_w["gold"] * 100 + foxi_w["real_estate"] * (100 + (eq[i] - 100) * 0.6) +
              foxi_w["cash"] * 100 + foxi_w["fox_fx"] * fx[i])
        baseline_path.append(round(bv, 2))
        foxi_path.append(round(fv, 2))

    return {
        "params": req.model_dump(),
        "baseline_path": baseline_path,
        "foxi_path": foxi_path,
        "baseline_final": baseline_path[-1],
        "foxi_final": foxi_path[-1],
    }


@api_router.get("/case-studies")
async def case_studies():
    return CASE_STUDIES


@api_router.get("/education")
async def education():
    return EDUCATION_CONTENT


@api_router.post("/onboarding/submit")
async def onboarding_submit(submission: OnboardingSubmission):
    doc = submission.model_dump()
    doc["timestamp"] = doc["timestamp"].isoformat()
    await db.onboardings.insert_one(doc)
    return {"id": submission.id, "ok": True}


@api_router.post("/narrate")
async def narrate(req: NarratorRequest):
    """Streaming SSE narrative from Claude Sonnet 4.5"""
    system_message = (
        "You are FOX I's institutional macro strategist writing for a sophisticated investor. "
        "Tone: precise, educational, institutional. Never salesy, never promotional, never use emoji. "
        "Reference specific metrics provided. Use 3 short paragraphs separated by blank lines. "
        "Paragraph 1: diagnose the baseline portfolio's weaknesses (concentration, currency exposure, drawdown profile). "
        "Paragraph 2: explain mechanically how strategic FX allocation (carry, macro positioning, vol management) reshapes the risk profile. "
        "Paragraph 3: state the quantitative improvement in plain institutional language. "
        "Do not exceed 220 words total."
    )

    ctx = {
        "baseline_alloc": req.allocation.model_dump(),
        "fox_fx_allocation_pct": req.fox_fx_allocation,
        "baseline_metrics": req.baseline_metrics,
        "foxi_metrics": req.foxi_metrics,
        "investor_context": req.onboarding_context or {},
    }

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"narrate-{uuid.uuid4()}",
        system_message=system_message,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    user_text = (
        "Analyze the following portfolio comparison data and produce the institutional narrative:\n\n"
        f"{json.dumps(ctx, indent=2)}"
    )

    async def event_gen():
        try:
            async for ev in chat.stream_message(UserMessage(text=user_text)):
                if isinstance(ev, TextDelta):
                    yield f"data: {json.dumps({'delta': ev.content})}\n\n"
                elif isinstance(ev, StreamDone):
                    yield f"data: {json.dumps({'done': True})}\n\n"
                    break
        except Exception as e:
            logger.exception("Narrator stream error")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
