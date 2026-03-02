"use client";

export const dynamic = "force-dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { requireAuth } from "@/lib/requireAuth";
function makeJoinToken(): string {
 if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  // fallback
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}


function randomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "DF-";
  for (let i = 0; i < 4; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function NewMeetPage() {
  const [name, setName] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teamsText, setTeamsText] = useState("");


  const canSubmit = useMemo(() => name.trim() && dateStart && !isLoading, [name, dateStart, isLoading]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const user = await requireAuth();
      const meetCode = randomCode();
      const joinUrl = `https://dqflow.com/join/${meetCode}`;
const teams = teamsText
  .split("\n")
  .map((t) => t.trim())
  .filter(Boolean)
  .map((nameRaw) => ({
    nameRaw,
    nameNorm: nameRaw.toUpperCase(),
  }));

      const docRef = await addDoc(collection(db, "meets"), {
        ownerUid: user.uid,
        name: name.trim(),
        dateStart,
        dateEnd: dateEnd || null,
        teams,
        timezone,
        meetCode,
        joinUrl,
        isActive: true,
        createdAt: serverTimestamp(),
        joinTokens: {
  official: makeJoinToken(),
  coach: makeJoinToken(),
  parent: makeJoinToken(),
},

      });

      window.location.href = `/meets/${docRef.id}`;
    } catch (err: any) {
      setError(err?.message ?? "Failed to create meet.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="text-xl font-semibold tracking-tight text-white">
            DQ<span className="text-cyan-300">flow</span>
          </div>
          <Link href="/meets" className="text-sm font-semibold text-white/90 hover:text-white">
            ← Back to Meets
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10">
        <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Create meet</h1>
          <p className="mt-2 text-sm text-slate-600">
            We’ll generate a join link + QR code after you create it.
          </p>

          <form className="mt-8 space-y-4" onSubmit={onCreate}>
            <div>
              <label className="text-sm font-medium text-slate-700">Meet name</label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none ring-cyan-400/40 focus:ring-4"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="2026 Winter Invitational"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">Start date</label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none ring-cyan-400/40 focus:ring-4"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">End date (optional)</label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none ring-cyan-400/40 focus:ring-4"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Time zone</label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none ring-cyan-400/40 focus:ring-4"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="America/New_York"
              />
            </div>
<div>
  <label className="text-sm font-medium text-slate-700">
    Teams (one per line)
  </label>
  <textarea
    className="mt-1 w-full rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 px-4 py-3 outline-none ring-cyan-400/40 focus:ring-4"
    value={teamsText}
    onChange={(e) => setTeamsText(e.target.value)}
    placeholder={"GOLD\nDOLPHINS\nATLANTA SWIM CLUB"}
    rows={5}
  />
  <div className="mt-2 text-xs text-slate-500">
    Optional now; you can add/edit later.
  </div>
</div>



            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className={
                canSubmit
                  ? "w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-700"
                  : "w-full rounded-xl bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-500"
              }
            >
              {isLoading ? "Creating…" : "Create meet"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
