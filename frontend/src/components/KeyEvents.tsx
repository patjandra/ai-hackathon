import { useState } from "react";
import type { CheckIn } from "../lib/types";

interface Event { date: string; description: string; severity: string; }
interface Props { events: Event[]; checkins: CheckIn[]; }

const SEV_DOT: Record<string, string> = {
  urgent:  "bg-red-500",
  notable: "bg-amber-400",
  routine: "bg-gray-300",
};

const SEV_RANK: Record<string, number> = { urgent: 0, notable: 1, routine: 2 };

function fmtDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function EventRow({ event, checkins }: { event: Event; checkins: CheckIn[] }) {
  const [open, setOpen] = useState(false);
  const source = checkins.find(c => c.date === event.date);
  const quote = source?.patientQuote || source?.rawTranscript;

  return (
    <div className="relative">
      <div className="absolute -left-5 top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white z-10 flex-shrink-0"
        style={{ backgroundColor: event.severity === "urgent" ? "#ef4444" : event.severity === "notable" ? "#fbbf24" : "#d1d5db" }}
      />
      <button
        onClick={() => quote && setOpen(o => !o)}
        className={`w-full text-left group ${quote ? "cursor-pointer" : "cursor-default"}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">{fmtDate(event.date)}</p>
            <p className="text-sm text-gray-800 leading-snug">{event.description}</p>
          </div>
          {quote && (
            <span className="text-xs text-gray-300 group-hover:text-gray-500 mt-1 flex-shrink-0 transition-colors">
              {open ? "▲" : "▼"}
            </span>
          )}
        </div>
      </button>

      {open && quote && (
        <div className="mt-2 ml-0 p-3 bg-gray-50 rounded-lg border border-gray-100">
          <p className="text-xs text-gray-400 font-medium mb-1 uppercase tracking-wide">Patient's words</p>
          <p className="text-sm text-gray-700 italic leading-relaxed">"{quote}"</p>
        </div>
      )}
    </div>
  );
}

// Detect a monitoring gap — days between last event and today
function monitoringGapDays(events: Event[]): number {
  if (!events.length) return 0;
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
  const last = new Date(sorted[sorted.length - 1].date + "T12:00:00");
  return Math.floor((Date.now() - last.getTime()) / 86_400_000);
}

export function KeyEvents({ events, checkins }: Props) {
  const [showAll, setShowAll] = useState(false);
  if (!events?.length) return null;

  // Sort by severity then date, collapse to top 4
  const sorted = [...events].sort((a, b) =>
    (SEV_RANK[a.severity] ?? 2) - (SEV_RANK[b.severity] ?? 2) || a.date.localeCompare(b.date)
  );
  const visible = showAll ? sorted : sorted.slice(0, 4);
  const gap = monitoringGapDays(events);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Key Events</p>
        {events.length > 4 && (
          <button
            onClick={() => setShowAll(s => !s)}
            className="text-xs text-teal-600 hover:text-teal-700 font-medium"
          >
            {showAll ? "Show fewer" : `Show all ${events.length}`}
          </button>
        )}
      </div>

      <div className="relative">
        <div className="absolute left-2 top-0 bottom-0 w-px bg-gray-200" />
        <div className="space-y-5 pl-7">
          {visible.map((ev, i) => (
            <EventRow key={i} event={ev} checkins={checkins} />
          ))}

          {/* Monitoring gap indicator */}
          {gap > 30 && (
            <div className="border-l-2 border-dashed border-gray-200 -ml-7 pl-6 py-2">
              <p className="text-xs text-gray-300 italic">
                No check-ins recorded for {Math.round(gap / 30)} months
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
