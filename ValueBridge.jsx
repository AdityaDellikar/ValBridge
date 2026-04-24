import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, BarChart, Bar } from "recharts";

/* ═══════════════════════════════════════════════════════
   VALUEBRIDGE v2 — Cost-to-Value Intelligence Platform
   with Execution Tracking & Learning Loop
   ═══════════════════════════════════════════════════════ */

const P = {
  navy: "#0B1F3A", navy2: "#132D52", navy3: "#1A3A6A",
  gold: "#C9A227", gold2: "#D4B44A", goldFade: "rgba(201,162,39,0.12)",
  white: "#FFFFFF", bg: "#F5F6F9",
  g100: "#ECEEF2", g200: "#DDE1E8", g300: "#C3C9D5", g400: "#9BA3B3", g500: "#6E778A", g700: "#363F52",
  green: "#1B8A50", greenBg: "rgba(27,138,80,0.07)", greenSoft: "#E8F5EE",
  amber: "#D48B0F", amberBg: "rgba(212,139,15,0.07)", amberSoft: "#FDF5E6",
  red: "#C43527", redBg: "rgba(196,53,39,0.07)", redSoft: "#FDECEB",
  teal: "#0E7C86", tealBg: "rgba(14,124,134,0.07)",
};

function calcScore(v, r) { return (v * 0.6) - (r * 0.4); }
function getRec(s) { return s >= 5 ? "Invest" : s >= 2 ? "Review" : "Avoid"; }
function fmtK(n) {
  if (n >= 10000000) return (n / 10000000).toFixed(1) + "Cr";
  if (n >= 100000) return (n / 100000).toFixed(1) + "L";
  if (n >= 1000) return (n / 1000).toFixed(0) + "K";
  return String(n);
}
function fmtFull(n) { return new Intl.NumberFormat("en-IN").format(n); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

const recColor = { Invest: P.green, Review: P.amber, Avoid: P.red };
const recBg = { Invest: P.greenBg, Review: P.amberBg, Avoid: P.redBg };
const statusColor = { Implemented: P.green, "In Progress": P.amber, "Not Implemented": P.g400 };
const statusBg = { Implemented: P.greenSoft, "In Progress": P.amberSoft, "Not Implemented": P.g100 };
const devColor = (d) => d <= 1 ? P.green : d <= 2.5 ? P.amber : P.red;
const devLabel = (d) => d <= 1 ? "Accurate" : d <= 2.5 ? "Moderate" : "High Mismatch";
const devBg = (d) => d <= 1 ? P.greenSoft : d <= 2.5 ? P.amberSoft : P.redSoft;

function autoCategory(name) {
  const n = name.toLowerCase();
  if (n.includes("automat") || n.includes("rpa") || n.includes("bot")) return "Automation";
  if (n.includes("outsourc") || n.includes("vendor")) return "Outsourcing";
  if (n.includes("consolidat") || n.includes("cloud") || n.includes("merg")) return "Consolidation";
  if (n.includes("market") || n.includes("brand") || n.includes("campaign")) return "Marketing";
  if (n.includes("supplier") || n.includes("contract") || n.includes("procur") || n.includes("negotiat")) return "Procurement";
  if (n.includes("downsize") || n.includes("office") || n.includes("staff") || n.includes("headcount")) return "Workforce";
  return "Operations";
}

const SEED = [
  { id: 1, name: "Automate Invoice Processing", cost: 1200000, value: 8, risk: 3, category: "Automation", status: "Implemented", actual: { costSaved: 1100000, value: 7, risk: 3, notes: "Rolled out across 3 departments. Minor integration delays but strong adoption." } },
  { id: 2, name: "Outsource IT Helpdesk", cost: 800000, value: 5, risk: 7, category: "Outsourcing", status: "Implemented", actual: { costSaved: 500000, value: 3, risk: 8, notes: "Vendor underperformed on SLA metrics. Knowledge transfer was inadequate." } },
  { id: 3, name: "Consolidate Cloud Vendors", cost: 2500000, value: 9, risk: 4, category: "Consolidation", status: "In Progress", actual: null },
  { id: 4, name: "Reduce Marketing Spend 20%", cost: 500000, value: 3, risk: 8, category: "Marketing", status: "Implemented", actual: { costSaved: 480000, value: 2, risk: 9, notes: "Pipeline dropped 18% in Q2. Brand awareness metrics declined significantly." } },
  { id: 5, name: "Implement RPA in Finance", cost: 1800000, value: 7, risk: 2, category: "Automation", status: "Implemented", actual: { costSaved: 1750000, value: 8, risk: 2, notes: "Exceeded expectations. Process time reduced by 65%." } },
  { id: 6, name: "Renegotiate Supplier Contracts", cost: 350000, value: 6, risk: 3, category: "Procurement", status: "Implemented", actual: { costSaved: 400000, value: 7, risk: 2, notes: "Achieved 12% cost reduction across key vendors." } },
  { id: 7, name: "Downsize Regional Offices", cost: 3200000, value: 4, risk: 9, category: "Workforce", status: "Not Implemented", actual: null },
];

const INSIGHTS_MAP = {
  "Automate Invoice Processing": "High-value automation initiative with strong ROI potential. Low operational risk due to mature technology.",
  "Outsource IT Helpdesk": "Moderate value offset by significant execution risk. Vendor dependency could impact service quality.",
  "Consolidate Cloud Vendors": "Strategic initiative with substantial long-term savings. Multi-cloud consolidation typically yields 25-35% cost reduction.",
  "Reduce Marketing Spend 20%": "High-risk cost reduction that may erode brand equity. Short-term savings could translate to long-term revenue decline.",
  "Implement RPA in Finance": "Strong investment candidate. Process automation delivers measurable efficiency gains with minimal disruption.",
  "Renegotiate Supplier Contracts": "Low-cost, high-impact initiative. Leverage volume commitments for 10-15% cost improvement.",
  "Downsize Regional Offices": "Significant savings but substantial organizational risk. Employee morale and talent attrition could offset gains.",
};

function getInsight(item) {
  if (INSIGHTS_MAP[item.name]) return INSIGHTS_MAP[item.name];
  const r = getRec(calcScore(item.value, item.risk));
  if (r === "Invest") return `Strong value-to-risk ratio. The cost of ₹${fmtK(item.cost)} is justified by high expected returns.`;
  if (r === "Review") return `Mixed value-risk profile requires deeper analysis. Consider a pilot phase before full commitment.`;
  return `Risk outweighs projected value. Recommend deferring or restructuring the approach.`;
}

function generatePerfInsight(item) {
  if (!item.actual) return null;
  const parts = [];
  const vD = item.actual.value - item.value;
  const rD = item.actual.risk - item.risk;
  const costPct = item.cost > 0 ? Math.round((item.actual.costSaved / item.cost) * 100) : 0;
  if (Math.abs(vD) <= 1 && Math.abs(rD) <= 1) {
    parts.push("Prediction accuracy was strong — both value and risk matched actual outcomes.");
  } else {
    if (vD < -2) parts.push(`Value impact was overestimated by ${Math.abs(vD)} points.`);
    else if (vD > 2) parts.push(`Value impact was underestimated by ${vD} points — exceeded expectations.`);
    else if (vD < 0) parts.push("Value impact was slightly below expectations.");
    else if (vD > 0) parts.push("Value impact slightly exceeded estimates.");
    if (rD > 2) parts.push(`Risk was significantly higher than estimated (+${rD} points).`);
    else if (rD > 0) parts.push("Risk materialized slightly above initial assessment.");
    else if (rD < -1) parts.push("Risk was lower than anticipated.");
  }
  if (costPct >= 95) parts.push(`Cost savings were on target at ${costPct}%.`);
  else if (costPct >= 75) parts.push(`Cost savings achieved ${costPct}% of projection.`);
  else parts.push(`Cost savings underperformed at ${costPct}% of projection.`);
  return parts.join(" ");
}

function computeLearnings(initiatives) {
  const impl = initiatives.filter(i => i.status === "Implemented" && i.actual);
  if (!impl.length) return { patterns: [], categoryStats: {}, adjustments: {}, overallAccuracy: 0 };
  const catStats = {};
  let totalDev = 0;
  impl.forEach(item => {
    const cat = item.category;
    if (!catStats[cat]) catStats[cat] = { count: 0, totalVDiff: 0, totalRDiff: 0, totalCostAcc: 0, items: [] };
    const vD = item.actual.value - item.value;
    const rD = item.actual.risk - item.risk;
    const cA = item.cost > 0 ? (item.actual.costSaved / item.cost) * 100 : 0;
    catStats[cat].count++;
    catStats[cat].totalVDiff += vD;
    catStats[cat].totalRDiff += rD;
    catStats[cat].totalCostAcc += cA;
    catStats[cat].items.push(item);
    totalDev += (Math.abs(vD) + Math.abs(rD)) / 2;
  });
  const overallAccuracy = Math.max(0, 100 - (totalDev / impl.length) * 10);
  const patterns = [];
  const adjustments = {};
  Object.entries(catStats).forEach(([cat, s]) => {
    const avgV = s.totalVDiff / s.count;
    const avgR = s.totalRDiff / s.count;
    const avgC = s.totalCostAcc / s.count;
    let vAdj = 0, rAdj = 0;
    if (avgV < -1.5) { patterns.push({ type: "warning", category: cat, text: `${cat} initiatives tend to overestimate value impact (avg ${avgV.toFixed(1)} pts below prediction).` }); vAdj = -0.05; }
    else if (avgV > 1.5) { patterns.push({ type: "success", category: cat, text: `${cat} initiatives consistently exceed value expectations (+${avgV.toFixed(1)} pts).` }); }
    if (avgR > 1.5) { patterns.push({ type: "warning", category: cat, text: `${cat} initiatives carry higher risk than estimated (+${avgR.toFixed(1)} pts above prediction).` }); rAdj = 0.05; }
    else if (avgR < -1) { patterns.push({ type: "success", category: cat, text: `${cat} initiatives tend to have lower risk than predicted (${avgR.toFixed(1)} pts).` }); }
    if (avgC >= 95) patterns.push({ type: "success", category: cat, text: `${cat} cost projections are highly reliable (${avgC.toFixed(0)}% accuracy).` });
    else if (avgC < 75) patterns.push({ type: "warning", category: cat, text: `${cat} cost projections frequently miss targets (${avgC.toFixed(0)}% accuracy).` });
    if (vAdj || rAdj) adjustments[cat] = { valueWeight: 0.6 + vAdj, riskWeight: 0.4 + rAdj };
  });
  return { patterns, categoryStats: catStats, adjustments, overallAccuracy };
}

function calcAdjScore(item, adj) {
  const a = adj[item.category];
  if (a) return (item.value * a.valueWeight) - (item.risk * a.riskWeight);
  return calcScore(item.value, item.risk);
}

/* ═══════════════ MICRO COMPONENTS ═══════════════ */

function Badge({ type }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 13px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: recBg[type], color: recColor[type], border: `1px solid ${recColor[type]}18`, letterSpacing: 0.8, textTransform: "uppercase" }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: recColor[type] }} />{type}</span>;
}
function StatusBadge({ status }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 11px", borderRadius: 18, fontSize: 10, fontWeight: 700, background: statusBg[status], color: statusColor[status], border: `1px solid ${statusColor[status]}15`, letterSpacing: 0.5, textTransform: "uppercase" }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: statusColor[status] }} />{status}</span>;
}
function DevDot({ d }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 16, fontSize: 10, fontWeight: 700, background: devBg(d), color: devColor(d), letterSpacing: 0.3 }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: devColor(d) }} />{devLabel(d)}</span>;
}
function ScoreVis({ score }) {
  const pct = clamp(((score + 4) / 10) * 100, 0, 100);
  const c = recColor[getRec(score)];
  return <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 115 }}>
    <div style={{ flex: 1, height: 6, background: P.g100, borderRadius: 3, overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: c, borderRadius: 3, transition: "width 0.6s ease" }} /></div>
    <span style={{ fontSize: 12, fontWeight: 800, color: c, fontFamily: "'DM Mono', monospace", minWidth: 30 }}>{score.toFixed(1)}</span>
  </div>;
}
function CardBox({ children, style = {}, accent }) {
  return <div style={{ background: P.white, borderRadius: 14, padding: "22px 22px", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 6px 20px rgba(0,0,0,0.025)", border: `1px solid ${P.g200}`, ...(accent ? { borderTop: `3px solid ${accent}` } : {}), ...style }}>{children}</div>;
}
function SectionHdr({ icon, title, sub }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
    <div style={{ width: 34, height: 34, background: P.goldFade, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{icon}</div>
    <div>
      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: P.navy, margin: 0 }}>{title}</h3>
      {sub && <p style={{ fontFamily: "'DM Sans'", fontSize: 11, color: P.g400, margin: "2px 0 0" }}>{sub}</p>}
    </div>
  </div>;
}
function SliderField({ label, value, onChange, min = 1, max = 10, color = P.gold }) {
  return <div style={{ marginBottom: 18 }}>
    <label style={{ fontFamily: "'DM Sans'", fontSize: 10, fontWeight: 700, color: P.g500, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8, display: "block" }}>{label}</label>
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ flex: 1 }}>
        <input type="range" min={min} max={max} step={1} value={value} onChange={(e) => onChange(parseInt(e.target.value, 10))}
          style={{ width: "100%", height: 5, borderRadius: 3, outline: "none", WebkitAppearance: "none", appearance: "none", cursor: "pointer", background: `linear-gradient(90deg, ${color} ${(value - min) / (max - min) * 100}%, ${P.g200} ${(value - min) / (max - min) * 100}%)` }} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          {Array.from({ length: max - min + 1 }, (_, i) => i + min).map(n => <span key={n} style={{ fontSize: 8, color: n === value ? color : P.g300, fontFamily: "'DM Mono'", fontWeight: n === value ? 800 : 400 }}>{n}</span>)}
        </div>
      </div>
      <div style={{ width: 42, height: 42, borderRadius: 9, background: color + "14", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Mono'", fontSize: 19, fontWeight: 800, color }}>{value}</div>
    </div>
  </div>;
}
function TextField({ label, value, onChange, placeholder, type = "text" }) {
  return <div style={{ marginBottom: 14 }}>
    <label style={{ fontFamily: "'DM Sans'", fontSize: 10, fontWeight: 700, color: P.g500, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8, display: "block" }}>{label}</label>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      style={{ fontFamily: "'DM Sans'", fontSize: 13, padding: "12px 14px", border: `1.5px solid ${P.g200}`, borderRadius: 8, background: P.white, color: P.navy, outline: "none", width: "100%", boxSizing: "border-box", transition: "border-color 0.2s" }}
      onFocus={(e) => { e.target.style.borderColor = P.gold; }} onBlur={(e) => { e.target.style.borderColor = P.g200; }} />
  </div>;
}
function Btn({ onClick, disabled, children, full = true }) {
  return <button onClick={onClick} disabled={disabled} style={{ width: full ? "100%" : "auto", padding: "14px 24px", fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", border: "none", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer", background: disabled ? P.g200 : `linear-gradient(135deg, ${P.navy}, ${P.navy3})`, color: disabled ? P.g400 : P.white, transition: "all 0.3s" }}>{children}</button>;
}

/* ═══════════════ LANDING PAGE ═══════════════ */

function LandingPage({ onStart }) {
  const [show, setShow] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setShow(true)); }, []);
  const fade = (d) => ({ opacity: show ? 1 : 0, transform: show ? "translateY(0)" : "translateY(28px)", transition: `all 0.9s ease ${d}s` });
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: `linear-gradient(155deg, ${P.navy} 0%, ${P.navy2} 45%, ${P.navy3} 100%)`, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -100, right: -100, width: 480, height: 480, border: "1px solid rgba(201,162,39,0.08)", borderRadius: "50%", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -60, left: -60, width: 320, height: 320, border: "1px solid rgba(201,162,39,0.06)", borderRadius: "50%", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, opacity: 0.025, backgroundImage: `linear-gradient(${P.gold} 1px, transparent 1px), linear-gradient(90deg, ${P.gold} 1px, transparent 1px)`, backgroundSize: "56px 56px", pointerEvents: "none" }} />
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "26px 44px", position: "relative", zIndex: 2, ...fade(0.1) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ width: 36, height: 36, background: `linear-gradient(135deg, ${P.gold}, ${P.gold2})`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 17, color: P.navy, clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}>V</div>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 600, color: P.white, letterSpacing: 1.5 }}>VALUEBRIDGE</span>
        </div>
      </nav>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "0 32px", position: "relative", zIndex: 2 }}>
        <div style={fade(0.2)}><div style={{ display: "inline-block", padding: "6px 20px", borderRadius: 24, border: `1px solid ${P.gold}30`, background: `${P.gold}08`, fontSize: 10, letterSpacing: 3.5, textTransform: "uppercase", color: P.gold, fontWeight: 700, marginBottom: 34 }}>Cost-to-Value Intelligence with Learning Loop</div></div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 72, fontWeight: 700, color: P.white, lineHeight: 1.08, maxWidth: 740, ...fade(0.35) }}>Value<span style={{ color: P.gold }}>Bridge</span></h1>
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 21, color: P.g300, fontStyle: "italic", margin: "12px 0 14px", ...fade(0.45) }}>From Cost Cutting to Value Creation</p>
        <p style={{ fontFamily: "'DM Sans'", fontSize: 14, color: P.g400, maxWidth: 530, lineHeight: 1.75, margin: "0 0 44px", ...fade(0.55) }}>Evaluate initiatives, track real outcomes, and let the platform learn from every decision to sharpen future recommendations.</p>
        <button onClick={onStart} style={{ fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", padding: "18px 48px", border: "none", cursor: "pointer", background: `linear-gradient(135deg, ${P.gold}, ${P.gold2})`, color: P.navy, borderRadius: 4, boxShadow: `0 4px 28px ${P.gold}40`, ...fade(0.65) }}>Start Analysis →</button>
        <div style={{ display: "flex", gap: 64, marginTop: 80, ...fade(0.8) }}>
          {[{ v: "₹2.4Cr+", l: "Savings Identified" }, { v: "87%", l: "Prediction Accuracy" }, { v: "340+", l: "Initiatives Tracked" }].map(s => (
            <div key={s.l} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: P.gold, marginBottom: 6 }}>{s.v}</div>
              <div style={{ fontFamily: "'DM Sans'", fontSize: 10, color: P.g500, letterSpacing: 1.5, textTransform: "uppercase" }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: "20px 44px", textAlign: "center", fontFamily: "'DM Sans'", fontSize: 10, color: P.g500, letterSpacing: 1.5, borderTop: `1px solid ${P.white}06` }}>© 2026 ValueBridge · Strategic Intelligence Platform</div>
    </div>
  );
}

/* ═══════════════ INPUT FORM ═══════════════ */

function InputForm({ onAdd }) {
  const [name, setName] = useState("");
  const [cost, setCost] = useState("");
  const [value, setValue] = useState(5);
  const [risk, setRisk] = useState(5);
  const valid = name.trim().length > 0 && cost !== "" && Number(cost) > 0;
  const ps = calcScore(value, risk);
  return (
    <CardBox>
      <SectionHdr icon="+" title="New Initiative" sub="Add a cost reduction initiative to evaluate" />
      <TextField label="Initiative Name" value={name} onChange={setName} placeholder="e.g., Automate Invoice Processing" />
      <TextField label="Estimated Cost (₹)" value={cost} onChange={setCost} placeholder="e.g., 1500000" type="number" />
      <SliderField label="Value Impact" value={value} onChange={setValue} color={P.gold} />
      <SliderField label="Risk Level" value={risk} onChange={setRisk} color={P.red} />
      <div style={{ padding: "11px 14px", borderRadius: 9, marginBottom: 14, background: P.bg, border: `1px solid ${P.g200}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div><span style={{ fontFamily: "'DM Sans'", fontSize: 10, color: P.g400, textTransform: "uppercase", letterSpacing: 1 }}>Preview</span>
          <div style={{ fontFamily: "'DM Sans'", fontSize: 11, color: P.g500, marginTop: 2 }}>({value}×0.6) − ({risk}×0.4) = <strong style={{ color: P.navy }}>{ps.toFixed(1)}</strong></div>
        </div><Badge type={getRec(ps)} />
      </div>
      <Btn onClick={() => { if (!valid) return; onAdd({ name: name.trim(), cost: Number(cost), value, risk, category: autoCategory(name.trim()), status: "Not Implemented", actual: null }); setName(""); setCost(""); setValue(5); setRisk(5); }} disabled={!valid}>Add Initiative</Btn>
    </CardBox>
  );
}

/* ═══════════════ OUTCOME TRACKER ═══════════════ */

function OutcomeTracker({ initiatives, onUpdate }) {
  const [selId, setSelId] = useState("");
  const [status, setStatus] = useState("Not Implemented");
  const [costSaved, setCostSaved] = useState("");
  const [actV, setActV] = useState(5);
  const [actR, setActR] = useState(5);
  const [notes, setNotes] = useState("");
  const sel = initiatives.find(i => String(i.id) === selId);

  useEffect(() => {
    if (sel) {
      setStatus(sel.status);
      if (sel.actual) { setCostSaved(String(sel.actual.costSaved)); setActV(sel.actual.value); setActR(sel.actual.risk); setNotes(sel.actual.notes || ""); }
      else { setCostSaved(""); setActV(5); setActR(5); setNotes(""); }
    }
  }, [selId]);

  const save = () => {
    if (!sel) return;
    const actual = status === "Implemented" ? { costSaved: Number(costSaved) || 0, value: actV, risk: actR, notes } : null;
    onUpdate(sel.id, status, actual);
  };

  return (
    <CardBox>
      <SectionHdr icon="📊" title="Track Outcomes" sub="Record actual results for implemented initiatives" />
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontFamily: "'DM Sans'", fontSize: 10, fontWeight: 700, color: P.g500, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8, display: "block" }}>Select Initiative</label>
        <select value={selId} onChange={(e) => setSelId(e.target.value)} style={{ width: "100%", fontFamily: "'DM Sans'", fontSize: 13, padding: "12px 14px", border: `1.5px solid ${P.g200}`, borderRadius: 8, background: P.white, color: P.navy, outline: "none" }}>
          <option value="">Choose an initiative...</option>
          {initiatives.map(i => <option key={i.id} value={String(i.id)}>{i.name}</option>)}
        </select>
      </div>
      {sel && (<>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontFamily: "'DM Sans'", fontSize: 10, fontWeight: 700, color: P.g500, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8, display: "block" }}>Implementation Status</label>
          <div style={{ display: "flex", gap: 6 }}>
            {["Not Implemented", "In Progress", "Implemented"].map(s => (
              <button key={s} onClick={() => setStatus(s)} style={{ flex: 1, padding: "9px 4px", borderRadius: 8, cursor: "pointer", border: status === s ? `2px solid ${statusColor[s]}` : `1.5px solid ${P.g200}`, background: status === s ? statusBg[s] : "transparent", color: status === s ? statusColor[s] : P.g500, fontFamily: "'DM Sans'", fontSize: 10, fontWeight: 600, transition: "all 0.2s" }}>{s}</button>
            ))}
          </div>
        </div>
        {status === "Implemented" && (
          <div style={{ padding: 16, background: P.greenSoft, borderRadius: 10, border: `1px solid ${P.green}12`, marginBottom: 14 }}>
            <div style={{ fontFamily: "'DM Sans'", fontSize: 10, fontWeight: 700, color: P.green, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>Actual Outcome Data</div>
            <TextField label="Actual Cost Saved (₹)" value={costSaved} onChange={setCostSaved} placeholder="e.g., 1100000" type="number" />
            <SliderField label="Actual Value Impact" value={actV} onChange={setActV} color={P.teal} />
            <SliderField label="Actual Risk Observed" value={actR} onChange={setActR} color={P.red} />
            <div>
              <label style={{ fontFamily: "'DM Sans'", fontSize: 10, fontWeight: 700, color: P.g500, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8, display: "block" }}>Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Key observations..." rows={3} style={{ fontFamily: "'DM Sans'", fontSize: 12, padding: "10px 12px", border: `1.5px solid ${P.g200}`, borderRadius: 8, background: P.white, color: P.navy, outline: "none", width: "100%", boxSizing: "border-box", resize: "vertical" }} />
            </div>
          </div>
        )}
        <Btn onClick={save} disabled={false}>Save Outcome</Btn>
      </>)}
    </CardBox>
  );
}

/* ═══════════════ SIMULATOR ═══════════════ */

function Simulator({ initiatives, adjustments }) {
  const [selId, setSelId] = useState("");
  const [cutPct, setCutPct] = useState(20);
  const [result, setResult] = useState(null);
  const run = () => {
    const item = initiatives.find(i => String(i.id) === selId);
    if (!item) return;
    const nV = Math.max(1, Math.round(item.value * (1 - cutPct / 200)));
    const nR = Math.min(10, Math.round(item.risk * (1 + cutPct / 150)));
    const oS = calcAdjScore(item, adjustments);
    const nS = calcAdjScore({ ...item, value: nV, risk: nR }, adjustments);
    setResult({ name: item.name, cutPct, oCost: item.cost, nCost: Math.round(item.cost * (1 - cutPct / 100)), oVal: item.value, nVal: nV, oRisk: item.risk, nRisk: nR, oS, nS, oRec: getRec(oS), nRec: getRec(nS), hasAdj: !!adjustments[item.category] });
  };
  return (
    <CardBox>
      <SectionHdr icon="⚡" title="Scenario Simulator" sub="What-if analysis with learning-adjusted weights" />
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontFamily: "'DM Sans'", fontSize: 10, fontWeight: 700, color: P.g500, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8, display: "block" }}>Select Initiative</label>
        <select value={selId} onChange={(e) => { setSelId(e.target.value); setResult(null); }} style={{ width: "100%", fontFamily: "'DM Sans'", fontSize: 13, padding: "12px 14px", border: `1.5px solid ${P.g200}`, borderRadius: 8, background: P.white, color: P.navy, outline: "none" }}>
          <option value="">Choose an initiative...</option>
          {initiatives.map(i => <option key={i.id} value={String(i.id)}>{i.name}</option>)}
        </select>
      </div>
      <SliderField label="Budget Reduction %" value={cutPct} onChange={setCutPct} min={5} max={50} color={P.amber} />
      <Btn onClick={run} disabled={!selId}>Run Simulation</Btn>
      {result && (
        <div style={{ padding: 16, borderRadius: 10, background: P.bg, border: `1px solid ${P.g200}`, marginTop: 14 }}>
          <div style={{ fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 700, color: P.navy, marginBottom: 3 }}>"{result.name}" — {result.cutPct}% Cut</div>
          {result.hasAdj && <div style={{ fontFamily: "'DM Sans'", fontSize: 10, color: P.teal, marginBottom: 12 }}>ⓘ Learning-adjusted weights applied</div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
            {[{ l: "Cost", f: `₹${fmtK(result.oCost)}`, t: `₹${fmtK(result.nCost)}` }, { l: "Value", f: result.oVal, t: result.nVal }, { l: "Risk", f: result.oRisk, t: result.nRisk }].map(d => (
              <div key={d.l} style={{ textAlign: "center", padding: "7px 0" }}>
                <div style={{ fontSize: 9, color: P.g400, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>{d.l}</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                  <span style={{ fontFamily: "'DM Mono'", fontSize: 11, color: P.g400, textDecoration: "line-through" }}>{d.f}</span>
                  <span style={{ color: P.gold, fontSize: 10 }}>→</span>
                  <span style={{ fontFamily: "'DM Mono'", fontSize: 13, fontWeight: 800, color: P.navy }}>{d.t}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 18, paddingTop: 10, borderTop: `1px solid ${P.g200}` }}>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 9, color: P.g400, marginBottom: 4, letterSpacing: 1 }}>BEFORE</div><Badge type={result.oRec} /></div>
            <span style={{ fontSize: 18, color: P.gold }}>→</span>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 9, color: P.g400, marginBottom: 4, letterSpacing: 1 }}>AFTER</div><Badge type={result.nRec} /></div>
          </div>
        </div>
      )}
    </CardBox>
  );
}

/* ═══════════════ KPI SUMMARY ═══════════════ */

function SummaryCards({ initiatives, learnings }) {
  const enriched = initiatives.map(i => ({ ...i, score: calcScore(i.value, i.risk), rec: getRec(calcScore(i.value, i.risk)) }));
  const total = enriched.reduce((s, i) => s + i.cost, 0);
  const investCost = enriched.filter(i => i.rec === "Invest").reduce((s, i) => s + i.cost, 0);
  const avg = enriched.length ? enriched.reduce((s, i) => s + i.score, 0) / enriched.length : 0;
  const impl = initiatives.filter(i => i.status === "Implemented").length;
  const cards = [
    { label: "Total Initiatives", val: enriched.length, sub: `${impl} implemented, ${enriched.filter(i => i.rec === "Invest").length} invest-worthy`, accent: P.navy },
    { label: "Cost Under Review", val: `₹${fmtK(total)}`, sub: `₹${fmtK(investCost)} in Invest tier`, accent: P.gold },
    { label: "Avg Priority Score", val: avg.toFixed(1), sub: `${getRec(avg)} zone overall`, accent: recColor[getRec(avg)] },
    { label: "Prediction Accuracy", val: `${learnings.overallAccuracy.toFixed(0)}%`, sub: `Based on ${impl} tracked outcomes`, accent: P.teal },
  ];
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 22 }}>
    {cards.map((c, i) => <CardBox key={i} accent={c.accent} style={{ padding: "18px 16px" }}>
      <div style={{ fontFamily: "'DM Sans'", fontSize: 10, fontWeight: 700, color: P.g400, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 9 }}>{c.label}</div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: P.navy, marginBottom: 3 }}>{c.val}</div>
      <div style={{ fontFamily: "'DM Sans'", fontSize: 11, color: P.g500 }}>{c.sub}</div>
    </CardBox>)}
  </div>;
}

/* ═══════════════ CHARTS ═══════════════ */

function Charts({ initiatives }) {
  const data = initiatives.map(i => { const s = calcScore(i.value, i.risk); return { name: i.name.length > 18 ? i.name.slice(0, 15) + "..." : i.name, fullName: i.name, value: i.value, risk: i.risk, cost: i.cost, score: s, rec: getRec(s) }; });
  const Tip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return <div style={{ background: P.white, border: `1px solid ${P.g200}`, borderRadius: 9, padding: "9px 13px", boxShadow: "0 3px 10px rgba(0,0,0,0.06)", maxWidth: 190 }}>
      <div style={{ fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 700, color: P.navy, marginBottom: 3 }}>{d.fullName || d.name}</div>
      <div style={{ fontFamily: "'DM Mono'", fontSize: 10, color: P.g500 }}>V:{d.value} R:{d.risk} ₹{fmtK(d.cost)}</div>
      <div style={{ fontFamily: "'DM Mono'", fontSize: 10, fontWeight: 700, color: recColor[d.rec], marginTop: 2 }}>{d.score.toFixed(1)} — {d.rec}</div>
    </div>;
  };
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 22 }}>
    <CardBox><h4 style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 700, color: P.navy, margin: "0 0 14px" }}>Value vs Risk Matrix</h4>
      <ResponsiveContainer width="100%" height={230}><ScatterChart margin={{ top: 8, right: 14, bottom: 8, left: 0 }}><CartesianGrid strokeDasharray="3 3" stroke={P.g100} /><XAxis dataKey="risk" type="number" domain={[0, 10]} tick={{ fontSize: 9, fill: P.g400 }} /><YAxis dataKey="value" type="number" domain={[0, 10]} tick={{ fontSize: 9, fill: P.g400 }} /><Tooltip content={<Tip />} /><Scatter data={data}>{data.map((d, i) => <Cell key={i} fill={recColor[d.rec]} r={clamp(d.cost / 400000, 5, 16)} fillOpacity={0.75} stroke={recColor[d.rec]} strokeWidth={1.5} />)}</Scatter></ScatterChart></ResponsiveContainer>
      <div style={{ display: "flex", justifyContent: "center", gap: 18, marginTop: 6 }}>{["Invest", "Review", "Avoid"].map(k => <div key={k} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: P.g500 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: recColor[k] }} />{k}</div>)}</div>
    </CardBox>
    <CardBox><h4 style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 700, color: P.navy, margin: "0 0 14px" }}>Priority Score Ranking</h4>
      <ResponsiveContainer width="100%" height={230}><BarChart data={[...data].sort((a, b) => b.score - a.score)} layout="vertical" margin={{ top: 0, right: 14, bottom: 0, left: 6 }}><CartesianGrid strokeDasharray="3 3" stroke={P.g100} horizontal={false} /><XAxis type="number" domain={[-4, 6]} tick={{ fontSize: 9, fill: P.g400 }} /><YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 8, fill: P.g700 }} /><Tooltip content={<Tip />} /><Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={13}>{[...data].sort((a, b) => b.score - a.score).map((d, i) => <Cell key={i} fill={recColor[d.rec]} fillOpacity={0.85} />)}</Bar></BarChart></ResponsiveContainer>
    </CardBox>
  </div>;
}

/* ═══════════════ PERFORMANCE COMPARISON ═══════════════ */

function PerfTable({ initiatives }) {
  const tracked = initiatives.filter(i => i.status === "Implemented" && i.actual);
  if (!tracked.length) return null;
  return (
    <CardBox style={{ marginBottom: 22 }}>
      <SectionHdr icon="🎯" title="Performance Comparison" sub="Predicted vs actual outcomes for implemented initiatives" />
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            {["Initiative", "Pred V", "Act V", "Δ V", "Pred R", "Act R", "Δ R", "Cost Acc", "Rating"].map(h => <th key={h} style={{ fontFamily: "'DM Sans'", fontSize: 9, fontWeight: 700, color: P.g400, letterSpacing: 1, textTransform: "uppercase", padding: "10px 8px", textAlign: "left", borderBottom: `2px solid ${P.g200}`, whiteSpace: "nowrap" }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {tracked.map((item, idx) => {
              const vD = item.actual.value - item.value;
              const rD = item.actual.risk - item.risk;
              const cA = item.cost > 0 ? Math.round((item.actual.costSaved / item.cost) * 100) : 0;
              const dev = (Math.abs(vD) + Math.abs(rD)) / 2;
              return <tr key={item.id} style={{ background: idx % 2 === 0 ? P.white : P.bg }}>
                <td style={{ padding: "12px 8px", fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 500, color: P.navy }}>{item.name}</td>
                <td style={{ padding: "12px 8px", fontFamily: "'DM Mono'", fontSize: 12, color: P.g700, textAlign: "center" }}>{item.value}</td>
                <td style={{ padding: "12px 8px", fontFamily: "'DM Mono'", fontSize: 12, color: P.teal, fontWeight: 700, textAlign: "center" }}>{item.actual.value}</td>
                <td style={{ padding: "12px 8px", fontFamily: "'DM Mono'", fontSize: 12, fontWeight: 700, textAlign: "center", color: vD > 0 ? P.green : vD < 0 ? P.red : P.g500 }}>{vD > 0 ? "+" : ""}{vD}</td>
                <td style={{ padding: "12px 8px", fontFamily: "'DM Mono'", fontSize: 12, color: P.g700, textAlign: "center" }}>{item.risk}</td>
                <td style={{ padding: "12px 8px", fontFamily: "'DM Mono'", fontSize: 12, color: P.teal, fontWeight: 700, textAlign: "center" }}>{item.actual.risk}</td>
                <td style={{ padding: "12px 8px", fontFamily: "'DM Mono'", fontSize: 12, fontWeight: 700, textAlign: "center", color: rD > 0 ? P.red : rD < 0 ? P.green : P.g500 }}>{rD > 0 ? "+" : ""}{rD}</td>
                <td style={{ padding: "12px 8px", fontFamily: "'DM Mono'", fontSize: 12, fontWeight: 700, textAlign: "center", color: cA >= 95 ? P.green : cA >= 75 ? P.amber : P.red }}>{cA}%</td>
                <td style={{ padding: "12px 8px" }}><DevDot d={dev} /></td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    </CardBox>
  );
}

/* ═══════════════ LEARNING DASHBOARD ═══════════════ */

function LearningDash({ initiatives, learnings }) {
  const tracked = initiatives.filter(i => i.status === "Implemented" && i.actual);
  if (!tracked.length) return (
    <CardBox style={{ marginBottom: 22 }}>
      <SectionHdr icon="🧠" title="Learning & Insights Over Time" sub="Track outcomes to unlock pattern detection" />
      <div style={{ padding: "36px 0", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>📈</div>
        <div style={{ fontFamily: "'DM Sans'", fontSize: 13, color: P.g500 }}>No outcome data yet. Track implementation results to see learning insights.</div>
      </div>
    </CardBox>
  );
  const { patterns, categoryStats, adjustments, overallAccuracy } = learnings;
  const catData = Object.entries(categoryStats).map(([cat, s]) => ({ name: cat, avgVD: Math.abs(s.totalVDiff / s.count), avgRD: Math.abs(s.totalRDiff / s.count), costAcc: Math.round(s.totalCostAcc / s.count), count: s.count }));
  const devData = tracked.map(item => ({ name: item.name.length > 14 ? item.name.slice(0, 11) + "..." : item.name, vDev: Math.abs(item.actual.value - item.value), rDev: Math.abs(item.actual.risk - item.risk) }));

  return (
    <CardBox style={{ marginBottom: 22 }}>
      <SectionHdr icon="🧠" title="Learning & Insights Over Time" sub="Pattern detection and model adjustments from tracked outcomes" />

      {/* Accuracy gauge + deviation chart */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16, marginBottom: 20 }}>
        <div style={{ background: P.bg, borderRadius: 11, padding: 18, textAlign: "center", border: `1px solid ${P.g200}` }}>
          <div style={{ fontFamily: "'DM Sans'", fontSize: 10, fontWeight: 700, color: P.g400, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>Prediction Accuracy</div>
          <div style={{ position: "relative", width: 110, height: 110, margin: "0 auto 12px" }}>
            <svg width="110" height="110" viewBox="0 0 110 110"><circle cx="55" cy="55" r="46" fill="none" stroke={P.g100} strokeWidth="9" /><circle cx="55" cy="55" r="46" fill="none" stroke={overallAccuracy >= 75 ? P.green : overallAccuracy >= 50 ? P.amber : P.red} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${overallAccuracy * 2.89} 289`} transform="rotate(-90 55 55)" style={{ transition: "stroke-dasharray 1s ease" }} /></svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: P.navy }}>{overallAccuracy.toFixed(0)}%</span></div>
          </div>
          <div style={{ fontFamily: "'DM Sans'", fontSize: 11, color: P.g500 }}>{tracked.length} tracked outcomes</div>
        </div>
        <div style={{ background: P.bg, borderRadius: 11, padding: 18, border: `1px solid ${P.g200}` }}>
          <div style={{ fontFamily: "'DM Sans'", fontSize: 10, fontWeight: 700, color: P.g400, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>Deviation by Initiative</div>
          <ResponsiveContainer width="100%" height={145}><BarChart data={devData} margin={{ top: 0, right: 6, bottom: 0, left: 0 }}><CartesianGrid strokeDasharray="3 3" stroke={P.g200} horizontal /><XAxis dataKey="name" tick={{ fontSize: 8, fill: P.g500 }} /><YAxis tick={{ fontSize: 8, fill: P.g400 }} /><Tooltip contentStyle={{ fontFamily: "'DM Sans'", fontSize: 10, borderRadius: 8, border: `1px solid ${P.g200}` }} /><Bar dataKey="vDev" name="Value Dev" fill={P.teal} radius={[3, 3, 0, 0]} barSize={10} /><Bar dataKey="rDev" name="Risk Dev" fill={P.amber} radius={[3, 3, 0, 0]} barSize={10} /></BarChart></ResponsiveContainer>
        </div>
      </div>

      {/* Category Reliability */}
      <div style={{ background: P.bg, borderRadius: 11, padding: 18, border: `1px solid ${P.g200}`, marginBottom: 18 }}>
        <div style={{ fontFamily: "'DM Sans'", fontSize: 10, fontWeight: 700, color: P.g400, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>Category Reliability</div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(catData.length, 5)}, 1fr)`, gap: 10 }}>
          {catData.map(cat => {
            const rel = Math.max(0, 100 - (cat.avgVD + cat.avgRD) * 10);
            const rc = rel >= 75 ? P.green : rel >= 50 ? P.amber : P.red;
            return <div key={cat.name} style={{ textAlign: "center", padding: "14px 6px", background: P.white, borderRadius: 9, border: `1px solid ${P.g200}` }}>
              <div style={{ fontFamily: "'DM Sans'", fontSize: 10, fontWeight: 700, color: P.navy, marginBottom: 8 }}>{cat.name}</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: rc, marginBottom: 3 }}>{rel.toFixed(0)}%</div>
              <div style={{ fontFamily: "'DM Sans'", fontSize: 9, color: P.g400, marginBottom: 6 }}>reliability</div>
              <div style={{ fontFamily: "'DM Mono'", fontSize: 9, color: P.g500 }}>Cost: {cat.costAcc}% · {cat.count} init.</div>
            </div>;
          })}
        </div>
      </div>

      {/* Patterns */}
      {patterns.length > 0 && <div style={{ marginBottom: 14 }}>
        <div style={{ fontFamily: "'DM Sans'", fontSize: 10, fontWeight: 700, color: P.g400, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>Detected Patterns</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {patterns.map((p, i) => <div key={i} style={{ padding: "10px 14px", borderRadius: 9, background: p.type === "success" ? P.greenSoft : P.amberSoft, border: `1px solid ${(p.type === "success" ? P.green : P.amber)}12`, display: "flex", alignItems: "flex-start", gap: 8 }}>
            <span style={{ fontSize: 13, marginTop: 1 }}>{p.type === "success" ? "✅" : "⚠️"}</span>
            <div><span style={{ fontFamily: "'DM Sans'", fontSize: 9, fontWeight: 700, color: p.type === "success" ? P.green : P.amber, letterSpacing: 1, textTransform: "uppercase" }}>{p.category}</span>
              <p style={{ fontFamily: "'DM Sans'", fontSize: 12, color: P.g700, margin: "3px 0 0", lineHeight: 1.55 }}>{p.text}</p></div>
          </div>)}
        </div>
      </div>}

      {/* Adjustments */}
      {Object.keys(adjustments).length > 0 && <div style={{ padding: "12px 16px", borderRadius: 9, background: `${P.teal}08`, border: `1px solid ${P.teal}12` }}>
        <div style={{ fontFamily: "'DM Sans'", fontSize: 10, fontWeight: 700, color: P.teal, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Active Weight Adjustments</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {Object.entries(adjustments).map(([cat, adj]) => <div key={cat} style={{ padding: "6px 12px", background: P.white, borderRadius: 7, border: `1px solid ${P.g200}` }}>
            <span style={{ fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 600, color: P.navy }}>{cat}: </span>
            <span style={{ fontFamily: "'DM Mono'", fontSize: 10, color: P.teal }}>V×{adj.valueWeight.toFixed(2)} R×{adj.riskWeight.toFixed(2)}</span>
          </div>)}
        </div>
        <p style={{ fontFamily: "'DM Sans'", fontSize: 10, color: P.g500, marginTop: 6 }}>Applied automatically to scoring and simulations.</p>
      </div>}
    </CardBox>
  );
}

/* ═══════════════ MAIN DASHBOARD TABLE ═══════════════ */

function DashTable({ initiatives, adjustments }) {
  const [sortF, setSortF] = useState("score");
  const [sortD, setSortD] = useState("desc");
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [expId, setExpId] = useState(null);
  const enriched = initiatives.map(i => { const s = calcScore(i.value, i.risk); return { ...i, score: s, rec: getRec(s) }; });
  const counts = { All: enriched.length, Invest: 0, Review: 0, Avoid: 0 };
  enriched.forEach(i => counts[i.rec]++);
  const filtered = enriched.filter(i => (filter === "All" || i.rec === filter) && (!search || i.name.toLowerCase().includes(search.toLowerCase())));
  const sorted = [...filtered].sort((a, b) => { const d = sortD === "asc" ? 1 : -1; return sortF === "name" ? d * a.name.localeCompare(b.name) : d * ((a[sortF] || 0) - (b[sortF] || 0)); });
  const toggle = (f) => { if (sortF === f) setSortD(d => d === "asc" ? "desc" : "asc"); else { setSortF(f); setSortD("desc"); } };
  const arr = (f) => sortF === f ? (sortD === "asc" ? " ↑" : " ↓") : "";
  const thS = (f) => ({ fontFamily: "'DM Sans'", fontSize: 9, fontWeight: 700, color: sortF === f ? P.navy : P.g400, letterSpacing: 1.1, textTransform: "uppercase", cursor: "pointer", padding: "11px 8px", textAlign: "left", borderBottom: `2px solid ${sortF === f ? P.gold : P.g200}`, whiteSpace: "nowrap", userSelect: "none" });

  return <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
      <div style={{ display: "flex", gap: 5 }}>
        {["All", "Invest", "Review", "Avoid"].map(f => <button key={f} onClick={() => setFilter(f)} style={{ fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 600, padding: "6px 14px", borderRadius: 20, cursor: "pointer", border: filter === f ? "none" : `1px solid ${P.g200}`, background: filter === f ? P.navy : "transparent", color: filter === f ? P.white : P.g500 }}>{f} ({counts[f]})</button>)}
      </div>
      <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ fontFamily: "'DM Sans'", fontSize: 12, padding: "8px 12px", border: `1.5px solid ${P.g200}`, borderRadius: 7, outline: "none", width: 180, background: P.white, color: P.navy }} onFocus={(e) => { e.target.style.borderColor = P.gold; }} onBlur={(e) => { e.target.style.borderColor = P.g200; }} />
    </div>
    <CardBox style={{ padding: 0, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>
          <th style={thS("name")} onClick={() => toggle("name")}>Initiative{arr("name")}</th>
          <th style={thS("cost")} onClick={() => toggle("cost")}>Cost{arr("cost")}</th>
          <th style={thS("value")} onClick={() => toggle("value")}>Value{arr("value")}</th>
          <th style={thS("risk")} onClick={() => toggle("risk")}>Risk{arr("risk")}</th>
          <th style={thS("score")} onClick={() => toggle("score")}>Priority{arr("score")}</th>
          <th style={{ ...thS(""), cursor: "default", borderBottom: `2px solid ${P.g200}` }}>Status</th>
          <th style={{ ...thS(""), cursor: "default", borderBottom: `2px solid ${P.g200}` }}>Action</th>
        </tr></thead>
        <tbody>
          {sorted.map((item, idx) => {
            const isExp = expId === item.id;
            return <React.Fragment key={item.id}>
              <tr onClick={() => setExpId(isExp ? null : item.id)} style={{ background: idx % 2 === 0 ? P.white : P.bg, cursor: "pointer", transition: "background 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = P.goldFade; }} onMouseLeave={(e) => { e.currentTarget.style.background = idx % 2 === 0 ? P.white : P.bg; }}>
                <td style={{ padding: "12px 8px", fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 500, color: P.navy }}><span style={{ fontSize: 8, color: P.g300, marginRight: 6 }}>{isExp ? "▼" : "▶"}</span>{item.name}</td>
                <td style={{ padding: "12px 8px", fontFamily: "'DM Mono'", fontSize: 11, color: P.g700 }}>₹{fmtFull(item.cost)}</td>
                <td style={{ padding: "12px 8px" }}><div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 7, background: P.greenBg, color: P.green, fontFamily: "'DM Mono'", fontSize: 12, fontWeight: 800 }}>{item.value}</div></td>
                <td style={{ padding: "12px 8px" }}><div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 7, background: P.redBg, color: P.red, fontFamily: "'DM Mono'", fontSize: 12, fontWeight: 800 }}>{item.risk}</div></td>
                <td style={{ padding: "12px 8px" }}><ScoreVis score={item.score} /></td>
                <td style={{ padding: "12px 8px" }}><StatusBadge status={item.status} /></td>
                <td style={{ padding: "12px 8px" }}><Badge type={item.rec} /></td>
              </tr>
              {isExp && <tr><td colSpan={7} style={{ padding: "0 8px 12px", background: P.bg }}>
                <div style={{ display: "grid", gridTemplateColumns: item.actual ? "1fr 1fr" : "1fr", gap: 10 }}>
                  <div style={{ padding: "14px 16px", background: P.white, borderRadius: 9, borderLeft: `4px solid ${recColor[item.rec]}` }}>
                    <div style={{ fontFamily: "'DM Sans'", fontSize: 9, fontWeight: 700, color: P.gold, letterSpacing: 2, textTransform: "uppercase", marginBottom: 7 }}>AI Strategic Insight</div>
                    <p style={{ fontFamily: "'DM Sans'", fontSize: 12, lineHeight: 1.65, color: P.g700, margin: 0 }}>{getInsight(item)}</p>
                  </div>
                  {item.actual && <div style={{ padding: "14px 16px", background: P.white, borderRadius: 9, borderLeft: `4px solid ${P.teal}` }}>
                    <div style={{ fontFamily: "'DM Sans'", fontSize: 9, fontWeight: 700, color: P.teal, letterSpacing: 2, textTransform: "uppercase", marginBottom: 7 }}>Performance Review</div>
                    <p style={{ fontFamily: "'DM Sans'", fontSize: 12, lineHeight: 1.65, color: P.g700, margin: "0 0 8px" }}>{generatePerfInsight(item)}</p>
                    {item.actual.notes && <div style={{ padding: "8px 10px", background: P.bg, borderRadius: 7, fontFamily: "'DM Sans'", fontSize: 11, color: P.g500, fontStyle: "italic", borderLeft: `3px solid ${P.g300}` }}>"{item.actual.notes}"</div>}
                  </div>}
                </div>
              </td></tr>}
            </React.Fragment>;
          })}
          {!sorted.length && <tr><td colSpan={7} style={{ padding: 36, textAlign: "center", fontFamily: "'DM Sans'", color: P.g400, fontSize: 13 }}>No initiatives match</td></tr>}
        </tbody>
      </table>
    </CardBox>
  </div>;
}

/* ═══════════════════════════════
   MAIN APPLICATION
   ═══════════════════════════════ */

export default function App() {
  const [page, setPage] = useState("landing");
  const [tab, setTab] = useState("analyze");
  const [initiatives, setInitiatives] = useState(SEED);
  const [nextId, setNextId] = useState(100);
  const [toast, setToast] = useState(null);

  const learnings = useMemo(() => computeLearnings(initiatives), [initiatives]);

  const showToast = (msg, color) => { setToast({ msg, color }); setTimeout(() => setToast(null), 3500); };
  const addInitiative = useCallback((data) => { setInitiatives(prev => [...prev, { id: nextId, ...data }]); setNextId(n => n + 1); const s = calcScore(data.value, data.risk); showToast(`"${data.name}" added → ${getRec(s)}`, recColor[getRec(s)]); }, [nextId]);
  const updateOutcome = useCallback((id, status, actual) => { setInitiatives(prev => prev.map(i => i.id === id ? { ...i, status, actual } : i)); showToast(`Outcome saved successfully`, P.teal); }, []);

  if (page === "landing") return <LandingPage onStart={() => setPage("app")} />;

  const tabs = [{ id: "analyze", label: "Analyze", icon: "📊" }, { id: "track", label: "Track Outcomes", icon: "🎯" }, { id: "learn", label: "Learning & Insights", icon: "🧠" }];

  return (
    <div style={{ minHeight: "100vh", background: P.bg }}>
      <style>{`@keyframes slideIn { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }`}</style>

      <header style={{ background: P.navy, padding: "0 36px", height: 56, display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 100, boxShadow: `0 2px 14px ${P.navy}22` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => setPage("landing")}>
          <div style={{ width: 26, height: 26, background: `linear-gradient(135deg, ${P.gold}, ${P.gold2})`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 13, color: P.navy, clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}>V</div>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 600, color: P.white, letterSpacing: 1.5 }}>VALUEBRIDGE</span>
        </div>
        <div style={{ display: "flex", gap: 3 }}>
          {tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={{ fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 600, padding: "7px 18px", borderRadius: 7, cursor: "pointer", border: "none", background: tab === t.id ? `${P.gold}20` : "transparent", color: tab === t.id ? P.gold : P.g300, transition: "all 0.2s", letterSpacing: 0.4 }}>{t.icon} {t.label}</button>)}
        </div>
        <div style={{ fontFamily: "'DM Sans'", fontSize: 10, color: P.g300, display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: P.green, boxShadow: `0 0 6px ${P.green}60` }} />
          {initiatives.length} initiatives · {learnings.overallAccuracy.toFixed(0)}% accuracy
        </div>
      </header>

      {toast && <div style={{ position: "fixed", top: 68, right: 24, zIndex: 200, background: P.white, borderRadius: 10, padding: "10px 18px", boxShadow: "0 6px 24px rgba(0,0,0,0.1)", border: `1px solid ${P.g200}`, borderLeft: `4px solid ${toast.color}`, animation: "slideIn 0.3s ease" }}><div style={{ fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 600, color: P.navy }}>{toast.msg}</div></div>}

      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "26px 36px 50px" }}>

        {tab === "analyze" && <>
          <div style={{ marginBottom: 22 }}><h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: P.navy, margin: "0 0 3px" }}>Intelligence Dashboard</h2><p style={{ fontFamily: "'DM Sans'", fontSize: 12, color: P.g500 }}>Evaluate, prioritize, and simulate cost reduction initiatives</p></div>
          <SummaryCards initiatives={initiatives} learnings={learnings} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 22 }}>
            <InputForm onAdd={addInitiative} />
            <Simulator initiatives={initiatives} adjustments={learnings.adjustments} />
          </div>
          <Charts initiatives={initiatives} />
          <div style={{ marginBottom: 10 }}><h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, color: P.navy, marginBottom: 3 }}>Initiative Analysis</h3><p style={{ fontFamily: "'DM Sans'", fontSize: 11, color: P.g400, marginBottom: 12 }}>Click any row for AI insight and performance review</p></div>
          <DashTable initiatives={initiatives} adjustments={learnings.adjustments} />
        </>}

        {tab === "track" && <>
          <div style={{ marginBottom: 22 }}><h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: P.navy, margin: "0 0 3px" }}>Execution Tracking</h2><p style={{ fontFamily: "'DM Sans'", fontSize: 12, color: P.g500 }}>Record implementation status and actual outcomes to feed the learning loop</p></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 22 }}>
            <OutcomeTracker initiatives={initiatives} onUpdate={updateOutcome} />
            <CardBox>
              <SectionHdr icon="📋" title="Implementation Overview" sub="Current status of all initiatives" />
              <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
                {["Implemented", "In Progress", "Not Implemented"].map(s => {
                  const c = initiatives.filter(i => i.status === s).length;
                  return <div key={s} style={{ flex: 1, textAlign: "center", padding: "12px 6px", background: statusBg[s], borderRadius: 9, border: `1px solid ${statusColor[s]}10` }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: statusColor[s] }}>{c}</div>
                    <div style={{ fontFamily: "'DM Sans'", fontSize: 9, color: statusColor[s], fontWeight: 600, letterSpacing: 0.7, textTransform: "uppercase", marginTop: 3 }}>{s}</div>
                  </div>;
                })}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {initiatives.map(item => <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", background: P.bg, borderRadius: 7, border: `1px solid ${P.g200}` }}>
                  <div><div style={{ fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 500, color: P.navy }}>{item.name}</div><div style={{ fontFamily: "'DM Sans'", fontSize: 10, color: P.g400 }}>{item.category} · ₹{fmtK(item.cost)}</div></div>
                  <StatusBadge status={item.status} />
                </div>)}
              </div>
            </CardBox>
          </div>
          <PerfTable initiatives={initiatives} />
        </>}

        {tab === "learn" && <>
          <div style={{ marginBottom: 22 }}><h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: P.navy, margin: "0 0 3px" }}>Learning & Insights</h2><p style={{ fontFamily: "'DM Sans'", fontSize: 12, color: P.g500 }}>Pattern detection, accuracy trends, and adaptive weight calibration</p></div>
          <LearningDash initiatives={initiatives} learnings={learnings} />
          <PerfTable initiatives={initiatives} />
        </>}

        <div style={{ marginTop: 36, paddingTop: 16, borderTop: `1px solid ${P.g200}`, textAlign: "center", fontFamily: "'DM Sans'", fontSize: 9, color: P.g400, letterSpacing: 1.5 }}>VALUEBRIDGE — Cost-to-Value Intelligence with Execution Tracking & Learning Loop</div>
      </div>
    </div>
  );
}
