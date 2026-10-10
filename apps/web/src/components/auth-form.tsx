"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { loginRequestSchema, registerRequestSchema } from "@txnguard/shared";
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

type Values = { name?: string; email: string; password: string };

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [error, setError] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const isRegister = mode === "register";
  const form = useForm<Values>({
    resolver: zodResolver(isRegister ? registerRequestSchema : loginRequestSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function submit(values: Values) {
    setError("");
    try {
      if (isRegister) {
        const session = await api.register({ name: values.name!, email: values.email, password: values.password });
        setSession(session);
        setApiKey(session.apiKey);
        return;
      }

      const session = await api.login({ email: values.email, password: values.password });
      setSession(session);
      router.replace("/dashboard");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to continue");
    }
  }

  if (apiKey) {
    return <div className="auth-shell"><div className="auth-panel">
      <div className="brand"><ShieldCheck size={24} /> TxnGuard</div>
      <h1>Store your API key</h1>
      <p className="muted">This key is shown once. Use it to authenticate transaction ingestion.</p>
      <code className="secret">{apiKey}</code>
      <button className="button primary" onClick={() => router.replace("/dashboard")}>Open dashboard</button>
    </div></div>;
  }

  const fieldError = (name: keyof Values) => form.formState.errors[name]?.message;
  return <main className="auth-shell"><section className="auth-context" aria-hidden="true">
    <div className="auth-context-mark"><ShieldCheck size={28} /></div>
    <p className="eyebrow">Merchant risk operations</p>
    <h1>Know what each payment means before it becomes a loss.</h1>
    <p>TxnGuard brings payment decisions, fraud signals, and investigation context into one calm operational workspace.</p>
    <div className="auth-context-points"><span><LockKeyhole size={16}/> Protected merchant workspace</span><span><Sparkles size={16}/> Real-time decision visibility</span></div>
  </section><section className="auth-panel">
    <Link href="/login" className="brand"><ShieldCheck size={24} /> TxnGuard</Link>
    <div className="auth-heading"><p className="eyebrow">{isRegister ? "Create workspace" : "Welcome back"}</p><h1>{isRegister ? "Start monitoring your payments" : "Sign in to your workspace"}</h1><p className="muted">{isRegister ? "Create a merchant account to receive your secure integration key." : "Use your merchant credentials to continue."}</p></div>
    <form onSubmit={form.handleSubmit(submit)} className="form-stack" noValidate>
      {isRegister && <label className="form-field">Merchant name<input aria-invalid={Boolean(fieldError("name"))} aria-describedby="name-error" autoComplete="organization" placeholder="The Wise Company" {...form.register("name")} /><span id="name-error" className="field-feedback" role="alert">{fieldError("name")}</span></label>}
      <label className="form-field">Work email<input type="email" aria-invalid={Boolean(fieldError("email"))} aria-describedby="email-error" autoComplete="email" placeholder="you@company.com" {...form.register("email")} /><span id="email-error" className="field-feedback" role="alert">{fieldError("email")}</span></label>
      <label className="form-field">Password<div className="password-control"><input type={showPassword ? "text" : "password"} aria-invalid={Boolean(fieldError("password"))} aria-describedby="password-error" autoComplete={isRegister ? "new-password" : "current-password"} placeholder={isRegister ? "At least 8 characters" : "Enter your password"} {...form.register("password")} /><button type="button" className="password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div><span id="password-error" className="field-feedback" role="alert">{fieldError("password")}</span></label>
      <div className="form-alert-slot">{error && <div className="alert error" role="alert"><span>{error}</span></div>}</div>
      <button className="button primary auth-submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Signing you in…" : <>{isRegister ? "Create merchant account" : "Continue to dashboard"}<ArrowRight size={17}/></>}</button>
    </form>
    <p className="muted center auth-switch">{isRegister ? "Already have an account?" : "New to TxnGuard?"} <Link href={isRegister ? "/login" : "/register"}>{isRegister ? "Sign in" : "Create an account"}</Link></p>
  </section></main>;
}
