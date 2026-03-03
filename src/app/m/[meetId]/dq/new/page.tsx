"use client";

import Link from "next/link";
import { DQ_SLIP_SECTIONS, DQPhase, DQStroke } from "@/lib/dqSlipSchema";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ensureAnonUser } from "@/lib/ensureAnonUser";
import AppHeader from "@/components/AppHeader";



type Role = "official" | "coach" | "parent";

export default function NewDQPage() {
  const params = useParams<{ meetId: string }>();
  const meetId = params?.meetId;
  const router = useRouter();

  const [role, setRole] = useState<Role | null>(null);
  const [teams, setTeams] = useState<Array<{ nameRaw: string; nameNorm: string }>>([]);

  const [judgeName, setJudgeName] = useState("");
const [cjInitials, setCjInitials] = useState("");
const [refereeName, setRefereeName] = useState("");


  const [eventNumber, setEventNumber] = useState("");
  const [heatNumber, setHeatNumber] = useState("");
  const [laneNumber, setLaneNumber] = useState("");
  const [swimmerName, setSwimmerName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [notifiedSwimmer, setNotifiedSwimmer] = useState(false);
const [notifiedCoach, setNotifiedCoach] = useState(false);

  
  

  const [notes, setNotes] = useState("");
  // Phase selection per stroke (only used for fly/back/breast; default swim)
const [phaseByStroke, setPhaseByStroke] = useState<Record<string, DQPhase>>({
  butterfly: "swim",
  backstroke: "swim",
  breaststroke: "swim",
});

// Checked infractions: key = "stroke|phase|code" (phase = swim if section phase disabled)
const [checks, setChecks] = useState<Record<string, boolean>>({});

// Text fields: key = "stroke|code"
const [textFields, setTextFields] = useState<Record<string, string>>({});

// Extra details for “range” relay items (swimmer # etc): key = "stroke|code"
const [extraFields, setExtraFields] = useState<Record<string, string>>({});

function checkKey(stroke: string, phase: string, code: string) {
  return `${stroke}|${phase}|${code}`;
}
function fieldKey(stroke: string, code: string) {
  return `${stroke}|${code}`;
}


  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputClass =
  "rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 px-4 py-3 outline-none ring-cyan-400/30 focus:ring-4";

  const inputSmClass =
  "rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 px-3 py-2 text-sm outline-none ring-cyan-400/30 focus:ring-4";

useEffect(() => {
  if (!meetId) return;

  (async () => {
    const user = await ensureAnonUser();

    // ✅ Load meet doc (teams live here)
    const meetSnap = await getDoc(doc(db, "meets", meetId));
    if (meetSnap.exists()) {
      const meetData = meetSnap.data() as any;
      setTeams(Array.isArray(meetData.teams) ? meetData.teams : []);
    } else {
      setTeams([]);
    }

    // ✅ Load subscription role
    const sub = await getDoc(doc(db, `meets/${meetId}/subscriptions/${user.uid}`));
    setRole(sub.exists() ? ((sub.data() as any).role as Role) : null);
  })();
}, [meetId]);





  const canSubmit = useMemo(() => {
  if (saving) return false;
  if (role !== "official") return false;

  return Boolean(
    eventNumber.trim() &&
    heatNumber.trim() &&
    laneNumber.trim() &&
    swimmerName.trim() &&
    teamName.trim() &&
    judgeName.trim()
  );
}, [
  saving,
  role,
  eventNumber,
  heatNumber,
  laneNumber,
  swimmerName,
  teamName,
  judgeName,
]);


  async function onSubmit() {

    console.log("🟣 NEW DQ PAGE VERSION 2026-03-03-B");
    console.log("SUBMIT CLICKED");


    if (!meetId) return;
    setSaving(true);
    setError(null);

    try {
      const user = await ensureAnonUser();
      const uid = user.uid;
      console.log("NEW DQ uid:", uid);

const subRef = doc(db, `meets/${meetId}/subscriptions/${uid}`);
const subSnap = await getDoc(subRef);
console.log("NEW DQ subscription exists?", subSnap.exists(), subSnap.data());
      const raceKey = `${eventNumber.trim()}-${heatNumber.trim()}-${laneNumber.trim()}`;

      const infractions = Object.entries(checks)
  .filter(([, v]) => v)
  .map(([k]) => {
    const [stroke, phase, code] = k.split("|");
    return { stroke, phase, code };
  });

const slipText = Object.entries(textFields)
  .map(([k, v]) => ({ key: k, value: v.trim() }))
  .filter((x) => x.value.length > 0);

const slipExtra = Object.entries(extraFields)
  .map(([k, v]) => ({ key: k, value: v.trim() }))
  .filter((x) => x.value.length > 0);


     const dqId = crypto.randomUUID();

// 1) Try public write first
try {
  await setDoc(doc(db, `meets/${meetId}/dq_reports/${dqId}`), {
    createdByUid: uid,
    infractions,
    recorded: false,
    recordedAt: null,
    recordedByUid: null,

    slipText,
    notifiedSwimmer,
    notifiedCoach,
    slipExtra,

    teamNameRaw: teamName.trim() || null,
    teamNameNorm: teamName.trim() ? teamName.trim().toUpperCase() : null,

    judgeName: judgeName.trim() || null,
    cjInitials: cjInitials.trim().toUpperCase() || null,
    refereeName: refereeName.trim() || null,

    createdAt: serverTimestamp(),
    eventNumber: eventNumber.trim(),
    heatNumber: heatNumber.trim(),
    laneNumber: laneNumber.trim(),
    raceKey,
    swimmerName: swimmerName.trim() || null,
    teamName: teamName.trim() || null,
    notes: notes.trim() || null,
  });

  console.log("✅ dq_reports create OK", dqId);
} catch (e: any) {
  console.error("❌ dq_reports create FAILED", { code: e?.code, message: e?.message });
  throw e;
}

// 2) Then try private write
try {
  await setDoc(doc(db, `meets/${meetId}/dq_private/${dqId}`), {
    createdByUid: uid,
    createdAt: serverTimestamp(),
    judgeName: judgeName.trim() || null,
    cjInitials: cjInitials.trim() || null,
  });

  console.log("✅ dq_private create OK", dqId);
} catch (e: any) {
  console.error("❌ dq_private create FAILED", { code: e?.code, message: e?.message });
  throw e;
}

router.push(`/m/${meetId}`);
    } catch (e: any) {
      setError(e?.message ?? "Failed to submit DQ.");
    } finally {
      setSaving(false);
    }
  }

  if (!meetId) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader
  meetId={meetId}
  role={role}
  backHref={`/m/${meetId}`}
  backLabel="← Back to feed"
/>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-2xl font-semibold tracking-wide text-slate-900">New DQ</h1>
          <p className="mt-2 text-sm text-slate-600">
            Officials only. 
          </p>

          {role && role !== "official" ? (
            <div className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
              You’re joined as <b>{role}</b>. Only <b>officials</b> can submit DQs.
            </div>
          ) : null}

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <input className={inputClass}
              placeholder="Event #"
              value={eventNumber}
              onChange={(e) => setEventNumber(e.target.value)}
            />
            <input className={inputClass}
              placeholder="Heat #"
              value={heatNumber}
              onChange={(e) => setHeatNumber(e.target.value)}
            />
            <input className={inputClass}
              placeholder="Lane #"
              value={laneNumber}
              onChange={(e) => setLaneNumber(e.target.value)}
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input className={inputClass}
              placeholder="Swimmer"
              value={swimmerName}
              onChange={(e) => setSwimmerName(e.target.value)}
            />
            <div>
  <select
    className={inputClass}
    value={teamName}
    onChange={(e) => setTeamName(e.target.value)}
  >
    <option value="">Team (optional)</option>
    {teams.map((t) => (
      <option key={t.nameNorm} value={t.nameRaw}>
        {t.nameRaw}
      </option>
    ))}
  </select>

  {teams.length === 0 && (
    <div className="mt-2 text-xs text-slate-500">
      No teams defined for this meet yet.
    </div>
  )}
</div>

          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            
            
          </div>

<div className="mt-4">
  <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
  <div className="text-xs font-semibold text-slate-700">Officials</div>

  <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
    {/* Judge */}
    <div>
      <div className="text-xs font-semibold text-slate-600">Judge</div>
      <div className="mt-1 rounded-lg bg-white px-2 py-2">
        <input
          className="w-full border-0 border-b border-slate-300 bg-transparent pb-1 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900"
          value={judgeName}
          onChange={(e) => setJudgeName(e.target.value)}
          placeholder="Name"
        />
      </div>
    </div>

    {/* CJ */}
    <div>
      <div className="text-xs font-semibold text-slate-600">CJ</div>
      <div className="mt-1 rounded-lg bg-white px-2 py-2">
        <input
          className="w-full border-0 border-b border-slate-300 bg-transparent pb-1 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900"
          value={cjInitials}
          onChange={(e) => setCjInitials(e.target.value)}
          placeholder="Initials"
        />
      </div>
    </div>

    {/* Referee */}
    <div>
      <div className="text-xs font-semibold text-slate-600">Referee</div>
      <div className="mt-1 rounded-lg bg-white px-2 py-2">
        <input
          className="w-full border-0 border-b border-slate-300 bg-transparent pb-1 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900"
          value={refereeName}
          onChange={(e) => setRefereeName(e.target.value)}
          placeholder="Name"
        />
      </div>
    </div>
  </div>
</div>

</div>



          <textarea
            className={inputClass}
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
          />

          {error ? (
            <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
              {error}
            </div>
          ) : null}

          <div className="mt-4">
  
</div>


{/* ---- PAPER MODE SLIP BODY ---- */}
<div className="print-sheet mt-8 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">

  <div className="flex items-center justify-between">
    <div className="text-sm font-semibold text-slate-900">DQ Slip (Paper Mode)</div>
    <div className="text-xs text-slate-500">Rev. 1/24</div>
  </div>

  <div className="mt-4 space-y-8">
    {DQ_SLIP_SECTIONS.map((section) => {
      const phase =
        section.phaseEnabled ? (phaseByStroke[section.stroke] ?? section.defaultPhase ?? "swim") : "swim";

      return (
        <div key={section.stroke} className="rounded-xl border border-slate-200">

          {/* Section header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-sm font-semibold text-slate-900">{section.title}</div>

            {section.phaseEnabled ? (
              <div className="inline-flex overflow-hidden rounded-xl ring-1 ring-slate-200">
                {(["start", "swim", "turn", "finish"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPhaseByStroke((prev) => ({ ...prev, [section.stroke]: p }))}
                    className={
                      phase === p
                        ? "bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                        : "bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    }
                  >
                    {p.toUpperCase()}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-xs font-semibold text-slate-500"> </div>
            )}
          </div>

          <div className="p-3">
            {/* Checkboxes */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {section.checks.map((c) => {
                const k = checkKey(section.stroke, phase, c.code);
                const checked = !!checks[k];

                // Relay range items: show tiny extra field (swimmer # / details)
                const needsExtra =
                  section.stroke === "relays" && (c.code.includes("6A") || c.code.includes("6F") || c.code === "6L");

                return (
  <div key={c.code} className="rounded-lg bg-white ring-1 ring-slate-100">
    {/* Row is tappable */}
    <div
      role="button"
      tabIndex={0}
      className="flex items-start gap-3 px-2 py-2 cursor-pointer select-none active:scale-[0.99] touch-manipulation"
      onClick={() => setChecks((prev) => ({ ...prev, [k]: !prev[k] }))}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setChecks((prev) => ({ ...prev, [k]: !prev[k] }));
        }
      }}
    >
      <input
        id={`chk-${section.stroke}-${phase}-${c.code}`.replace(/[^a-zA-Z0-9-_]/g, "-")}
        type="checkbox"
        className="mt-1 h-4 w-4 accent-cyan-600"
        checked={checked}
        readOnly
        onClick={(e) => e.stopPropagation()}
      />

      <div className="flex-1">
        <div className="text-[13px] leading-5 text-slate-900">
          <span className="inline-block w-12 font-mono text-[11px] text-slate-600">{c.code}</span>{" "}
          <span className="ml-1">{c.label}</span>
        </div>
      </div>
    </div>

    {/* Extra input OUTSIDE the tappable row */}
    {needsExtra ? (
      <div className="px-2 pb-2">
        <input
          className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none ring-cyan-400/30 focus:ring-4"
          value={extraFields[fieldKey(section.stroke, c.code)] ?? ""}
          onChange={(e) =>
            setExtraFields((prev) => ({
              ...prev,
              [fieldKey(section.stroke, c.code)]: e.target.value,
            }))
          }
          placeholder={c.code === "6L" ? "Swimmer / stroke details…" : "Swimmer # (optional)…"}
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        />
      </div>
    ) : null}
  </div>
);
              })}
            </div>

            {/* “Long line” text fields */}
            {section.texts.length > 0 ? (
              <div className="mt-4 space-y-4">
                {section.texts.map((t) => (
                  <div key={t.code}>
                    <div className="text-xs font-semibold text-slate-700">
                      <span className="font-mono">{t.code}</span> {t.label}
                    </div>

                    {/* paper-like “line” input */}
                    <div className="mt-1 rounded-lg bg-white px-2 py-2">
                      <input
                        className="w-full border-0 border-b border-slate-300 bg-transparent pb-1 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900"
                        value={textFields[fieldKey(section.stroke, t.code)] ?? ""}
                        onChange={(e) =>
                          setTextFields((prev) => ({ ...prev, [fieldKey(section.stroke, t.code)]: e.target.value }))
                        }
                        placeholder={t.placeholder ?? ""}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      );
    })}
  </div>
</div>

<div className="mt-8 border-t border-slate-300 pt-4">
  <div className="text-xs font-semibold text-slate-700">NOTIFIED</div>

  <div className="mt-3 flex gap-6">
    <label className="flex items-center gap-2 text-sm text-slate-900">
      <input
        type="checkbox"
        checked={notifiedSwimmer}
        onChange={(e) => setNotifiedSwimmer(e.target.checked)}
        className="h-4 w-4 accent-slate-900"
      />
      Swimmer
    </label>

    <label className="flex items-center gap-2 text-sm text-slate-900">
      <input
        type="checkbox"
        checked={notifiedCoach}
        onChange={(e) => setNotifiedCoach(e.target.checked)}
        className="h-4 w-4 accent-slate-900"
      />
      Coach
    </label>
  </div>
</div>




      <button
  type="button"
  onClick={onSubmit}
  disabled={!canSubmit}
  className={
    canSubmit
      ? "mt-6 w-full rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800"
      : "mt-6 w-full rounded-2xl bg-slate-300 px-6 py-3 text-sm font-semibold text-white"
  }
>
  Submit DQ
</button>


        </div>
      </main>
    </div>
  );
}
