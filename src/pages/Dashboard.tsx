import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FileText,
  DollarSign,
  Clock,
  AlertTriangle,
  Users,
  Plus,
  Search,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";
import { motion } from "motion/react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getDashboardStats,
  getMonthlyRevenue,
  getRecentInvoices,
  getUpcomingDueInvoices,
  getTopClients,
} from "@/services/api";
import type { DashboardStats, MonthlyRevenue, Invoice } from "@/types/types";
import {
  formatCurrency,
  formatDate,
  getStatusColor,
  getDaysUntilDue,
} from "@/lib/utils";
import StatusBadge from "@/components/invoice/StatusBadge";

const PIE_COLORS = [
  "#2563eb",
  "#16a34a",
  "#f97316",
  "#ef4444",
  "#6b7280",
  "#0ea5e9",
  "#f59e0b",
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [monthly, setMonthly] = useState<MonthlyRevenue[]>([]);
  const [recent, setRecent] = useState<Invoice[]>([]);
  const [upcoming, setUpcoming] = useState<Invoice[]>([]);
  const [topClients, setTopClients] = useState<
    { client_name: string; total: number; count: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [s, m, r, u, tc] = await Promise.all([
      getDashboardStats(),
      getMonthlyRevenue(),
      getRecentInvoices(8),
      getUpcomingDueInvoices(),
      getTopClients(5),
    ]);
    setStats(s);
    setMonthly(m);
    setRecent(r);
    setUpcoming(u);
    setTopClients(tc);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const statusPieData = stats
    ? [
        {
          name: "Paid",
          value: recent.filter((i) => i.status === "Paid").length,
        },
        {
          name: "Pending",
          value: recent.filter((i) => i.status === "Pending").length,
        },
        {
          name: "Overdue",
          value: upcoming.filter((i) => i.status === "Overdue").length,
        },
        {
          name: "Draft",
          value: recent.filter((i) => i.status === "Draft").length,
        },
      ].filter((d) => d.value > 0)
    : [];

  const statsCards = [
    {
      label: "Total Invoices",
      value: stats?.total_invoices || 0,
      icon: FileText,
      color: "text-primary",
      format: "number",
      desc: `${stats?.draft_count || 0} drafts`,
    },
    {
      label: "Paid Amount",
      value: stats?.paid_amount || 0,
      icon: DollarSign,
      color: "text-green-600",
      format: "currency",
      desc: "Total collected",
    },
    {
      label: "Pending Amount",
      value: stats?.pending_amount || 0,
      icon: Clock,
      color: "text-orange-600",
      format: "currency",
      desc: "Awaiting payment",
    },
    {
      label: "Overdue",
      value: stats?.overdue_amount || 0,
      icon: AlertTriangle,
      color: "text-red-600",
      format: "currency",
      desc: `${stats?.overdue_count || 0} invoices overdue`,
    },
    {
      label: "Total Clients",
      value: stats?.total_clients || 0,
      icon: Users,
      color: "text-sky-600",
      format: "number",
      desc: "Active clients",
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Welcome back — here's your business overview
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Quick search invoices..."
              className="pl-8 h-8 text-xs w-48"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && search) {
                  navigate(`/invoices?search=${encodeURIComponent(search)}`);
                }
              }}
            />
          </div>
          <Link to="/invoices/create">
            <Button size="sm" className="gap-1.5 text-xs h-8">
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Invoice</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {statsCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-lg border border-border bg-card p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{card.label}</p>
                {loading ? (
                  <Skeleton className="h-6 w-24 mt-1" />
                ) : (
                  <p className="text-lg font-semibold text-foreground mt-1">
                    {card.format === "currency"
                      ? formatCurrency(card.value as number)
                      : (card.value as number).toLocaleString()}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {card.desc}
                </p>
              </div>
              <div className={`shrink-0 p-2 rounded-md bg-muted ${card.color}`}>
                <card.icon className="w-4 h-4" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Monthly Revenue Bar Chart */}
        <div className="xl:col-span-2 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Monthly Revenue
              </h2>
              <p className="text-xs text-muted-foreground">
                {new Date().getFullYear()}
              </p>
            </div>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </div>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <div className="w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={monthly}
                  margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                >
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

        {/* Status Pie */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Invoice Status
              </h2>
              <p className="text-xs text-muted-foreground">Distribution</p>
            </div>
          </div>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : statusPieData.length > 0 ? (
            <div className="w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {statusPieData.map((_, idx) => (
                      <Cell
                        key={idx}
                        fill={PIE_COLORS[idx % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
              No data yet
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Recent Invoices + Upcoming Due + Top Clients */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Recent Invoices */}
        <div className="xl:col-span-2 rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">
              Recent Invoices
            </h2>
            <Link
              to="/invoices"
              className="text-xs text-primary flex items-center gap-0.5 hover:underline"
            >
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap">
              <thead>
                <tr className="border-b border-border">
                  {["Invoice", "Client", "Date", "Amount", "Status"].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr
                      key={i}
                      className="border-b border-border last:border-0"
                    >
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-4 py-2.5">
                          <Skeleton className="h-4 w-20" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : recent.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-sm text-muted-foreground"
                    >
                      No invoices yet.{" "}
                      <Link
                        to="/invoices/create"
                        className="text-primary hover:underline"
                      >
                        Create one
                      </Link>
                    </td>
                  </tr>
                ) : (
                  recent.map((inv) => (
                    <tr
                      key={inv.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-2.5 text-xs font-medium text-primary">
                        <Link to={`/invoices/${inv.id}`}>
                          {inv.invoice_number}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-foreground max-w-[120px] truncate">
                        {inv.client_name || "-"}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {formatDate(inv.invoice_date)}
                      </td>
                      <td className="px-4 py-2.5 text-xs font-medium">
                        {formatCurrency(inv.grand_total, inv.currency)}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={inv.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Upcoming Due */}
          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">
                Upcoming Due
              </h2>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="px-4 py-2.5">
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))
              ) : upcoming.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                  No upcoming due payments
                </div>
              ) : (
                upcoming.map((inv) => {
                  const days = getDaysUntilDue(inv.due_date);
                  return (
                    <Link
                      key={inv.id}
                      to={`/invoices/${inv.id}`}
                      className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {inv.client_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {inv.invoice_number}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-xs font-medium">
                          {formatCurrency(inv.pending_amount, inv.currency)}
                        </p>
                        <p
                          className={`text-xs ${days !== null && days <= 3 ? "text-red-600" : "text-muted-foreground"}`}
                        >
                          {days !== null
                            ? days === 0
                              ? "Due today"
                              : `${days}d`
                            : "-"}
                        </p>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          {/* Top Clients */}
          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">
                Top Clients
              </h2>
              <Users className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="px-4 py-2.5">
                    <Skeleton className="h-8 w-full" />
                  </div>
                ))
              ) : topClients.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                  No data
                </div>
              ) : (
                topClients.map((c, i) => (
                  <div
                    key={c.client_name}
                    className="flex items-center gap-3 px-4 py-2.5"
                  >
                    <span className="text-xs font-medium text-muted-foreground w-4 shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {c.client_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {c.count} invoice{c.count !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <p className="text-xs font-medium shrink-0">
                      {formatCurrency(c.total)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Yearly Line Chart */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Revenue Trend
            </h2>
            <p className="text-xs text-muted-foreground">
              Monthly totals this year
            </p>
          </div>
        </div>
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="w-full min-w-0 overflow-hidden">
            <ResponsiveContainer width="100%" height={160}>
              <LineChart
                data={monthly}
                margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
              >
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
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
