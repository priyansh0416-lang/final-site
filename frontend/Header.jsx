import { Link, NavLink, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const NAV = [
  { to: "/onboarding", label: "Onboarding" },
  { to: "/dashboard", label: "Portfolio Intelligence" },
  { to: "/stress-test", label: "Stress Testing" },
  { to: "/education", label: "Education" },
  { to: "/trust", label: "Trust & Methodology" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  return (
    <header
      data-testid="site-header"
      className="sticky top-0 z-50 bg-white/85 backdrop-blur-xl border-b border-[#E2E8F0]"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" data-testid="brand-logo" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-sm bg-[#0A2540] flex items-center justify-center">
            <span className="font-display text-white font-extrabold text-[13px] tracking-tighter">F</span>
          </div>
          <div className="leading-none">
            <div className="font-display font-extrabold text-[#0A2540] tracking-tighter text-[15px]">FOX I</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-[#64748B] -mt-0.5">Institutional FX</div>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              data-testid={`nav-${n.to.replace("/", "")}`}
              className={({ isActive }) =>
                `px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? "text-[#0A2540] bg-[#F1F5F9]"
                    : "text-[#475569] hover:text-[#0A2540] hover:bg-[#F8FAFC]"
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-2">
          <Link to="/dashboard" data-testid="header-cta-dashboard">
            <Button
              variant="default"
              className="bg-[#0A2540] hover:bg-[#1D4ED8] text-white rounded-md h-9 px-4 text-sm"
            >
              Open Dashboard
            </Button>
          </Link>
        </div>

        <button
          data-testid="mobile-menu-toggle"
          className="lg:hidden p-2"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t border-[#E2E8F0] bg-white">
          <div className="px-6 py-4 flex flex-col gap-2">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                data-testid={`mobile-nav-${n.to.replace("/", "")}`}
                className={`px-3 py-2 rounded-md text-sm ${loc.pathname === n.to ? "bg-[#F1F5F9] text-[#0A2540]" : "text-[#475569]"}`}
              >
                {n.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
