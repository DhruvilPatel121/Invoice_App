import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Edit, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  getClients,
  createClient,
  updateClient,
  deleteClient,
  getInvoicesByClient,
} from "@/services/api";
import type { Client, Invoice } from "@/types/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import StatusBadge from "@/components/invoice/StatusBadge";

const emptyClient = (): Omit<Client, "id" | "created_at" | "updated_at"> => ({
  client_name: "",
  company_name: "",
  gst_number: "",
  address: "",
  email: "",
  phone: "",
  state: "",
  country: "India",
  zip_code: "",
  notes: "",
});

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState(emptyClient());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientInvoices, setClientInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    const data = await getClients(search || undefined);
    setClients(data);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchClients, 300);
    return () => clearTimeout(t);
  }, [fetchClients]);

  const openCreate = () => {
    setEditClient(null);
    setFormData(emptyClient());
    setDialogOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditClient(client);
    setFormData({
      client_name: client.client_name,
      company_name: client.company_name,
      gst_number: client.gst_number,
      address: client.address,
      email: client.email,
      phone: client.phone,
      state: client.state,
      country: client.country,
      zip_code: client.zip_code,
      notes: client.notes,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.client_name) {
      toast.error("Client name is required");
      return;
    }
    setSaving(true);
    if (editClient) {
      const result = await updateClient(editClient.id, formData);
      if (result) {
        toast.success("Client updated");
        fetchClients();
      }
    } else {
      const result = await createClient(formData);
      if (result) {
        toast.success("Client created");
        fetchClients();
      }
    }
    setSaving(false);
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteClient(deleteId);
    toast.success("Client deleted");
    setDeleteId(null);
    if (selectedClient?.id === deleteId) setSelectedClient(null);
    fetchClients();
  };

  const handleSelectClient = async (client: Client) => {
    setSelectedClient(client);
    setInvoicesLoading(true);
    const { data } = await getInvoicesByClient(client.id, 1, 20);
    setClientInvoices(data);
    setInvoicesLoading(false);
  };

  const set = (key: string, value: string) =>
    setFormData((f) => ({ ...f, [key]: value }));

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold">Clients</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {clients.length} clients
          </p>
        </div>
        <Button
          size="sm"
          className="h-8 text-xs gap-1.5 shrink-0"
          onClick={openCreate}
        >
          <Plus className="w-3.5 h-3.5" />
          New Client
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Client List */}
        <div className="xl:col-span-1 space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              className="pl-8 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-3">
                  <Skeleton className="h-12 w-full" />
                </div>
              ))
            ) : clients.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground">No clients yet</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs mt-2"
                  onClick={openCreate}
                >
                  Add first client
                </Button>
              </div>
            ) : (
              clients.map((client) => (
                <div
                  key={client.id}
                  className={`p-3 cursor-pointer hover:bg-muted/30 transition-colors ${selectedClient?.id === client.id ? "bg-muted/50" : ""}`}
                  onClick={() => handleSelectClient(client)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {client.client_name}
                      </p>
                      {client.company_name && (
                        <p className="text-xs text-muted-foreground truncate">
                          {client.company_name}
                        </p>
                      )}
                      {client.email && (
                        <p className="text-xs text-primary truncate">
                          {client.email}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(client);
                        }}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(client.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Client Detail Panel */}
        <div className="xl:col-span-2">
          {!selectedClient ? (
            <div className="h-full rounded-lg border border-dashed border-border flex items-center justify-center p-8">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Select a client to view details
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs mt-3"
                  onClick={openCreate}
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Add New Client
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Client Info Card */}
              <div className="rounded-lg border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-base font-semibold">
                      {selectedClient.client_name}
                    </h2>
                    {selectedClient.company_name && (
                      <p className="text-sm text-muted-foreground">
                        {selectedClient.company_name}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 gap-1"
                      onClick={() => openEdit(selectedClient)}
                    >
                      <Edit className="w-3 h-3" />
                      Edit
                    </Button>
                    <Link to={`/invoices/create?client=${selectedClient.id}`}>
                      <Button size="sm" className="text-xs h-7 gap-1">
                        <Plus className="w-3 h-3" />
                        Invoice
                      </Button>
                    </Link>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  {selectedClient.email && (
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p className="font-medium text-primary">
                        {selectedClient.email}
                      </p>
                    </div>
                  )}
                  {selectedClient.phone && (
                    <div>
                      <p className="text-muted-foreground">Phone</p>
                      <p className="font-medium">{selectedClient.phone}</p>
                    </div>
                  )}
                  {selectedClient.gst_number && (
                    <div>
                      <p className="text-muted-foreground">GSTIN</p>
                      <p className="font-medium">{selectedClient.gst_number}</p>
                    </div>
                  )}
                  {selectedClient.state && (
                    <div>
                      <p className="text-muted-foreground">State</p>
                      <p className="font-medium">{selectedClient.state}</p>
                    </div>
                  )}
                  {selectedClient.country && (
                    <div>
                      <p className="text-muted-foreground">Country</p>
                      <p className="font-medium">{selectedClient.country}</p>
                    </div>
                  )}
                  {selectedClient.zip_code && (
                    <div>
                      <p className="text-muted-foreground">ZIP</p>
                      <p className="font-medium">{selectedClient.zip_code}</p>
                    </div>
                  )}
                  {selectedClient.address && (
                    <div className="col-span-full">
                      <p className="text-muted-foreground">Address</p>
                      <p className="font-medium">{selectedClient.address}</p>
                    </div>
                  )}
                  {selectedClient.notes && (
                    <div className="col-span-full">
                      <p className="text-muted-foreground">Notes</p>
                      <p className="font-medium">{selectedClient.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Client Invoices */}
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <h3 className="text-sm font-semibold">Invoice History</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full whitespace-nowrap">
                    <thead className="bg-muted/40 border-b border-border">
                      <tr>
                        {["Invoice #", "Date", "Amount", "Status", ""].map(
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
                      {invoicesLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <tr key={i}>
                            {Array.from({ length: 5 }).map((_, j) => (
                              <td key={j} className="px-4 py-2.5">
                                <Skeleton className="h-4 w-16" />
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : clientInvoices.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-6 text-center text-xs text-muted-foreground"
                          >
                            No invoices yet for this client
                          </td>
                        </tr>
                      ) : (
                        clientInvoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-muted/20">
                            <td className="px-4 py-2.5 text-xs font-medium text-primary">
                              {inv.invoice_number}
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
                            <td className="px-4 py-2.5">
                              <Link to={`/invoices/${inv.id}`}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                >
                                  <FileText className="w-3 h-3" />
                                </Button>
                              </Link>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl overflow-y-auto max-h-[90dvh]">
          <DialogHeader>
            <DialogTitle>
              {editClient ? "Edit Client" : "New Client"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            <Field label="Client Name *">
              <Input
                value={formData.client_name}
                onChange={(e) => set("client_name", e.target.value)}
              />
            </Field>
            <Field label="Company Name">
              <Input
                value={formData.company_name}
                onChange={(e) => set("company_name", e.target.value)}
              />
            </Field>
            <Field label="GST Number">
              <Input
                value={formData.gst_number}
                onChange={(e) => set("gst_number", e.target.value)}
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </Field>
            <Field label="Phone">
              <Input
                value={formData.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </Field>
            <Field label="State">
              <Input
                value={formData.state}
                onChange={(e) => set("state", e.target.value)}
              />
            </Field>
            <Field label="Country">
              <Input
                value={formData.country}
                onChange={(e) => set("country", e.target.value)}
              />
            </Field>
            <Field label="ZIP Code">
              <Input
                value={formData.zip_code}
                onChange={(e) => set("zip_code", e.target.value)}
              />
            </Field>
            <Field label="Address" className="md:col-span-2">
              <Textarea
                rows={2}
                value={formData.address}
                onChange={(e) => set("address", e.target.value)}
              />
            </Field>
            <Field label="Notes" className="md:col-span-2">
              <Textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="text-xs"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : editClient ? "Update" : "Create Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Alert */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the client. Existing invoices will
              not be affected.
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

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="text-xs mb-1.5 block text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
