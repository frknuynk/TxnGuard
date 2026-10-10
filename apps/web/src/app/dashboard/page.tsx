"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarDays, CheckCircle2, CircleDollarSign, Gauge } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TransactionDrawer } from "@/components/transaction-drawer";
import { TransactionTable } from "@/components/transaction-table";
import { api } from "@/lib/api";
import { useRealtime } from "@/lib/use-realtime";

type Range = "24h" | "7d" | "30d" | "custom";
type Bucket = { hour: string; count: number; volumeMinor: number };
const labels = { "24h": "Last 24 hours", "7d": "Last 7 days", "30d": "Last 30 days" } as const;

export default function DashboardPage() {
  useRealtime();
  const router = useRouter();
  const [range, setRange] = useState<Range>("24h");
  const [from, setFrom] = useState(dateInput(-6));
  const [to, setTo] = useState(dateInput(0));
  const [selected, setSelected] = useState<string | null>(null);
  const query = range === "custom" ? new URLSearchParams({ range, from: new Date(`${from}T00:00:00`).toISOString(), to: new Date(`${to}T23:59:59.999`).toISOString() }).toString() : `range=${range}`;
  const overview = useQuery({ queryKey: ["overview", query], queryFn: () => api.overview(query) });
  const recent = useQuery({ queryKey: ["transactions", "recent"], queryFn: () => api.transactions("limit=6") });
  const activity = useMemo(() => buckets(overview.data?.hourlyVolume ?? [], overview.data?.bucket ?? "hour", range, from, to), [overview.data, range, from, to]);
  if (overview.isLoading || recent.isLoading) return <div className="page"><div className="skeleton heading-skeleton"/><div className="skeleton large-skeleton"/></div>;
  if (overview.error || recent.error) return <div className="page"><div className="alert error">{(overview.error ?? recent.error)?.message}<button className="button" onClick={() => { void overview.refetch(); void recent.refetch(); }}>Retry</button></div></div>;
  const data = overview.data!;
  const money = (minor: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(minor / 100);
  const attention = (data.statusCounts.flagged ?? 0) + (data.statusCounts.declined ?? 0);
  const peak = activity.reduce((best, item) => item.count > best.count ? item : best, activity[0]!);
  const subtitle = range === "custom" ? `${from} to ${to}` : labels[range];
  const openBucket = (item: Bucket) => { const start = new Date(item.hour); const end = new Date(start); data.bucket === "hour" ? end.setHours(end.getHours() + 1) : end.setDate(end.getDate() + 1); router.push(`/dashboard/transactions?from=${encodeURIComponent(start.toISOString())}&to=${encodeURIComponent(end.toISOString())}`); };
  const openSeverity = (severity: string) => router.push(["medium", "high", "critical"].includes(severity) ? `/dashboard/fraud?severity=${severity}` : `/dashboard/transactions?severity=${severity}`);
  return <div className="page"><div className="page-heading"><div><p className="eyebrow">Risk operations</p><h1>Overview</h1><p>Payment activity and fraud posture for {subtitle.toLowerCase()}.</p></div></div>
    <section className="stats-grid">{[{ label:"Transaction volume",value:money(data.totalVolumeMinor),detail:`${data.totalTransactions} payments`,icon:CircleDollarSign,href:"/dashboard/transactions" },{ label:"Approval rate",value:`${data.approvalRate}%`,detail:`${data.statusCounts.approved ?? 0} approved`,icon:CheckCircle2,href:"/dashboard/transactions?status=approved" },{ label:"Average risk",value:data.averageFraudScore.toFixed(1),detail:"Across selected activity",icon:Gauge,href:"/dashboard/transactions" },{ label:"Needs attention",value:attention,detail:`${data.statusCounts.declined ?? 0} declined`,icon:AlertTriangle,href:"/dashboard/fraud" }].map(({label,value,detail,icon:Icon,href}) => <button type="button" className="stat-card stat-card-link" key={label} onClick={() => router.push(href)}><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div><Icon size={20}/></button>)}</section>
    <section className="dashboard-grid"><article className="panel chart-panel"><div className="panel-head"><div><h2>Activity</h2><p>Click a {data.bucket} to inspect its payment decisions.</p></div><div className="chart-insight"><span>Peak</span><strong>{peak.count} events</strong><small>{format(peak.hour,data.bucket)}</small></div></div><div className="activity-controls"><div className="range-tabs" role="tablist">{(["24h","7d","30d"] as const).map((value) => <button key={value} role="tab" aria-selected={range===value} className={range===value?"active":""} onClick={() => setRange(value)}>{labels[value]}</button>)}<button role="tab" aria-selected={range==="custom"} className={range==="custom"?"active":""} onClick={() => setRange("custom")}>Custom</button></div>{range === "custom" && <div className="custom-range"><CalendarDays size={16}/><label>From<input type="date" value={from} max={to} onChange={(e)=>setFrom(e.target.value)}/></label><label>To<input type="date" value={to} min={from} onChange={(e)=>setTo(e.target.value)}/></label></div>}</div><div className="chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={activity} margin={{top:8,right:4,left:-18,bottom:0}}><CartesianGrid strokeDasharray="3 4" vertical={false} stroke="#e5ebe8"/><XAxis dataKey="hour" tickFormatter={(value)=>format(value,data.bucket)} minTickGap={28} tickLine={false} axisLine={false}/><YAxis allowDecimals={false} tickLine={false} axisLine={false}/><Tooltip cursor={{fill:"#e8f1ed"}} content={<Tip bucket={data.bucket}/>}/><Bar dataKey="count" fill="#167b62" radius={[5,5,0,0]} maxBarSize={30} onClick={(entry) => { const item=(entry as {payload?:Bucket}).payload; if(item?.count) openBucket(item); }}/></BarChart></ResponsiveContainer></div></article><article className="panel"><div className="panel-head"><div><h2>Severity mix</h2><p>Choose a risk band to investigate its decisions.</p></div></div><div className="severity-list">{Object.entries(data.severityCounts).map(([key,value]) => {const pct=data.totalTransactions?Math.round(value/data.totalTransactions*100):0;return <button type="button" className={`severity-row severity-row-${key}`} key={key} onClick={() => openSeverity(key)} aria-label={`Review ${key} severity decisions`}><div><span className={`dot severity-${key}`}/><span className="capitalize">{key}</span><strong>{value}</strong></div><div className="bar"><span className={`severity-${key}`} style={{width:`${pct}%`}}/></div><small>{pct}% of decisions</small></button>;})}</div></article></section>
    <section className="panel recent-transactions-panel"><div className="panel-head"><div><h2>Recent transactions</h2><p>Latest merchant payment decisions</p></div><a href="/dashboard/transactions">View all</a></div><TransactionTable transactions={recent.data!.transactions} onSelect={setSelected} variant="recent"/></section><TransactionDrawer transactionId={selected} onClose={()=>setSelected(null)}/></div>;
}
function buckets(source:Bucket[],bucket:"hour"|"day",range:Range,from:string,to:string){const map=new Map(source.map(x=>[new Date(x.hour).setMinutes(0,0,0),x]));const count=bucket==="hour"?24:range==="7d"?7:range==="30d"?30:Math.min(31,Math.max(1,Math.round((new Date(to).getTime()-new Date(from).getTime())/86400000)+1));return Array.from({length:count},(_,i)=>{const d=range==="custom"?new Date(`${from}T00:00:00`):new Date();d.setMinutes(0,0,0);bucket==="hour"?d.setHours(d.getHours()-(count-1-i)):d.setDate(d.getDate()-(range==="custom"?-i:count-1-i));return map.get(d.getTime())??{hour:d.toISOString(),count:0,volumeMinor:0};});}
function dateInput(offset:number){const d=new Date();d.setDate(d.getDate()+offset);return d.toISOString().slice(0,10);} function format(value:string,bucket:"hour"|"day"){return new Date(value).toLocaleDateString([],bucket==="hour"?{hour:"2-digit",hour12:false}:{month:"short",day:"numeric"});} function Tip({active,payload,bucket}:{active?:boolean;payload?:Array<{payload:Bucket}>;bucket:"hour"|"day"}){if(!active||!payload?.[0])return null;const d=payload[0].payload;return <div className="chart-tooltip"><span>{format(d.hour,bucket)}</span><strong>{d.count} transactions</strong><small>Click to inspect</small></div>;}
