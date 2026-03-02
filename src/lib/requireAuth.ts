import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

export function requireAuth(): Promise<User> {
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      if (user) resolve(user);
      else reject(new Error("Not authenticated"));
    });
  });
}
