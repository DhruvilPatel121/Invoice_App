import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Upload,
  X,
  Save,
  Download,
  Upload as UploadIcon,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  getCompanySettings,
  upsertCompanySettings,
  uploadAsset,
} from "@/services/api";
import type { CompanySettings } from "@/types/types";
import { CURRENCIES } from "@/types/types";
import { useTheme } from "@/contexts/ThemeContext";

const TABS = ["Company", "Invoice", "Appearance", "Data"] as const;
type Tab = (typeof TABS)[number];

type AssetField = "logo_url" | "signature_url" | "seal_url" | "upi_qr_url";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>("Company");
  const [settings, setSettings] = useState<Partial<CompanySettings>>({
    company_name: "",
    address: "",
    gst_number: "",
    email: "",
    phone: "",
    website: "",
    bank_account_name: "",
    bank_account_number: "",
    bank_name: "",
    bank_ifsc: "",
    bank_swift: "",
    logo_url: "",
    signature_url: "",
    seal_url: "",
    upi_qr_url: "",
    default_gst_rate: 18,
    default_currency: "INR",
    invoice_prefix: "INV",
    invoice_number_format: "INV-YYYY-NNNN",
    default_payment_terms: "Net 30",
    default_notes: "",
    default_terms: "",
    theme: "light",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {},
  );

  useEffect(() => {
    getCompanySettings().then((s) => {
      if (s) setSettings(s);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const result = await upsertCompanySettings({ ...settings, theme });
    if (result) {
      toast.success("Settings saved");
    } else {
      toast.error("Failed to save settings");
    }
    setSaving(false);
  };

  const handleUpload = async (field: AssetField, file: File) => {
    const path = `shivvilon/${field}_${Date.now()}`;
    setUploadProgress((p) => ({ ...p, [field]: 5 }));
    const url = await uploadAsset(file, "company-assets", path, (pct) => {
      setUploadProgress((p) => ({ ...p, [field]: pct }));
    });
    setUploadProgress((p) => ({ ...p, [field]: 0 }));
    if (url) {
      setSettings((s) => ({ ...s, [field]: url }));
      toast.success("Image uploaded");
    } else {
      toast.error("Upload failed");
    }
  };

  const set = (key: keyof CompanySettings, value: unknown) =>
    setSettings((s) => ({ ...s, [key]: value }));

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `shivvilon-settings-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    toast.success("Settings exported");
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        setSettings((prev) => ({ ...prev, ...data }));
        toast.success("Settings imported — click Save to apply");
      } catch {
        toast.error("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure your invoice system
          </p>
        </div>
        <Button
          size="sm"
          className="text-xs h-8 gap-1.5"
          onClick={handleSave}
          disabled={saving}
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            onClick={() => setActiveTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <>
          {/* Company Tab */}
          {activeTab === "Company" && (
            <div className="space-y-5">
              <div className="rounded-lg border border-border bg-card p-5 space-y-4">
                <h2 className="text-sm font-semibold">Company Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Company Name">
                    <Input
                      value={settings.company_name || ""}
                      onChange={(e) => set("company_name", e.target.value)}
                    />
                  </Field>
                  <Field label="GST Number">
                    <Input
                      value={settings.gst_number || ""}
                      onChange={(e) => set("gst_number", e.target.value)}
                      placeholder="24XXXXX0000X1Z2"
                    />
                  </Field>
                  <Field label="Email">
                    <Input
                      type="email"
                      value={settings.email || ""}
                      onChange={(e) => set("email", e.target.value)}
                    />
                  </Field>
                  <Field label="Phone">
                    <Input
                      value={settings.phone || ""}
                      onChange={(e) => set("phone", e.target.value)}
                    />
                  </Field>
                  <Field label="Website">
                    <Input
                      value={settings.website || ""}
                      onChange={(e) => set("website", e.target.value)}
                    />
                  </Field>
                  <Field label="Address" className="md:col-span-2">
                    <Textarea
                      rows={2}
                      value={settings.address || ""}
                      onChange={(e) => set("address", e.target.value)}
                    />
                  </Field>
                </div>
              </div>

              {/* Bank Details */}
              <div className="rounded-lg border border-border bg-card p-5 space-y-4">
                <h2 className="text-sm font-semibold">Bank Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Account Name">
                    <Input
                      value={settings.bank_account_name || ""}
                      onChange={(e) => set("bank_account_name", e.target.value)}
                    />
                  </Field>
                  <Field label="Account Number">
                    <Input
                      value={settings.bank_account_number || ""}
                      onChange={(e) =>
                        set("bank_account_number", e.target.value)
                      }
                    />
                  </Field>
                  <Field label="Bank Name">
                    <Input
                      value={settings.bank_name || ""}
                      onChange={(e) => set("bank_name", e.target.value)}
                    />
                  </Field>
                  <Field label="IFSC Code">
                    <Input
                      value={settings.bank_ifsc || ""}
                      onChange={(e) => set("bank_ifsc", e.target.value)}
                    />
                  </Field>
                  <Field label="SWIFT Code">
                    <Input
                      value={settings.bank_swift || ""}
                      onChange={(e) => set("bank_swift", e.target.value)}
                    />
                  </Field>
                </div>
              </div>

              {/* Asset Uploads */}
              <div className="rounded-lg border border-border bg-card p-5 space-y-4">
                <h2 className="text-sm font-semibold">Logos & Signatures</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(
                    [
                      ["logo_url", "Company Logo"],
                      ["signature_url", "Authorized Signature"],
                      ["seal_url", "Company Seal"],
                      ["upi_qr_url", "UPI QR Code"],
                    ] as [AssetField, string][]
                  ).map(([field, label]) => (
                    <div key={field}>
                      <Label className="text-xs mb-1.5 block">{label}</Label>
                      {settings[field] ? (
                        <div className="relative inline-block">
                          <img
                            src={settings[field] as string}
                            alt={label}
                            className="h-16 rounded border object-contain"
                          />
                          <button
                            type="button"
                            className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-4 h-4 flex items-center justify-center"
                            onClick={() => set(field, "")}
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center gap-1 text-xs text-muted-foreground border border-dashed rounded p-3 hover:border-primary transition-colors">
                          <Upload className="w-4 h-4" />
                          Upload
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files?.[0])
                                handleUpload(field, e.target.files[0]);
                            }}
                          />
                        </label>
                      )}
                      {(uploadProgress[field] || 0) > 0 && (
                        <Progress
                          value={uploadProgress[field]}
                          className="h-1 mt-1"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Invoice Tab */}
          {activeTab === "Invoice" && (
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <h2 className="text-sm font-semibold">Invoice Defaults</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Invoice Number Prefix">
                  <Input
                    value={settings.invoice_prefix || "INV"}
                    onChange={(e) => set("invoice_prefix", e.target.value)}
                  />
                </Field>
                <Field label="Invoice Number Format">
                  <Input
                    value={settings.invoice_number_format || "INV-YYYY-NNNN"}
                    onChange={(e) =>
                      set("invoice_number_format", e.target.value)
                    }
                  />
                </Field>
                <Field label="Default Currency">
                  <Select
                    value={settings.default_currency || "INR"}
                    onValueChange={(v) => set("default_currency", v)}
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
                </Field>
                <Field label="Default GST Rate (%)">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={settings.default_gst_rate || 18}
                    onChange={(e) =>
                      set("default_gst_rate", Number(e.target.value))
                    }
                  />
                </Field>
                <Field label="Default Payment Terms">
                  <Input
                    value={settings.default_payment_terms || ""}
                    onChange={(e) =>
                      set("default_payment_terms", e.target.value)
                    }
                  />
                </Field>
                <Field label="Default Notes" className="md:col-span-2">
                  <Textarea
                    rows={2}
                    value={settings.default_notes || ""}
                    onChange={(e) => set("default_notes", e.target.value)}
                  />
                </Field>
                <Field
                  label="Default Terms & Conditions"
                  className="md:col-span-2"
                >
                  <Textarea
                    rows={3}
                    value={settings.default_terms || ""}
                    onChange={(e) => set("default_terms", e.target.value)}
                  />
                </Field>
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === "Appearance" && (
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <h2 className="text-sm font-semibold">Appearance</h2>
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div>
                  <p className="text-sm font-medium">Dark Mode</p>
                  <p className="text-xs text-muted-foreground">
                    Switch between light and dark themes
                  </p>
                </div>
                <Switch
                  checked={theme === "dark"}
                  onCheckedChange={(checked) =>
                    setTheme(checked ? "dark" : "light")
                  }
                />
              </div>
              <div className="pt-2">
                <p className="text-xs text-muted-foreground">
                  Current theme:{" "}
                  <span className="font-medium text-foreground capitalize">
                    {theme}
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Data Tab */}
          {activeTab === "Data" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-card p-5 space-y-4">
                <h2 className="text-sm font-semibold">Data Management</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="border border-border rounded-lg p-4 space-y-2">
                    <p className="text-sm font-medium">Export Settings</p>
                    <p className="text-xs text-muted-foreground">
                      Download your configuration as JSON
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5"
                      onClick={handleExport}
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export JSON
                    </Button>
                  </div>
                  <div className="border border-border rounded-lg p-4 space-y-2">
                    <p className="text-sm font-medium">Import Settings</p>
                    <p className="text-xs text-muted-foreground">
                      Restore from a previous export
                    </p>
                    <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs border border-dashed rounded px-3 py-1.5 hover:border-primary transition-colors">
                      <UploadIcon className="w-3.5 h-3.5" />
                      Import JSON
                      <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0])
                            handleImport(e.target.files[0]);
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-destructive">
                      Danger Zone
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Deleting data is permanent. Always export a backup first.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
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
