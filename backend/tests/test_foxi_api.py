"""FOX I Portfolio Intelligence API tests"""
import os
import json
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://macro-diversify.preview.emergentagent.com").rstrip("/")
# Fallback to frontend .env at runtime
try:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")
except Exception:
    pass

API = f"{BASE_URL}/api"

DEFAULT_ALLOC = {"equities": 60, "bonds": 20, "gold": 5, "real_estate": 5, "cash": 10, "fox_fx": 0}


# ---------------- Health ----------------
def test_root():
    r = requests.get(f"{API}/")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "operational"
    assert "name" in data


# ---------------- Scenarios ----------------
def test_scenarios_list():
    r = requests.get(f"{API}/scenarios")
    assert r.status_code == 200
    data = r.json()
    ids = {s["id"] for s in data}
    expected = {"gfc_2008", "covid_2020", "inr_depreciation", "fed_hikes_2022", "geopolitical_2022", "inflation_2021"}
    assert expected.issubset(ids), f"missing scenarios: {expected - ids}"
    assert len(data) >= 6
    for s in data:
        for k in ("id", "name", "summary", "period"):
            assert k in s


# ---------------- Portfolio Simulate ----------------
def test_portfolio_simulate():
    payload = {"allocation": DEFAULT_ALLOC, "fox_fx_allocation": 15, "years": 10}
    r = requests.post(f"{API}/portfolio/simulate", json=payload)
    assert r.status_code == 200, r.text
    d = r.json()
    for branch in ("baseline", "foxi"):
        m = d[branch]["metrics"]
        for k in ("cagr", "sharpe", "volatility", "max_drawdown", "recovery_months", "portfolio_path"):
            assert k in m, f"{branch} missing {k}"
        assert isinstance(m["portfolio_path"], list) and len(m["portfolio_path"]) > 100
    assert "delta" in d
    assert d["delta"]["sharpe_delta"] > 0, f"FOX I should improve sharpe, got {d['delta']['sharpe_delta']}"


# ---------------- Stress Test ----------------
def test_stress_test_gfc():
    payload = {"scenario_id": "gfc_2008", "allocation": DEFAULT_ALLOC, "fox_fx_allocation": 15}
    r = requests.post(f"{API}/stress-test", json=payload)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["scenario"]["id"] == "gfc_2008"
    assert isinstance(d["baseline_path"], list) and len(d["baseline_path"]) >= 12
    assert isinstance(d["foxi_path"], list) and len(d["foxi_path"]) >= 12
    # foxi drawdown should be less severe (closer to zero, ie higher value since negative)
    assert d["foxi_drawdown"] >= d["baseline_drawdown"], (
        f"foxi_drawdown {d['foxi_drawdown']} should be less severe than baseline {d['baseline_drawdown']}"
    )


def test_stress_test_invalid_scenario():
    r = requests.post(f"{API}/stress-test", json={"scenario_id": "bogus", "allocation": DEFAULT_ALLOC})
    assert r.status_code == 404


# ---------------- Custom Scenario ----------------
def test_custom_scenario():
    payload = {
        "usd_shock_pct": 10,
        "rate_shock_bps": 150,
        "equity_vol_regime": 1.5,
        "allocation": DEFAULT_ALLOC,
        "fox_fx_allocation": 15,
    }
    r = requests.post(f"{API}/scenario/custom", json=payload)
    assert r.status_code == 200, r.text
    d = r.json()
    assert len(d["baseline_path"]) == 13
    assert len(d["foxi_path"]) == 13


# ---------------- Case Studies ----------------
def test_case_studies():
    r = requests.get(f"{API}/case-studies")
    assert r.status_code == 200
    cs = r.json()
    assert len(cs) >= 6
    for c in cs:
        for k in ("id", "company", "title", "lesson"):
            assert k in c


# ---------------- Education ----------------
def test_education():
    r = requests.get(f"{API}/education")
    assert r.status_code == 200
    items = r.json()
    assert len(items) >= 7
    cats = {i["category"] for i in items}
    expected = {"Risk Management", "Macro Strategy", "Portfolio Theory", "Who Uses FX"}
    assert expected.issubset(cats), f"missing categories: {expected - cats}"


# ---------------- Onboarding ----------------
def test_onboarding_submit():
    payload = {"answers": {"goal": "diversify", "experience": "intermediate", "TEST_marker": True}}
    r = requests.post(f"{API}/onboarding/submit", json=payload)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["ok"] is True
    assert "id" in d and len(d["id"]) > 0


# ---------------- Narrate (SSE streaming) ----------------
def test_narrate_streaming():
    payload = {
        "allocation": DEFAULT_ALLOC,
        "fox_fx_allocation": 15,
        "baseline_metrics": {"cagr": 6.8, "sharpe": 0.42, "volatility": 11.5, "max_drawdown": -22.3, "recovery_months": 14, "final_value": 195.4},
        "foxi_metrics": {"cagr": 7.4, "sharpe": 0.58, "volatility": 10.1, "max_drawdown": -17.8, "recovery_months": 9, "final_value": 207.1},
    }
    with requests.post(f"{API}/narrate", json=payload, stream=True, timeout=90) as r:
        assert r.status_code == 200, r.text
        deltas = []
        done = False
        error = None
        start = time.time()
        for raw in r.iter_lines(decode_unicode=True):
            if time.time() - start > 80:
                break
            if not raw or not raw.startswith("data: "):
                continue
            try:
                ev = json.loads(raw[6:])
            except Exception:
                continue
            if "delta" in ev:
                deltas.append(ev["delta"])
            if ev.get("done"):
                done = True
                break
            if "error" in ev:
                error = ev["error"]
                break
        assert error is None, f"narrate stream error: {error}"
        text = "".join(deltas)
        assert len(deltas) > 0, "no delta events received"
        assert len(text) > 100, f"narrative too short: {len(text)} chars"
        assert done, "did not receive done event"
