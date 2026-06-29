"use client";

import { useState } from "react";

import { useAuth } from "@/context/AuthContext";

export function LoginForm() {
  const { signIn } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signIn({ username, password });
    } catch {
      setError("Credenciales inválidas");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Usuario</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand-primary)_20%,transparent)]"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand-primary)_20%,transparent)]"
          required
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="btn-brand w-full rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-60"
      >
        {submitting ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
