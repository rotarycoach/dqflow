


"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { requireAuth } from "@/lib/requireAuth";
import { QRCodeCanvas } from "qrcode.react";
import { useParams } from "next/navigation";
import AppHeader from "@/components/AppHeader";





type Meet = {
  ownerUid: string;
  name: string;
  dateStart: string;
  dateEnd?: string | null;
  timezone?: string;
  meetCode: string;
  joinUrl: string;
  joinTokens?: {
    official?: string;
    coach?: string;
    parent?: string;
  };
};

export default function MeetDetailPage() {

  const [meet, setMeet] = useState<Meet | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const params = useParams<{ id: string }>();
const meetId = params?.id;
const [toast, setToast] = useState<string | null>(null);



  const joinUrl =
  meet?.joinUrl?.trim() ||
  (meet?.meetCode ? `https://dqflow.com/join/${meet.meetCode}` : "");

  const officialJoinUrl =
  meet?.meetCode && meet?.joinTokens?.official
    ? `https://dqflow.com/join/${encodeURIComponent(meet.meetCode)}?role=official&token=${encodeURIComponent(
        meet.joinTokens.official
      )}`
    : "";

const coachJoinUrl =
  meet?.meetCode && meet?.joinTokens?.coach
    ? `https://dqflow.com/join/${encodeURIComponent(meet.meetCode)}?role=coach&token=${encodeURIComponent(
        meet.joinTokens.coach
      )}`
    : "";

const parentJoinUrl =
  meet?.meetCode && meet?.joinTokens?.parent
    ? `https://dqflow.com/join/${encodeURIComponent(meet.meetCode)}?role=parent&token=${encodeURIComponent(
        meet.joinTokens.parent
      )}`
    : "";



  useEffect(() => {
    (async () => {
      try {
        const user = await requireAuth();
        if (!meetId) return; // wait until router params are ready
        const ref = doc(db, "meets", meetId);
        const snap = await getDoc(ref);
        if (!snap.exists()) throw new Error("Meet not found.");

        const data = snap.data() as Meet;
        console.log("MEET RAW DATA:", data);
console.log("JOIN URL VALUE:", data?.joinUrl, "TYPE:", typeof data?.joinUrl);

        if (data.ownerUid !== user.uid) throw new Error("Not authorized.");

        setMeet(data);

        


      } catch (e: any) {
        setError(e?.message ?? "Failed to load meet.");
      }
    })();
}, [meetId]);  

  const title = meet ? meet.name : "Meet";

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    alert("Copied!");
  }

  function downloadQr(canvasId: string, filename: string) {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
  if (!canvas) return;

  const pngUrl = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = pngUrl;
  link.download = filename;
  link.click();

  setToast("Downloaded!");

  setTimeout(() => {
    setToast(null);
  }, 2000);
}




  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader
  meetId={null}
  role={null}
  rightSlot={
    <Link href="/meets" className="text-sm font-semibold text-white/90 hover:text-white">
      ← Back to Meets
    </Link>
  }
/>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex-1 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
            {error ? (
              <div className="text-sm text-red-700">{error}</div>
            ) : !meet ? (
              <div className="text-sm text-slate-600">Loading…</div>
            ) : (
              <>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
                <div className="mt-2 text-sm text-slate-600">
                  {meet.dateStart}
                  {meet.dateEnd ? ` → ${meet.dateEnd}` : ""} •{" "}
                  <span className="font-mono">{meet.meetCode}</span>
                </div>

                <div className="mt-8 space-y-4">
                  

                 <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
  <div className="text-sm font-semibold text-slate-900">Role join links + QR codes</div>
  <div className="mt-1 text-xs text-slate-600">
    Share the correct link/QR for each group. Tokens prevent role switching.
  </div>

  <div className="mt-5 grid gap-4 lg:grid-cols-3">
    {[
      { label: "Officials", url: officialJoinUrl, hint: "Full Access" },
      { label: "Coaches", url: coachJoinUrl, hint: "Team-filtered DQs" },
      { label: "Parents / Spectators", url: parentJoinUrl, hint: "Alerts for your particular swimmer" },
    ].map((item) => (
      <div key={item.label} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
        <div className="text-sm font-semibold text-slate-900">{item.label}</div>
        <div className="mt-1 text-xs text-slate-600">{item.hint}</div>

        <div className="mt-3 flex items-center justify-center rounded-2xl bg-white p-3 ring-1 ring-slate-200">
          {item.url ? (
            <QRCodeCanvas
  value={item.url}
  size={160}
  id={`qr-${item.label.replace(/\s+/g, "-").toLowerCase()}`}
/>

          ) : (
            <div className="h-[160px] w-[160px] rounded-2xl bg-slate-50 ring-1 ring-slate-200 flex items-center justify-center text-xs text-slate-500">
              Generating…
            </div>
          )}
        </div>

        <div className="mt-3 break-all rounded-xl bg-white px-3 py-2 font-mono text-xs text-slate-900 ring-1 ring-slate-200">
          {item.url || "—"}
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => copy(item.url)}
            disabled={!item.url}
            className={
              item.url
                ? "flex-1 rounded-xl bg-cyan-600 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-700"
                : "flex-1 rounded-xl bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-500"
            }
          >
            Copy link
          </button>

          <button
  type="button"
  disabled={!item.url}
  onClick={() =>
    downloadQr(
      `qr-${item.label.replace(/\s+/g, "-").toLowerCase()}`,
      `${meet.meetCode}-${item.label.replace(/\s+/g, "-").toLowerCase()}.png`
    )
  }
  className={
    item.url
      ? "rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
      : "rounded-xl bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-500"
  }
>
  Download QR
</button>

        </div>
      </div>
    ))}
  </div>
</div>



                  
                </div>
              </>
            )}
          </div>

          <div className="w-full rounded-3xl bg-slate-900 p-8 text-white shadow-sm ring-1 ring-white/10 lg:w-[360px]">
            <div className="text-sm font-semibold text-white">Next steps</div>
            <div className="mt-3 space-y-3 text-sm text-slate-200">
              <div>1) Share the correct role QR/link</div>
<div>2) Officials use the Officials QR</div>
<div>3) Coaches use the Coaches QR</div>
<div>4) Parents use the Parents QR</div>
            </div>
          </div>
        </div>
      </main>

          {toast && (
  <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg animate-fade-in">
    {toast}
  </div>
)}



    </div>
  );
}
