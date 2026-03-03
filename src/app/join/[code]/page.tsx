"use client";

import AppHeader from "@/components/AppHeader";
import { ensureAnonUser } from "@/lib/ensureAnonUser";
import { db } from "@/lib/firebase";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  serverTimestamp,
  where,
} from "firebase/firestore";

type Meet = {
  name: string;
  dateStart: string;
  dateEnd?: string | null;
  timezone?: string;
  meetCode: string;
  joinUrl?: string;
};

type Role = "official" | "coach" | "parent";

function normalizeTeamName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toUpperCase();
}

function makeRaceKey(eventNumber: string, heatNumber: string, laneNumber: string) {
  return `${eventNumber.trim()}-${heatNumber.trim()}-${laneNumber.trim()}`;
}

export default function JoinMeetPage() {
  const router = useRouter();

  const params = useParams<{ code: string }>();
  const meetCodeRaw = params?.code ?? "";
  const meetCode = useMemo(() => decodeURIComponent(meetCodeRaw).trim(), [meetCodeRaw]);

  const sp = useSearchParams();
  const urlRoleRaw = (sp.get("role") || "").toLowerCase();
  const urlToken = sp.get("token") || "";

  const urlRole: Role | null =
    urlRoleRaw === "official" || urlRoleRaw === "coach" || urlRoleRaw === "parent"
      ? (urlRoleRaw as Role)
      : null;

  const [meetId, setMeetId] = useState<string | null>(null);
  const [meet, setMeet] = useState<Meet | null>(null);

  const [role, setRole] = useState<Role>(urlRole ?? "official");
  const [roleLocked, setRoleLocked] = useState<boolean>(!!urlRole);
  const [joinToken, setJoinToken] = useState<string>(urlToken);

  const [teamName, setTeamName] = useState("");
  const [watchItems, setWatchItems] = useState<Array<{ event: string; heat: string; lane: string }>>([
    { event: "", heat: "", lane: "" },
  ]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Keep state synced if URL changes
  useEffect(() => {
    setRole(urlRole ?? "official");
    setRoleLocked(!!urlRole);
    setJoinToken(urlToken);
  }, [urlRole, urlToken]);

  // Ensure anon auth + load meet by meetCode
  useEffect(() => {
    if (!meetCode) return;

    (async () => {
      setLoading(true);
      setError(null);
      setSuccess(null);

      try {
        await ensureAnonUser();

        const qy = query(collection(db, "meets"), where("meetCode", "==", meetCode));
        const snap = await getDocs(qy);

        if (snap.empty) throw new Error("Meet not found. Check the code and try again.");
        if (snap.docs.length > 1) {
          throw new Error(`Multiple meets found for code ${meetCode}. Delete duplicates in Firestore.`);
        }

        const d = snap.docs[0];
        setMeetId(d.id);
        setMeet(d.data() as Meet);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load meet.");
      } finally {
        setLoading(false);
      }
    })();
  }, [meetCode]);

  const readyFromLink = !urlRole || (role === urlRole && joinToken === urlToken);

  function canSave() {
    if (!readyFromLink) return false;
    if (!meetId) return false;
    if (saving) return false;
    if (!joinToken?.trim()) return false;

    if (role === "coach") return teamName.trim().length > 0;
    if (role === "parent") {
      return watchItems.some((w) => w.event.trim() && w.heat.trim() && w.lane.trim());
    }
    return true;
  }

  async function onJoin() {
    if (!meetId) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const user = await ensureAnonUser();
      const uid = user.uid;

      const roleToWrite: Role = urlRole ?? role;
      const tokenToWrite: string = urlToken || joinToken;

      if (urlRole && roleToWrite !== urlRole) {
        throw new Error("Role mismatch. Refresh and try again.");
      }
      if (!tokenToWrite?.trim()) {
        throw new Error("Missing token in join link.");
      }

      const subRef = doc(db, `meets/${meetId}/subscriptions/${uid}`);

      // If already joined, skip write and redirect
      const existing = await getDoc(subRef);
      if (existing.exists()) {
        setSuccess("Already joined. Redirecting…");
        router.replace(`/m/${meetId}`);
        return;
      }

      const payload = {
        role: roleToWrite,
        joinToken: tokenToWrite,
        createdAt: serverTimestamp(),
        coachTeamRaw: roleToWrite === "coach" ? teamName.trim() : null,
        coachTeamNorm: roleToWrite === "coach" ? normalizeTeamName(teamName.trim()) : null,
      };

      await setDoc(subRef, payload, { merge: true });

      // Parent watch items
      if (roleToWrite === "parent") {
        const valid = watchItems
          .filter((w) => w.event.trim() && w.heat.trim() && w.lane.trim())
          .map((w) => ({
            eventNumber: w.event.trim(),
            heatNumber: w.heat.trim(),
            laneNumber: w.lane.trim(),
            raceKey: makeRaceKey(w.event, w.heat, w.lane),
            meetId,
            createdAt: serverTimestamp(),
          }));

        for (const item of valid) {
          await setDoc(
            doc(db, `meets/${meetId}/parentWatchlists/${uid}/watchItems/${item.raceKey}`),
            item,
            { merge: true }
          );
        }
      }

      setSuccess("Joined! Redirecting…");
      router.replace(`/m/${meetId}`);
    } catch (e: any) {
      setError(e?.message ?? "Failed to join.");
    } finally {
      setSaving(false);
    }
  }

  function updateWatchItem(idx: number, patch: Partial<(typeof watchItems)[number]>) {
    setWatchItems((prev) => prev.map((w, i) => (i === idx ? { ...w, ...patch } : w)));
  }

  function addWatchRow() {
    setWatchItems((prev) => [...prev, { event: "", heat: "", lane: "" }]);
  }

  function removeWatchRow(idx: number) {
    setWatchItems((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader meetId={null} role={null} />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Join meet</h1>
          <p className="mt-2 text-sm text-slate-600">
            Entered code: <span className="font-mono">{meetCode || "—"}</span>
          </p>

          {loading ? (
            <div className="mt-6 text-sm text-slate-600">Loading meet…</div>
          ) : error ? (
            <div className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
              {error}
            </div>
          ) : !meet ? (
            <div className="mt-6 text-sm text-slate-600">Meet not found.</div>
          ) : (
            <>
              <div className="mt-6 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-sm font-semibold text-slate-900">{meet.name}</div>
                <div className="mt-1 text-xs text-slate-600">
                  {meet.dateStart}
                  {meet.dateEnd ? ` → ${meet.dateEnd}` : ""} •{" "}
                  <span className="font-mono">{meet.meetCode}</span>
                </div>
              </div>

              <div className="mt-8">
                <div className="text-sm font-semibold text-slate-900">Choose your role</div>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    { key: "official", label: "Official", desc: "See all DQs + live feed" },
                    { key: "coach", label: "Coach", desc: "Team-based notifications" },
                    { key: "parent", label: "Parent", desc: "Race-based notifications" },
                  ].map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      disabled={roleLocked}
                      onClick={() => {
                        if (roleLocked) return;
                        setRole(r.key as Role);
                      }}
                      className={
                        role === r.key
                          ? "rounded-2xl border border-cyan-300 bg-cyan-50 p-4 text-left ring-2 ring-cyan-200"
                          : roleLocked
                          ? "cursor-not-allowed rounded-2xl border border-slate-200 bg-white p-4 text-left opacity-50"
                          : "rounded-2xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50"
                      }
                    >
                      <div className="font-semibold text-slate-900">{r.label}</div>
                      <div className="mt-1 text-xs text-slate-600">{r.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {role === "coach" && (
                <div className="mt-6 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                  <div className="text-sm font-semibold text-slate-900">Coach setup</div>
                  <div className="mt-2 text-sm text-slate-600">Select or type your team name.</div>
                  <input
                    className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none ring-cyan-400/40 focus:ring-4"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g., GOLD"
                  />
                  <div className="mt-2 text-xs text-slate-500">Matching is case-insensitive.</div>
                </div>
              )}

              {role === "parent" && (
                <div className="mt-6 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                  <div className="text-sm font-semibold text-slate-900">Parent setup</div>
                  <div className="mt-2 text-sm text-slate-600">
                    Add races (Event / Heat / Lane). You can add as many as you want.
                  </div>

                  <div className="mt-4 space-y-3">
                    {watchItems.map((w, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2">
                        <input
                          className="col-span-4 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-cyan-400/30 focus:ring-4"
                          value={w.event}
                          onChange={(e) => updateWatchItem(idx, { event: e.target.value })}
                          placeholder="Event"
                        />
                        <input
                          className="col-span-4 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-cyan-400/30 focus:ring-4"
                          value={w.heat}
                          onChange={(e) => updateWatchItem(idx, { heat: e.target.value })}
                          placeholder="Heat"
                        />
                        <input
                          className="col-span-4 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-cyan-400/30 focus:ring-4"
                          value={w.lane}
                          onChange={(e) => updateWatchItem(idx, { lane: e.target.value })}
                          placeholder="Lane"
                        />

                        <div className="col-span-12 flex justify-end">
                          {watchItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeWatchRow(idx)}
                              className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                            >
                              Remove row
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={addWatchRow}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      + Add another race
                    </button>
                  </div>
                </div>
              )}

              {success && (
                <div className="mt-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
                  {success}
                </div>
              )}

              {error && (
                <div className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
                  {error}
                </div>
              )}

              <div className="mt-8">
                <button
                  type="button"
                  disabled={!canSave()}
                  onClick={onJoin}
                  className={
                    canSave()
                      ? "w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-700"
                      : "w-full rounded-xl bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-500"
                  }
                >
                  {saving ? "Joining…" : "Join meet"}
                </button>
                <div className="mt-2 text-center text-xs text-slate-500">
                  DQflow will use this role to send the right notifications.
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}