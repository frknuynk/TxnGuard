"use client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Filter, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FilterSelect } from "@/components/filter-select";
import { PaginationControls } from "@/components/pagination-controls";
import { TransactionDrawer } from "@/components/transaction-drawer";
import { TransactionTable } from "@/components/transaction-table";
import { api } from "@/lib/api";
import { useRealtime } from "@/lib/use-realtime";

export default function TransactionsPage() {
  useRealtime(); const router=useRouter(); const params=useSearchParams();
  const from=params.get("from")??"", to=params.get("to")??"", initialStatus=params.get("status")??"", initialSeverity=params.get("severity")??"";
  const [status,setStatus]=useState(initialStatus), [severity,setSeverity]=useState(initialSeverity), [offset,setOffset]=useState(0), [selected,setSelected]=useState<string|null>(null);
  useEffect(()=>{setStatus(initialStatus);setSeverity(initialSeverity);setOffset(0);},[initialStatus,initialSeverity,from,to]);
  const query=new URLSearchParams({limit:"20",offset:String(offset)}); if(status)query.set("status",status);if(severity)query.set("severity",severity);if(from)query.set("from",from);if(to)query.set("to",to);
  const transactions=useQuery({queryKey:["transactions",query.toString()],queryFn:()=>api.transactions(query.toString()),placeholderData:keepPreviousData,refetchInterval:30_000});
  const hasContext=Boolean(from||to||status||severity); const setFilter=(field:"status"|"severity",value:string)=>{field==="status"?setStatus(value):setSeverity(value);setOffset(0);}; const clearFilters=()=>{setStatus("");setSeverity("");setOffset(0);if(from||to||initialStatus||initialSeverity)router.replace("/dashboard/transactions");};
  const isTransitioning=transactions.isPlaceholderData;
  return <div className="page"><div className="page-heading"><div><p className="eyebrow">Payments</p><h1>Transactions</h1><p>Review every merchant payment decision and open its audit trail inline.</p></div></div><section className="filter-bar"><div className="filter-intro"><Filter size={18}/><div><strong>{from?"Activity window selected":"Refine queue"}</strong><span>{from?`${new Date(from).toLocaleString()} — ${new Date(to).toLocaleString()}`:"Filter the review surface without leaving the page."}</span></div></div><FilterSelect label="Status" value={status} pending={isTransitioning} onChange={v=>setFilter("status",v)} options={[{value:"",label:"All statuses"},...["approved","flagged","declined"].map(value=>({value,label:value[0]!.toUpperCase()+value.slice(1)}))]}/><FilterSelect label="Severity" value={severity} pending={isTransitioning} onChange={v=>setFilter("severity",v)} options={[{value:"",label:"All severities"},...["none","low","medium","high","critical"].map(value=>({value,label:value[0]!.toUpperCase()+value.slice(1)}))]}/><div className="filter-actions"><button className="clear-filters" disabled={!hasContext} onClick={clearFilters}><X size={14}/>Show all</button><div className={`filter-sync${isTransitioning?" is-pending":""}`} role="status" aria-live="polite"><span aria-hidden="true"/>{isTransitioning?"Applying filters":"Live results"}</div></div></section><section className={`panel data-panel${isTransitioning?" is-transitioning":""}`} aria-busy={transactions.isLoading||isTransitioning}>{transactions.isLoading?<div className="skeleton table-skeleton"/>:transactions.error?<div className="alert error">{transactions.error.message}<button className="button" onClick={()=>void transactions.refetch()}>Retry</button></div>:<><TransactionTable transactions={transactions.data!.transactions} onSelect={setSelected}/><PaginationControls {...transactions.data!.pagination} pageSize={20} onOffsetChange={setOffset} disabled={isTransitioning}/></>}</section><TransactionDrawer transactionId={selected} onClose={()=>setSelected(null)}/></div>;
}
