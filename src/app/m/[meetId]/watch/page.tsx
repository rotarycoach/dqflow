"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { ensureAnonUser } from "@/lib/ensureAnonUser";
import AppHeader from "@/components/AppHeader";

type Role = "official" | "coach" | "parent";

type WatchItem = {
  raceKey: string; // "event-heat-lane"
  eventNumber?: string | null;
  heatNumber?: string | null;
  laneNumber?: string | null;
  swimmerName?: string | null;
  createdAt?: any;
};

function normalizeNum(s: string) {
  return String(s ?? "").trim();
}

function buildRaceKey(eventNumber: string, heatNumber: string, laneNumber: string) {
  const e = normalizeNum(eventNumber);
  const h = normalizeNum(heatNumber);
  const l = normalizeNum(laneNumber);
  return e && h && l ? `${e}-${h}-${l}` : "";
}

export default function ParentWatchPage() {
  const params = useParams<{ meetId: string }>();
  const meetId = params?.meetId;
  const router = useRouter();

  const [role, setRole] = useState<Role | null>(null);
  const [uid, setUid] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Array<{ id: string; data: WatchItem }>>([]);

  // form
  const [eventNumber, setEventNumber] = useState("");
  const [heatNumber, setHeatNumber] = useState("");
  const [laneNumber, setLaneNumber] = useState("");
  const [swimmerName, setSwimmerName] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const raceKey = useMemo(
    () => buildRaceKey(eventNumber, heatNumber, laneNumber),
    [eventNumber, heatNumber, laneNumber]
  );

  useEffect(() => {
    if (!meetId) return;

    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const user = await ensureAnonUser();
        setUid(user.uid);

        const subSnap = await getDoc(doc(db, `meets/${meetId}/subscriptions/${user.uid}`));
        const r = subSnap.exists() ? ((subSnap.data() as any).role as Role) : null;
        setRole(r);

        if (r !== "parent") {
          // not a parent; send them back to live feed
          router.replace(`/m/${meetId}`);
          return;
        }

        const qy = collection(db, `meets/${meetId}/parentWatchlists/${user.uid}/watchItems`);
        const unsub = onSnapshot(
          qy,
          (snap) => {
            setItems(snap.docs.map((d) => ({ id: d.id, data: d.data() as any })));
            setLoading(false);
          },
          (e: any) => {
            setErr(e?.message ?? "Failed to load watch list.");
            setLoading(false);
          }
        );

        return () => unsub();
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load watch list.");
        setLoading(false);
      }
    })();
  }, [meetId, router]);

  async function addWatchItem() {
    if (!meetId || !uid) return;
    if (!raceKey) return;

    setSaving(true);
    setErr(null);
    try {
      const ref = doc(db, `meets/${meetId}/parentWatchlists/${uid}/watchItems/${raceKey}`);
      await setDoc(
        ref,
        {
          raceKey,
          eventNumber: normalizeNum(eventNumber),
          heatNumber: normalizeNum(heatNumber),
          laneNumber: normalizeNum(laneNumber),
          swimmerName: swimmerName.trim() || null,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );

      setEventNumber("");
      setHeatNumber("");
      setLaneNumber("");
      setSwimmerName("");
    } catch (e: any) {
      setErr(e?.message ?? "Failed to add watch item.");
    } finally {
      setSaving(false);
    }
  }

  async function removeWatchItem(id: string) {
    if (!meetId || !uid) return;
    await deleteDoc(doc(db, `meets/${meetId}/parentWatchlists/${uid}/watchItems/${id}`));
  }

  const inputClass =
    "rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none ring-cyan-400/30 focus:ring-4";

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader meetId={meetId} role={role} backHref={`/m/${meetId}`} backLabel="← Back to feed" />

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="rounded-3xl bg-white p-6 sm:p-8 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Your Watch List</h1>
          <p className="mt-2 text-sm text-slate-600">
            Add your swimmer’s race (Event / Heat / Lane). You’ll see DQs for those races in the live feed.
          </p>

          <div className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold text-slate-700">Add a race</div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input className={inputClass} placeholder="Event #" value={eventNumber} onChange={(e) => setEventNumber(e.target.value)} />
              <input className={inputClass} placeholder="Heat #" value={heatNumber} onChange={(e) => setHeatNumber(e.target.value)} />
              <input className={inputClass} placeholder="Lane #" value={laneNumber} onChange={(e) => setLaneNumber(e.target.value)} />
            </div>

            <div className="mt-3">
              <input
                className={inputClass}
                placeholder="Swimmer name (optional)"
                value={swimmerName}
                onChange={(e) => setSwimmerName(e.target.value)}
              />
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-600">
                Race key:{" "}
                <span className="font-mono font-semibold text-slate-900">{raceKey || "—"}</span>
              </div>

              <button
                type="button"
                onClick={addWatchItem}
                disabled={!raceKey || saving}
                className={
                  raceKey && !saving
                    ? "rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700"
                    : "rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-500"
                }
              >
                {saving ? "Adding…" : "Add"}
              </button>
            </div>
          </div>

          {err ? (
            <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">{err}</div>
          ) : null}

          <div className="mt-6">
            <div className="text-sm font-semibold text-slate-900">Watching</div>

            {loading ? (
              <div className="mt-3 text-sm text-slate-600">Loading…</div>
            ) : items.length === 0 ? (
              <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
                No races yet. Add Event / Heat / Lane above.
              </div>
            ) : (
              <div className="mt-3 divide-y divide-slate-100 rounded-2xl bg-white ring-1 ring-slate-200">
                {items.map(({ id, data }) => (
                  <div key={id} className="flex items-center justify-between gap-3 p-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        Event {data.eventNumber ?? "—"} • Heat {data.heatNumber ?? "—"} • Lane {data.laneNumber ?? "—"}
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        {data.swimmerName ? <span className="font-semibold">{data.swimmerName}</span> : null}
                        <span className="ml-2 font-mono">{id}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeWatchItem(id)}
                      className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
            If you see a DQ for your swimmer, talk to your coach for the full details and next steps.
          </div>

          <div className="mt-6">
            <Link
              href={`/m/${meetId}`}
              className="inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Back to live feed
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}