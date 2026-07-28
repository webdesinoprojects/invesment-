"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
type Point = { label: string; members: number; deposits: number; withdrawals: number };
export function DashboardCharts({ data, statuses }: { data: Point[]; statuses: { name: string; value: number }[] }) {
  const colors = ["#10b981","#f59e0b","#ef4444"] as const;
  return (
    <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div><h2 className="font-bold">Platform growth</h2><p className="text-xs text-slate-500">Registrations and financial activity</p></div>
        <div className="mt-5 h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data}><defs><linearGradient id="green" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity=".35"/><stop offset="95%" stopColor="#10b981" stopOpacity="0"/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/><XAxis dataKey="label" axisLine={false} tickLine={false} fontSize={11}/><YAxis axisLine={false} tickLine={false} fontSize={11}/><Tooltip/><Area type="monotone" dataKey="members" stroke="#10b981" fill="url(#green)" strokeWidth={3}/></AreaChart></ResponsiveContainer></div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold">Member status</h2><p className="text-xs text-slate-500">Current account distribution</p>
        <div className="mt-4 h-44"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statuses} dataKey="value" innerRadius={52} outerRadius={76} paddingAngle={4}>{statuses.map((_, i) => <Cell key={i} fill={colors[i % colors.length]!} />)}</Pie><Tooltip/></PieChart></ResponsiveContainer></div>
        <div className="flex justify-center gap-4 text-xs">{statuses.map((item, i) => <span key={item.name} className="flex items-center gap-1.5"><i className="size-2 rounded-full" style={{background:colors[i % colors.length]!}} />{item.name} {item.value}</span>)}</div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
        <h2 className="font-bold">Deposits versus withdrawals</h2><p className="text-xs text-slate-500">Six-month transaction volume</p>
        <div className="mt-5 h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/><XAxis dataKey="label" axisLine={false} tickLine={false} fontSize={11}/><YAxis axisLine={false} tickLine={false} fontSize={11}/><Tooltip/><Bar dataKey="deposits" fill="#10b981" radius={[5,5,0,0]}/><Bar dataKey="withdrawals" fill="#0f172a" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div>
      </section>
    </div>
  );
}
