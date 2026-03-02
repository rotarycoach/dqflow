"use client";

import { auth } from "@/lib/firebase";
import { browserLocalPersistence, setPersistence } from "firebase/auth";

let done = false;

export async function initAuthPersistence() {
  if (done) return;
  done = true;
  await setPersistence(auth, browserLocalPersistence);
}
