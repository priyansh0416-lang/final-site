import { Shield, FileCheck, Activity, Eye, ScrollText, GitBranch } from "lucide-react";

const PILLARS = [
  {
    icon: Shield,
    title: "Risk Management Framework",
    points: [
      "Volatility-targeted position sizing — strategy vol held within 7–9% annualized",
      "Drawdown circuit-breakers at -4%, -6%, -8% triggering systematic deleveraging",
      "Daily VaR & expected shortfall monitoring with independent oversight",
    ],
  },
  {
    icon: Activity,
    title: "Drawdown Controls",
    points: [
      "Hard cap on single-position FX exposure (typically <15% of risk budget)",
      "Correlation-aware basket sizing — avoids concentrated currency-block risk",
      "Liquidity tier requirements — only G10 and select EM with full intraday liquidity",
    ],
  },
  {
    icon: Eye,
    title: "Transparency Standards",
    points: [
      "Monthly factor attribution — carry, momentum, value, macro discretionary",
      "Position-level disclosure available to qualifying allocators under NDA",
      "Independently audited NAV with daily marks",
    ],
  },
  {
    icon: ScrollText,
    title: "Strategy Philosophy",
    points: [
      "FX is an asset class — not a residual of equity allocation",
      "Diversification of return drivers > concentration of conviction",
      "Risk-adjusted compounding over chasing maximum nominal returns",
    ],
  },
  {
    icon: FileCheck,
    title: "Compliance-Oriented Reporting",
    points: [
      "GIPS-aligned performance presentation",
      "Quarterly investor letters with full attribution & risk decomposition",
      "Independent third-party administration and custody",
    ],
  },
  {
    icon: GitBranch,
    title: "Institutional Methodology",
    points: [
      "Multi-signal blending: carry, macro divergence, vol carry, momentum filters",
      "Walk-forward validation — no single signal contributes more than 25% of risk",
      "Regime-aware allocation — vol regimes detected with 8-14 month persistence",
    ],
  },
];

export default function Trust() {
  return (
    <div data-testid="trust-page" className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-14">
        <div className="text-[11px] uppercase tracking-[0.22em] text-[#0F766E] font-semibold mb-2">Trust & Methodology</div>
        <h1 className="font-display text-3xl lg:text-4xl font-bold text-[#0A2540] tracking-tight max-w-3xl">
          Six pillars. No black boxes. The same disciplines an institutional consultant would diligence.
        </h1>
        <p className="mt-3 text-[#475569] max-w-2xl">
          Institutional capital flows toward transparency, not toward marketing. Here is how
          FOX I is structured to meet that standard.
        </p>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PILLARS.map((p, i) => (
            <div key={i} data-testid={`pillar-${i}`} className="border border-[#E2E8F0] rounded-lg p-6 bg-white hover:border-[#0A2540] transition-colors">
              <p.icon size={22} strokeWidth={1.5} className="text-[#0A2540] mb-4" />
              <div className="font-display text-lg font-semibold text-[#0F172A] mb-3 tracking-tight">{p.title}</div>
              <ul className="space-y-2.5">
                {p.points.map((pt, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-[#475569] leading-relaxed">
                    <span className="text-[#0F766E] mt-1.5 h-1 w-1 rounded-full bg-[#0F766E] flex-shrink-0"></span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 border border-[#E2E8F0] rounded-lg p-8 bg-[#F8FAFC]">
          <div className="text-xs uppercase tracking-[0.2em] text-[#0F766E] font-semibold mb-3">Disclosure</div>
          <p className="text-sm text-[#475569] leading-relaxed max-w-3xl">
            The simulations and historical paths shown on this platform are constructed from
            curated, institutionally calibrated datasets for educational and illustrative purposes.
            They do not represent live track records, guarantees of future performance, or
            offers of any security. FOX I positions itself as an institutional FX strategy
            provider; all investments carry market, currency, liquidity, and counterparty risk.
            Qualified investors may request the formal offering documents, audited returns,
            risk disclosures, and methodology white papers via the secure investor relations channel.
          </p>
        </div>
      </div>
    </div>
  );
}
