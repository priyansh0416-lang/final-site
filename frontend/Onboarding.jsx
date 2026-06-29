import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { API } from "@/lib/foxi";
import axios from "axios";
import { toast } from "sonner";

const STEPS = [
  {
    id: "investor_type",
    section: "Profile",
    title: "Which best describes you?",
    subtitle: "We tailor the depth of analysis to your context.",
    type: "single",
    options: [
      { v: "hnw", label: "Individual / HNW investor" },
      { v: "family_office", label: "Family office" },
      { v: "institution", label: "Institutional allocator" },
      { v: "professional", label: "Investment professional / advisor" },
    ],
  },
  {
    id: "experience",
    section: "Profile",
    title: "Your investing experience",
    subtitle: "There are no wrong answers — this calibrates education depth.",
    type: "single",
    options: [
      { v: "<3", label: "Less than 3 years" },
      { v: "3-10", label: "3 – 10 years" },
      { v: "10+", label: "10+ years" },
    ],
  },
  {
    id: "portfolio_size",
    section: "Profile",
    title: "Approximate portfolio size",
    subtitle: "Used only to scale examples. Not stored externally.",
    type: "single",
    options: [
      { v: "<100k", label: "< $100k" },
      { v: "100k-1m", label: "$100k – $1M" },
      { v: "1m-10m", label: "$1M – $10M" },
      { v: "10m+", label: "$10M+" },
    ],
  },
  {
    id: "allocation",
    section: "Current Portfolio",
    title: "Your current allocation (approximate)",
    subtitle: "Move the sliders. We use this as the baseline for the dashboard.",
    type: "allocation",
  },
  {
    id: "fx_belief_1",
    section: "FX Perception",
    title: "FX trading is mostly speculation / gambling.",
    subtitle: "Honest first reactions are the most useful.",
    type: "single",
    insight: {
      title: "Institutional reality",
      body: "FX is the world's largest asset market ($7.5T daily). Sovereign wealth funds and central banks treat FX as a structural allocation. Retail spot trading is one tiny corner — and not what FOX I does.",
    },
    options: [
      { v: "agree", label: "Strongly agree" },
      { v: "lean_agree", label: "Lean agree" },
      { v: "neutral", label: "Neutral" },
      { v: "lean_disagree", label: "Lean disagree" },
      { v: "disagree", label: "Strongly disagree" },
    ],
  },
  {
    id: "fx_belief_2",
    section: "FX Perception",
    title: "Currency exposure averages out over the long run.",
    subtitle: "A common allocator assumption — worth testing.",
    type: "single",
    insight: {
      title: "Institutional reality",
      body: "INR fell 55% vs USD over 12 years. JPY moved 30% in 18 months. There is no \"mean reversion\" timescale for currencies — drifts are persistent and permanent in real terms.",
    },
    options: [
      { v: "agree", label: "Strongly agree" },
      { v: "lean_agree", label: "Lean agree" },
      { v: "neutral", label: "Neutral" },
      { v: "lean_disagree", label: "Lean disagree" },
      { v: "disagree", label: "Strongly disagree" },
    ],
  },
  {
    id: "fx_belief_3",
    section: "FX Perception",
    title: "If I hold global equities, I already have FX exposure.",
    subtitle: "Technically yes — but is it managed?",
    type: "single",
    insight: {
      title: "Institutional reality",
      body: "Embedded FX exposure inside equity portfolios is unmanaged, concentrated in USD, and uncompensated. Institutions either hedge it (pensions) or treat it as a separate allocation (sovereign wealth) — they rarely leave it untouched.",
    },
    options: [
      { v: "yes_managed", label: "Yes — and I think it's managed" },
      { v: "yes_unsure", label: "Yes — but unsure if managed" },
      { v: "never_thought", label: "Honestly, I hadn't thought about it" },
      { v: "no", label: "No, I assume not" },
    ],
  },
  {
    id: "goals",
    section: "Goals",
    title: "What outcome would matter most to you?",
    subtitle: "Pick the single most important.",
    type: "single",
    options: [
      { v: "diversification", label: "Better diversification & lower drawdown" },
      { v: "returns", label: "Higher risk-adjusted returns" },
      { v: "hedging", label: "Hedging existing currency risk" },
      { v: "learning", label: "Understanding the institutional FX playbook" },
    ],
  },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({
    allocation: { equities: 60, bonds: 20, gold: 5, real_estate: 5, cash: 10 },
  });
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const total = STEPS.length;
  const progress = ((step + 1) / total) * 100;
  const cur = STEPS[step];

  const allocTotal = useMemo(() => {
    const a = answers.allocation || {};
    return ["equities", "bonds", "gold", "real_estate", "cash"].reduce((s, k) => s + (a[k] || 0), 0);
  }, [answers]);

  const canAdvance = () => {
    if (cur.type === "single") return !!answers[cur.id];
    if (cur.type === "allocation") return allocTotal === 100;
    return true;
  };

  const handleNext = async () => {
    if (step < total - 1) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // submit
      setSubmitting(true);
      try {
        await axios.post(`${API}/onboarding/submit`, { answers });
        localStorage.setItem("foxi_onboarding", JSON.stringify(answers));
        toast.success("Profile saved. Loading your dashboard…");
        setTimeout(() => navigate("/dashboard"), 600);
      } catch (e) {
        // even if backend fails, persist locally
        localStorage.setItem("foxi_onboarding", JSON.stringify(answers));
        navigate("/dashboard");
      } finally {
        setSubmitting(false);
      }
    }
  };

  const setSingle = (val) => setAnswers((a) => ({ ...a, [cur.id]: val }));
  const setAllocation = (key, val) =>
    setAnswers((a) => ({ ...a, allocation: { ...a.allocation, [key]: val } }));

  return (
    <div data-testid="onboarding-page" className="bg-white">
      <div className="max-w-3xl mx-auto px-6 lg:px-8 py-14">
        <div className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] uppercase tracking-[0.22em] text-[#0F766E] font-semibold">
              {cur.section}
            </div>
            <div className="text-[11px] font-mono text-[#64748B]">
              STEP {step + 1} / {total}
            </div>
          </div>
          <Progress value={progress} className="h-1 bg-[#F1F5F9]" data-testid="onboarding-progress" />
        </div>

        <div key={cur.id} className="foxi-reveal">
          <h1 className="font-display text-3xl lg:text-4xl font-bold text-[#0A2540] tracking-tight leading-tight">
            {cur.title}
          </h1>
          <p className="mt-3 text-[#475569]">{cur.subtitle}</p>

          {cur.type === "single" && (
            <div className="mt-8">
              <RadioGroup
                value={answers[cur.id] || ""}
                onValueChange={setSingle}
                className="space-y-3"
              >
                {cur.options.map((o) => (
                  <label
                    key={o.v}
                    htmlFor={`${cur.id}-${o.v}`}
                    data-testid={`option-${cur.id}-${o.v}`}
                    className={`flex items-center gap-3 rounded-md border px-4 py-3.5 cursor-pointer transition-colors ${
                      answers[cur.id] === o.v
                        ? "border-[#0A2540] bg-[#F8FAFC]"
                        : "border-[#E2E8F0] hover:border-[#CBD5E1] bg-white"
                    }`}
                  >
                    <RadioGroupItem value={o.v} id={`${cur.id}-${o.v}`} className="border-[#94A3B8]" />
                    <span className="text-sm text-[#0F172A]">{o.label}</span>
                  </label>
                ))}
              </RadioGroup>

              {cur.insight && answers[cur.id] && (
                <div className="mt-6 border-l-2 border-[#0F766E] bg-[#F8FAFC] p-5 rounded-r-md foxi-reveal">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-[#0F766E] font-semibold mb-2">
                    {cur.insight.title}
                  </div>
                  <p className="text-sm text-[#0F172A] leading-relaxed">{cur.insight.body}</p>
                </div>
              )}
            </div>
          )}

          {cur.type === "allocation" && (
            <div className="mt-8 space-y-5">
              {[
                ["equities", "Global Equities"],
                ["bonds", "Global Bonds"],
                ["gold", "Gold"],
                ["real_estate", "Real Estate"],
                ["cash", "Cash"],
              ].map(([k, label]) => (
                <div key={k}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-[#0F172A]">{label}</span>
                    <span className="font-mono text-[#475569]">{answers.allocation[k]}%</span>
                  </div>
                  <Slider
                    data-testid={`alloc-slider-${k}`}
                    value={[answers.allocation[k]]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(v) => setAllocation(k, v[0])}
                  />
                </div>
              ))}

              <div
                className={`flex items-center justify-between mt-4 p-3 rounded-md border ${
                  allocTotal === 100
                    ? "border-[#059669] bg-[#F0FDF4]"
                    : "border-[#D97706] bg-[#FFFBEB]"
                }`}
              >
                <span className="text-sm text-[#0F172A]">Total allocation</span>
                <span
                  data-testid="alloc-total"
                  className={`font-mono font-semibold ${
                    allocTotal === 100 ? "text-[#059669]" : "text-[#D97706]"
                  }`}
                >
                  {allocTotal}% {allocTotal === 100 ? "✓" : "(must = 100%)"}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-12 flex justify-between">
          <Button
            variant="ghost"
            disabled={step === 0}
            onClick={() => setStep(step - 1)}
            data-testid="onboarding-back"
            className="text-[#475569] hover:text-[#0A2540]"
          >
            <ArrowLeft size={16} className="mr-2" /> Back
          </Button>
          <Button
            disabled={!canAdvance() || submitting}
            onClick={handleNext}
            data-testid="onboarding-next"
            className="bg-[#0A2540] hover:bg-[#1D4ED8] text-white rounded-md h-11 px-6"
          >
            {step === total - 1 ? (
              <>
                {submitting ? "Saving…" : "View My Portfolio Intelligence"}{" "}
                <CheckCircle2 size={16} className="ml-2" />
              </>
            ) : (
              <>
                Continue <ArrowRight size={16} className="ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
