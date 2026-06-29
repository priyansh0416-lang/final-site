import { useEffect, useState } from "react";
import axios from "axios";
import { API, DEFAULT_ALLOCATION } from "@/lib/foxi";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

export default function StressTest() {
  const stored = (() => {
    try { return JSON.parse(localStorage.getItem("foxi_onboarding") || "{}"); } catch { return {}; }
  })();
  const initialAlloc = stored.allocation ? { ...stored.allocation, fox_fx: 0 } : DEFAULT_ALLOCATION;

  const [scenarios, setScenarios] = useState([]);
  const [active, setActive] = useState("gfc_2008");
  const [result, setResult] = useState(null);
  const [foxFxAlloc, setFoxFxAlloc] = useState(15);

  // Custom scenario
  const [usdShock, setUsdShock] = useState(10);
  const [rateShock, setRateShock] = useState(150);
  const [volRegime, setVolRegime] = useState(1.5);
  const [customResult, setCustomResult] = useState(null);

  useEffect(() => {
    axios.get(`${API}/scenarios`).then((r) => setScenarios(r.data));
  }, []);

  useEffect(() => {
    if (!active) return;
    axios.post(`${API}/stress-test`, {
      scenario_id: active, allocation: initialAlloc, fox_fx_allocation: foxFxAlloc,
    }).then((r) => setResult(r.data));
    // eslint-disable-next-line
  }, [active, foxFxAlloc]);

  const runCustom = () => {
    axios.post(`${API}/scenario/custom`, {
      usd_shock_pct: usdShock, rate_shock_bps: rateShock, equity_vol_regime: volRegime,
      allocation: initialAlloc, fox_fx_allocation: foxFxAlloc,
    }).then((r) => setCustomResult(r.data));
  };

  useEffect(() => { runCustom(); /* eslint-disable-next-line */ }, []);

  const chartData = result
    ? result.baseline_path.map((v, i) => ({ m: i, baseline: v, foxi: result.foxi_path[i] }))
    : [];

  const customChartData = customResult
    ? customResult.baseline_path.map((v, i) => ({ m: i, baseline: v, foxi: customResult.foxi_path[i] }))
    : [];

  return (
    <div data-testid="stress-test-page" className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <div className="text-[11px] uppercase tracking-[0.22em] text-[#0F766E] font-semibold mb-2">Historical & Stress Testing</div>
        <h1 className="font-display text-3xl lg:text-4xl font-bold text-[#0A2540] tracking-tight">
          Replay the moments that broke 60/40 portfolios.
        </h1>
        <p className="mt-3 text-[#475569] max-w-2xl">
          Curated, institutionally calibrated historical paths for the events every macro desk
          stress-tests against. Toggle FOX I FX allocation to see resilience under each regime.
        </p>

        <Tabs defaultValue="historical" className="mt-10">
          <TabsList className="bg-[#F1F5F9] border border-[#E2E8F0]">
            <TabsTrigger data-testid="tab-historical" value="historical">Historical Events</TabsTrigger>
            <TabsTrigger data-testid="tab-custom" value="custom">Custom Scenario Builder</TabsTrigger>
          </TabsList>

          <TabsContent value="historical" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-3 space-y-2">
                {scenarios.map((s) => (
                  <button
                    key={s.id}
                    data-testid={`scenario-${s.id}`}
                    onClick={() => setActive(s.id)}
                    className={`w-full text-left p-4 rounded-md border transition-colors ${
                      active === s.id
                        ? "bg-[#0A2540] border-[#0A2540] text-white"
                        : "bg-white border-[#E2E8F0] hover:border-[#0A2540] text-[#0F172A]"
                    }`}
                  >
                    <div className="text-sm font-semibold leading-snug">{s.name}</div>
                    <div className={`text-[11px] font-mono mt-1 ${active === s.id ? "text-white/70" : "text-[#94A3B8]"}`}>{s.period}</div>
                  </button>
                ))}
              </div>

              <div className="lg:col-span-9 space-y-6">
                {result && (
                  <>
                    <div className="border border-[#E2E8F0] rounded-lg p-6">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider border-[#CBD5E1] text-[#475569] mb-3">{result.scenario.period}</Badge>
                          <div className="font-display text-xl font-bold text-[#0A2540]">{result.scenario.name}</div>
                          <p className="mt-2 text-sm text-[#475569] max-w-2xl">{result.scenario.summary}</p>
                        </div>
                      </div>

                      <div className="mt-4 border-l-2 border-[#0F766E] bg-[#F8FAFC] p-4 rounded-r-md">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-[#0F766E] font-semibold mb-1.5">FX Reading</div>
                        <p className="text-sm text-[#0F172A]">{result.scenario.narrative}</p>
                      </div>

                      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatBox label="Baseline drawdown" value={`${result.baseline_drawdown}%`} negative />
                        <StatBox label="With FOX I drawdown" value={`${result.foxi_drawdown}%`} positive />
                        <StatBox label="Baseline final" value={result.baseline_final.toFixed(1)} />
                        <StatBox label="With FOX I final" value={result.foxi_final.toFixed(1)} positive />
                      </div>

                      <div className="mt-6">
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="text-[#0F172A]">FOX I FX allocation</span>
                          <span className="font-mono text-[#475569]">{foxFxAlloc}%</span>
                        </div>
                        <Slider data-testid="stress-foxi-slider" value={[foxFxAlloc]} min={0} max={40} step={1} onValueChange={(v) => setFoxFxAlloc(v[0])} />
                      </div>
                    </div>

                    <div className="border border-[#E2E8F0] rounded-lg p-6">
                      <div className="font-display text-base font-semibold text-[#0F172A] mb-4">Portfolio value through the event</div>
                      <div className="h-72">
                        <ResponsiveContainer>
                          <LineChart data={chartData}>
                            <CartesianGrid stroke="#F1F5F9" vertical={false} />
                            <XAxis dataKey="m" tickFormatter={(m) => `M${m}`} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line name="Without FX" type="monotone" dataKey="baseline" stroke="#0A2540" strokeWidth={2.2} dot={false} />
                            <Line name="With FOX I" type="monotone" dataKey="foxi" stroke="#0F766E" strokeWidth={2.2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="custom" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-4 border border-[#E2E8F0] rounded-lg p-6 space-y-6">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-[#0F766E] font-semibold mb-2">Scenario inputs</div>
                  <p className="text-[12px] text-[#64748B]">Define a macro shock. The engine projects a 12-month path.</p>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1.5"><span>USD shock</span><span className="font-mono text-[#475569]">{usdShock > 0 ? "+" : ""}{usdShock}%</span></div>
                  <Slider data-testid="custom-usd" value={[usdShock]} min={-25} max={25} step={1} onValueChange={(v) => setUsdShock(v[0])} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1.5"><span>Policy rate shock</span><span className="font-mono text-[#475569]">{rateShock > 0 ? "+" : ""}{rateShock} bps</span></div>
                  <Slider data-testid="custom-rate" value={[rateShock]} min={-300} max={500} step={25} onValueChange={(v) => setRateShock(v[0])} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1.5"><span>Equity vol regime</span><span className="font-mono text-[#475569]">×{volRegime.toFixed(1)}</span></div>
                  <Slider data-testid="custom-vol" value={[volRegime * 10]} min={5} max={30} step={1} onValueChange={(v) => setVolRegime(v[0] / 10)} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1.5"><span>FOX I FX allocation</span><span className="font-mono text-[#475569]">{foxFxAlloc}%</span></div>
                  <Slider data-testid="custom-foxi" value={[foxFxAlloc]} min={0} max={40} step={1} onValueChange={(v) => setFoxFxAlloc(v[0])} />
                </div>
                <Button data-testid="run-custom-btn" onClick={runCustom} className="w-full bg-[#0A2540] hover:bg-[#1D4ED8] text-white">
                  Project Outcome
                </Button>
              </div>

              <div className="lg:col-span-8 border border-[#E2E8F0] rounded-lg p-6">
                <div className="font-display text-base font-semibold text-[#0F172A] mb-4">Projected 12-month path</div>
                {customResult && (
                  <>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <StatBox label="Baseline final" value={customResult.baseline_final.toFixed(1)} />
                      <StatBox label="With FOX I final" value={customResult.foxi_final.toFixed(1)} positive />
                    </div>
                    <div className="h-72">
                      <ResponsiveContainer>
                        <LineChart data={customChartData}>
                          <CartesianGrid stroke="#F1F5F9" vertical={false} />
                          <XAxis dataKey="m" tickFormatter={(m) => `M${m}`} />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line name="Without FX" type="monotone" dataKey="baseline" stroke="#0A2540" strokeWidth={2.2} dot={false} />
                          <Line name="With FOX I" type="monotone" dataKey="foxi" stroke="#0F766E" strokeWidth={2.2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function StatBox({ label, value, positive = false, negative = false }) {
  const color = positive ? "text-[#059669]" : negative ? "text-[#DC2626]" : "text-[#0A2540]";
  return (
    <div className="border border-[#E2E8F0] rounded-md p-4">
      <div className="text-[10px] uppercase tracking-[0.18em] text-[#94A3B8] font-semibold">{label}</div>
      <div className={`mt-2 font-display text-xl font-extrabold foxi-num ${color}`}>{value}</div>
    </div>
  );
}
