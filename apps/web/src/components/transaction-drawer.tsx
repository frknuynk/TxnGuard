"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowUpRight, LoaderCircle, ShieldAlert, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { api } from "@/lib/api";

type TransactionDrawerProps = { transactionId: string | null; onClose: () => void };

const formatMoney = (minor: number, currency: string) => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(minor / 100);

export function TransactionDrawer({ transactionId, onClose }: TransactionDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const invokerRef = useRef<HTMLElement | null>(null);
  const detail = useQuery({
    queryKey: ["transaction", transactionId],
    queryFn: () => api.transaction(transactionId!),
    enabled: Boolean(transactionId),
  });

  useEffect(() => {
    if (!transactionId) return;
    invokerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      invokerRef.current?.focus();
    };
  }, [transactionId]);

  if (!transactionId) return null;

  function keepFocusInDrawer(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") { onClose(); return; }
    if (event.key !== "Tab") return;
    const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable?.length) return;
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  return <div className="drawer-layer" onMouseDown={onClose}>
    <aside
      ref={drawerRef}
      className="transaction-drawer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="transaction-drawer-title"
      onMouseDown={(event) => event.stopPropagation()}
      onKeyDown={keepFocusInDrawer}
    >
      <header className="drawer-header">
        <div><p className="eyebrow">Payment investigation</p><h2 id="transaction-drawer-title">Transaction detail</h2></div>
        <button ref={closeRef} className="icon-button drawer-close" onClick={onClose} aria-label="Close transaction detail"><X /></button>
      </header>
      {detail.isLoading && <div className="drawer-state"><LoaderCircle className="spin" /><strong>Loading payment context</strong><span>Fetching the decision and its audit trail.</span></div>}
      {detail.error && <div className="drawer-state drawer-error"><AlertCircle /><strong>Unable to load this transaction</strong><span>{detail.error.message}</span><button className="button" onClick={() => void detail.refetch()}>Try again</button></div>}
      {detail.data && <DrawerContent data={detail.data} />}
    </aside>
  </div>;
}

function DrawerContent({ data }: { data: Awaited<ReturnType<typeof api.transaction>> }) {
  const { transaction: tx, fraudEvents } = data;
  const countryMismatch = tx.cardCountry !== tx.ipCountry;
  return <div className="drawer-content">
    <section className="drawer-decision">
      <div><span className={`badge status-${tx.status}`}>{tx.status}</span><p className="transaction-id mono">{tx.id}</p><p className="muted">{new Date(tx.createdAt).toLocaleString()}</p></div>
      <div className={`risk-number severity-${tx.fraudSeverity}`} aria-label={`Risk score ${tx.fraudScore}`}>{tx.fraudScore}<small>/100</small></div>
    </section>

    <section className="drawer-section"><div className="drawer-section-head"><h3>Payment context</h3><span className="amount">{formatMoney(tx.amountMinor, tx.currency)}</span></div>
      <dl className="drawer-facts">
        <div><dt>Card BIN</dt><dd className="mono">{tx.cardBin}</dd></div>
        <div><dt>Card country</dt><dd>{tx.cardCountry}</dd></div>
        <div><dt>IP country</dt><dd>{tx.ipCountry}</dd></div>
        <div><dt>Origin check</dt><dd className={countryMismatch ? "fact-warning" : "fact-safe"}>{countryMismatch ? "Country mismatch" : "Countries match"}</dd></div>
      </dl>
    </section>

    <section className="drawer-section"><div className="drawer-section-head"><div><h3>Fraud signals</h3><p>Decision audit trail</p></div><ShieldAlert size={18} /></div>
      {fraudEvents.length ? <div className="signal-list">{fraudEvents.map((event) => <article key={event.id}>
        <span className="signal-impact">+{event.scoreImpact}</span><div><strong>{event.reason}</strong><code>{event.ruleKey}</code></div><ArrowUpRight size={16} aria-hidden="true" />
      </article>)}</div> : <div className="drawer-empty"><strong>No fraud signal fired</strong><span>This payment was evaluated and no rule added risk.</span></div>}
    </section>

    <section className="drawer-section decision-note"><h3>Decision</h3><p><strong className="capitalize">{tx.fraudSeverity}</strong> severity resulted in a <strong className="capitalize">{tx.status}</strong> payment decision.</p></section>
  </div>;
}
