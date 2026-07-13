import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  Eye,
  Edit,
  Copy,
  Trash2,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import StatusBadge from "@/components/invoice/StatusBadge";
import {
  getInvoices,
  deleteInvoice,
  updateInvoiceStatus,
  duplicateInvoice,
  generateInvoiceNumber,
  getClients,
  markInvoiceDownloaded,
  markInvoicePrinted,
} from "@/services/api";
import type { Invoice, InvoiceFilters, Client } from "@/types/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { generateInvoicePDF } from "@/lib/pdfGenerator";

const STATUSES = [
  "all",
  "Draft",
  "Sent",
  "Viewed",
  "Paid",
  "Pending",
  "Partially Paid",
  "Cancelled",
  "Overdue",
];
const DATE_RANGES = [
  "all",
  "today",
  "yesterday",
  "last7",
  "last30",
  "thisMonth",
  "lastMonth",
  "thisYear",
  "custom",
];
const DATE_RANGE_LABELS: Record<string, string> = {
  all: "All Time",
  today: "Today",
  yesterday: "Yesterday",
  last7: "Last 7 Days",
  last30: "Last 30 Days",
  thisMonth: "This Month",
  lastMonth: "Last Month",
  thisYear: "This Year",
  custom: "Custom Range",
};

function getDateRange(range: string): { from: string; to: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = fmt(now);
  if (range === "today") return { from: today, to: today };
  if (range === "yesterday") {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const ys = fmt(y);
    return { from: ys, to: ys };
  }
  if (range === "last7") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return { from: fmt(d), to: today };
  }
  if (range === "last30") {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return { from: fmt(d), to: today };
  }
  if (range === "thisMonth")
    return {
      from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: today,
    };
  if (range === "lastMonth") {
    const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const e = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: fmt(s), to: fmt(e) };
  }
  if (range === "thisYear")
    return { from: `${now.getFullYear()}-01-01`, to: today };
  return { from: "", to: "" };
}

const PAGE_SIZE = 15;

export default function InvoiceList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [partialPayDialog, setPartialPayDialog] = useState<string | null>(null);
  const [partialAmount, setPartialAmount] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<InvoiceFilters>({
    search: searchParams.get("search") || "",
    status: "all",
    client_id: "all",
    date_range: "all",
    date_from: "",
    date_to: "",
    amount_min: "",
    amount_max: "",
  });

  const computedFilters = useCallback(() => {
    const { date_from, date_to, ...rest } = filters;
    if (rest.date_range !== "all" && rest.date_range !== "custom") {
      const range = getDateRange(rest.date_range);
      return { ...rest, date_from: range.from, date_to: range.to };
    }
    return { ...rest, date_from, date_to };
  }, [filters]);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    const { data, count } = await getInvoices(
      computedFilters(),
      page,
      PAGE_SIZE,
    );
    setInvoices(data);
    setTotal(count);
    setLoading(false);
  }, [computedFilters, page]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);
  useEffect(() => {
    getClients().then(setClients);
  }, []);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchInvoices();
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search]);

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteInvoice(deleteId);
    toast.success("Invoice deleted");
    setDeleteId(null);
    fetchInvoices();
  };

  const handleDuplicate = async (inv: Invoice) => {
    const newNum = await generateInvoiceNumber();
    const created = await duplicateInvoice(inv.id, newNum);
    if (created) {
      toast.success(`Duplicated as ${created.invoice_number}`);
      navigate(`/invoices/${created.id}/edit`);
    }
  };

  const handleMarkStatus = async (
    id: string,
    status: string,
    amount?: number,
  ) => {
    await updateInvoiceStatus(id, status, amount);
    toast.success(`Marked as ${status}`);
    fetchInvoices();
  };

  const handleDownload = async (inv: Invoice) => {
    const fullInv = { ...inv };
    await generateInvoicePDF(fullInv, { download: true });
    await markInvoiceDownloaded(inv.id);
    toast.success("PDF downloaded");
  };

  const handlePrint = async (inv: Invoice) => {
    await generateInvoicePDF(inv, { print: true });
    await markInvoicePrinted(inv.id);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-foreground">Invoices</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total} total invoices
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setShowFilters((f) => !f)}
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filters</span>
          </Button>
          <Link to="/invoices/create">
            <Button size="sm" className="h-8 text-xs gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Invoice</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by invoice #, client name, GST, phone, email, amount..."
            className="pl-9 text-sm"
            value={filters.search}
            onChange={(e) =>
              setFilters((f) => ({ ...f, search: e.target.value }))
            }
          />
        </div>

        {showFilters && (
          <div className="rounded-lg border border-border bg-card p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs mb-1.5 block">Status</Label>
              <Select
                value={filters.status}
                onValueChange={(v) => {
                  setFilters((f) => ({ ...f, status: v }));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s === "all" ? "All Statuses" : s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Client</Label>
              <Select
                value={filters.client_id}
                onValueChange={(v) => {
                  setFilters((f) => ({ ...f, client_id: v }));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Date Range</Label>
              <Select
                value={filters.date_range}
                onValueChange={(v) => {
                  setFilters((f) => ({ ...f, date_range: v }));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue>
                    {DATE_RANGE_LABELS[filters.date_range]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {DATE_RANGES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {DATE_RANGE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {filters.date_range === "custom" && (
              <div className="md:col-span-2 xl:col-span-1 grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs mb-1.5 block">From</Label>
                  <Input
                    type="date"
                    className="h-8 text-xs"
                    value={filters.date_from}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, date_from: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">To</Label>
                  <Input
                    type="date"
                    className="h-8 text-xs"
                    value={filters.date_to}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, date_to: e.target.value }))
                    }
                  />
                </div>
              </div>
            )}
            <div>
              <Label className="text-xs mb-1.5 block">Min Amount</Label>
              <Input
                placeholder="0"
                className="h-8 text-xs"
                value={filters.amount_min}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, amount_min: e.target.value }))
                }
              />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Max Amount</Label>
              <Input
                placeholder="Any"
                className="h-8 text-xs"
                value={filters.amount_max}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, amount_max: e.target.value }))
                }
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs w-full"
                onClick={() => {
                  setFilters({
                    search: "",
                    status: "all",
                    client_id: "all",
                    date_range: "all",
                    date_from: "",
                    date_to: "",
                    amount_min: "",
                    amount_max: "",
                  });
                  setPage(1);
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                {[
                  "Invoice #",
                  "Client",
                  "Date",
                  "Due Date",
                  "Amount",
                  "Paid",
                  "Pending",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-16" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="w-8 h-8 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">
                        No invoices found
                      </p>
                      <Link to="/invoices/create">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs mt-1"
                        >
                          Create your first invoice
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3 text-xs font-medium text-primary">
                      <Link
                        to={`/invoices/${inv.id}`}
                        className="hover:underline"
                      >
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-foreground max-w-[140px] truncate">
                      {inv.client_name || "-"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDate(inv.invoice_date)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDate(inv.due_date)}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium">
                      {formatCurrency(inv.grand_total, inv.currency)}
                    </td>
                    <td className="px-4 py-3 text-xs text-green-600">
                      {formatCurrency(inv.paid_amount, inv.currency)}
                    </td>
                    <td className="px-4 py-3 text-xs text-orange-600">
                      {formatCurrency(inv.pending_amount, inv.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          asChild
                        >
                          <Link to={`/invoices/${inv.id}`}>
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          asChild
                        >
                          <Link to={`/invoices/${inv.id}/edit`}>
                            <Edit className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                            >
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="text-xs w-44"
                          >
                            <DropdownMenuItem
                              onClick={() => handleDownload(inv)}
                            >
                              <Download className="w-3.5 h-3.5 mr-2" />
                              Download PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePrint(inv)}>
                              <Printer className="w-3.5 h-3.5 mr-2" />
                              Print
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDuplicate(inv)}
                            >
                              <Copy className="w-3.5 h-3.5 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleMarkStatus(inv.id, "Paid")}
                            >
                              <CheckCircle className="w-3.5 h-3.5 mr-2 text-green-600" />
                              Mark as Paid
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleMarkStatus(inv.id, "Pending")
                              }
                            >
                              <Clock className="w-3.5 h-3.5 mr-2 text-orange-600" />
                              Mark as Pending
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setPartialPayDialog(inv.id);
                                setPartialAmount("");
                              }}
                            >
                              <Clock className="w-3.5 h-3.5 mr-2 text-amber-600" />
                              Mark Partially Paid
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteId(inv.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <span className="text-xs px-2">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The invoice and all its data will be
              permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Partial Pay Dialog */}
      <Dialog
        open={!!partialPayDialog}
        onOpenChange={(open) => !open && setPartialPayDialog(null)}
      >
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <DialogHeader>
            <DialogTitle>Enter Paid Amount</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-xs">Amount Paid</Label>
            <Input
              className="mt-1.5"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={partialAmount}
              onChange={(e) => setPartialAmount(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPartialPayDialog(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (partialPayDialog && partialAmount) {
                  handleMarkStatus(
                    partialPayDialog,
                    "Partially Paid",
                    Number(partialAmount),
                  );
                  setPartialPayDialog(null);
                }
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// needed for the empty state icon
function FileText({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}
