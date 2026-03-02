"use client";

import type React from "react";
import Link from "next/link";

type Role = "official" | "coach" | "parent" | null;

export default function AppHeader({
  meetId,
  role,
  backHref,
  backLabel = "← Back",
  rightSlot,
  showNewDq = false,
}: {
  meetId?: string | null;
  role: Role;
  backHref?: string;              // optional: show a back link instead of logo link
  backLabel?: string;
  rightSlot?: React.ReactNode;    // optional: override the right side
  showNewDq?: boolean;            // show "+ New DQ" for officials
}) {
  const logoHref = meetId ? `/m/${meetId}` : "/";

  return (
    <header className="bg-slate-900">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {backHref ? (
          <Link href={backHref} className="text-sm font-semibold text-white/90 hover:text-white">
            {backLabel}
          </Link>
        ) : (
          <Link href={logoHref} className="flex items-center gap-3">
            <img src="/dqflow-mark.svg" alt="DQflow" className="h-10 w-10" />
            <span className="text-xl font-semibold tracking-tight text-white">
              DQ<span className="text-cyan-300">flow</span>
            </span>
          </Link>
        )}

        <div className="flex items-center gap-3">
          {rightSlot ? (
            rightSlot
          ) : (
            <>
              {showNewDq && role === "official" && meetId ? (
                <Link
                  href={`/m/${meetId}/dq/new`}
                  className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700"
                >
                  + New DQ
                </Link>
              ) : null}

              {meetId ? (
  <Link href="/" className="text-sm font-semibold text-white/90 hover:text-white">
    Admin login
  </Link>
) : null}
            </>
          )}
        </div>
      </div>
    </header>
  );
}