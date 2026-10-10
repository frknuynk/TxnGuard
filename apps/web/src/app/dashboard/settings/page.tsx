"use client";

import { useState } from "react";
import { Copy, KeyRound, LoaderCircle, TriangleAlert } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

export default function SettingsPage() {
  const { merchant, setSession, accessToken, refreshToken } = useAuthStore();
  const [name, setName] = useState(merchant?.name ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [copied, setCopied] = useState(false);
  async function save() { setError(""); setMessage(""); setSaving(true); try { const result = await api.updateMerchant(name); setSession({ merchant: result.merchant, accessToken: accessToken!, refreshToken: refreshToken! }); setMessage("Profile updated."); } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to update profile."); } finally { setSaving(false); } }
  async function rotate() { if (!confirm("Rotate the API key? Existing integrations will stop working immediately.")) return; setError(""); setApiKey(""); setRotating(true); try { const result = await api.rotateApiKey(); setApiKey(result.apiKey); } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to rotate API key."); } finally { setRotating(false); } }
  async function copyKey() { if (!apiKey) return; await navigator.clipboard.writeText(apiKey); setCopied(true); window.setTimeout(() => setCopied(false), 1500); }
  return <div className="page"><div className="page-heading"><div><p className="eyebrow">Workspace</p><h1>Settings</h1><p>Manage merchant identity and integration credentials.</p></div></div><section className="settings-grid"><article className="panel form-stack"><div><h2>Merchant profile</h2><p className="muted">Shown throughout your risk operations workspace.</p></div><label className="form-field">Merchant name<input value={name} onChange={(e) => setName(e.target.value)} /></label><label className="form-field">Email<input value={merchant?.email ?? ""} disabled /></label>{message && <div className="alert success" role="status">{message}</div>}<button className="button primary fit" disabled={saving} onClick={() => void save()}>{saving && <LoaderCircle size={15} className="spin"/>}{saving ? "Saving…" : "Save changes"}</button></article><article className="panel form-stack"><div className="panel-head"><div><h2>API key</h2><p>Rotate compromised integration credentials.</p></div><KeyRound/></div><div className="rotation-notice"><TriangleAlert size={18}/><p><strong>Existing integrations stop immediately.</strong> Rotation is limited to 3 requests per hour for this workspace.</p></div>{apiKey && <><div className="alert warning">Store this key now. It will not be shown again.</div><div className="key-result"><code className="secret">{apiKey}</code><button className="button" onClick={() => void copyKey()}><Copy size={15}/>{copied ? "Copied" : "Copy key"}</button></div></>}{error && <div className="alert error" role="alert">{error}</div>}<button className="button danger fit" disabled={rotating} onClick={() => void rotate()}>{rotating && <LoaderCircle size={15} className="spin"/>}{rotating ? "Rotating…" : "Rotate API key"}</button></article></section></div>;
}
