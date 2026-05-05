"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await login(username, password);
    } catch (e: any) {
      setErr("Invalid username or password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-lightgray dark:bg-dark px-4">
      <div className="w-full max-w-md bg-background rounded-2xl shadow-lg p-8">
        <div className="mb-6 text-center flex flex-col items-center">
          <Image
            src="/images/lockup-stacked/invoxa-stacked-light.svg"
            alt="Invoxa"
            width={160}
            height={120}
            priority
          />
          <h1 className="mt-4 text-xl font-semibold">Sign in</h1>
          <p className="text-sm text-link mt-1">AI invoice extraction</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Username</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
