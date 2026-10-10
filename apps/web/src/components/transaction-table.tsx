"use client";

import type { Transaction } from "@txnguard/shared";

type TransactionTableProps = {
  transactions: Transaction[];
  onSelect?: (transactionId: string) => void;
  variant?: "standard" | "recent";
};

const money = (minor: number, currency: string) => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(minor / 100);
const timestamp = (value: string) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export function TransactionTable({ transactions, onSelect, variant = "standard" }: TransactionTableProps) {
  if (!transactions.length) return <div className="empty"><strong>No transactions found</strong><span>New payment activity will appear here.</span></div>;

  return <>
    <div className={`table-wrap${variant === "recent" ? " recent-transaction-table" : ""}`}>
      <table><thead><tr><th>Transaction</th><th>Amount</th><th>Origin</th><th>Risk</th><th>Status</th><th>Time</th></tr></thead><tbody>{transactions.map((tx) => <tr key={tx.id}>
        <td><button className="transaction-link mono" onClick={() => onSelect?.(tx.id)} aria-label={`Inspect transaction ${tx.id}`}>{tx.id.slice(0, 8)}</button></td>
        <td className="amount">{money(tx.amountMinor, tx.currency)}</td>
        <td>{tx.cardCountry} / {tx.ipCountry}</td>
        <td><span className={`score severity-${tx.fraudSeverity}`}>{tx.fraudScore}</span><span className="capitalize">{tx.fraudSeverity}</span></td>
        <td><span className={`badge status-${tx.status}`}>{tx.status}</span></td>
        <td>{new Date(tx.createdAt).toLocaleString()}</td>
      </tr>)}</tbody></table>
    </div>
    {variant === "recent" && <div className="recent-transaction-cards">{transactions.map((tx) => <button type="button" className="recent-transaction-card" key={tx.id} onClick={() => onSelect?.(tx.id)} aria-label={`Inspect transaction ${tx.id}`}>
      <div className="recent-transaction-topline"><span className="mono">{tx.id.slice(0, 8)}</span><span className={`badge status-${tx.status}`}>{tx.status}</span></div>
      <strong>{money(tx.amountMinor, tx.currency)}</strong>
      <div className="recent-transaction-meta"><span>{tx.cardCountry} / {tx.ipCountry}</span><span><b className={`score severity-${tx.fraudSeverity}`}>{tx.fraudScore}</b><em className="capitalize">{tx.fraudSeverity}</em></span></div>
      <time>{timestamp(tx.createdAt)}</time>
    </button>)}</div>}
  </>;
}
