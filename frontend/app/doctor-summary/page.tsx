"use client";

import { useEffect, useState } from "react";
import { Printer, ArrowLeft, FirstAidKit, WarningCircle, ChatCircleText } from "@phosphor-icons/react";

type Mode = "her" | "pregnancy";

const fmtDate = (d?: string | null) =>
  d ? new Date(`${String(d).split("T")[0]}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid mb-5">
      <h2 className="text-xs font-semibold text-plum-900/60 border-b border-plum-900/10 pb-1 mb-2">{title}</h2>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-plum-900/10 px-3 py-2">
      <div className="text-[11px] text-plum-900/55">{label}</div>
      <div className="text-sm font-semibold text-plum-900">{value ?? "—"}</div>
    </div>
  );
}

function Screen({ title, data, detail }: { title: string; data: any; detail?: string }) {
  if (!data) return null;
  if (data.not_scored) {
    return (
      <div className="rounded-lg border border-plum-900/10 p-3 break-inside-avoid">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-plum-900">{title}</span>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border bg-plum-900/5 text-plum-900/60 border-plum-900/10">Not scored</span>
        </div>
        <p className="text-xs text-plum-900/70 mt-1">{data.reason}</p>
      </div>
    );
  }
  const level = data.risk_level || "—";
  const tone = level === "High" ? "bg-red-50 text-red-800 border-red-200" : level === "Moderate" ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-emerald-50 text-emerald-800 border-emerald-200";
  return (
    <div className="rounded-lg border border-plum-900/10 p-3 break-inside-avoid">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-plum-900">{title}</span>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${tone}`}>{level}</span>
      </div>
      {detail && <p className="text-xs text-plum-900/70 mt-1">{detail}</p>}
      {(data.clinical_flags || []).length > 0 && (
        <ul className="mt-1 text-xs text-plum-900/80 list-disc pl-4">
          {data.clinical_flags.map((f: string) => <li key={f}>{f}</li>)}
        </ul>
      )}
      {data.model && (
        <p className="text-[10px] text-plum-900/45 mt-1">
          {data.model.name}; {data.model.dataset}, n={data.model.n}, AUC {data.model.roc_auc}. Screening aid, not a diagnosis.
        </p>
      )}
      {data.method && !data.model && <p className="text-[10px] text-plum-900/45 mt-1">Method: {data.method}</p>}
    </div>
  );
}

const List = ({ items }: { items: { label: string; count: number }[] }) =>
  items.length ? (
    <p className="text-xs text-plum-900/80">{items.slice(0, 8).map(i => `${i.label} (${i.count})`).join(" · ")}</p>
  ) : (
    <p className="text-xs text-plum-900/50">None recorded</p>
  );

export default function DoctorSummaryPage() {
  const [mode, setMode] = useState<Mode>("her");
  const [days, setDays] = useState(90);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setMode(params.get("mode") === "pregnancy" ? "pregnancy" : "her");
    setDays(parseInt(params.get("days") || "90") || 90);
  }, []);

  useEffect(() => {
    setData(null);
    setError(null);
    fetch(`/api/doctor-summary?mode=${mode}&days=${days}`, { cache: "no-store" })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setData)
      .catch(e => setError(String(e?.message || e)));
  }, [mode, days]);

  const back = mode === "pregnancy" ? "/pregnancy-mode" : "/her-mode";

  return (
    <div className="min-h-screen bg-cream print:bg-white py-6 px-4 print:p-0">
      <style>{`@media print { @page { size: A4; margin: 14mm; } .no-print { display: none !important; } }`}</style>

      <div className="no-print max-w-[210mm] mx-auto mb-4 flex flex-wrap items-center gap-2 justify-between">
        <a href={back} className="inline-flex items-center gap-1.5 text-sm text-plum-900/70 hover:text-plum-900">
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </a>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            className="text-sm rounded-full border border-plum-900/15 bg-white px-3 py-1.5"
            aria-label="Summary period"
          >
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={180}>Last 6 months</option>
          </select>
          <button
            onClick={() => window.print()}
            disabled={!data}
            className="inline-flex items-center gap-2 rounded-full bg-plum-900 text-white text-sm font-medium px-4 py-2 disabled:opacity-40"
          >
            <Printer className="w-4 h-4" /> Print / Save as PDF
          </button>
        </div>
      </div>

      <article className="max-w-[210mm] mx-auto bg-white rounded-2xl print:rounded-none shadow-sm print:shadow-none border border-plum-900/10 print:border-0 p-6 sm:p-8 print:p-0 text-plum-900">
        <header className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2 text-pink-600">
              <FirstAidKit weight="duotone" className="w-5 h-5" />
              <span className="text-xs font-semibold">Sakhi · Doctor visit summary</span>
            </div>
            <h1 className="text-2xl font-semibold mt-1">
              {mode === "pregnancy" ? "Antenatal" : "Menstrual & hormonal"} health summary
            </h1>
            {data && (
              <p className="text-sm text-plum-900/60">
                {data.patient.name} · {data.stats.checkIns} check-ins · {fmtDate(data.period.from)} to {fmtDate(data.period.to)}
              </p>
            )}
          </div>
          <div className="text-right text-[11px] text-plum-900/50">
            Generated {data ? fmtDate(data.generatedAt) : "…"}
            <br />Patient-reported data
          </div>
        </header>

        {error && <p className="text-sm text-red-700">Could not build the summary ({error}).</p>}
        {!data && !error && <p className="text-sm text-plum-900/50">Building summary…</p>}

        {data?.kind === "her" && (
          <>
            <Section title="Cycle">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Stat label="Last period" value={fmtDate(data.cycle.lastPeriodStart)} />
                <Stat label="Cycle length" value={data.cycle.prediction?.average_cycle_length ?? data.cycle.reportedCycleLength ? `${data.cycle.prediction?.average_cycle_length ?? data.cycle.reportedCycleLength} days` : null} />
                <Stat label="Period duration" value={data.cycle.reportedPeriodDuration ? `${data.cycle.reportedPeriodDuration} days` : null} />
                <Stat label="Next period (est.)" value={fmtDate(data.cycle.prediction?.next_period_date)} />
              </div>
              {data.cycle.history.length > 0 && (
                <p className="text-xs text-plum-900/70 mt-2">
                  History: {data.cycle.history.map((h: any) => `${h.month}: ${h.cycleLength}d cycle / ${h.periodDuration}d bleed`).join(" · ")}
                </p>
              )}
              <p className="text-xs text-plum-900/70 mt-1">Self-reported regularity: {data.cycle.regularity || "—"} · Known conditions: {data.patient.diagnosedConditions.length ? data.patient.diagnosedConditions.join(", ") : "none"}</p>
            </Section>

            <Section title="Symptoms over the period">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                <Stat label="Average cramps" value={data.stats.avgCramps !== null ? `${data.stats.avgCramps}/10` : null} />
                <Stat label="Worst cramps" value={data.stats.maxCramps !== null ? `${data.stats.maxCramps}/10` : null} />
                <Stat label="Heavy-flow days" value={data.stats.heavyDays} />
                <Stat label="Average sleep" value={data.stats.avgSleep !== null ? `${data.stats.avgSleep} h` : null} />
              </div>
              <p className="text-[11px] font-semibold text-plum-900/60">Most reported symptoms (days)</p>
              <List items={data.stats.symptoms} />
              <p className="text-[11px] font-semibold text-plum-900/60 mt-1">Flow</p>
              <List items={data.stats.flow} />
              <p className="text-[11px] font-semibold text-plum-900/60 mt-1">Mood</p>
              <List items={data.stats.moods} />
            </Section>

            {data.pcosPattern && data.pcosPattern.rows.some((r: any) => r.checkIns > 0) && (
              <Section title="Month by month (PCOS pattern)">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-plum-900/50">
                      <th className="py-1 font-medium">Month</th><th className="font-medium">Period</th><th className="font-medium">Cycle</th>
                      <th className="font-medium">Bleed days</th><th className="font-medium">Acne</th><th className="font-medium">Hair growth</th>
                      <th className="font-medium">Hair loss</th><th className="font-medium">Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.pcosPattern.rows.map((r: any) => (
                      <tr key={r.label} className="border-t border-plum-900/5">
                        <td className="py-1">{r.label}</td>
                        <td className={!r.periodStarted && r.checkIns >= 10 ? "font-bold text-red-700" : ""}>{r.periodStarted ? "Yes" : r.checkIns ? "No" : "—"}</td>
                        <td className={r.cycleLength && (r.cycleLength > 35 || r.cycleLength < 21) ? "font-bold text-red-700" : ""}>{r.cycleLength ? `${r.cycleLength} d` : "—"}</td>
                        <td>{r.checkIns ? r.bleedDays : "—"}</td>
                        <td>{r.checkIns ? r.acneDays : "—"}</td>
                        <td>{r.checkIns ? r.hairGrowthDays : "—"}</td>
                        <td>{r.checkIns ? r.hairLossDays : "—"}</td>
                        <td>{r.weight ? `${r.weight} kg` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-[10px] text-plum-900/50 mt-1">Days counted from her daily check-ins. Cycle = days from that month&apos;s period start to the next one.</p>
              </Section>
            )}

            <Section title="Screening results">
              <div className="grid sm:grid-cols-2 gap-2">
                <Screen title="PCOS (Rotterdam symptom criteria)" data={data.screens.pcos} detail={data.screens.pcos?.next_step} />
                <Screen title="Thyroid symptom screen" data={data.screens.thyroid} detail={data.screens.thyroid?.next_step} />
              </div>
            </Section>
          </>
        )}

        {data?.kind === "pregnancy" && (
          <>
            <Section title="Pregnancy">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Stat label="Gestation" value={data.patient.weeksPregnant ? `${data.patient.weeksPregnant} weeks` : null} />
                <Stat label="Due date" value={fmtDate(data.patient.dueDate)} />
                <Stat label="Weight change" value={data.vitals.weightChange !== null ? `${data.vitals.weightChange > 0 ? "+" : ""}${data.vitals.weightChange} kg` : null} />
                <Stat label="Baby kicks (avg / min)" value={data.vitals.avgKicks !== null ? `${data.vitals.avgKicks} / ${data.vitals.minKicks}` : null} />
              </div>
              <p className="text-xs text-plum-900/70 mt-2">
                {data.patient.experience || ""}{data.patient.experience ? " · " : ""}Known conditions: {data.patient.conditions.length ? data.patient.conditions.join(", ") : "none"}
              </p>
            </Section>

            <Section title="Blood pressure & glucose readings">
              {data.vitals.bp.length === 0 && data.vitals.sugar.length === 0 ? (
                <p className="text-xs text-plum-900/50">No readings logged in this period.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-plum-900/50">
                      <th className="py-1 font-medium">Date</th><th className="font-medium">BP (mmHg)</th><th className="font-medium">Glucose (mg/dL)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(new Set([...data.vitals.bp.map((b: any) => b.date), ...data.vitals.sugar.map((s: any) => s.date)]))
                      .sort().slice(-15).map((d: any) => {
                        const b = data.vitals.bp.find((x: any) => x.date === d);
                        const s = data.vitals.sugar.find((x: any) => x.date === d);
                        const highBp = b && (b.systolic >= 140 || b.diastolic >= 90);
                        return (
                          <tr key={d} className="border-t border-plum-900/5">
                            <td className="py-1">{fmtDate(d)}</td>
                            <td className={highBp ? "font-bold text-red-700" : ""}>{b ? `${b.systolic}/${b.diastolic}` : "—"}</td>
                            <td className={s && s.value >= 140 ? "font-bold text-red-700" : ""}>{s ? s.value : "—"}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </Section>

            <Section title="Symptoms reported (days)">
              <List items={data.stats.symptoms} />
            </Section>

            <Section title="Screening results">
              <div className="grid sm:grid-cols-2 gap-2">
                <Screen title="Preeclampsia / hypertensive risk" data={data.screens.preeclampsia} />
                <Screen title="Blood sugar risk" data={data.screens.gdm} detail="General diabetes model (trained on non-pregnant women) used as a guide; OGTT at 24 to 28 weeks diagnoses gestational diabetes." />
              </div>
            </Section>

            {data.appointments.length > 0 && (
              <Section title="Appointments this month">
                <p className="text-xs text-plum-900/80">
                  {data.appointments.map((a: any) => `${a.completed ? "✓" : "○"} ${a.name} (${a.date})`).join(" · ")}
                </p>
              </Section>
            )}
          </>
        )}

        {data && (
          <>
            {data.labs?.length > 0 && (
              <Section title="Lab results (latest of each)">
                <table className="w-full text-xs">
                  <tbody>
                    {data.labs.map((l: any) => (
                      <tr key={l.key} className="border-t border-plum-900/5 align-top">
                        <td className="py-1 pr-2 font-medium">{l.label}</td>
                        <td className={`pr-2 tabular-nums ${l.status === "attention" || l.status === "urgent" ? "font-bold text-red-700" : ""}`}>{l.value}</td>
                        <td className="pr-2 text-plum-900/60">{fmtDate(l.date)}</td>
                        <td className="text-plum-900/70">{l.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>
            )}

            {data.tablets && (
              <Section title={`Tablets taken, last ${data.tablets.days} days${data.tablets.takenRate !== null ? ` (${data.tablets.takenRate}% of doses)` : ""}`}>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-plum-900/50">
                      <th className="py-1 font-medium">Tablet</th><th className="font-medium">Schedule</th><th className="font-medium">On time</th><th className="font-medium">Late</th><th className="font-medium">Missed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.tablets.rows.map((t: any) => (
                      <tr key={t.name} className="border-t border-plum-900/5">
                        <td className="py-1">{t.name}</td><td>{t.schedule}</td><td>{t.onTime}</td><td>{t.late}</td>
                        <td className={t.missed > 3 ? "font-bold text-red-700" : ""}>{t.missed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>
            )}

            <Section title="Points to discuss">
              {data.flags.length > 0 && (
                <div className="flex gap-2 mb-2">
                  <WarningCircle weight="fill" className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <ul className="text-xs text-plum-900/85 list-disc pl-4">
                    {data.flags.map((f: string) => <li key={f}>{f}</li>)}
                  </ul>
                </div>
              )}
              <div className="flex gap-2">
                <ChatCircleText weight="fill" className="w-4 h-4 text-pink-600 shrink-0 mt-0.5" />
                <ul className="text-xs text-plum-900/85 list-disc pl-4">
                  {data.questions.map((q: string) => <li key={q}>{q}</li>)}
                </ul>
              </div>
            </Section>

            <footer className="text-[10px] text-plum-900/45 border-t border-plum-900/10 pt-2">
              Generated by Sakhi from patient-reported daily check-ins. Risk screens are decision-support aids trained on public
              research datasets and clinical guidelines; they are not a diagnosis. Please interpret alongside clinical examination
              and laboratory tests.
            </footer>
          </>
        )}
      </article>
    </div>
  );
}
