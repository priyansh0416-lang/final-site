import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, Shield, BarChart3, Globe } from "lucide-react";

const TICKER_ITEMS = [
  { k: "DXY", v: "104.21", d: "+0.18%" },
  { k: "EUR/USD", v: "1.0824", d: "-0.12%" },
  { k: "USD/JPY", v: "152.34", d: "+0.31%" },
  { k: "USD/INR", v: "83.62", d: "+0.04%" },
  { k: "GBP/USD", v: "1.2691", d: "+0.09%" },
  { k: "USD/CNY", v: "7.218", d: "-0.06%" },
  { k: "AUD/USD", v: "0.6612", d: "+0.21%" },
  { k: "Carry G10 Idx", v: "118.4", d: "+0.7%" },
];

const STATS = [
  { v: "$7.5T", l: "Daily global FX turnover (BIS, 2022)" },
  { v: "$2.3T", l: "Sovereign wealth assets with active FX mandates" },
  { v: "78%", l: "Top-50 pensions running FX overlays" },
  { v: "0.08", l: "FX strategy correlation to S&P 500" },
];

const MISCONCEPTIONS = [
  {
    myth: "FX is gambling.",
    truth: "FX is the world's largest, most liquid asset class. It is a structural component of every sovereign wealth fund's portfolio.",
  },
  {
    myth: "Currency exposure averages out over time.",
    truth: "INR depreciated 55% vs USD over 12 years. JPY moved 30% in 18 months. Currency drift is permanent, not transient.",
  },
  {
    myth: "FX is too volatile.",
    truth: "G10 FX realised volatility (7–11%) is structurally lower than equities (15–25%). Vol-targeted FX strategies further reduce dispersion.",
  },
];

export default function Landing() {
  return (
    <div data-testid="landing-page">
      {/* Ticker */}
      <div className="border-b border-[#E2E8F0] bg-[#F8FAFC] overflow-hidden">
        <div className="flex foxi-ticker whitespace-nowrap py-2.5">
          {[...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS].map((t, i) => (
            <div key={i} className="px-6 text-xs font-mono flex items-center gap-2">
              <span className="text-[#94A3B8] uppercase tracking-wider">{t.k}</span>
              <span className="text-[#0F172A] font-semibold">{t.v}</span>
              <span className={t.d.startsWith("+") ? "text-[#059669]" : "text-[#DC2626]"}>{t.d}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hero */}
      <section className="relative foxi-grid-bg">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-20 pb-24 lg:pt-28 lg:pb-32">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 foxi-reveal">
              <div className="text-xs uppercase tracking-[0.24em] text-[#0F766E] font-semibold mb-5">
                Institutional FX Strategies · Macro Diversification
              </div>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#0A2540] leading-[1.05] tracking-tighter">
                The currency layer<br />
                your portfolio is<br />
                <span className="italic font-medium text-[#1D4ED8]">quietly missing.</span>
              </h1>
              <p className="mt-6 text-base lg:text-lg text-[#475569] max-w-xl leading-relaxed">
                FOX I builds institutional FX strategies — carry, macro positioning, currency
                diversification — used by sovereign wealth funds and pensions for decades.
                Learn how strategic FX exposure reshapes the risk profile of any portfolio.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link to="/onboarding" data-testid="hero-cta-onboarding">
                  <Button className="bg-[#0A2540] hover:bg-[#1D4ED8] text-white rounded-md h-11 px-6">
                    Start Investor Onboarding <ArrowRight size={16} className="ml-2" />
                  </Button>
                </Link>
                <Link to="/dashboard" data-testid="hero-cta-dashboard">
                  <Button variant="outline" className="border-[#0A2540] text-[#0A2540] hover:bg-[#F8FAFC] rounded-md h-11 px-6">
                    Explore Portfolio Intelligence
                  </Button>
                </Link>
              </div>

              <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl">
                {STATS.map((s, i) => (
                  <div key={i} className="border-l-2 border-[#0A2540] pl-3">
                    <div className="font-display text-2xl font-extrabold text-[#0A2540] foxi-num">{s.v}</div>
                    <div className="text-[11px] text-[#64748B] leading-snug mt-1">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 foxi-reveal foxi-reveal-delay-2">
              <div className="rounded-lg border border-[#E2E8F0] bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-[#64748B] font-semibold">Strategy Snapshot</div>
                  <div className="text-[10px] font-mono text-[#94A3B8]">LIVE METHODOLOGY</div>
                </div>

                <div className="space-y-4 text-sm">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[#475569]">Target net return</span>
                    <span className="font-mono font-semibold text-[#0F172A]">8 – 10% annualized</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-[#475569]">Realized volatility (target)</span>
                    <span className="font-mono font-semibold text-[#0F172A]">7 – 9%</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-[#475569]">Correlation to global equities</span>
                    <span className="font-mono font-semibold text-[#0F766E]">~ 0.08</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-[#475569]">Max drawdown (back-test)</span>
                    <span className="font-mono font-semibold text-[#0F172A]">-6.4%</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-[#475569]">Strategy components</span>
                    <span className="font-mono font-semibold text-[#0F172A]">Carry · Macro · Vol</span>
                  </div>
                </div>

                <div className="mt-6 pt-5 border-t border-[#E2E8F0]">
                  <div className="text-xs text-[#475569] leading-relaxed">
                    “FX exposure is not a residual of asset allocation — it is an asset class
                    of its own. The world's largest investors have known this for thirty years.”
                  </div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[#94A3B8] mt-3">— FOX I Macro Desk</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Misconceptions */}
      <section className="border-t border-[#E2E8F0] bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
          <div className="text-xs uppercase tracking-[0.24em] text-[#0F766E] font-semibold mb-3">Reframing FX</div>
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-[#0A2540] tracking-tight max-w-3xl">
            What retail markets call risk, institutions call diversification.
          </h2>
          <p className="mt-4 text-[#475569] max-w-2xl leading-relaxed">
            Most investors carry an unmanaged, often invisible currency exposure. Removing the
            misconceptions is the first step toward institutional-grade portfolio construction.
          </p>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            {MISCONCEPTIONS.map((m, i) => (
              <div key={i} className="bg-white border border-[#E2E8F0] rounded-lg p-6 hover:border-[#0A2540] transition-colors">
                <div className="text-[11px] uppercase tracking-[0.18em] text-[#DC2626] font-semibold mb-2">Misconception</div>
                <div className="font-display text-lg font-semibold text-[#0F172A] leading-snug">{m.myth}</div>
                <div className="my-4 h-px bg-[#E2E8F0]"></div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-[#0F766E] font-semibold mb-2">Institutional reality</div>
                <div className="text-sm text-[#475569] leading-relaxed">{m.truth}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules grid */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
          <div className="text-xs uppercase tracking-[0.24em] text-[#0F766E] font-semibold mb-3">Platform Modules</div>
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-[#0A2540] tracking-tight">
            A full institutional intelligence stack.
          </h2>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: TrendingUp, title: "Portfolio Intelligence", desc: "Editable allocations. Real-time recalculation of CAGR, Sharpe, drawdown, recovery. Without vs. With FOX I delta engine.", link: "/dashboard" },
              { icon: BarChart3, title: "Stress Testing", desc: "Replay 2008, COVID, INR depreciation, Fed cycles, geopolitical shocks. Custom scenario builder for macro events.", link: "/stress-test" },
              { icon: Globe, title: "FX Education", desc: "Hedging, carry, macro positioning, central bank impact — explained with the data points institutions actually use.", link: "/education" },
              { icon: Shield, title: "Trust & Methodology", desc: "Risk framework, drawdown controls, transparency standards. Compliance-grade reporting from day one.", link: "/trust" },
            ].map((m, i) => (
              <Link
                key={i}
                to={m.link}
                data-testid={`module-card-${i}`}
                className="group block bg-white border border-[#E2E8F0] hover:border-[#0A2540] rounded-lg p-6 transition-all hover:-translate-y-0.5"
              >
                <m.icon size={22} strokeWidth={1.5} className="text-[#0A2540] mb-4" />
                <div className="font-display text-lg font-semibold text-[#0F172A]">{m.title}</div>
                <div className="mt-2 text-sm text-[#475569] leading-relaxed">{m.desc}</div>
                <div className="mt-4 text-xs font-mono uppercase tracking-wider text-[#1D4ED8] group-hover:translate-x-1 transition-transform">
                  Explore →
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="bg-[#0A2540] text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          <div className="md:col-span-2">
            <h2 className="font-display text-3xl lg:text-4xl font-bold tracking-tight">
              See your portfolio through an institutional lens.
            </h2>
            <p className="mt-3 text-white/70 max-w-xl">
              Five minutes. Edit your real allocation. Observe the without-vs-with delta. Read
              the AI-generated institutional narrative on what you are missing.
            </p>
          </div>
          <div className="flex md:justify-end">
            <Link to="/onboarding" data-testid="footer-cta-onboarding">
              <Button className="bg-white text-[#0A2540] hover:bg-[#F1F5F9] rounded-md h-11 px-6">
                Begin Onboarding <ArrowRight size={16} className="ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
