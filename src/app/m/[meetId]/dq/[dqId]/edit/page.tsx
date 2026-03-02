"use client";

import Link from "next/link";
import { DQ_SLIP_SECTIONS, DQPhase } from "@/lib/dqSlipSchema";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ensureAnonUser } from "@/lib/ensureAnonUser";
import AppHeader from "@/components/AppHeader";

type Role = "official" | "coach" | "parent";

export default function EditDQPage() {
  const params = useParams<{ meetId: string; dqId: string }>();
  const meetId = params?.meetId;
  const dqId = params?.dqId;

  const router = useRouter();

  const [loadingDQ, setLoadingDQ] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  const [notes, setNotes] = useState("");

  const [notifiedSwimmer, setNotifiedSwimmer] = useState(false);
  const [notifiedCoach, setNotifiedCoach] = useState(false);

  const [phaseByStroke, setPhaseByStroke] = useState<Record<string, DQPhase>>({
    butterfly: "swim",
    backstroke: "swim",
    breaststroke: "swim",
  });

  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [textFields, setTextFields] = useState<Record<string, string>>({});
  const [extraFields, setExtraFields] = useState<Record<string, string>>({});

  function checkKey(stroke: string, phase: string, code: string) {
    return `${stroke}|${phase}|${code}`;
  }
  function fieldKey(stroke: string, code: string) {
    return `${stroke}|${code}`;
  }

  // tighter on mobile, keep roomy on desktop
  const inputClass =
    "rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 px-3 py-2.5 text-sm outline-none ring-cyan-400/30 focus:ring-4 sm:px-4 sm:py-3 sm:text-base";

  useEffect(() => {
    if (!meetId || !dqId) return;

    (async () => {
      setLoadingDQ(true);
      setError(null);

      const user = await ensureAnonUser();

      const meetSnap = await getDoc(doc(db, "meets", meetId));
      if (meetSnap.exists()) {
        const meetData = meetSnap.data() as any;
        setTeams(Array.isArray(meetData.teams) ? meetData.teams : []);
      } else {
        setTeams([]);
      }

      const subSnap = await getDoc(doc(db, `meets/${meetId}/subscriptions/${user.uid}`));
      const r = subSnap.exists() ? ((subSnap.data() as any).role as Role) : null;
      setRole(r);

      if (r !== "official") {
        setLoadingDQ(false);
        return;
      }

      const pubSnap = await getDoc(doc(db, `meets/${meetId}/dq_reports/${dqId}`));
      if (!pubSnap.exists()) throw new Error("DQ not found.");
      const pub = pubSnap.data() as any;

      setEventNumber(pub.eventNumber ?? "");
      setHeatNumber(pub.heatNumber ?? "");
      setLaneNumber(pub.laneNumber ?? "");
      setSwimmerName(pub.swimmerName ?? "");
      setNotes(pub.notes ?? "");
      setTeamName(pub.teamNameRaw ?? pub.teamName ?? "");
      setNotifiedSwimmer(!!pub.notifiedSwimmer);
      setNotifiedCoach(!!pub.notifiedCoach);

      const nextChecks: Record<string, boolean> = {};
      if (Array.isArray(pub.infractions)) {
        for (const inf of pub.infractions) {
          const k = `${inf.stroke}|${inf.phase}|${inf.code}`;
          nextChecks[k] = true;
        }
      }
      setChecks(nextChecks);

      const nextText: Record<string, string> = {};
      if (Array.isArray(pub.slipText)) {
        for (const kv of pub.slipText) {
          if (kv?.key) nextText[String(kv.key)] = String(kv.value ?? "");
        }
      }
      setTextFields(nextText);

      const nextExtra: Record<string, string> = {};
      if (Array.isArray(pub.slipExtra)) {
        for (const kv of pub.slipExtra) {
          if (kv?.key) nextExtra[String(kv.key)] = String(kv.value ?? "");
        }
      }
      setExtraFields(nextExtra);

      const privSnap = await getDoc(doc(db, `meets/${meetId}/dq_private/${dqId}`));
      if (privSnap.exists()) {
        const priv = privSnap.data() as any;
        setJudgeName(priv.judgeName ?? "");
        setCjInitials(priv.cjInitials ?? "");
      } else {
        setJudgeName(pub.judgeName ?? "");
        setCjInitials(pub.cjInitials ?? "");
      }

      setRefereeName(pub.refereeName ?? "");
      setLoadingDQ(false);
    })().catch((e: any) => {
      setError(e?.message ?? "Failed to load DQ.");
      setLoadingDQ(false);
    });
  }, [meetId, dqId]);

  const canSave = useMemo(() => {
    if (saving) return false;
    if (role !== "official") return false;
    if (loadingDQ) return false;

    return Boolean(eventNumber.trim() && heatNumber.trim() && laneNumber.trim() && judgeName.trim());
  }, [saving, role, loadingDQ, eventNumber, heatNumber, laneNumber, judgeName]);

  async function onSave() {
    if (!meetId || !dqId) return;

    setSaving(true);
    setError(null);

    try {
      const user = await ensureAnonUser();
      const uid = user.uid;

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

      const raceKey = `${eventNumber.trim()}-${heatNumber.trim()}-${laneNumber.trim()}`;

      const batch = writeBatch(db);

      batch.update(doc(db, `meets/${meetId}/dq_reports/${dqId}`), {
        eventNumber: eventNumber.trim(),
        heatNumber: heatNumber.trim(),
        laneNumber: laneNumber.trim(),
        raceKey,

        swimmerName: swimmerName.trim() || null,

        teamNameRaw: teamName.trim() || null,
        teamNameNorm: teamName.trim().toUpperCase() || null,

        notes: notes.trim() || null,

        infractions,
        slipText,
        slipExtra,

        notifiedSwimmer,
        notifiedCoach,

        judgeName: judgeName.trim() || null,
        cjInitials: cjInitials.trim().toUpperCase() || null,
        refereeName: refereeName.trim() || null,
      });

      batch.set(
        doc(db, `meets/${meetId}/dq_private/${dqId}`),
        {
          createdByUid: uid,
          judgeName: judgeName.trim() || null,
          cjInitials: cjInitials.trim().toUpperCase() || null,
        },
        { merge: true }
      );

      await batch.commit();
      router.push(`/m/${meetId}/dq/${dqId}`);
    } catch (e: any) {
      setError(e?.message ?? "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  if (!meetId || !dqId) return null;


  return (
    <div className="min-h-screen bg-slate-50">
      
      <AppHeader
  meetId={meetId}
  role={role}
  backHref={`/m/${meetId}/dq/${dqId}`}
  backLabel="← Back to DQ"
/>

      <main className="mx-auto max-w-3xl px-3 py-4 sm:px-6 sm:py-10">
        <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 pb-28">
          <h1 className="text-lg font-semibold tracking-wide text-slate-900 sm:text-2xl">Edit DQ</h1>

          {loadingDQ ? (
            <div className="mt-4 text-sm text-slate-600 sm:mt-6">Loading…</div>
          ) : role && role !== "official" ? (
            <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200 sm:mt-6">
              You’re joined as <b>{role}</b>. Only <b>officials</b> can edit DQs.
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200 sm:mt-6">
              {error}
            </div>
          ) : null}

          <div className="mt-5 grid grid-cols-1 gap-3 sm:mt-8 sm:gap-4 sm:grid-cols-3">
            <input className={inputClass} placeholder="Event #" value={eventNumber} onChange={(e) => setEventNumber(e.target.value)} />
            <input className={inputClass} placeholder="Heat #" value={heatNumber} onChange={(e) => setHeatNumber(e.target.value)} />
            <input className={inputClass} placeholder="Lane #" value={laneNumber} onChange={(e) => setLaneNumber(e.target.value)} />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:mt-4 sm:gap-4 sm:grid-cols-2">
            <input className={inputClass} placeholder="Swimmer" value={swimmerName} onChange={(e) => setSwimmerName(e.target.value)} />
            <div>
              <select className={inputClass} value={teamName} onChange={(e) => setTeamName(e.target.value)}>
                <option value="">Team (optional)</option>
                {teams.map((t) => (
                  <option key={t.nameNorm} value={t.nameRaw}>
                    {t.nameRaw}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 sm:mt-6 sm:p-4">
            <div className="text-[11px] font-semibold text-slate-700 sm:text-xs">Officials</div>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:mt-3 sm:gap-4 sm:grid-cols-3">
              <div>
                <div className="text-[11px] font-semibold text-slate-600 sm:text-xs">Judge</div>
                <div className="mt-1 rounded-lg bg-white px-2 py-2">
                  <input
                    className="w-full border-0 border-b border-slate-300 bg-transparent pb-1 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900"
                    value={judgeName}
                    onChange={(e) => setJudgeName(e.target.value)}
                    placeholder="Name"
                  />
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold text-slate-600 sm:text-xs">CJ</div>
                <div className="mt-1 rounded-lg bg-white px-2 py-2">
                  <input
                    className="w-full border-0 border-b border-slate-300 bg-transparent pb-1 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900"
                    value={cjInitials}
                    onChange={(e) => setCjInitials(e.target.value)}
                    placeholder="Initials"
                  />
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold text-slate-600 sm:text-xs">Referee</div>
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

          <textarea
            className={`${inputClass} mt-4 sm:mt-6`}
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />

         <div className="print-sheet mt-5 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 sm:mt-8 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">DQ Slip (Paper Mode)</div>
              <div className="text-xs text-slate-500">Rev. 1/24</div>
            </div>

            <div className="mt-3 space-y-5 sm:mt-4 sm:space-y-8">
              {DQ_SLIP_SECTIONS.map((section) => {
                const phase = section.phaseEnabled
                  ? (phaseByStroke[section.stroke] ?? section.defaultPhase ?? "swim")
                  : "swim";

return (
  <div key={section.stroke} className="rounded-xl border border-slate-200">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 sm:px-4 sm:py-3">
      <div className="text-sm font-semibold text-slate-900">{section.title}</div>

      {section.phaseEnabled ? (
        <div className="-mr-1 max-w-full overflow-x-auto whitespace-nowrap">
          <div className="inline-flex flex-wrap gap-1 rounded-xl">
            {(["start", "swim", "turn", "finish"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPhaseByStroke((prev) => ({ ...prev, [section.stroke]: p }))}
                className={
                  phase === p
                    ? "bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white"
                    : "bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                }
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-xs font-semibold text-slate-500"> </div>
      )}
    </div>

    <div className="p-2 sm:p-3">
      {/* ✅ THIS IS THE SECTION YOU COULDN’T FIND: section.checks.map */}
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 sm:gap-2">
        {section.checks.map((c) => {
          const k = checkKey(section.stroke, phase, c.code);
          const checked = !!checks[k];

          const needsExtra =
            section.stroke === "relays" &&
            (c.code.includes("6A") || c.code.includes("6F") || c.code === "6L");

          const inputId = `chk-${section.stroke}-${phase}-${c.code}`.replace(/[^a-zA-Z0-9-_]/g, "-");

return (
  <div key={c.code} className="rounded-lg bg-white ring-1 ring-slate-100">
    {/* Tap anywhere on the row toggles */}
    <div
      role="button"
      tabIndex={0}
      className="flex items-start gap-3 px-2 py-2 cursor-pointer select-none active:scale-[0.99] touch-manipulation"
     onClick={() =>
  setChecks((prev) => ({
    ...prev,
    [k]: !prev[k],
  }))
}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setChecks((prev) => ({ ...prev, [k]: !prev[k] }));
        }
      }}
    >
      <input
        id={inputId}
        type="checkbox"
        className="mt-1 h-4 w-4 accent-cyan-600"
        checked={checked}
        readOnly
        onClick={(e) => e.stopPropagation()} // clicking the box itself won't double toggle
      />

      <div className="flex-1">
        <div className="text-[13px] leading-5 text-slate-900">
          <span className="inline-block w-12 font-mono text-[11px] text-slate-600">{c.code}</span>{" "}
          <span className="ml-1">{c.label}</span>
        </div>
      </div>
    </div>

    {/* Extra input OUTSIDE row toggle area */}
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

      {/* existing text fields */}
      {section.texts.length > 0 ? (
        <div className="mt-3 space-y-3 sm:mt-4 sm:space-y-4">
          {section.texts.map((t) => (
            <div key={t.code}>
              <div className="text-[11px] font-semibold text-slate-700 sm:text-xs">
                <span className="font-mono">{t.code}</span> {t.label}
              </div>
              <div className="mt-1 rounded-lg bg-white px-2 py-2">
                <input
                  className="w-full border-0 border-b border-slate-300 bg-transparent pb-1 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900"
                  value={textFields[fieldKey(section.stroke, t.code)] ?? ""}
                  onChange={(e) =>
                    setTextFields((prev) => ({
                      ...prev,
                      [fieldKey(section.stroke, t.code)]: e.target.value,
                    }))
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

          <div className="mt-5 border-t border-slate-300 pt-4 sm:mt-8">
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
            onClick={onSave}
            disabled={!canSave}
            className={
              canSave
                ? "mt-5 w-full rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800 sm:mt-6"
                : "mt-5 w-full rounded-2xl bg-slate-300 px-6 py-3 text-sm font-semibold text-white sm:mt-6"
            }
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>



<div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur">
  <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
    <div className="text-xs text-slate-600">
      {error ? <span className="font-semibold text-red-700">{error}</span> : null}
    </div>

    <button
      type="button"
      onClick={onSave}
      disabled={!canSave}
      className={
        canSave
          ? "rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white active:scale-[0.99]"
          : "rounded-2xl bg-slate-300 px-5 py-3 text-sm font-semibold text-white"
      }
    >
      {saving ? "Saving…" : "Save changes"}
    </button>
  </div>
</div>



      </main>
    </div>
  );
}