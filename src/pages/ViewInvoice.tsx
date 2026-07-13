import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Edit,
  Download,
  Printer,
  Trash2,
  CheckCircle,
  Clock,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import StatusBadge from "@/components/invoice/StatusBadge";
import {
  getInvoiceById,
  deleteInvoice,
  updateInvoiceStatus,
  getInvoiceHistory,
  duplicateInvoice,
  generateInvoiceNumber,
  markInvoiceDownloaded,
  markInvoicePrinted,
} from "@/services/api";
import type { Invoice, InvoiceHistory } from "@/types/types";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  amountToWords,
} from "@/lib/utils";
import { generateInvoicePDF } from "@/lib/pdfGenerator";

export default function ViewInvoice() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [history, setHistory] = useState<InvoiceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const fetchInvoice = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [inv, hist] = await Promise.all([
      getInvoiceById(id),
      getInvoiceHistory(id),
    ]);
    setInvoice(inv);
    setHistory(hist);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const handleDelete = async () => {
    if (!invoice) return;
    await deleteInvoice(invoice.id);
    toast.success("Invoice deleted");
    navigate("/invoices");
  };

  const handleStatus = async (status: string) => {
    if (!invoice) return;
    await updateInvoiceStatus(invoice.id, status);
    toast.success(`Marked as ${status}`);
    fetchInvoice();
  };

  const handleDownload = async () => {
    if (!invoice) return;
    await generateInvoicePDF(invoice, { download: true });
    await markInvoiceDownloaded(invoice.id);
    toast.success("PDF downloaded");
    fetchInvoice();
  };

  const handlePrint = async () => {
    if (!invoice) return;
    await generateInvoicePDF(invoice, { print: true });
    await markInvoicePrinted(invoice.id);
    fetchInvoice();
  };

  const handleDuplicate = async () => {
    if (!invoice) return;
    const newNum = await generateInvoiceNumber();
    const dup = await duplicateInvoice(invoice.id, newNum);
    if (dup) {
      toast.success(`Duplicated as ${dup.invoice_number}`);
      navigate(`/invoices/${dup.id}/edit`);
    }
  };

  const curr = invoice?.currency || "INR";

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Invoice not found.</p>
        <Link
          to="/invoices"
          className="text-primary text-sm mt-2 inline-block hover:underline"
        >
          Back to Invoices
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <Link
          to="/invoices"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Invoices
        </Link>
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <h1 className="text-xl font-semibold truncate">
            {invoice.invoice_number}
          </h1>
          <StatusBadge status={invoice.status} />
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1.5"
            onClick={handleDownload}
          >
            <Download className="w-3.5 h-3.5" />
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1.5"
            onClick={handlePrint}
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1.5"
            onClick={handleDuplicate}
          >
            <Copy className="w-3.5 h-3.5" />
            Duplicate
          </Button>
          <Link to={`/invoices/${invoice.id}/edit`}>
            <Button size="sm" className="text-xs h-8 gap-1.5">
              <Edit className="w-3.5 h-3.5" />
              Edit
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1.5 text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Invoice Preview */}
        <div className="xl:col-span-2 space-y-4">
          {/* Company + Client */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-4 mb-5 pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                {invoice.company_logo_url ? (
                  <img
                    src={invoice.company_logo_url}
                    alt="logo"
                    className="h-10 object-contain"
                  />
                ) : (
                  <div className="w-10 h-10 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                    {(invoice.company_name || "S").charAt(0)}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold">
                    {invoice.company_name}
                  </p>
                  {invoice.company_gst && (
                    <p className="text-xs text-muted-foreground">
                      GSTIN: {invoice.company_gst}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-primary">TAX INVOICE</p>
                <p className="text-xs text-muted-foreground">
                  #{invoice.invoice_number}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-primary mb-2 uppercase tracking-wide">
                  Invoice From
                </p>
                <p className="text-sm font-medium">{invoice.company_name}</p>
                {invoice.company_email && (
                  <p className="text-xs text-primary">
                    {invoice.company_email}
                  </p>
                )}
                {invoice.company_phone && (
                  <p className="text-xs text-muted-foreground">
                    {invoice.company_phone}
                  </p>
                )}
                {invoice.company_address && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {invoice.company_address}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-primary mb-2 uppercase tracking-wide">
                  Invoice To
                </p>
                <p className="text-sm font-medium">{invoice.client_name}</p>
                {invoice.client_company && (
                  <p className="text-xs text-muted-foreground">
                    {invoice.client_company}
                  </p>
                )}
                {invoice.client_gst && (
                  <p className="text-xs text-muted-foreground">
                    GSTIN: {invoice.client_gst}
                  </p>
                )}
                {invoice.client_email && (
                  <p className="text-xs text-primary">{invoice.client_email}</p>
                )}
                {invoice.client_address && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {invoice.client_address}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
              <div>
                <p className="text-xs text-muted-foreground">Invoice Date</p>
                <p className="text-sm font-medium mt-0.5">
                  {formatDate(invoice.invoice_date)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Due Date</p>
                <p className="text-sm font-medium mt-0.5">
                  {formatDate(invoice.due_date)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Payment Terms</p>
                <p className="text-sm font-medium mt-0.5">
                  {invoice.payment_terms || "-"}
                </p>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full whitespace-nowrap">
                <thead className="bg-primary text-primary-foreground">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold">
                      Description
                    </th>
                    <th className="px-4 py-2.5 text-xs font-semibold">
                      HSN/SAC
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold">
                      Qty
                    </th>
                    <th className="px-4 py-2.5 text-xs font-semibold">Unit</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold">
                      Rate
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold">
                      Disc%
                    </th>
                    {invoice.gst_enabled && (
                      <th className="px-4 py-2.5 text-right text-xs font-semibold">
                        Tax%
                      </th>
                    )}
                    <th className="px-4 py-2.5 text-right text-xs font-semibold">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(invoice.items || []).map((item, i) => (
                    <tr key={item.id || i} className="hover:bg-muted/20">
                      <td className="px-4 py-2.5 text-xs text-foreground">
                        {item.description}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {item.hsn_sac || "-"}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-right">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {item.unit}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-right">
                        {formatCurrency(item.rate, curr)}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-right">
                        {item.discount_percent > 0
                          ? `${item.discount_percent}%`
                          : "-"}
                      </td>
                      {invoice.gst_enabled && (
                        <td className="px-4 py-2.5 text-xs text-right">
                          {item.tax_percent}%
                        </td>
                      )}
                      <td className="px-4 py-2.5 text-xs text-right font-semibold">
                        {formatCurrency(item.amount, curr)}
                      </td>
                    </tr>
                  ))}
                  {(invoice.items || []).length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-4 text-center text-xs text-muted-foreground"
                      >
                        No items
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end p-4 border-t border-border">
              <div className="w-full max-w-xs space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(invoice.subtotal, curr)}</span>
                </div>
                {invoice.discount_amount > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="text-green-600">
                      - {formatCurrency(invoice.discount_amount, curr)}
                    </span>
                  </div>
                )}
                {invoice.gst_enabled && (
                  <>
                    {invoice.cgst_amount > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          CGST ({invoice.cgst_rate}%)
                        </span>
                        <span>{formatCurrency(invoice.cgst_amount, curr)}</span>
                      </div>
                    )}
                    {invoice.sgst_amount > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          SGST ({invoice.sgst_rate}%)
                        </span>
                        <span>{formatCurrency(invoice.sgst_amount, curr)}</span>
                      </div>
                    )}
                    {invoice.igst_amount > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          IGST ({invoice.igst_rate}%)
                        </span>
                        <span>{formatCurrency(invoice.igst_amount, curr)}</span>
                      </div>
                    )}
                  </>
                )}
                {invoice.round_off !== 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Round Off</span>
                    <span>
                      {invoice.round_off > 0 ? "+" : ""}
                      {formatCurrency(invoice.round_off, curr)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-semibold pt-2 border-t border-border">
                  <span>Grand Total</span>
                  <span className="text-primary">
                    {formatCurrency(invoice.grand_total, curr)}
                  </span>
                </div>
                {invoice.paid_amount > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Paid</span>
                    <span className="text-green-600">
                      {formatCurrency(invoice.paid_amount, curr)}
                    </span>
                  </div>
                )}
                {invoice.pending_amount > 0 && (
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-muted-foreground">Balance Due</span>
                    <span className="text-orange-600">
                      {formatCurrency(invoice.pending_amount, curr)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Amount in Words */}
            <div className="px-4 pb-4">
              <p className="text-xs text-muted-foreground">Amount in Words:</p>
              <p className="text-xs font-medium mt-0.5">
                {amountToWords(invoice.grand_total, curr)}
              </p>
            </div>
          </div>

          {/* Bank Details */}
          {invoice.company_bank_name && (
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs font-semibold mb-3 text-foreground">
                Payment Information
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                {invoice.company_bank_account_name && (
                  <div>
                    <span className="text-muted-foreground">
                      Account Name:{" "}
                    </span>
                    {invoice.company_bank_account_name}
                  </div>
                )}
                {invoice.company_bank_account_number && (
                  <div>
                    <span className="text-muted-foreground">Account No: </span>
                    {invoice.company_bank_account_number}
                  </div>
                )}
                {invoice.company_bank_name && (
                  <div>
                    <span className="text-muted-foreground">Bank: </span>
                    {invoice.company_bank_name}
                  </div>
                )}
                {invoice.company_bank_ifsc && (
                  <div>
                    <span className="text-muted-foreground">IFSC: </span>
                    {invoice.company_bank_ifsc}
                  </div>
                )}
                {invoice.company_bank_swift && (
                  <div>
                    <span className="text-muted-foreground">SWIFT: </span>
                    {invoice.company_bank_swift}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes / Terms */}
          {(invoice.notes || invoice.terms) && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              {invoice.notes && (
                <div>
                  <p className="text-xs font-semibold mb-1">Notes</p>
                  <p className="text-xs text-muted-foreground">
                    {invoice.notes}
                  </p>
                </div>
              )}
              {invoice.terms && (
                <div>
                  <p className="text-xs font-semibold mb-1">
                    Terms & Conditions
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {invoice.terms}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Panel: Status Actions + History */}
        <div className="space-y-4">
          {/* Quick Status Change */}
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-semibold mb-3">Update Status</p>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs h-8 gap-2 text-green-700 border-green-200 hover:bg-green-50"
                onClick={() => handleStatus("Paid")}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Mark as Paid
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs h-8 gap-2 text-orange-700 border-orange-200 hover:bg-orange-50"
                onClick={() => handleStatus("Pending")}
              >
                <Clock className="w-3.5 h-3.5" />
                Mark as Pending
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs h-8 gap-2 text-sky-700 border-sky-200 hover:bg-sky-50"
                onClick={() => handleStatus("Sent")}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Mark as Sent
              </Button>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-2">
            <p className="text-xs font-semibold mb-2">Invoice Details</p>
            {[
              ["Currency", invoice.currency],
              ["Payment Method", invoice.payment_method || "-"],
              ["Transaction ID", invoice.transaction_id || "-"],
              ["Payment Date", formatDate(invoice.payment_date)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium truncate ml-2 max-w-[120px]">
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* History Timeline */}
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-semibold mb-3">Activity History</p>
            <div className="space-y-3">
              {/* Static timestamps */}
              <TimelineItem
                label="Created"
                value={formatDateTime(invoice.created_at)}
              />
              <TimelineItem
                label="Last Updated"
                value={formatDateTime(invoice.updated_at)}
              />
              {invoice.paid_at && (
                <TimelineItem
                  label="Paid"
                  value={formatDateTime(invoice.paid_at)}
                  color="text-green-600"
                />
              )}
              {invoice.printed_at && (
                <TimelineItem
                  label="Printed"
                  value={formatDateTime(invoice.printed_at)}
                />
              )}
              {invoice.downloaded_at && (
                <TimelineItem
                  label="Downloaded"
                  value={formatDateTime(invoice.downloaded_at)}
                />
              )}

              {/* DB history */}
              {history.length > 0 && (
                <div className="pt-2 border-t border-border mt-2 space-y-2.5">
                  {history.map((h) => (
                    <div key={h.id} className="flex gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground">
                          {h.action}
                        </p>
                        {h.description && (
                          <p className="text-xs text-muted-foreground">
                            {h.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(h.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {invoice.invoice_number}. This cannot
              be undone.
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
    </div>
  );
}

function TimelineItem({
  label,
  value,
  color = "text-foreground",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex gap-2">
      <div className="w-1.5 h-1.5 rounded-full bg-border mt-1.5 shrink-0" />
      <div>
        <p className={`text-xs font-medium ${color}`}>{label}</p>
        <p className="text-xs text-muted-foreground">{value}</p>
      </div>
    </div>
  );
}
