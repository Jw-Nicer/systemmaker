"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const readyRef = useRef(false);

  // Clear any stale client-side auth state so it doesn't cause redirect loops.
  // We await signOut and gate form submission until it completes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (auth.currentUser) {
        await signOut(auth);
      }
      if (!cancelled) readyRef.current = true;
    })();
    return () => { cancelled = true; };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Wait for stale auth cleanup if still in progress
      if (!readyRef.current && auth.currentUser) {
        await signOut(auth);
        readyRef.current = true;
      }

      const credential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await credential.user.getIdToken();

      // Create server-side session cookie
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        // Retry once with a force-refreshed token (handles token timing issues)
        const freshToken = await credential.user.getIdToken(true);
        const retryRes = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: freshToken }),
        });

        if (!retryRes.ok) {
          const body = await retryRes.json().catch(() => null);
          throw new Error(body?.error || "Failed to create session");
        }
      }

      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Invalid email or password"
      );
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm p-8 rounded-2xl border border-border bg-surface">
        <h1 className="text-2xl font-bold mb-1 text-center">Nicer Admin</h1>
        <p className="text-sm text-muted text-center mb-8">
          Sign in to manage your site
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg bg-background border border-border focus:border-primary focus:outline-none"
              placeholder="admin@nicersystems.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg bg-background border border-border focus:border-primary focus:outline-none"
              placeholder="********"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 rounded-lg bg-primary text-background font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
