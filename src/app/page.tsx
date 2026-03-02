"use client";

import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";

import { useMemo, useState } from "react";
const apiKeyTail =
  (process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "").slice(-6) || "MISSING";

import Image from "next/image";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

export default function HomePage() {
  const [email, setEmail] = useState("");
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && password.length >= 6 && !isLoading;
  }, [email, password, isLoading]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // Next step: route to /meets dashboard (we’ll add this next)
      router.push("/meets");

    } catch (err: any) {
      setError(err?.message ?? "Login failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navy header */}
     
     <AppHeader meetId={null} role={null} />

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-10 lg:grid-cols-2 lg:py-16">
        {/* Left marketing panel */}
        <section className="rounded-3xl bg-slate-900 p-8 text-white shadow-sm ring-1 ring-white/10">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-yellow-400/20 ring-1 ring-yellow-300/30" />
            <div className="text-2xl font-semibold tracking-tight">
              DQ<span className="text-cyan-300">flow</span>
            </div>
          </div>

          <p className="mt-5 text-base leading-relaxed text-slate-200">
            Real-time disqualification reporting for swim meets—built for officials on deck,
            with instant visibility for timing, coaches, and parents.
          </p>

          <div className="mt-8 grid gap-3">
            {[
              "Officials enter DQs on a slip-style form",
              "Live DQ feed for meet operations",
              "Team + race-based push notifications",
              "Join links + QR codes for every meet",
            ].map((t) => (
              <div key={t} className="flex items-start gap-3">
                <div className="mt-1 h-5 w-5 rounded-md bg-yellow-400/20 ring-1 ring-yellow-300/30" />
                <div className="text-sm text-slate-200">{t}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Login card */}
        <section className="flex items-center">
          <div className="w-full rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Admin login
            </h1>
            <div className="mt-2 text-xs text-slate-400">
  
            </div>

            <p className="mt-2 text-sm text-slate-600">
              Sign in to create meets, generate QR codes, and manage your subscription.
            </p>

            <form className="mt-8 space-y-4" onSubmit={onSubmit}>
              <div>
                <label className="text-sm font-medium text-slate-700">Email</label>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none ring-cyan-400/40 focus:ring-4"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@dqflow.com"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Password</label>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none ring-cyan-400/40 focus:ring-4"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
                <div className="mt-2 text-xs text-slate-500">
                  Minimum 6 characters (Firebase default).
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
                className={cx(
                  "mt-2 w-full rounded-xl px-4 py-3 text-sm font-semibold shadow-sm",
                  canSubmit
                    ? "bg-cyan-600 text-white hover:bg-cyan-700"
                    : "bg-slate-200 text-slate-500"
                )}
              >
                {isLoading ? "Signing in…" : "Sign in"}
              </button>

              <div className="pt-3 text-center text-xs text-slate-500">
                We’ll add “Forgot password” and sign-up in the next step.
              </div>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}

