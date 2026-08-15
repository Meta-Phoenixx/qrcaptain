"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { AppSideNav } from "@/components/app-side-nav";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

type CalEvent = {
  id: string;
  date: number; // timestamp
  label: string;
  vesselName: string;
  type: "overdue" | "upcoming" | "open_work_order";
};

function isSameDay(ts: number, y: number, m: number, d: number) {
  const dt = new Date(ts);
  return dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d;
}

const URGENCY_STYLE = {
  overdue:         "bg-red-500/20 text-red-300 border-red-500/30",
  upcoming:        "bg-amber-500/15 text-amber-300 border-amber-500/25",
  open_work_order: "bg-captain-500/15 text-captain-300 border-captain-500/25",
};

export default function CalendarPage() {
  const [selectedFleetId, setSelectedFleetId] = useState<Id<"fleets"> | null>(null);
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const a = api as any;
  const fleetList     = useQuery(a.fleetDashboard.listAllFleetsDashboard) ?? [];
  const serviceStatus = useQuery(
    selectedFleetId ? a.engineHours.getFleetServiceStatus : "skip",
    selectedFleetId ? { fleetId: selectedFleetId } : "skip"
  ) ?? [];
  const fleetData = useQuery(
    selectedFleetId ? a.fleetDashboard.getFleetDashboard : "skip",
    selectedFleetId ? { fleetId: selectedFleetId } : "skip"
  );

  if (fleetList.length > 0 && !selectedFleetId) setSelectedFleetId(fleetList[0]._id);

  // Build calendar events from service status and open work orders
  const events: CalEvent[] = useMemo(() => {
    const evts: CalEvent[] = [];

    // Service events from engine hours predictions
    (serviceStatus as any[]).forEach((s: any) => {
      s.engineStatuses?.forEach((e: any) => {
        if (e.prediction?.predictedServiceDate) {
          evts.push({
            id: `svc-${s.vessel._id}-${e.equipmentId}`,
            date: e.prediction.predictedServiceDate,
            label: `${e.name} service`,
            vesselName: s.vessel.name,
            type: e.prediction.isOverdue ? "overdue" : "upcoming",
          });
        }
      });
    });

    // Open work orders from fleet dashboard
    const vessels: any[] = fleetData?.vessels ?? [];
    vessels.forEach((v: any) => {
      if (v.openWorkOrderCount > 0) {
        // Place open work orders on today as an indicator
        evts.push({
          id: `wo-${v.vesselId}`,
          date: Date.now(),
          label: `${v.openWorkOrderCount} open WO${v.openWorkOrderCount > 1 ? "s" : ""}`,
          vesselName: v.name,
          type: "open_work_order",
        });
      }
    });

    return evts;
  }, [serviceStatus, fleetData]);

  // Calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
    setSelectedDay(null);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
    setSelectedDay(null);
  }

  const dayEvents = (day: number) =>
    events.filter(e => isSameDay(e.date, viewYear, viewMonth, day));

  const selectedEvents = selectedDay ? dayEvents(selectedDay) : [];

  return (
    <div className="flex min-h-screen bg-[#0f1929]">
      <AppSideNav />

      <main className="flex-1 min-w-0 overflow-x-hidden">
        {/* Header */}
        <div className="px-6 pt-8 pb-6 border-b border-white/[0.06]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white font-heading tracking-tight">Calendar</h1>
              <p className="text-sm text-white/40 mt-0.5">Upcoming service and open work orders</p>
            </div>
            {/* Legend */}
            <div className="hidden sm:flex items-center gap-4">
              {([["overdue","Overdue"],["upcoming","Upcoming"],["open_work_order","Work Order"]] as const).map(([type, label]) => (
                <span key={type} className="flex items-center gap-1.5 text-xs text-white/40">
                  <span className={`w-2 h-2 rounded-full ${
                    type === "overdue" ? "bg-red-400" : type === "upcoming" ? "bg-amber-400" : "bg-captain-400"
                  }`} />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-6 flex flex-col xl:flex-row gap-6">
          {/* Calendar */}
          <div className="flex-1 min-w-0">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-5">
              <button onClick={prevMonth} className="p-2 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.05] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-base font-bold text-white font-heading">{MONTH_NAMES[viewMonth]} {viewYear}</h2>
              <button onClick={nextMonth} className="p-2 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.05] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAY_NAMES.map(d => (
                <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-widest text-white/25 py-2">{d}</div>
              ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (!day) return <div key={i} />;
                const evts = dayEvents(day);
                const isToday = today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
                const isSelected = selectedDay === day;
                const hasOverdue   = evts.some(e => e.type === "overdue");
                const hasUpcoming  = evts.some(e => e.type === "upcoming");
                const hasWO        = evts.some(e => e.type === "open_work_order");

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                    className={`relative flex flex-col items-center min-h-[56px] p-1.5 rounded-xl border transition-all ${
                      isSelected
                        ? "bg-captain-500/15 border-captain-500/30"
                        : isToday
                        ? "bg-white/[0.06] border-white/10"
                        : "border-transparent hover:bg-white/[0.04]"
                    }`}
                  >
                    <span className={`text-sm font-medium ${
                      isToday ? "text-captain-300" : isSelected ? "text-captain-200" : "text-white/60"
                    }`}>{day}</span>
                    {/* Dots */}
                    {evts.length > 0 && (
                      <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                        {hasOverdue   && <span className="w-1.5 h-1.5 rounded-full bg-red-400" />}
                        {hasUpcoming  && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                        {hasWO        && <span className="w-1.5 h-1.5 rounded-full bg-captain-400" />}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day detail panel */}
          <div className="xl:w-72 flex-shrink-0">
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 min-h-[200px]">
              {selectedDay ? (
                <>
                  <h3 className="text-sm font-bold text-white mb-4">
                    {MONTH_NAMES[viewMonth]} {selectedDay}, {viewYear}
                  </h3>
                  {selectedEvents.length === 0 ? (
                    <p className="text-xs text-white/25">No events</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedEvents.map(e => (
                        <div key={e.id} className={`px-3 py-2.5 rounded-xl border text-xs ${URGENCY_STYLE[e.type]}`}>
                          <p className="font-semibold">{e.vesselName}</p>
                          <p className="opacity-70 mt-0.5">{e.label}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 gap-2 text-white/20">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-xs">Select a day</p>
                </div>
              )}
            </div>

            {/* Upcoming events list */}
            {events.length > 0 && (
              <div className="mt-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-3">All Events</p>
                <div className="space-y-2">
                  {events
                    .sort((a, b) => a.date - b.date)
                    .slice(0, 8)
                    .map(e => (
                      <div key={e.id} className={`flex items-start gap-3 px-3 py-2 rounded-xl border text-xs ${URGENCY_STYLE[e.type]}`}>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{e.vesselName}</p>
                          <p className="opacity-70 truncate">{e.label}</p>
                        </div>
                        <p className="opacity-50 flex-shrink-0 tabular-nums">
                          {new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
