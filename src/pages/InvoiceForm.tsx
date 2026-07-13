import React, { useEffect, useState } from "react";
import {
  useParams,
  useNavigate,
  useSearchParams,
  Link,
} from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getInvoiceById,
  createInvoice,
  updateInvoice,
  generateInvoiceNumber,
  getCompanySettings,
  getClients,
  getClientById,
  uploadAsset,
} from "@/services/api";
import type {
  Client,
  InvoiceFormData,
  InvoiceItemFormData,
} from "@/types/types";
import {
  CURRENCIES,
  PAYMENT_TERMS,
  UNITS,
  PAYMENT_METHODS,
  type InvoiceStatus,
} from "@/types/types";
import { amountToWords, formatCurrency } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

const STATUSES: InvoiceStatus[] = [
  "Draft",
  "Sent",
  "Viewed",
  "Paid",
  "Pending",
  "Partially Paid",
  "Cancelled",
  "Overdue",
];
const DISCOUNT_TYPES = [
  { value: "none", label: "No Discount" },
  { value: "percentage", label: "Percentage (%)" },
  { value: "fixed", label: "Fixed Amount" },
  { value: "coupon", label: "Coupon Code" },
];

const defaultItem = (): InvoiceItemFormData => ({
  description: "",
  hsn_sac: "",
  quantity: 1,
  unit: "Nos",
  rate: 0,
  discount_percent: 0,
  tax_percent: 0,
  amount: 0,
});

function calcItemAmount(item: InvoiceItemFormData): number {
  const base = (item.quantity || 0) * (item.rate || 0);
  const discounted = base - (base * (item.discount_percent || 0)) / 100;
  return discounted + (discounted * (item.tax_percent || 0)) / 100;
}

export default function InvoiceForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEdit = !!id;
  const preselectedClientId = searchParams.get("client");

  const [clients, setClients] = useState<Client[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openSections, setOpenSections] = useState({
    company: false,
    client: true,
    invoice: true,
    items: true,
    gst: true,
    discount: false,
    payment: false,
  });
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {},
  );

  const { register, control, handleSubmit, watch, setValue, reset } =
    useForm<InvoiceFormData>({
      defaultValues: {
        client_id: "",
        client_name: "",
        client_company: "",
        client_gst: "",
        client_address: "",
        client_email: "",
        client_phone: "",
        client_state: "",
        client_country: "India",
        client_zip: "",
        invoice_date: new Date().toISOString().split("T")[0],
        due_date: "",
        payment_terms: "Net 30",
        currency: "INR",
        status: "Draft",
        items: [defaultItem()],
        gst_enabled: false,
        cgst_rate: 9,
        sgst_rate: 9,
        igst_rate: 0,
        discount_type: "none",
        discount_value: 0,
        coupon_code: "",
        round_off: 0,
        payment_method: "",
        transaction_id: "",
        payment_date: "",
        payment_notes: "",
        notes: "",
        terms: "",
      },
    });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items");
  const watchCurrency = watch("currency");
  const watchGst = watch("gst_enabled");
  const watchCgst = watch("cgst_rate");
  const watchSgst = watch("sgst_rate");
  const watchIgst = watch("igst_rate");
  const watchDiscountType = watch("discount_type");
  const watchDiscountValue = watch("discount_value");
  const watchRoundOff = watch("round_off");

  // Calculations
  const subtotal =
    watchedItems?.reduce((s, item) => s + calcItemAmount(item), 0) || 0;
  const discountAmount = (() => {
    if (watchDiscountType === "percentage")
      return (subtotal * (watchDiscountValue || 0)) / 100;
    if (watchDiscountType === "fixed") return watchDiscountValue || 0;
    return 0;
  })();
  const afterDiscount = subtotal - discountAmount;
  const cgstAmt = watchGst ? (afterDiscount * (watchCgst || 0)) / 100 : 0;
  const sgstAmt = watchGst ? (afterDiscount * (watchSgst || 0)) / 100 : 0;
  const igstAmt = watchGst ? (afterDiscount * (watchIgst || 0)) / 100 : 0;
  const totalGst = cgstAmt + sgstAmt + igstAmt;
  const grandTotal = afterDiscount + totalGst + (watchRoundOff || 0);

  // Company fields (stored locally for form but come from settings)
  const [companyData, setCompanyData] = useState({
    company_name: "",
    company_address: "",
    company_gst: "",
    company_email: "",
    company_phone: "",
    company_website: "",
    company_logo_url: "",
    company_signature_url: "",
    company_seal_url: "",
    company_upi_qr_url: "",
    company_bank_account_name: "",
    company_bank_account_number: "",
    company_bank_name: "",
    company_bank_ifsc: "",
    company_bank_swift: "",
  });

  useEffect(() => {
    async function init() {
      setLoading(true);

      // Fetch base data in parallel
      const [s, c, num] = await Promise.all([
        getCompanySettings(),
        getClients(),
        isEdit ? Promise.resolve("") : generateInvoiceNumber(),
      ]);
      setClients(c);
      if (!isEdit) setInvoiceNumber(num);

      // Apply company settings defaults for NEW invoices
      if (s) {
        setCompanyData({
          company_name: s.company_name || "",
          company_address: s.address || "",
          company_gst: s.gst_number || "",
          company_email: s.email || "",
          company_phone: s.phone || "",
          company_website: s.website || "",
          company_logo_url: s.logo_url || "",
          company_signature_url: s.signature_url || "",
          company_seal_url: s.seal_url || "",
          company_upi_qr_url: s.upi_qr_url || "",
          company_bank_account_name: s.bank_account_name || "",
          company_bank_account_number: s.bank_account_number || "",
          company_bank_name: s.bank_name || "",
          company_bank_ifsc: s.bank_ifsc || "",
          company_bank_swift: s.bank_swift || "",
        });
        if (!isEdit) {
          reset((prev) => ({
            ...prev,
            currency: s.default_currency || "INR",
            payment_terms: s.default_payment_terms || "Net 30",
            notes: s.default_notes || "",
            terms: s.default_terms || "",
            gst_enabled: false,
            cgst_rate: s.default_gst_rate ? s.default_gst_rate / 2 : 9,
            sgst_rate: s.default_gst_rate ? s.default_gst_rate / 2 : 9,
          }));
        }
      }

      // Pre-populate client from URL ?client=<id>
      if (!isEdit && preselectedClientId) {
        const preClient = await getClientById(preselectedClientId);
        if (preClient) {
          reset((prev) => ({
            ...prev,
            client_id: preClient.id,
            client_name: preClient.client_name,
            client_company: preClient.company_name || "",
            client_gst: preClient.gst_number || "",
            client_address: preClient.address || "",
            client_email: preClient.email || "",
            client_phone: preClient.phone || "",
            client_state: preClient.state || "",
            client_country: preClient.country || "India",
            client_zip: preClient.zip_code || "",
          }));
        }
      }

      // Load existing invoice for EDIT mode
      if (isEdit && id) {
        const inv = await getInvoiceById(id);
        if (inv) {
          setInvoiceNumber(inv.invoice_number);
          setCompanyData({
            company_name: inv.company_name,
            company_address: inv.company_address,
            company_gst: inv.company_gst,
            company_email: inv.company_email,
            company_phone: inv.company_phone,
            company_website: inv.company_website,
            company_logo_url: inv.company_logo_url,
            company_signature_url: inv.company_signature_url,
            company_seal_url: inv.company_seal_url,
            company_upi_qr_url: inv.company_upi_qr_url,
            company_bank_account_name: inv.company_bank_account_name,
            company_bank_account_number: inv.company_bank_account_number,
            company_bank_name: inv.company_bank_name,
            company_bank_ifsc: inv.company_bank_ifsc,
            company_bank_swift: inv.company_bank_swift,
          });
          reset({
            client_id: inv.client_id || "",
            client_name: inv.client_name,
            client_company: inv.client_company,
            client_gst: inv.client_gst,
            client_address: inv.client_address,
            client_email: inv.client_email,
            client_phone: inv.client_phone,
            client_state: inv.client_state,
            client_country: inv.client_country,
            client_zip: inv.client_zip,
            invoice_date: inv.invoice_date,
            due_date: inv.due_date || "",
            payment_terms: inv.payment_terms,
            currency: inv.currency,
            status: inv.status,
            items: (inv.items || []).map((item) => ({
              id: item.id,
              description: item.description,
              hsn_sac: item.hsn_sac,
              quantity: item.quantity,
              unit: item.unit,
              rate: item.rate,
              discount_percent: item.discount_percent,
              tax_percent: item.tax_percent,
              amount: item.amount,
            })),
            gst_enabled: inv.gst_enabled,
            cgst_rate: inv.cgst_rate,
            sgst_rate: inv.sgst_rate,
            igst_rate: inv.igst_rate,
            discount_type: inv.discount_type,
            discount_value: inv.discount_value,
            coupon_code: inv.coupon_code,
            round_off: inv.round_off,
            payment_method: inv.payment_method,
            transaction_id: inv.transaction_id,
            payment_date: inv.payment_date || "",
            payment_notes: inv.payment_notes,
            notes: inv.notes,
            terms: inv.terms,
          });
        }
      }
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit, preselectedClientId]);

  const handleClientSelect = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      setValue("client_id", client.id);
      setValue("client_name", client.client_name);
      setValue("client_company", client.company_name);
      setValue("client_gst", client.gst_number);
      setValue("client_address", client.address);
      setValue("client_email", client.email);
      setValue("client_phone", client.phone);
      setValue("client_state", client.state);
      setValue("client_country", client.country);
      setValue("client_zip", client.zip_code);
    }
  };

  const handleFileUpload = async (
    field: keyof typeof companyData,
    file: File,
  ) => {
    const path = `shivvilon/${field}_${Date.now()}`;
    setUploadProgress((p) => ({ ...p, [field]: 5 }));
    const url = await uploadAsset(file, "company-assets", path, (pct) => {
      setUploadProgress((p) => ({ ...p, [field]: pct }));
    });
    setUploadProgress((p) => ({ ...p, [field]: 0 }));
    if (url) {
      setCompanyData((d) => ({ ...d, [field]: url }));
      toast.success("Image uploaded");
    } else {
      toast.error("Upload failed");
    }
  };

  const onSubmit = async (data: InvoiceFormData) => {
    if (!data.client_name) {
      toast.error("Client name is required");
      return;
    }
    if (!data.items?.length) {
      toast.error("Add at least one item");
      return;
    }
    setSaving(true);

    const invoiceData = {
      invoice_number: invoiceNumber,
      invoice_year: new Date().getFullYear(),
      invoice_seq: 0,
      ...companyData,
      client_id: data.client_id || null,
      client_name: data.client_name,
      client_company: data.client_company || "",
      client_gst: data.client_gst || "",
      client_address: data.client_address || "",
      client_email: data.client_email || "",
      client_phone: data.client_phone || "",
      client_state: data.client_state || "",
      client_country: data.client_country || "India",
      client_zip: data.client_zip || "",
      invoice_date: data.invoice_date,
      due_date: data.due_date || null,
      payment_terms: data.payment_terms || "",
      currency: data.currency || "INR",
      status: data.status,
      subtotal,
      discount_type: data.discount_type,
      discount_value: data.discount_value || 0,
      discount_amount: discountAmount,
      coupon_code: data.coupon_code || "",
      round_off: data.round_off || 0,
      gst_enabled: data.gst_enabled,
      cgst_rate: data.cgst_rate || 0,
      sgst_rate: data.sgst_rate || 0,
      igst_rate: data.igst_rate || 0,
      cgst_amount: cgstAmt,
      sgst_amount: sgstAmt,
      igst_amount: igstAmt,
      total_gst: totalGst,
      grand_total: grandTotal,
      paid_amount: data.status === "Paid" ? grandTotal : 0,
      pending_amount: data.status === "Paid" ? 0 : grandTotal,
      payment_method: data.payment_method || "",
      transaction_id: data.transaction_id || "",
      payment_date: data.payment_date || null,
      payment_notes: data.payment_notes || "",
      notes: data.notes || "",
      terms: data.terms || "",
      paid_at: data.status === "Paid" ? new Date().toISOString() : null,
      printed_at: null,
      downloaded_at: null,
      last_modified_by: "User",
    };

    const items = (data.items || []).map((item) => ({
      description: item.description,
      hsn_sac: item.hsn_sac || "",
      quantity: item.quantity || 0,
      unit: item.unit || "Nos",
      rate: item.rate || 0,
      discount_percent: item.discount_percent || 0,
      tax_percent: item.tax_percent || 0,
      amount: calcItemAmount(item),
      sort_order: 0,
    }));

    try {
      let result;
      if (isEdit && id) {
        result = await updateInvoice(id, invoiceData, items);
      } else {
        result = await createInvoice(invoiceData, items);
      }
      if (result) {
        toast.success(isEdit ? "Invoice updated" : "Invoice created");
        navigate(`/invoices/${result.id}`);
      } else {
        toast.error("Failed to save invoice");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const toggle = (key: keyof typeof openSections) =>
    setOpenSections((s) => ({ ...s, [key]: !s[key] }));

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/invoices"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold truncate">
              {isEdit ? "Edit Invoice" : "New Invoice"}
            </h1>
            <p className="text-xs text-muted-foreground">{invoiceNumber}</p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs h-8"
            onClick={() => {
              setValue("status", "Draft");
              handleSubmit(onSubmit)();
            }}
          >
            Save Draft
          </Button>
          <Button
            type="submit"
            size="sm"
            className="text-xs h-8"
            disabled={saving}
          >
            {saving ? "Saving..." : isEdit ? "Update" : "Create Invoice"}
          </Button>
        </div>
      </div>

      {/* Company Info Section */}
      <SectionCard
        title="Company Information"
        open={openSections.company}
        onToggle={() => toggle("company")}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Company Name">
            <Input
              value={companyData.company_name}
              onChange={(e) =>
                setCompanyData((d) => ({ ...d, company_name: e.target.value }))
              }
            />
          </FormField>
          <FormField label="GST Number (Optional)">
            <Input
              value={companyData.company_gst}
              onChange={(e) =>
                setCompanyData((d) => ({ ...d, company_gst: e.target.value }))
              }
              placeholder="24XXXXX0000X1Z2"
            />
          </FormField>
          <FormField label="Email">
            <Input
              type="email"
              value={companyData.company_email}
              onChange={(e) =>
                setCompanyData((d) => ({ ...d, company_email: e.target.value }))
              }
            />
          </FormField>
          <FormField label="Phone">
            <Input
              value={companyData.company_phone}
              onChange={(e) =>
                setCompanyData((d) => ({ ...d, company_phone: e.target.value }))
              }
            />
          </FormField>
          <FormField label="Website">
            <Input
              value={companyData.company_website}
              onChange={(e) =>
                setCompanyData((d) => ({
                  ...d,
                  company_website: e.target.value,
                }))
              }
            />
          </FormField>
          <FormField label="Address" className="md:col-span-2">
            <Textarea
              rows={2}
              value={companyData.company_address}
              onChange={(e) =>
                setCompanyData((d) => ({
                  ...d,
                  company_address: e.target.value,
                }))
              }
            />
          </FormField>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border mt-4">
          <p className="text-xs font-semibold col-span-full text-muted-foreground uppercase tracking-wide">
            Bank Details
          </p>
          <FormField label="Account Name">
            <Input
              value={companyData.company_bank_account_name}
              onChange={(e) =>
                setCompanyData((d) => ({
                  ...d,
                  company_bank_account_name: e.target.value,
                }))
              }
            />
          </FormField>
          <FormField label="Account Number">
            <Input
              value={companyData.company_bank_account_number}
              onChange={(e) =>
                setCompanyData((d) => ({
                  ...d,
                  company_bank_account_number: e.target.value,
                }))
              }
            />
          </FormField>
          <FormField label="Bank Name">
            <Input
              value={companyData.company_bank_name}
              onChange={(e) =>
                setCompanyData((d) => ({
                  ...d,
                  company_bank_name: e.target.value,
                }))
              }
            />
          </FormField>
          <FormField label="IFSC Code">
            <Input
              value={companyData.company_bank_ifsc}
              onChange={(e) =>
                setCompanyData((d) => ({
                  ...d,
                  company_bank_ifsc: e.target.value,
                }))
              }
            />
          </FormField>
          <FormField label="SWIFT Code">
            <Input
              value={companyData.company_bank_swift}
              onChange={(e) =>
                setCompanyData((d) => ({
                  ...d,
                  company_bank_swift: e.target.value,
                }))
              }
            />
          </FormField>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-border mt-4">
          <p className="text-xs font-semibold col-span-full text-muted-foreground uppercase tracking-wide">
            Uploads
          </p>
          {(
            [
              ["company_logo_url", "Company Logo"],
              ["company_signature_url", "Authorized Signature"],
              ["company_seal_url", "Company Seal"],
              ["company_upi_qr_url", "UPI QR Code"],
            ] as [keyof typeof companyData, string][]
          ).map(([field, label]) => (
            <div key={field}>
              <Label className="text-xs mb-1.5 block">{label}</Label>
              {companyData[field] ? (
                <div className="relative inline-block">
                  <img
                    src={companyData[field] as string}
                    alt={label}
                    className="h-12 rounded border object-contain"
                  />
                  <button
                    type="button"
                    className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-4 h-4 flex items-center justify-center text-xs"
                    onClick={() =>
                      setCompanyData((d) => ({ ...d, [field]: "" }))
                    }
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer flex items-center gap-1.5 text-xs text-muted-foreground border border-dashed rounded px-2 py-2 hover:border-primary transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0])
                        handleFileUpload(field, e.target.files[0]);
                    }}
                  />
                </label>
              )}
              {(uploadProgress[field] || 0) > 0 && (
                <Progress value={uploadProgress[field]} className="h-1 mt-1" />
              )}
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Client Info */}
      <SectionCard
        title="Client Information"
        open={openSections.client}
        onToggle={() => toggle("client")}
      >
        <div className="mb-3">
          <Label className="text-xs mb-1.5 block">Select Existing Client</Label>
          <Select onValueChange={handleClientSelect}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Pick a saved client or enter below..." />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.client_name} {c.company_name ? `- ${c.company_name}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Client Name *">
            <Input
              {...register("client_name", { required: true })}
              placeholder="Contact name"
            />
          </FormField>
          <FormField label="Company Name">
            <Input {...register("client_company")} />
          </FormField>
          <FormField label="GST Number (Optional)">
            <Input {...register("client_gst")} placeholder="24XXXXX0000X1Z2" />
          </FormField>
          <FormField label="Email">
            <Input type="email" {...register("client_email")} />
          </FormField>
          <FormField label="Phone">
            <Input {...register("client_phone")} />
          </FormField>
          <FormField label="State">
            <Input {...register("client_state")} />
          </FormField>
          <FormField label="Country">
            <Input {...register("client_country")} />
          </FormField>
          <FormField label="ZIP Code">
            <Input {...register("client_zip")} />
          </FormField>
          <FormField label="Address" className="md:col-span-2">
            <Textarea rows={2} {...register("client_address")} />
          </FormField>
        </div>
      </SectionCard>

      {/* Invoice Details */}
      <SectionCard
        title="Invoice Details"
        open={openSections.invoice}
        onToggle={() => toggle("invoice")}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <FormField label="Invoice Number">
            <Input
              value={invoiceNumber}
              disabled
              className="bg-muted text-muted-foreground"
            />
          </FormField>
          <FormField label="Invoice Date">
            <Input type="date" {...register("invoice_date")} />
          </FormField>
          <FormField label="Due Date">
            <Input type="date" {...register("due_date")} />
          </FormField>
          <FormField label="Payment Terms">
            <Select
              value={watch("payment_terms")}
              onValueChange={(v) => setValue("payment_terms", v)}
            >
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_TERMS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Currency">
            <Select
              value={watchCurrency}
              onValueChange={(v) => setValue("currency", v)}
            >
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.symbol} {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Status">
            <Select
              value={watch("status")}
              onValueChange={(v) => setValue("status", v as InvoiceStatus)}
            >
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>
      </SectionCard>

      {/* Items */}
      <SectionCard
        title="Invoice Items"
        open={openSections.items}
        onToggle={() => toggle("items")}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-border">
                {[
                  "Description",
                  "HSN/SAC",
                  "Qty",
                  "Unit",
                  "Rate",
                  "Disc%",
                  ...(watchGst ? ["Tax%"] : []),
                  "Amount",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left pb-2 text-xs font-medium text-muted-foreground px-1"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fields.map((field, i) => {
                const item = watchedItems?.[i];
                const amount = item ? calcItemAmount(item) : 0;
                return (
                  <tr key={field.id} className="border-b border-border/50">
                    <td className="px-1 py-1.5 w-40">
                      <Input
                        className="text-xs h-8"
                        {...register(`items.${i}.description`)}
                        placeholder="Item description"
                      />
                    </td>
                    <td className="px-1 py-1.5 w-20">
                      <Input
                        className="text-xs h-8"
                        {...register(`items.${i}.hsn_sac`)}
                        placeholder="998314"
                      />
                    </td>
                    <td className="px-1 py-1.5 w-16">
                      <Input
                        type="number"
                        min="0"
                        step="0.001"
                        className="text-xs h-8"
                        {...register(`items.${i}.quantity`, {
                          valueAsNumber: true,
                          min: 0,
                        })}
                      />
                    </td>
                    <td className="px-1 py-1.5 w-20">
                      <Select
                        value={watchedItems?.[i]?.unit || "Nos"}
                        onValueChange={(v) => setValue(`items.${i}.unit`, v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNITS.map((u) => (
                            <SelectItem key={u} value={u}>
                              {u}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-1 py-1.5 w-24">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="text-xs h-8"
                        {...register(`items.${i}.rate`, {
                          valueAsNumber: true,
                          min: 0,
                        })}
                      />
                    </td>
                    <td className="px-1 py-1.5 w-16">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        className="text-xs h-8"
                        {...register(`items.${i}.discount_percent`, {
                          valueAsNumber: true,
                        })}
                      />
                    </td>
                    {watchGst && (
                      <td className="px-1 py-1.5 w-16">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          className="text-xs h-8"
                          {...register(`items.${i}.tax_percent`, {
                            valueAsNumber: true,
                          })}
                        />
                      </td>
                    )}
                    <td className="px-1 py-1.5 w-24 text-right text-xs font-medium">
                      {formatCurrency(amount, watchCurrency)}
                    </td>
                    <td className="px-1 py-1.5 w-8">
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => remove(i)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 text-xs h-8 gap-1.5"
          onClick={() => append(defaultItem())}
        >
          <Plus className="w-3.5 h-3.5" />
          Add Item
        </Button>

        {/* Totals Summary */}
        <div className="flex justify-end mt-4">
          <div className="w-full max-w-xs space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(subtotal, watchCurrency)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span className="text-green-600">
                  - {formatCurrency(discountAmount, watchCurrency)}
                </span>
              </div>
            )}
            {watchGst && totalGst > 0 && (
              <>
                {cgstAmt > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      CGST ({watch("cgst_rate")}%)
                    </span>
                    <span>{formatCurrency(cgstAmt, watchCurrency)}</span>
                  </div>
                )}
                {sgstAmt > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      SGST ({watch("sgst_rate")}%)
                    </span>
                    <span>{formatCurrency(sgstAmt, watchCurrency)}</span>
                  </div>
                )}
                {igstAmt > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      IGST ({watch("igst_rate")}%)
                    </span>
                    <span>{formatCurrency(igstAmt, watchCurrency)}</span>
                  </div>
                )}
              </>
            )}
            <div className="flex justify-between font-semibold pt-1.5 border-t border-border text-sm">
              <span>Grand Total</span>
              <span className="text-primary">
                {formatCurrency(grandTotal, watchCurrency)}
              </span>
            </div>
            {grandTotal > 0 && (
              <p className="text-xs text-muted-foreground pt-1 italic">
                {amountToWords(grandTotal, watchCurrency)}
              </p>
            )}
          </div>
        </div>
      </SectionCard>

      {/* GST Settings */}
      <SectionCard
        title="GST Settings"
        open={openSections.gst}
        onToggle={() => toggle("gst")}
      >
        <div className="flex items-center gap-3 mb-4">
          <Switch
            checked={watchGst}
            onCheckedChange={(v) => setValue("gst_enabled", v)}
          />
          <span className="text-sm">
            {watchGst ? "GST Enabled" : "GST Disabled"}
          </span>
        </div>
        {watchGst && (
          <div className="grid grid-cols-3 gap-4">
            <FormField label="CGST Rate (%)">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                {...register("cgst_rate", { valueAsNumber: true })}
              />
            </FormField>
            <FormField label="SGST Rate (%)">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                {...register("sgst_rate", { valueAsNumber: true })}
              />
            </FormField>
            <FormField label="IGST Rate (%)">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                {...register("igst_rate", { valueAsNumber: true })}
              />
            </FormField>
          </div>
        )}
      </SectionCard>

      {/* Discount */}
      <SectionCard
        title="Discount & Adjustments"
        open={openSections.discount}
        onToggle={() => toggle("discount")}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <FormField label="Discount Type">
            <Select
              value={watchDiscountType}
              onValueChange={(v) =>
                setValue(
                  "discount_type",
                  v as "none" | "percentage" | "fixed" | "coupon",
                )
              }
            >
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DISCOUNT_TYPES.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          {watchDiscountType !== "none" && watchDiscountType !== "coupon" && (
            <FormField
              label={
                watchDiscountType === "percentage"
                  ? "Discount %"
                  : "Discount Amount"
              }
            >
              <Input
                type="number"
                min="0"
                step="0.01"
                {...register("discount_value", { valueAsNumber: true })}
              />
            </FormField>
          )}
          {watchDiscountType === "coupon" && (
            <FormField label="Coupon Code">
              <Input {...register("coupon_code")} placeholder="SAVE10" />
            </FormField>
          )}
          <FormField label="Round Off">
            <Input
              type="number"
              step="0.01"
              {...register("round_off", { valueAsNumber: true })}
              placeholder="0.00"
            />
          </FormField>
        </div>
      </SectionCard>

      {/* Payment Details */}
      <SectionCard
        title="Payment Details"
        open={openSections.payment}
        onToggle={() => toggle("payment")}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Payment Method">
            <Select
              value={watch("payment_method")}
              onValueChange={(v) => setValue("payment_method", v)}
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Transaction ID">
            <Input
              {...register("transaction_id")}
              placeholder="UTR / Cheque No."
            />
          </FormField>
          <FormField label="Payment Date">
            <Input type="date" {...register("payment_date")} />
          </FormField>
          <FormField label="Payment Notes" className="md:col-span-2">
            <Textarea rows={2} {...register("payment_notes")} />
          </FormField>
        </div>
      </SectionCard>

      {/* Notes & Terms */}
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm font-semibold mb-3">Notes & Terms</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Notes (visible on invoice)">
            <Textarea
              rows={3}
              {...register("notes")}
              placeholder="Thank you for your business!"
            />
          </FormField>
          <FormField label="Terms & Conditions">
            <Textarea
              rows={3}
              {...register("terms")}
              placeholder="Payment due within..."
            />
          </FormField>
        </div>
      </div>

      {/* Footer Submit */}
      <div className="flex justify-end gap-2 pb-6">
        <Link to="/invoices">
          <Button type="button" variant="outline" size="sm" className="text-xs">
            Cancel
          </Button>
        </Link>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => {
            setValue("status", "Draft");
            handleSubmit(onSubmit)();
          }}
        >
          Save as Draft
        </Button>
        <Button type="submit" size="sm" className="text-xs" disabled={saving}>
          {saving ? "Saving..." : isEdit ? "Update Invoice" : "Create Invoice"}
        </Button>
      </div>
    </form>
  );
}

function SectionCard({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        <span className="text-sm font-semibold">{title}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </button>
      {open && <div className="p-4 border-t border-border">{children}</div>}
    </div>
  );
}

function FormField({
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
