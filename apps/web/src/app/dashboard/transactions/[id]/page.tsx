"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";

export default function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const detail = useQuery({ queryKey: ["transaction", id], queryFn: () => api.transaction(id) });
  if (detail.isLoading) return <div className="page"><div className="skeleton large-skeleton"/></div>;
  if (detail.error) return <div className="page"><div className="alert error">{detail.error.message}</div></div>;
  const { transaction: tx, fraudEvents } = detail.data!;
  return <div className="page"><Link className="back-link" href="/dashboard/transactions"><ArrowLeft size={16}/> Transactions</Link><div className="page-heading"><div><p className="eyebrow">Transaction detail</p><h1 className="mono">{tx.id}</h1><p>{new Date(tx.createdAt).toLocaleString()}</p></div><span className={`badge status-${tx.status}`}>{tx.status}</span></div><section className="detail-grid"><article className="panel"><h2>Payment</h2><dl><div><dt>Amount</dt><dd>{(tx.amountMinor / 100).toFixed(2)} {tx.currency}</dd></div><div><dt>Card BIN</dt><dd>{tx.cardBin}</dd></div><div><dt>Card country</dt><dd>{tx.cardCountry}</dd></div><div><dt>IP country</dt><dd>{tx.ipCountry}</dd></div></dl></article><article className="panel"><h2>Risk decision</h2><div className={`risk-number severity-${tx.fraudSeverity}`}>{tx.fraudScore}</div><p className="capitalize">{tx.fraudSeverity} severity</p></article></section><section className="panel"><div className="panel-head"><div><h2>Triggered rules</h2><p>Audit record for this fraud decision</p></div></div>{fraudEvents.length ? <div className="event-list">{fraudEvents.map((event) => <article key={event.id}><span className="score severity-medium">+{event.scoreImpact}</span><div><strong>{event.reason}</strong><code>{event.ruleKey}</code></div></article>)}</div> : <div className="empty">No fraud rules triggered.</div>}</section></div>;
}
