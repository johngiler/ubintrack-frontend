"use client";

import { useState } from "react";

import { useAuth } from "@/context/AuthContext";

export function LoginForm() {
  const { signIn } = useAuth();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const username = form.username.value.trim();
    const password = form.password.value;
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
    <form method="post" action="/login" onSubmit={handleSubmit} className="space-y-4">
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="login-username">
          Usuario
        </label>
        <input
          id="login-username"
          name="username"
          type="text"
          autoComplete="username"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand-primary)_20%,transparent)]"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="login-password">
          Contraseña
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand-primary)_20%,transparent)]"
          required
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="btn-brand w-full cursor-pointer rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-60"
      >
        {submitting ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
