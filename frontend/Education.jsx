import { useEffect, useState } from "react";
import axios from "axios";
import { API } from "@/lib/foxi";
import { Badge } from "@/components/ui/badge";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

export default function Education() {
  const [edu, setEdu] = useState([]);
  const [cases, setCases] = useState([]);

  useEffect(() => {
    axios.get(`${API}/education`).then((r) => setEdu(r.data));
    axios.get(`${API}/case-studies`).then((r) => setCases(r.data));
  }, []);

  const grouped = edu.reduce((acc, e) => {
    (acc[e.category] = acc[e.category] || []).push(e);
    return acc;
  }, {});

  return (
    <div data-testid="education-page" className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-14">
        <div className="text-[11px] uppercase tracking-[0.22em] text-[#0F766E] font-semibold mb-2">Institutional FX Education</div>
        <h1 className="font-display text-3xl lg:text-4xl font-bold text-[#0A2540] tracking-tight">
          The FX playbook of the world's largest investors — explained.
        </h1>
        <p className="mt-3 text-[#475569] max-w-2xl">
          No jargon. No charts you can't read. The same conceptual framework that sovereign
          wealth funds, central banks, and macro hedge funds rely on.
        </p>

        {/* Education library */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <div className="text-[11px] uppercase tracking-[0.2em] text-[#0F766E] font-semibold mb-4">{category}</div>
              <Accordion type="single" collapsible>
                {items.map((e) => (
                  <AccordionItem key={e.id} value={e.id} className="border-[#E2E8F0]">
                    <AccordionTrigger data-testid={`edu-${e.id}`} className="text-left text-[#0F172A] hover:text-[#0A2540] hover:no-underline">
                      <span className="font-display font-semibold text-sm">{e.title}</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-[#475569] leading-relaxed">{e.body}</p>
                      <div className="mt-3 space-y-1.5">
                        {e.data_points.map((dp, i) => (
                          <div key={i} className="flex items-start gap-2 text-[12px] font-mono text-[#0F172A]">
                            <span className="text-[#0F766E] mt-0.5">▸</span>
                            <span>{dp}</span>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>

        {/* Case studies */}
        <div className="mt-20">
          <div className="text-[11px] uppercase tracking-[0.22em] text-[#0F766E] font-semibold mb-2">Real-world case studies</div>
          <h2 className="font-display text-2xl lg:text-3xl font-bold text-[#0A2540] tracking-tight">
            How sophisticated organizations actually use FX.
          </h2>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {cases.map((c) => (
              <div key={c.id} data-testid={`case-${c.id}`} className="border border-[#E2E8F0] rounded-lg p-5 hover:border-[#0A2540] transition-colors bg-white">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider border-[#CBD5E1] text-[#475569]">{c.sector}</Badge>
                  <span className="font-mono text-[10px] text-[#94A3B8]">{c.year}</span>
                </div>
                <div className="font-display text-base font-semibold text-[#0A2540] leading-snug">{c.title}</div>
                <div className="text-[12px] text-[#94A3B8] mt-1">{c.company}</div>
                <p className="mt-3 text-sm text-[#475569] leading-relaxed">{c.summary}</p>
                <div className="mt-4 pt-3 border-t border-[#E2E8F0]">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-[#0F766E] font-semibold mb-1">Institutional lesson</div>
                  <div className="text-[12px] text-[#0F172A] italic leading-snug">"{c.lesson}"</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
