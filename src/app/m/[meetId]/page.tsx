"use client";
import { DQ_SLIP_SECTIONS } from "@/lib/dqSlipSchema";

import Link from "next/link";
import { updateDoc, serverTimestamp } from "firebase/firestore";

import AppHeader from "@/components/AppHeader";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { ensureAnonUser } from "@/lib/ensureAnonUser";

type Role = "official" | "coach" | "parent";

type Meet = {
  name: string;
  dateStart: string;
  dateEnd?: string | null;
  meetCode: string;
};

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

  swimmerName: string;
  teamNameRaw: string;
  teamNameNorm: string;

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
  officialInitials: string;
  createdByUid: string;
};

export default function MeetLivePage() {
  const params = useParams<{ meetId: string }>();
  const meetId = params?.meetId;

  const [meet, setMeet] = useState<Meet | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [coachTeamNorm, setCoachTeamNorm] = useState<string | null>(null);

  const [roleChecked, setRoleChecked] = useState(false);
  const [uid, setUid] = useState<string | null>(null);

  const [dqPublic, setDqPublic] = useState<Array<{ id: string; data: DQPublic }>>([]);
  const [dqPrivateMap, setDqPrivateMap] = useState<Record<string, DQPrivate>>({});

  const [parentRaceKeys, setParentRaceKeys] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  

const codeLabelMap = useMemo(() => {
    const m = new Map<string, { label: string; strokeTitle: string }>();
    for (const sec of DQ_SLIP_SECTIONS) {
      for (const c of sec.checks) {
        m.set(c.code, { label: c.label, strokeTitle: sec.title });
      }
      for (const t of sec.texts) {
        m.set(t.code, { label: t.label, strokeTitle: sec.title });
      }
    }
    return m;
  }, []);

  async function toggleRecorded(dqId: string, next: boolean) {
    if (!meetId) return;
    if (!uid) return;

    const ref = doc(db, `meets/${meetId}/dq_reports/${dqId}`);
    await updateDoc(ref, {
      recorded: next,
      recordedAt: next ? serverTimestamp() : null,
      recordedByUid: next ? uid : null,
    });
  }

  // Boot auth + load subscription role
  useEffect(() => {
    if (!meetId) return;

    (async () => {
      setLoading(true);
      const user = await ensureAnonUser();
      setUid(user.uid);
      setAuthReady(true);

      console.log("LIVE PAGE UID:", user.uid);


      const meetSnap = await getDoc(doc(db, "meets", meetId));
      if (meetSnap.exists()) setMeet(meetSnap.data() as Meet);

      const subSnap = await getDoc(doc(db, `meets/${meetId}/subscriptions/${user.uid}`));
if (subSnap.exists()) {
  const sub = subSnap.data() as any;
  setRole(sub.role as Role);
  setCoachTeamNorm(sub.coachTeamNorm ?? null);
} else {
  setRole(null);
  setCoachTeamNorm(null);
}
setRoleChecked(true);

      setLoading(false);
    })();
  }, [meetId]);


// Parent: subscribe to watchItems so we can query only allowed DQs
useEffect(() => {
  if (!meetId) return;
  if (!authReady) return;
  if (!roleChecked) return;
  if (!uid) return;

  if (role !== "parent") {
    setParentRaceKeys([]);
    return;
  }

  const qy = query(collection(db, `meets/${meetId}/parentWatchlists/${uid}/watchItems`));

  return onSnapshot(
    qy,
    (snap) => {
      const keys = snap.docs
        .map((d) => (d.data() as any).raceKey || d.id) // support either style
        .filter(Boolean);
      setParentRaceKeys(keys);
    },
    (err) => {
      console.error("LISTENER FAIL: watchItems", err.code, err.message);
    }
  );
}, [meetId, authReady, roleChecked, role, uid]);

  // Subscribe to public DQ feed (role-aware query that matches rules)
useEffect(() => {
  if (!meetId) return;
  if (!authReady) return;
  if (!roleChecked) return;
  if (!role) return;

  const base = collection(db, `meets/${meetId}/dq_reports`);

  // OFFICIAL: read all
  if (role === "official") {
    const qy = query(base, orderBy("createdAt", "desc"));
    return onSnapshot(
      qy,
      (snap) => setDqPublic(snap.docs.map((d) => ({ id: d.id, data: d.data() as any }))),
      (err) => console.error("LISTENER FAIL: dq_reports", err.code, err.message)
    );
  }

  // COACH: read only their team
  if (role === "coach") {
    if (!coachTeamNorm) {
      setDqPublic([]);
      return;
    }

    const qy = query(base, where("teamNameNorm", "==", coachTeamNorm), orderBy("createdAt", "desc"));
    return onSnapshot(
      qy,
      (snap) => setDqPublic(snap.docs.map((d) => ({ id: d.id, data: d.data() as any }))),
      (err) => console.error("LISTENER FAIL: dq_reports", err.code, err.message)
    );
  }

  // PARENT: read only watched raceKeys
  if (role === "parent") {
    const keys = parentRaceKeys.slice(0, 30); // Firestore 'in' max = 30
    if (keys.length === 0) {
      setDqPublic([]);
      return;
    }

    const qy = query(base, where("raceKey", "in", keys), orderBy("createdAt", "desc"));
    return onSnapshot(
      qy,
      (snap) => setDqPublic(snap.docs.map((d) => ({ id: d.id, data: d.data() as any }))),
      (err) => console.error("LISTENER FAIL: dq_reports", err.code, err.message)
    );
  }
}, [meetId, authReady, roleChecked, role, coachTeamNorm, parentRaceKeys]);


  // Subscribe to private initials ONLY for officials/coaches
  useEffect(() => {
    if (!meetId) return;
    if (!authReady) return;
  if (!roleChecked) return;
    if (role !== "official" && role !== "coach") return;

    const qy = query(collection(db, `meets/${meetId}/dq_private`));

   return onSnapshot(
  qy,
  (snap) => {
    const next: Record<string, any> = {};
    snap.docs.forEach((d) => (next[d.id] = d.data() as any));
    setDqPrivateMap(next);
  },
  (err) => {
    console.error("LISTENER FAIL: dq_private", err.code, err.message);
  }
);

  }, [meetId, authReady, roleChecked, role]);

  const joinUrl = useMemo(() => {
    if (!meet?.meetCode) return "";
    return `/join/${encodeURIComponent(meet.meetCode)}`;
  }, [meet?.meetCode]);



  if (!meetId) return null;

const visibleDqs = dqPublic;
const watchingCount = role === "parent" ? parentRaceKeys.length : 0;


  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader meetId={meetId} role={role} showNewDq />
      <main className="mx-auto max-w-6xl px-6 py-10">
        {loading ? (
  <div className="text-sm text-slate-600">Loading…</div>
) : !roleChecked ? (
  <div className="text-sm text-slate-600">Checking your join status…</div>
) : !role ? (
  <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
    <div className="text-xl font-semibold text-slate-900">
      You haven’t joined this meet yet.
    </div>
  </div>
) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <div className="text-2xl font-semibold text-slate-900">{meet?.name ?? "Meet"}</div>
                  <div className="mt-1 text-sm text-slate-600">
                    Role: <span className="font-semibold">{role}</span>
                    {role === "coach" && coachTeamNorm ? (
  <div className="mt-1 text-xs text-slate-500">
    Team filter: <span className="font-mono">{coachTeamNorm}</span>
  </div>
) : null}

                  </div>
                  {role === "parent" ? (
  <div className="mt-1 text-xs text-slate-500">
    Watching: <span className="font-mono font-semibold text-slate-700">{watchingCount}</span> races
  </div>
) : null}
{role === "parent" ? (
  <div className="mt-3">
    <Link
      href={`/m/${meetId}/watch`}
      className="inline-flex rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
    >
      Manage watch list
    </Link>
  </div>
) : null}

                </div>
              </div>

              <div className="mt-8">
                <div className="text-sm font-semibold text-slate-900">Live DQ Feed</div>
                <div className="mt-3 divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200">
                  {visibleDqs.length === 0 ? (
                    <div className="p-4 text-sm text-slate-600">No DQs yet.</div>
                  ) : (
                    visibleDqs.map(({ id, data }) => {
                      const initials = dqPrivateMap[id]?.officialInitials;
                      const showInitials = role === "official" || role === "coach";

                      const rowHref =
  role === "official"
    ? `/m/${meetId}/dq/${id}/edit`
    : `/m/${meetId}/dq/${id}`;


  return (
  <Link
  key={id}
  href={rowHref}
  className="block p-4 hover:bg-slate-50/60"
>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="font-semibold text-slate-900">
        Event {data.eventNumber} • Heat {data.heatNumber} • Lane {data.laneNumber}
      </div>

      <div className="flex items-center gap-2">
        {data.recorded ? (
          <span className="rounded-lg bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
            Recorded
          </span>
        ) : (
          <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
            Not recorded
          </span>
        )}

        {/* IMPORTANT: prevent link-click when you press the toggle */}
        {role === "official" ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleRecorded(id, !(data.recorded ?? false));
            }}
            className={
              data.recorded
                ? "rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                : "rounded-xl bg-cyan-600 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-700"
            }
          >
            {data.recorded ? "Unrecord" : "Mark recorded"}
          </button>
        ) : null}

        {showInitials && initials ? (
          <div className="text-xs font-semibold text-slate-700">
            Official: <span className="font-mono">{initials}</span>
          </div>
        ) : null}
      </div>
    </div>

    {/* keep the rest of your existing content the same */}
    {Array.isArray(data.infractions) && data.infractions.length > 0 ? (
      <div className="mt-2 space-y-1 text-sm text-slate-800">
        {data.infractions.map((inf: any, idx: number) => {
          const meta = codeLabelMap.get(inf.code);
          const label = meta?.label ?? inf.code;
          const strokeTitle = meta?.strokeTitle ?? inf.stroke ?? "Stroke";
          const phase = inf.phase ? String(inf.phase).toUpperCase() : "";

          return (
            <div key={`${inf.code}-${idx}`} className="flex flex-wrap gap-x-2">
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                {strokeTitle}{phase ? ` • ${phase}` : ""}
              </span>
              <span className="font-mono text-xs text-slate-600">{inf.code}</span>
              <span>{label}</span>
            </div>
          );
        })}
      </div>
    ) : null}

    {Array.isArray(data.slipText) && data.slipText.length > 0 ? (
      <div className="mt-2 text-sm text-slate-700">
        {data.slipText.map((t: any, idx: number) => (
          <div key={`t-${idx}`}>
            <span className="font-semibold">Details:</span> {t.value}
          </div>
        ))}
      </div>
    ) : null}

    {Array.isArray(data.slipExtra) && data.slipExtra.length > 0 ? (
      <div className="mt-2 text-sm text-slate-700">
        {data.slipExtra.map((t: any, idx: number) => (
          <div key={`x-${idx}`}>
            <span className="font-semibold">Relay:</span> {t.value}
          </div>
        ))}
      </div>
    ) : null}

    <div className="mt-2 text-sm text-slate-700">
      {data.swimmerName ? <span className="font-semibold">{data.swimmerName}</span> : "Swimmer"}
      {data.teamNameRaw ? ` • ${data.teamNameRaw}` : ""}
    </div>

    {data.notes ? <div className="mt-2 text-sm text-slate-600">{data.notes}</div> : null}
  </Link>
);
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-slate-900 p-8 text-white shadow-sm ring-1 ring-white/10">
  <div className="text-sm font-semibold">Tips</div>

  {role === "official" ? (
    <div className="mt-3 space-y-3 text-sm text-slate-200">
      <div>Use <span className="font-semibold text-white">New DQ</span> to submit a slip.</div>
      <div>Tap a DQ row to view details.</div>
      <div>Mark slips recorded once they’re entered.</div>
    </div>
  ) : role === "coach" ? (
    <div className="mt-3 space-y-3 text-sm text-slate-200">
      <div>You’ll only see DQs for <span className="font-semibold text-white">your team</span>.</div>
      <div>Tap a DQ row to view details.</div>
      <div>Follow up with the swimmer/parents for next steps.</div>
    </div>
  ) : role === "parent" ? (
    <div className="mt-3 space-y-3 text-sm text-slate-200">
      <div>
        Add your swimmer’s race to your{" "}
        <Link href={`/m/${meetId}/watch`} className="font-semibold text-cyan-300 hover:text-cyan-200">
          watch list
        </Link>
        .
      </div>
      <div>You’ll only see DQs for races you’re watching.</div>
      <div>
        If you see a DQ for your swimmer,{" "}
        <span className="font-semibold text-white">talk to your coach</span> for details and next steps.
      </div>
    </div>
  ) : (
    <div className="mt-3 text-sm text-slate-200">
      Join this meet to see the live feed.
    </div>
  )}
</div>
          </div>
        )}
      </main>
    </div>
  );
}
