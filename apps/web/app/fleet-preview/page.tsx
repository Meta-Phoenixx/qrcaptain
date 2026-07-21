"use client";

import { useState } from "react";
import { GlassCard, GlassButton, GlassBadge } from "@/components/ui/glass";

const MOCK_VESSELS = [
  { vesselId: "v1", name: "Sea Breeze",     make: "Sea Ray",      model: "SLX 280",       status: "in_service",     hasInsurance: true,  insuranceExpiry: Date.now() + 180*86400000, isOverdue: false, isApproaching: true,  openWorkOrderCount: 1, hasMechanic: true  },
  { vesselId: "v2", name: "Blue Horizon",   make: "Boston Whaler",model: "Outrage 330",   status: "in_maintenance", hasInsurance: true,  insuranceExpiry: Date.now() + 20*86400000,  isOverdue: true,  isApproaching: false, openWorkOrderCount: 3, hasMechanic: true  },
  { vesselId: "v3", name: "Captain's Pride",make: "Grady-White",  model: "Freedom 307",   status: "in_service",     hasInsurance: false, insuranceExpiry: null,                      isOverdue: false, isApproaching: false, openWorkOrderCount: 0, hasMechanic: false },
  { vesselId: "v4", name: "Sunset Runner",  make: "Robalo",       model: "R305",          status: "out_of_service", hasInsurance: true,  insuranceExpiry: Date.now() + 90*86400000,  isOverdue: true,  isApproaching: false, openWorkOrderCount: 2, hasMechanic: true  },
  { vesselId: "v5", name: "Island Hopper",  make: "Contender",    model: "39 ST",         status: "storage",        hasInsurance: true,  insuranceExpiry: Date.now() + 300*86400000, isOverdue: false, isApproaching: false, openWorkOrderCount: 0, hasMechanic: true  },
];

const STATUS_MAP: Record<string, { label: string; color: "green"|"yellow"|"red"|"blue" }> = {
  in_service:     { label: "In Service",     color: "green"  },
  in_maintenance: { label: "In Maintenance", color: "yellow" },
  out_of_service: { label: "Out of Service", color: "red"    },
  storage:        { label: "Storage",        color: "blue"   },
};

function HealthRing({ score }: { score: number }) {
  const r = 52, circ = 2 * Math.PI * r, fill = (score / 100) * circ;
  const color = score >= 80 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={128} height={128} viewBox="0 0 128 128">
        <circle cx={64} cy={64} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={10} />
        <circle cx={64} cy={64} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 64 64)" style={{ filter: `drop-shadow(0 0 8px ${color})` }} />
        <text x={64} y={68} textAnchor="middle" fill="white" fontSize={26} fontWeight={700}>{score}%</text>
      </svg>
      <span className="text-xs text-white/50 tracking-wide uppercase">Fleet Health</span>
    </div>
  );
}

function StatTile({ label, value, color, active, onClick }: { label: string; value: number; color: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 px-4 py-3 rounded-xl border transition-all ${active ? "border-captain-400 bg-captain-400/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      <span className="text-xs text-white/50 whitespace-nowrap">{label}</span>
    </button>
  );
}

export default function FleetPreviewPage() {
  const [activeFilter, setActiveFilter] = useState<string|null>(null);
  const [showModal, setShowModal] = useState(false);
  const [distressSent, setDistressSent] = useState(false);

  const vessels = activeFilter
    ? MOCK_VESSELS.filter(v =>
        activeFilter === "overdue"       ? v.isOverdue :
        activeFilter === "approaching"   ? v.isApproaching :
        activeFilter === "outOfService"  ? v.status === "out_of_service" : true)
    : MOCK_VESSELS;

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0a0f1e] via-[#0d1627] to-[#0a1520] p-6">
      <div className="max-w-6xl mx-auto mb-8">
        <p className="text-captain-400 text-sm font-medium mb-1">Fleet Preview — Mock Data</p>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-heading font-bold text-white">Fleet Command Center</h1>
          <GlassButton variant="ghost">+ New Fleet</GlassButton>
        </div>
        <div className="flex gap-2 mt-4">
          <button className="px-4 py-1.5 rounded-full text-sm font-medium bg-captain-500/20 border border-captain-400 text-captain-300">Gulf Coast Charters</button>
          <button className="px-4 py-1.5 rounded-full text-sm font-medium border border-dashed border-white/20 text-white/40">+ New Fleet</button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30">
          <span className="text-red-400">⚠</span>
          <span className="text-red-300 text-sm font-medium">2 vessels are overdue for service — schedule immediately.</span>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <span className="text-amber-400">⚠</span>
          <span className="text-amber-300 text-sm font-medium">1 vessel has no authorized mechanic.</span>
        </div>

        <GlassCard className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
            <HealthRing score={62} />
            <div className="flex flex-wrap gap-3">
              <StatTile label="Total Vessels"    value={5} color="text-white"       active={activeFilter===null}          onClick={() => setActiveFilter(null)} />
              <StatTile label="In Service"       value={2} color="text-green-400"   active={activeFilter==="inService"}   onClick={() => setActiveFilter("inService")} />
              <StatTile label="In Maintenance"   value={1} color="text-amber-400"   active={activeFilter==="maintenance"} onClick={() => setActiveFilter("maintenance")} />
              <StatTile label="Out of Service"   value={1} color="text-red-400"     active={activeFilter==="outOfService"}onClick={() => setActiveFilter("outOfService")} />
              <StatTile label="Service Overdue"  value={2} color="text-red-400"     active={activeFilter==="overdue"}     onClick={() => setActiveFilter("overdue")} />
              <StatTile label="Approaching"      value={1} color="text-amber-400"   active={activeFilter==="approaching"} onClick={() => setActiveFilter("approaching")} />
              <StatTile label="No Insurance"     value={1} color="text-red-400"     active={false}                        onClick={() => setActiveFilter(null)} />
              <StatTile label="Open Work Orders" value={6} color="text-captain-400" active={false}                        onClick={() => setActiveFilter(null)} />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-white font-semibold">Vessels</h2>
            {activeFilter && <button onClick={() => setActiveFilter(null)} className="text-xs text-white/40 hover:text-white/70">Clear filter ×</button>}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/40 text-left text-xs uppercase tracking-wider border-b border-white/5">
                <th className="px-6 py-3">Vessel</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Insurance</th>
                <th className="px-4 py-3">Work Orders</th>
                <th className="px-4 py-3">Mechanic</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {vessels.map(v => {
                const st = STATUS_MAP[v.status] ?? { label: v.status, color: "blue" as const };
                return (
                  <tr key={v.vesselId} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{v.name}</div>
                      <div className="text-xs text-white/40">{v.make} {v.model}</div>
                    </td>
                    <td className="px-4 py-4"><GlassBadge color={st.color}>{st.label}</GlassBadge></td>
                    <td className="px-4 py-4">
                      {v.isOverdue ? <GlassBadge color="red">Overdue</GlassBadge>
                        : v.isApproaching ? <GlassBadge color="yellow">Due Soon</GlassBadge>
                        : <GlassBadge color="green">Current</GlassBadge>}
                    </td>
                    <td className="px-4 py-4">
                      {!v.hasInsurance ? <GlassBadge color="red">No Insurance</GlassBadge>
                        : v.insuranceExpiry && v.insuranceExpiry - Date.now() < 30*86400000 ? <GlassBadge color="yellow">Expiring Soon</GlassBadge>
                        : <GlassBadge color="green">Insured</GlassBadge>}
                    </td>
                    <td className="px-4 py-4">
                      {v.openWorkOrderCount > 0 ? <GlassBadge color="yellow">{v.openWorkOrderCount} Open</GlassBadge>
                        : <span className="text-white/30 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-4">
                      {v.hasMechanic ? <GlassBadge color="green">Assigned</GlassBadge> : <GlassBadge color="red">None</GlassBadge>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="text-white font-semibold mb-1">Captain — Distress Notice Flow</h2>
          <p className="text-white/40 text-sm mb-4">Simulates the one-tap distress alert from the mobile captain screen.</p>

          {!distressSent && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-white/60 text-sm">Vessel: <span className="text-white font-medium">Sea Breeze</span></p>
                <p className="text-white/60 text-sm">Captain: <span className="text-white font-medium">James Kirk</span></p>
              </div>
              <button onClick={() => setShowModal(true)}
                className="w-full py-4 rounded-xl bg-red-600 hover:bg-red-500 active:scale-[0.99] text-white font-bold text-lg transition-all"
                style={{ boxShadow: "0 0 24px rgba(239,68,68,0.4)" }}>
                🚨 SEND DISTRESS NOTICE
              </button>
            </div>
          )}

          {distressSent && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-red-900/30 border border-red-500/40 text-center">
                <div className="text-2xl mb-1">✅</div>
                <p className="text-red-300 font-semibold">Distress notice sent!</p>
                <p className="text-white/50 text-xs mt-1">Fleet owner + 1 mechanic notified with GPS coordinates</p>
              </div>
              <p className="text-white/40 text-xs uppercase tracking-wider">Notifications dispatched to:</p>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                <span className="text-green-400">✓</span>
                <div>
                  <p className="text-white text-sm">Maria (Fleet Manager)</p>
                  <p className="text-white/40 text-xs">URGENT — Sea Breeze (James Kirk): Engine fire… GPS: 25.7617, -80.1918</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                <span className="text-green-400">✓</span>
                <div>
                  <p className="text-white text-sm">Carlos (Mechanic — C&amp;C Marine)</p>
                  <p className="text-white/40 text-xs">URGENT — Sea Breeze (James Kirk): Engine fire… GPS: 25.7617, -80.1918</p>
                </div>
              </div>
              <button onClick={() => setDistressSent(false)} className="text-xs text-white/30 hover:text-white/50 underline">Reset demo</button>
            </div>
          )}
        </GlassCard>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a0a0a] border border-red-500/50 rounded-2xl p-6 max-w-sm w-full">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">🚨</div>
              <h3 className="text-white font-bold text-xl">Send Distress Notice</h3>
              <p className="text-red-400 text-sm mt-1">This will immediately alert the fleet owner and all mechanics.</p>
            </div>
            <textarea className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white text-sm resize-none mb-3" rows={3}
              defaultValue="Engine fire in starboard engine. Need immediate assistance." />
            <div className="text-xs text-white/40 mb-4 p-2 bg-white/5 rounded-lg">📍 GPS: 25.7617, -80.1918 (Miami, FL)</div>
            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl border border-white/20 text-white/60 hover:bg-white/5">Cancel</button>
              <button onClick={() => { setDistressSent(true); setShowModal(false); }}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-all"
                style={{ boxShadow: "0 0 16px rgba(239,68,68,0.5)" }}>
                CONFIRM DISTRESS
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
