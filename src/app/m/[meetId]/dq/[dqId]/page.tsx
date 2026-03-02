"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ensureAnonUser } from "@/lib/ensureAnonUser";
import { DQ_SLIP_SECTIONS } from "@/lib/dqSlipSchema";
import AppHeader from "@/components/AppHeader";

type Role = "official" | "coach" | "parent";

type DQInfraction = {
  stroke: string;
  phase: "start" | "swim" | "turn" | "finish";
  code: string;
};

type KeyValue = { key: string; value: string };

type DQPublic = {
  eventNumber: string;
  heatNumber: string;
  laneNumber: string;
  raceKey: string;

  swimmerName?: string | null;
  teamNameRaw?: string | null;
  teamNameNorm?: string | null;

  notes?: string | null;
  infractions?: DQInfraction[];
  slipText?: KeyValue[];
  slipExtra?: KeyValue[];

  notifiedSwimmer?: boolean;
  notifiedCoach?: boolean;

  recorded?: boolean;
  recordedAt?: any;
  recordedByUid?: string | null;

  createdAt?: any;
  createdByUid: string;
};

type DQPrivate = {
  judgeName?: string | null;
  cjInitials?: string | null;
  createdByUid: string;
};

function Section({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mt-6 rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-4 flex items-center justify-between active:scale-[0.99]"
      >
        <div className="text-base font-semibold text-slate-900">{title}</div>
        <div className="text-xs font-semibold text-slate-500">{open ? "HIDE" : "SHOW"}</div>
      </button>
      {open ? <div className="px-4 pb-4">{children}</div> : null}
    </div>
  );
}


export default function DqDetailPage() {
  const params = useParams<{ meetId: string; dqId: string }>();
  const meetId = params?.meetId;
  const dqId = params?.dqId;

  const [role, setRole] = useState<Role | null>(null);
  const [dq, setDq] = useState<DQPublic | null>(null);
  const [dqPrivate, setDqPrivate] = useState<DQPrivate | null>(null);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const isOfficial = role === "official";

  const codeLabelMap = useMemo(() => {
    const m = new Map<string, { label: string; strokeTitle: string }>();
    for (const sec of DQ_SLIP_SECTIONS) {
      for (const c of sec.checks) m.set(c.code, { label: c.label, strokeTitle: sec.title });
      for (const t of sec.texts) m.set(t.code, { label: t.label, strokeTitle: sec.title });
    }
    return m;
  }, []);

  useEffect(() => {
    if (!meetId || !dqId) return;

    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const user = await ensureAnonUser();

        // load role (used to decide whether to fetch dq_private)
        const subSnap = await getDoc(doc(db, `meets/${meetId}/subscriptions/${user.uid}`));
        const r = subSnap.exists() ? ((subSnap.data() as any).role as Role) : null;
        setRole(r);

        // load public dq (rules will enforce if allowed)
        const pubSnap = await getDoc(doc(db, `meets/${meetId}/dq_reports/${dqId}`));
        if (!pubSnap.exists()) throw new Error("DQ not found (or you don’t have access).");
        setDq(pubSnap.data() as any);

        // officials + coaches can also load private fields
        if (r === "official" || r === "coach") {
          const privSnap = await getDoc(doc(db, `meets/${meetId}/dq_private/${dqId}`));
          setDqPrivate(privSnap.exists() ? (privSnap.data() as any) : null);
        } else {
          setDqPrivate(null);
        }
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load DQ.");
      } finally {
        setLoading(false);
      }
    })();
  }, [meetId, dqId]);

  if (!meetId) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      
<AppHeader
  meetId={meetId}
  role={role}
  backHref={`/m/${meetId}`}
  backLabel="← Back to feed"
/>


        <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
  <div className="rounded-3xl bg-white p-5 sm:p-8 shadow-sm ring-1 ring-slate-200">
          {loading ? (
            <div className="text-sm text-slate-600">Loading…</div>
          ) : err ? (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">{err}</div>
          ) : !dq ? (
            <div className="text-sm text-slate-600">Not found.</div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xl font-semibold text-slate-900">
                    Event {dq.eventNumber} • Heat {dq.heatNumber} • Lane {dq.laneNumber}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    {dq.swimmerName ? <span className="font-semibold text-slate-900">{dq.swimmerName}</span> : "Swimmer"}
                    {dq.teamNameRaw ? ` • ${dq.teamNameRaw}` : ""}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Role: <span className="font-semibold">{role ?? "—"}</span>
                  </div>
                </div>

                {dq.recorded ? (
                  <span className="rounded-lg bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
                    Recorded
                  </span>
                ) : (
                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                    Not recorded
                  </span>
                )}
              </div>

              {(dqPrivate?.cjInitials || dqPrivate?.judgeName) ? (
                <div className="mt-6 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <div className="text-xs font-semibold text-slate-600">Officials</div>
                  <div className="mt-2 text-sm text-slate-800">
                    {dqPrivate.judgeName ? <>Judge: <span className="font-semibold">{dqPrivate.judgeName}</span></> : null}
                    {dqPrivate.cjInitials ? (
                      <div className="mt-1">
                        CJ: <span className="font-mono font-semibold">{String(dqPrivate.cjInitials).toUpperCase()}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {Array.isArray(dq.infractions) && dq.infractions.length > 0 ? (
  <Section title="Infractions" defaultOpen={true}>
    <div className="space-y-2">
      {dq.infractions.map((inf: any, idx: number) => {
        const meta = codeLabelMap.get(inf.code);
        const label = meta?.label ?? inf.code;
        const strokeTitle = meta?.strokeTitle ?? inf.stroke ?? "Stroke";
        const phase = inf.phase ? String(inf.phase).toUpperCase() : "";
        return (
          <div key={`${inf.code}-${idx}`} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold text-slate-600">
              {strokeTitle}{phase ? ` • ${phase}` : ""} • <span className="font-mono">{inf.code}</span>
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{label}</div>
          </div>
        );
      })}
    </div>
  </Section>
) : null}

              {Array.isArray(dq.slipText) && dq.slipText.length > 0 ? (
  <Section title="Details" defaultOpen={isOfficial}>
    <div className="space-y-2 text-sm text-slate-800">
      {dq.slipText.map((t: any, idx: number) => (
        <div key={`t-${idx}`} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          {t.value}
        </div>
      ))}
    </div>
  </Section>
) : null}

              {Array.isArray(dq.slipExtra) && dq.slipExtra.length > 0 ? (
  <Section title="Relay" defaultOpen={isOfficial}>
    <div className="space-y-2 text-sm text-slate-800">
      {dq.slipExtra.map((t: any, idx: number) => (
        <div key={`x-${idx}`} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          {t.value}
        </div>
      ))}
    </div>
  </Section>
) : null}

             {dq.notes ? (
  <Section title="Notes" defaultOpen={isOfficial}>
    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-800 ring-1 ring-slate-200">
      {dq.notes}
    </div>
  </Section>
) : null}

              {/* Later we’ll add an “Edit Slip” button here for officials */}
            </>
          )}
        </div>

        {isOfficial ? (
  <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur">
    <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
      <div className="text-xs text-slate-600">
        {dq?.recorded ? (
          <span className="font-semibold text-emerald-700">Recorded</span>
        ) : (
          <span className="font-semibold text-slate-700">Not recorded</span>
        )}
      </div>

      <Link
        href={`/m/${meetId}/dq/${dqId}/edit`}
        className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white active:scale-[0.99]"
      >
        Edit slip
      </Link>
    </div>
    <div className="rounded-3xl bg-white p-5 sm:p-8 shadow-sm ring-1 ring-slate-200 pb-24"></div>
  </div>
) : null}
      </main>
    </div>
  );
}