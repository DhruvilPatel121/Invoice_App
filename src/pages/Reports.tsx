import React, { useEffect, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Download, FileText, BarChart2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getInvoicesByDateRange,
  getMonthlyRevenue,
  getTopClients,
} from "@/services/api";
import type { Invoice, MonthlyRevenue } from "@/types/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import StatusBadge from "@/components/invoice/StatusBadge";
import * as XLSX from "xlsx";

const PIE_COLORS = [
  "#2563eb",
  "#16a34a",
  "#f97316",
  "#ef4444",
  "#6b7280",
  "#0ea5e9",
];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

export default function Reports() {
  const [tab, setTab] = useState<"revenue" | "invoices" | "clients">("revenue");
  const [year, setYear] = useState(CURRENT_YEAR);
  const [monthly, setMonthly] = useState<MonthlyRevenue[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [topClients, setTopClients] = useState<
    { client_name: string; total: number; count: number }[]
  >([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [m, invs, tc] = await Promise.all([
      getMonthlyRevenue(year),
      getInvoicesByDateRange(`${year}-01-01`, `${year}-12-31`),
      getTopClients(10),
    ]);
    setMonthly(m);
    setInvoices(invs);
    setTopClients(tc);
    setLoading(false);
  }, [year]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const totalRevenue = monthly.reduce((s, m) => s + m.paid, 0);
  const totalPending = monthly.reduce((s, m) => s + m.pending, 0);
  const paidInvoices = invoices.filter((i) => i.status === "Paid");
  const pendingInvoices = invoices.filter((i) =>
    ["Pending", "Partially Paid", "Overdue"].includes(i.status),
  );

  const statusBreakdown = [
    {
      name: "Paid",
      value: paidInvoices.length,
      amount: paidInvoices.reduce((s, i) => s + i.grand_total, 0),
    },
    {
      name: "Pending",
      value: pendingInvoices.length,
      amount: pendingInvoices.reduce((s, i) => s + i.pending_amount, 0),
    },
    {
      name: "Draft",
      value: invoices.filter((i) => i.status === "Draft").length,
      amount: 0,
    },
    {
      name: "Cancelled",
      value: invoices.filter((i) => i.status === "Cancelled").length,
      amount: 0,
    },
  ].filter((d) => d.value > 0);

  const exportToExcel = (type: "revenue" | "invoices" | "clients") => {
    try {
      let wb = XLSX.utils.book_new();
      if (type === "revenue") {
        const ws = XLSX.utils.json_to_sheet(
          monthly.map((m) => ({
            Month: m.month,
            Year: m.year,
            "Paid Amount": m.paid,
            "Pending Amount": m.pending,
            Total: m.total,
          })),
        );
        XLSX.utils.book_append_sheet(wb, ws, "Monthly Revenue");
      } else if (type === "invoices") {
        const ws = XLSX.utils.json_to_sheet(
          invoices.map((i) => ({
            "Invoice No": i.invoice_number,
            Client: i.client_name,
            Date: formatDate(i.invoice_date),
            "Due Date": formatDate(i.due_date),
            Status: i.status,
            Amount: i.grand_total,
            Paid: i.paid_amount,
            Pending: i.pending_amount,
          })),
        );
        XLSX.utils.book_append_sheet(wb, ws, "Invoices");
      } else {
        const ws = XLSX.utils.json_to_sheet(
          topClients.map((c) => ({
            Client: c.client_name,
            "Total Amount": c.total,
            "Invoice Count": c.count,
          })),
        );
        XLSX.utils.book_append_sheet(wb, ws, "Top Clients");
      }
      XLSX.writeFile(wb, `report-${type}-${year}.xlsx`);
      toast.success("Exported to Excel");
    } catch {
      toast.error("Export failed");
    }
  };

  const TABS = [
    { key: "revenue" as const, label: "Revenue" },
    { key: "invoices" as const, label: "Invoices" },
    { key: "clients" as const, label: "Top Clients" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold">Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Financial analytics and insights
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Select
            value={String(year)}
            onValueChange={(v) => setYear(Number(v))}
          >
            <SelectTrigger className="h-8 text-xs w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => exportToExcel(tab)}
          >
            <Download className="w-3.5 h-3.5" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Revenue",
            value: formatCurrency(totalRevenue),
            color: "text-primary",
          },
          {
            label: "Total Pending",
            value: formatCurrency(totalPending),
            color: "text-orange-600",
          },
          {
            label: "Total Invoices",
            value: invoices.length.toString(),
            color: "text-foreground",
          },
          {
            label: "Paid Invoices",
            value: paidInvoices.length.toString(),
            color: "text-green-600",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-border bg-card p-4"
          >
            <p className="text-xs text-muted-foreground">{card.label}</p>
            {loading ? (
              <Skeleton className="h-6 w-24 mt-1" />
            ) : (
              <p className={`text-lg font-semibold mt-1 ${card.color}`}>
                {card.value}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Revenue Tab */}
      {tab === "revenue" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold mb-4">
                Monthly Revenue {year}
              </h2>
              {loading ? (
                <Skeleton className="h-56 w-full" />
              ) : (
                <div className="w-full min-w-0 overflow-hidden">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={monthly}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) =>
                          v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v
                        }
                      />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Legend
                        layout="horizontal"
                        wrapperStyle={{ paddingTop: 8 }}
                      />
                      <Bar
                        dataKey="paid"
                        name="Paid"
                        fill="#2563eb"
                        radius={[2, 2, 0, 0]}
                      />
                      <Bar
                        dataKey="pending"
                        name="Pending"
                        fill="#f97316"
                        radius={[2, 2, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold mb-4">Revenue Trend</h2>
              {loading ? (
                <Skeleton className="h-56 w-full" />
              ) : (
                <div className="w-full min-w-0 overflow-hidden">
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={monthly}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) =>
                          v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v
                        }
                      />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Line
                        type="monotone"
                        dataKey="total"
                        stroke="#2563eb"
                        strokeWidth={2}
                        dot={false}
                        name="Total"
                      />
                      <Line
                        type="monotone"
                        dataKey="paid"
                        stroke="#16a34a"
                        strokeWidth={1.5}
                        dot={false}
                        name="Paid"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Monthly table */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold">Monthly Breakdown</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full whitespace-nowrap">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    {["Month", "Total", "Paid", "Pending"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading
                    ? Array.from({ length: 6 }).map((_, i) => (
                        <tr key={i}>
                          {Array.from({ length: 4 }).map((_, j) => (
                            <td key={j} className="px-4 py-2.5">
                              <Skeleton className="h-4 w-20" />
                            </td>
                          ))}
                        </tr>
                      ))
                    : monthly.map((m) => (
                        <tr key={m.month} className="hover:bg-muted/20">
                          <td className="px-4 py-2.5 text-xs font-medium">
                            {m.month} {year}
                          </td>
                          <td className="px-4 py-2.5 text-xs">
                            {formatCurrency(m.total)}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-green-600">
                            {formatCurrency(m.paid)}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-orange-600">
                            {formatCurrency(m.pending)}
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Invoices Tab */}
      {tab === "invoices" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold mb-4">
                Invoice Status Distribution
              </h2>
              {loading ? (
                <Skeleton className="h-56 w-full" />
              ) : (
                <div className="w-full min-w-0 overflow-hidden">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={statusBreakdown}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                      >
                        {statusBreakdown.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number, name) => [v, name]} />
                      <Legend
                        layout="horizontal"
                        wrapperStyle={{ paddingTop: 8 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <h2 className="text-sm font-semibold">Summary</h2>
              {statusBreakdown.map((s, i) => (
                <div key={s.name} className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ background: PIE_COLORS[i] }}
                  />
                  <span className="text-xs flex-1">{s.name}</span>
                  <span className="text-xs font-medium">
                    {s.value} invoices
                  </span>
                  {s.amount > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {formatCurrency(s.amount)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold">All Invoices {year}</h2>
              <span className="text-xs text-muted-foreground">
                {invoices.length} total
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full whitespace-nowrap">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    {["Invoice #", "Client", "Date", "Amount", "Status"].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                          {Array.from({ length: 5 }).map((_, j) => (
                            <td key={j} className="px-4 py-2.5">
                              <Skeleton className="h-4 w-16" />
                            </td>
                          ))}
                        </tr>
                      ))
                    : invoices.slice(0, 20).map((inv) => (
                        <tr key={inv.id} className="hover:bg-muted/20">
                          <td className="px-4 py-2.5 text-xs font-medium text-primary">
                            {inv.invoice_number}
                          </td>
                          <td className="px-4 py-2.5 text-xs">
                            {inv.client_name}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">
                            {formatDate(inv.invoice_date)}
                          </td>
                          <td className="px-4 py-2.5 text-xs">
                            {formatCurrency(inv.grand_total, inv.currency)}
                          </td>
                          <td className="px-4 py-2.5">
                            <StatusBadge status={inv.status} />
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Clients Tab */}
      {tab === "clients" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold">Top Clients by Revenue</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full whitespace-nowrap">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    {["Rank", "Client", "Invoice Count", "Total Revenue"].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 4 }).map((_, j) => (
                          <td key={j} className="px-4 py-2.5">
                            <Skeleton className="h-4 w-20" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : topClients.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-8 text-center text-sm text-muted-foreground"
                      >
                        No data
                      </td>
                    </tr>
                  ) : (
                    topClients.map((c, i) => (
                      <tr key={c.client_name} className="hover:bg-muted/20">
                        <td className="px-4 py-2.5 text-xs font-bold text-muted-foreground">
                          {i + 1}
                        </td>
                        <td className="px-4 py-2.5 text-xs font-medium">
                          {c.client_name}
                        </td>
                        <td className="px-4 py-2.5 text-xs">{c.count}</td>
                        <td className="px-4 py-2.5 text-xs font-semibold text-primary">
                          {formatCurrency(c.total)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {topClients.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold mb-4">Revenue by Client</h2>
              <div className="w-full min-w-0 overflow-hidden">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={topClients.slice(0, 8)} layout="vertical">
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) =>
                        v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v
                      }
                    />
                    <YAxis
                      type="category"
                      dataKey="client_name"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={80}
                    />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar
                      dataKey="total"
                      name="Revenue"
                      fill="#2563eb"
                      radius={[0, 2, 2, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
