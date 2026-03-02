"use client";

import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { initAuthPersistence } from "@/lib/authInit";


export async function ensureAnonUser() {
    await initAuthPersistence();

  // If already signed in (admin or anon), keep it.
  if (auth.currentUser) return auth.currentUser;

  // Wait a tick for hydration auth restoration
  await new Promise<void>((resolve) => {
    const unsub = onAuthStateChanged(auth, () => {
      unsub();
      resolve();
    });
  });

  if (auth.currentUser) return auth.currentUser;

  const cred = await signInAnonymously(auth);
  return cred.user;
}
