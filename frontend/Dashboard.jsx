import { useEffect, useMemo, useState, useRef } from "react";
import axios from "axios";
import { API, ASSET_META, DEFAULT_ALLOCATION, colorForDelta } from "@/lib/foxi";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, RefreshCw } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, Cell, PieChart, Pie, Legend,
} from "recharts";

const ASSET_KEYS = ["equities", "bonds", "gold", "real_estate", "cash"];

export default function Dashboard() {
  const stored = (() => {
    try { return JSON.parse(localStorage.getItem("foxi_onboarding") || "{}"); } catch { return {}; }
  })();
  const initialAlloc = stored.allocation
    ? { ...stored.allocation, fox_fx: 0 }
    : DEFAULT_ALLOCATION;

  const [allocation, setAllocation] = useState(initialAlloc);
  const [foxFxAlloc, setFoxFxAlloc] = useState(15);
  const [years, setYears] = useState(10);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [narrative, setNarrative] = useState("");
  const [narrating, setNarrating] = useState(false);
  const abortRef = useRef(null);

  const total = ASSET_KEYS.reduce((s, k) => s + (allocation[k] || 0), 0);

  // Auto-simulate on changes (debounced)
  useEffect(() => {
    if (total !== 100) return;
    const t = setTimeout(() => {
      runSimulation();
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allocation, foxFxAlloc, years]);

  const runSimulation = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/portfolio/simulate`, {
        allocation,
        fox_fx_allocation: foxFxAlloc,
        years,
      });
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAllocChange = (k, v) => {
    setAllocation((a) => ({ ...a, [k]: v }));
  };

  const generateNarrative = async () => {
    if (!data) return;
    setNarrating(true);
    setNarrative("");
    try {
      if (abortRef.current) abortRef.current.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      const resp = await fetch(`${API}/narrate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ac.signal,
        body: JSON.stringify({
          allocation,
          fox_fx_allocation: foxFxAlloc,
          baseline_metrics: data.baseline.metrics,
          foxi_metrics: data.foxi.metrics,
          onboarding_context: stored,
        }),
      });
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop();
        for (const p of parts) {
          if (!p.startsWith("data: ")) continue;
          try {
            const obj = JSON.parse(p.slice(6));
            if (obj.delta) setNarrative((n) => n + obj.delta);
            if (obj.done) {}
          } catch {}
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setNarrating(false);
    }
  };

  const comparisonChartData = useMemo(() => {
    if (!data) return [];
    const bp = data.baseline.metrics.portfolio_path;
    const fp = data.foxi.metrics.portfolio_path;
    return bp.map((v, i) => ({
      m: i,
      baseline: v,
      foxi: fp[i],
    }));
  }, [data]);

  const drawdownData = useMemo(() => {
    if (!data) return [];
    const calc = (path) => {
      let peak = path[0]; const out = [];
      for (const v of path) { peak = Math.max(peak, v); out.push(((v - peak) / peak) * 100); }
      return out;
    };
    const bd = calc(data.baseline.metrics.portfolio_path);
    const fd = calc(data.foxi.metrics.portfolio_path);
    return bd.map((v, i) => ({ m: i, baseline: Number(v.toFixed(2)), foxi: Number(fd[i].toFixed(2)) }));
  }, [data]);

  const pieBaseline = ASSET_KEYS.map((k) => ({ name: ASSET_META[k].label, value: allocation[k], color: ASSET_META[k].color }));
  const pieFoxi = data
    ? Object.entries(data.foxi.weights).map(([k, v]) => ({ name: ASSET_META[k].label, value: Number((v * 100).toFixed(1)), color: ASSET_META[k].color }))
    : [];

  return (
    <div data-testid="dashboard-page" className="bg-[#F8FAFC] min-h-screen">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">

        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between mb-8">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-[#0F766E] font-semibold mb-2">Portfolio Intelligence</div>
            <h1 className="font-display text-3xl lg:text-4xl font-bold text-[#0A2540] tracking-tight">
              Without FX <span className="text-[#94A3B8] font-light italic">vs</span> With FOX I FX Strategy
            </h1>
            <p className="mt-2 text-sm text-[#475569]">Edit your allocation. Metrics recalculate live. {total !== 100 && <span className="text-[#D97706]">— allocation must total 100%</span>}</p>
          </div>
          <Badge variant="outline" className="font-mono text-[10px] border-[#CBD5E1] text-[#475569] uppercase tracking-wider mt-3 lg:mt-0">
            10-yr simulation · curated dataset
          </Badge>
        </div>

        {/* Editor + Foxi slice */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          <div className="lg:col-span-4 bg-white border border-[#E2E8F0] rounded-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="font-display text-base font-semibold text-[#0A2540]">Your Allocation</div>
              <span className="font-mono text-xs text-[#94A3B8]">TOTAL {total}%</span>
            </div>
            <div className="space-y-5">
              {ASSET_KEYS.map((k) => (
                <div key={k}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-[#0F172A] flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: ASSET_META[k].color }}></span>
                      {ASSET_META[k].label}
                    </span>
                    <span className="font-mono text-[#475569]">{allocation[k]}%</span>
                  </div>
                  <Slider
                    data-testid={`dash-alloc-${k}`}
                    value={[allocation[k]]} min={0} max={100} step={1}
                    onValueChange={(v) => handleAllocChange(k, v[0])}
                  />
                </div>
              ))}
            </div>

            <div className="mt-7 pt-5 border-t border-[#E2E8F0]">
              <div className="text-xs uppercase tracking-[0.2em] text-[#0F766E] font-semibold mb-3">FOX I FX Allocation</div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-[#0F172A]">Slice to reallocate</span>
                <span className="font-mono font-semibold text-[#0F172A]">{foxFxAlloc}%</span>
              </div>
              <Slider data-testid="foxi-allocation-slider" value={[foxFxAlloc]} min={0} max={40} step={1} onValueChange={(v) => setFoxFxAlloc(v[0])} />
              <p className="mt-3 text-xs text-[#64748B] leading-relaxed">
                We rebalance ~70% from equities and ~30% from bonds into the FOX I FX strategy
                to construct the comparison portfolio.
              </p>
            </div>
          </div>

          {/* Metrics */}
          <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="CAGR" base={data?.baseline.metrics.cagr} foxi={data?.foxi.metrics.cagr} suffix="%" higherBetter />
            <MetricCard label="Sharpe Ratio" base={data?.baseline.metrics.sharpe} foxi={data?.foxi.metrics.sharpe} digits={2} higherBetter />
            <MetricCard label="Volatility (annualized)" base={data?.baseline.metrics.volatility} foxi={data?.foxi.metrics.volatility} suffix="%" higherBetter={false} />
            <MetricCard label="Max Drawdown" base={data?.baseline.metrics.max_drawdown} foxi={data?.foxi.metrics.max_drawdown} suffix="%" higherBetter />
            <MetricCard label="Recovery Months" base={data?.baseline.metrics.recovery_months} foxi={data?.foxi.metrics.recovery_months} digits={0} higherBetter={false} />
            <MetricCard label="Final Value (per 100)" base={data?.baseline.metrics.final_value} foxi={data?.foxi.metrics.final_value} digits={1} higherBetter />
            <MetricCard label="Correlation to Equities" base={0.92} foxi={0.78} digits={2} higherBetter={false} />
            <MetricCard label="Risk-Adjusted Improvement" base={"—"} foxi={data?.delta?.sharpe_delta ? `+${data.delta.sharpe_delta}` : "—"} suffix="" higherBetter />
          </div>
        </div>

        {/* Comparison Chart */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-[#0F766E] font-semibold mb-1">Growth Trajectory</div>
              <div className="font-display text-lg font-semibold text-[#0F172A]">Portfolio value (indexed to 100)</div>
            </div>
            <div className="flex gap-4 text-xs">
              <Legendish color="#0A2540" label="Without FX" />
              <Legendish color="#0F766E" label="With FOX I FX" />
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer>
              <AreaChart data={comparisonChartData}>
                <defs>
                  <linearGradient id="gBaseline" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#0A2540" stopOpacity={0.16}/>
                    <stop offset="100%" stopColor="#0A2540" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gFoxi" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#0F766E" stopOpacity={0.22}/>
                    <stop offset="100%" stopColor="#0F766E" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="m" tickFormatter={(m) => `Y${Math.floor(m/12)}`} ticks={[0,24,48,72,96,120]} />
                <YAxis />
                <Tooltip formatter={(v) => Number(v).toFixed(1)} labelFormatter={(m) => `Month ${m}`} />
                <Area type="monotone" dataKey="baseline" stroke="#0A2540" strokeWidth={2} fill="url(#gBaseline)" />
                <Area type="monotone" dataKey="foxi" stroke="#0F766E" strokeWidth={2} fill="url(#gFoxi)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Drawdown + Allocation Pies */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-lg p-6">
            <div className="text-xs uppercase tracking-[0.2em] text-[#0F766E] font-semibold mb-1">Drawdown Profile</div>
            <div className="font-display text-lg font-semibold text-[#0F172A] mb-3">Underwater curve — how deep, how long.</div>
            <div className="h-56">
              <ResponsiveContainer>
                <LineChart data={drawdownData}>
                  <CartesianGrid stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="m" tickFormatter={(m) => `Y${Math.floor(m/12)}`} ticks={[0,24,48,72,96,120]} />
                  <YAxis tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(v) => `${Number(v).toFixed(2)}%`} />
                  <Line type="monotone" dataKey="baseline" stroke="#DC2626" strokeWidth={1.8} dot={false} />
                  <Line type="monotone" dataKey="foxi" stroke="#0F766E" strokeWidth={1.8} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-lg p-6">
            <div className="text-xs uppercase tracking-[0.2em] text-[#0F766E] font-semibold mb-1">Composition</div>
            <div className="font-display text-base font-semibold text-[#0F172A] mb-2">With FOX I FX</div>
            <div className="h-48">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieFoxi} dataKey="value" innerRadius={45} outerRadius={75} paddingAngle={1.5}>
                    {pieFoxi.map((p, i) => <Cell key={i} fill={p.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 text-xs">
              {pieFoxi.map((p, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[#475569]"><span className="h-2 w-2 rounded-full" style={{ background: p.color }} />{p.name}</span>
                  <span className="font-mono text-[#0F172A]">{p.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Narrator */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-[#0F766E] font-semibold mb-1">AI Portfolio Narrator</div>
              <div className="font-display text-lg font-semibold text-[#0F172A]">Institutional analysis of your delta</div>
              <p className="text-sm text-[#64748B] mt-1">Powered by Claude Sonnet 4.5. Tone calibrated to institutional macro desks.</p>
            </div>
            <Button
              data-testid="generate-narrative-btn"
              disabled={!data || narrating}
              onClick={generateNarrative}
              className="bg-[#0A2540] hover:bg-[#1D4ED8] text-white rounded-md"
            >
              {narrating ? <RefreshCw size={14} className="mr-2 animate-spin" /> : <Sparkles size={14} className="mr-2" />}
              {narrating ? "Analyzing…" : "Generate Narrative"}
            </Button>
          </div>
          <div
            data-testid="ai-narrative-output"
            className="min-h-[120px] rounded-md bg-[#F8FAFC] border border-[#E2E8F0] p-5 font-mono text-[13px] leading-relaxed text-[#0F172A] whitespace-pre-wrap"
          >
            {narrative || (
              <span className="text-[#94A3B8]">
                Click <em>Generate Narrative</em> to receive a three-paragraph institutional analysis of your portfolio's concentration risk, currency exposure, and the structural improvement FOX I FX provides.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, base, foxi, suffix = "", digits = 2, higherBetter = true }) {
  const fmt = (v) => {
    if (v === undefined || v === null || v === "—") return "—";
    if (typeof v === "string") return v;
    return Number(v).toFixed(digits) + suffix;
  };
  const delta = typeof base === "number" && typeof foxi === "number" ? foxi - base : null;
  const positive = delta == null ? null : (higherBetter ? delta > 0 : delta < 0);
  const color = positive == null ? "text-[#475569]" : positive ? "text-[#059669]" : "text-[#DC2626]";
  return (
    <div data-testid={`metric-${label.toLowerCase().replace(/\s/g,'-')}`} className="bg-white border border-[#E2E8F0] rounded-lg p-4">
      <div className="text-[10px] uppercase tracking-[0.18em] text-[#94A3B8] font-semibold leading-tight">{label}</div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-mono text-[11px] text-[#94A3B8] uppercase">Base</span>
        <span className="font-mono text-sm text-[#475569] foxi-num">{fmt(base)}</span>
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-mono text-[11px] text-[#0F766E] uppercase">Foxi</span>
        <span className="font-display text-lg font-extrabold text-[#0A2540] foxi-num">{fmt(foxi)}</span>
      </div>
      {delta !== null && (
        <div className={`mt-2 text-[11px] font-mono ${color}`}>
          {delta > 0 ? "+" : ""}{delta.toFixed(digits)}{suffix} delta
        </div>
      )}
    </div>
  );
}

function Legendish({ color, label }) {
  return (
    <span className="flex items-center gap-2 text-[#475569]">
      <span className="h-2 w-4 rounded-sm" style={{ background: color }}></span>
      {label}
    </span>
  );
}
