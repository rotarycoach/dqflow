"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useAuthUser } from "@/lib/useAuthUser";
import AppHeader from "@/components/AppHeader";


type Meet = {
  id: string;
  name: string;
  dateStart: string;
  dateEnd?: string | null;
  meetCode: string;
  joinUrl: string;
  createdAt?: any;
};

export default function MeetsPage() {
  const [meets, setMeets] = useState<Meet[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, ready } = useAuthUser();
    async function onSignOut() {
    await signOut(auth);
    window.location.href = "/";
  }


  useEffect(() => {
  if (!ready) return;

  if (!user) {
    window.location.href = "/";
    return;
  }

  (async () => {
    setLoading(true);
    const q = query(
      collection(db, "meets"),
      where("ownerUid", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    setMeets(
      snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
    );
    setLoading(false);
  })();
}, [ready, user]);


  return (
    <div className="min-h-screen bg-slate-50">
      
      <AppHeader
  meetId={null}
  role={null}
  rightSlot={
    <div className="flex items-center gap-3">
      <Link
        href="/meets/new"
        className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700"
      >
        + Create meet
      </Link>

      <button
        type="button"
        onClick={onSignOut}
        className="text-sm font-semibold text-white/90 hover:text-white"
      >
        Sign out
      </button>
    </div>
  }
/>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Meets</h1>
            <p className="mt-2 text-sm text-slate-600">
              Create a meet to generate a join link + QR code for officials, coaches, and parents.
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          {!ready || loading ? (
            <div className="text-sm text-slate-600">Loading…</div>
          ) : meets.length === 0 ? (
            <div className="text-sm text-slate-600">
              No meets yet. Click <span className="font-semibold">Create Meet</span>.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {meets.map((m) => (
                <Link
                  key={m.id}
                  href={`/meets/${m.id}`}
                  className="flex items-center justify-between py-4 hover:bg-slate-50/60 rounded-xl px-3"
                >
                  <div>
                    <div className="font-semibold text-slate-900">{m.name}</div>
                    <div className="mt-1 text-xs text-slate-600">
                      {m.dateStart}
                      {m.dateEnd ? ` → ${m.dateEnd}` : ""} • Code:{" "}
                      <span className="font-mono">{m.meetCode}</span>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-cyan-700">Open →</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
