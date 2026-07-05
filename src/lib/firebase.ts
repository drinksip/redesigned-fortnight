import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
} from "firebase/firestore";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import type { UserData } from "./types";
import { defaultData } from "./utils";

/* ──────────────────────────────────────────────────────────────
   Firebase configuration.

   SECURITY NOTES (important!):
   • Passwords are NEVER stored here. Firebase Authentication (Google)
     handles password hashing/storage — the client never sees them and they
     are never written to Firestore.
   • The `apiKey` below is a PUBLIC project identifier, NOT a secret. It is
     safe to ship in client code. Real protection comes from Firestore
     Security Rules (see FIREBASE_SETUP.md) + Authentication.
   • All user data lives in the `nova/{uid}` collection. Each document is
     locked to its owner by the security rules, so no user can read or write
     anyone else's data.
   ────────────────────────────────────────────────────────────── */
const firebaseConfig = {
  apiKey: "AIzaSyC5X53jkzV7DKX2jYnNwDWjIIUeMaHxOVI",
  authDomain: "nova-799d5.firebaseapp.com",
  projectId: "nova-799d5",
  storageBucket: "nova-799d5.firebasestorage.app",
  messagingSenderId: "288377332072",
  appId: "1:288377332072:web:16a3dbba08cbeee885f6dd",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Initialize Analytics only in supported environments (avoids errors in
// restricted contexts such as ad-blockers, file://, or iframes).
isSupported().then((ok) => {
  if (ok) getAnalytics(app);
});

/**
 * Fresh collection. The old app used `users/{uid}` (which carried ghost subjects
 * from a different timetable format). We now write to `nova/{uid}` so every
 * account starts clean — no migration of stale data.
 */
const COLLECTION = "nova";

/** Build the synthetic email used by the username auth model. */
const toEmail = (username: string) =>
  `${username.trim().toLowerCase()}@gcsetracker.app`;

/** Basic server-side-style validation of a username (client-enforced too). */
function sanitizeUsername(username: string): string {
  return username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, "")
    .slice(0, 24);
}

export const firebase = {
  async register(rawUsername: string, password: string, yearGroup: "10" | "11") {
    const username = sanitizeUsername(rawUsername);
    if (username.length < 3)
      throw Object.assign(new Error("Username too short"), {
        code: "auth/invalid-username",
      });
    const email = toEmail(username);
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const data = { ...defaultData(username), yearGroup };
    await setDoc(doc(db, COLLECTION, cred.user.uid), data);
    return { uid: cred.user.uid, username, data };
  },

  async login(rawUsername: string, password: string) {
    const username = sanitizeUsername(rawUsername);
    const email = toEmail(username);
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const snap = await getDoc(doc(db, COLLECTION, cred.user.uid));
    const data: UserData = snap.exists()
      ? { ...defaultData(username), ...(snap.data() as Partial<UserData>) }
      : defaultData(username);
    return { uid: cred.user.uid, username, data };
  },

  async logout() {
    await signOut(auth);
  },

  /** Merge-save the whole document (debounced by the caller). */
  async saveData(uid: string, data: Partial<UserData>) {
    await setDoc(doc(db, COLLECTION, uid), data, { merge: true });
  },

  async loadDoc(uid: string): Promise<UserData | null> {
    const snap = await getDoc(doc(db, COLLECTION, uid));
    if (!snap.exists()) return null;
    return snap.data() as UserData;
  },

  async sendSpecRequest(
    username: string,
    subjectId: string,
    subjectName: string,
    examBoard: string
  ) {
    await addDoc(collection(db, "spec_requests"), {
      username: sanitizeUsername(username),
      subjectId,
      subjectName,
      examBoard,
      timestamp: new Date().toISOString(),
    });
  },

  async sendFeatureRequest(
    username: string,
    yearGroup: string,
    type: string,
    message: string
  ) {
    await addDoc(collection(db, "feature_requests"), {
      username: sanitizeUsername(username),
      yearGroup,
      type,
      message: message.trim().slice(0, 2000),
      timestamp: new Date().toISOString(),
    });
  },

  onAuthChange(cb: (uid: string | null) => void) {
    return onAuthStateChanged(auth, (u) => cb(u?.uid ?? null));
  },
};
