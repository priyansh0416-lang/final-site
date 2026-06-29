export default function Footer() {
  return (
    <footer
      data-testid="site-footer"
      className="border-t border-[#E2E8F0] bg-[#F8FAFC] mt-24"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-sm bg-[#0A2540] flex items-center justify-center">
              <span className="font-display text-white font-extrabold text-[13px]">F</span>
            </div>
            <div>
              <div className="font-display font-extrabold text-[#0A2540] text-[15px]">FOX I</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-[#64748B]">Institutional FX</div>
            </div>
          </div>
          <p className="text-sm text-[#64748B] leading-relaxed">
            Strategic currency exposure for global macro diversification. Risk-managed.
            Transparent. Built for institutional and HNW investors.
          </p>
        </div>

        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-[#64748B] mb-3 font-semibold">Platform</div>
          <ul className="text-sm text-[#475569] space-y-2">
            <li>Investor Onboarding</li>
            <li>Portfolio Intelligence</li>
            <li>Historical Stress Testing</li>
            <li>FX Education</li>
          </ul>
        </div>

        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-[#64748B] mb-3 font-semibold">Methodology</div>
          <ul className="text-sm text-[#475569] space-y-2">
            <li>Risk Framework</li>
            <li>Drawdown Controls</li>
            <li>Compliance Standards</li>
            <li>Performance Reporting</li>
          </ul>
        </div>

        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-[#64748B] mb-3 font-semibold">Disclosure</div>
          <p className="text-xs text-[#64748B] leading-relaxed">
            Simulations and back-tests shown are illustrative, based on curated historical datasets,
            and do not represent guaranteed future returns. FOX I is positioned as an institutional
            strategy provider; investments carry market and currency risk.
          </p>
        </div>
      </div>

      <div className="border-t border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-5 flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="text-xs text-[#94A3B8] font-mono">© FOX I CAPITAL · INSTITUTIONAL FX STRATEGIES</div>
          <div className="text-xs text-[#94A3B8] font-mono">v 1.0 · educational simulation environment</div>
        </div>
      </div>
    </footer>
  );
}
