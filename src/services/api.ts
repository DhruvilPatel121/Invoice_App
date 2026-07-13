import { supabase } from '@/db/supabase';
import type {
  CompanySettings, Client, Invoice, InvoiceItem,
  InvoiceHistory, InvoiceFilters, DashboardStats, MonthlyRevenue,
} from '@/types/types';
import { compressImage } from '@/lib/utils';

// ─── Company Settings ────────────────────────────────────────────────────────

export async function getCompanySettings(): Promise<CompanySettings | null> {
  const { data } = await supabase
    .from('company_settings')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function upsertCompanySettings(settings: Partial<CompanySettings>): Promise<CompanySettings | null> {
  const existing = await getCompanySettings();
  if (existing) {
    const { data } = await supabase
      .from('company_settings')
      .update({ ...settings, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .maybeSingle();
    return data;
  }
  const { data } = await supabase
    .from('company_settings')
    .insert(settings)
    .select()
    .maybeSingle();
  return data;
}

// ─── Clients ─────────────────────────────────────────────────────────────────

export async function getClients(search?: string): Promise<Client[]> {
  let query = supabase
    .from('clients')
    .select('*')
    .order('client_name', { ascending: true })
    .limit(500);
  if (search) {
    query = query.or(`client_name.ilike.%${search}%,company_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
  }
  const { data } = await query;
  return Array.isArray(data) ? data : [];
}

export async function getClientById(id: string): Promise<Client | null> {
  const { data } = await supabase.from('clients').select('*').eq('id', id).maybeSingle();
  return data;
}

export async function createClient(client: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Promise<Client | null> {
  const { data } = await supabase.from('clients').insert(client).select().maybeSingle();
  return data;
}

export async function updateClient(id: string, client: Partial<Client>): Promise<Client | null> {
  const { data } = await supabase
    .from('clients')
    .update({ ...client, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .maybeSingle();
  return data;
}

export async function deleteClient(id: string): Promise<void> {
  await supabase.from('clients').delete().eq('id', id);
}

// ─── Invoice Number Generation ───────────────────────────────────────────────

export async function generateInvoiceNumber(prefix = 'INV'): Promise<string> {
  const { data } = await supabase.rpc('generate_invoice_number', { prefix });
  return (data as string) || `${prefix}-${new Date().getFullYear()}-0001`;
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export async function getInvoices(
  filters: Partial<InvoiceFilters> = {},
  page = 1,
  pageSize = 20
): Promise<{ data: Invoice[]; count: number }> {
  let query = supabase
    .from('invoices')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (filters.search) {
    const s = filters.search;
    query = query.or(
      `invoice_number.ilike.%${s}%,client_name.ilike.%${s}%,client_gst.ilike.%${s}%,client_phone.ilike.%${s}%,client_email.ilike.%${s}%,notes.ilike.%${s}%`
    );
  }
  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters.client_id && filters.client_id !== 'all') {
    query = query.eq('client_id', filters.client_id);
  }
  if (filters.date_from) query = query.gte('invoice_date', filters.date_from);
  if (filters.date_to) query = query.lte('invoice_date', filters.date_to);
  if (filters.amount_min) query = query.gte('grand_total', Number(filters.amount_min));
  if (filters.amount_max) query = query.lte('grand_total', Number(filters.amount_max));

  const { data, count } = await query;
  return { data: Array.isArray(data) ? data : [], count: count || 0 };
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  const { data: invoice } = await supabase.from('invoices').select('*').eq('id', id).maybeSingle();
  if (!invoice) return null;
  const { data: items } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', id)
    .order('sort_order', { ascending: true });
  return { ...invoice, items: Array.isArray(items) ? items : [] };
}

export async function createInvoice(
  invoice: Omit<Invoice, 'id' | 'created_at' | 'updated_at' | 'items'>,
  items: Omit<InvoiceItem, 'id' | 'invoice_id' | 'created_at'>[]
): Promise<Invoice | null> {
  const { data: inv, error } = await supabase
    .from('invoices')
    .insert(invoice)
    .select()
    .maybeSingle();
  if (error || !inv) return null;

  if (items.length > 0) {
    await supabase.from('invoice_items').insert(
      items.map((item, i) => ({ ...item, invoice_id: inv.id, sort_order: i }))
    );
  }

  await supabase.from('invoice_history').insert({
    invoice_id: inv.id,
    action: 'Created',
    description: `Invoice ${inv.invoice_number} created`,
  });

  return getInvoiceById(inv.id);
}

export async function updateInvoice(
  id: string,
  invoice: Partial<Invoice>,
  items?: Omit<InvoiceItem, 'id' | 'invoice_id' | 'created_at'>[]
): Promise<Invoice | null> {
  const { error } = await supabase
    .from('invoices')
    .update({ ...invoice, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return null;

  if (items !== undefined) {
    await supabase.from('invoice_items').delete().eq('invoice_id', id);
    if (items.length > 0) {
      await supabase.from('invoice_items').insert(
        items.map((item, i) => ({ ...item, invoice_id: id, sort_order: i }))
      );
    }
  }

  await supabase.from('invoice_history').insert({
    invoice_id: id,
    action: 'Updated',
    description: `Invoice updated`,
  });

  return getInvoiceById(id);
}

export async function deleteInvoice(id: string): Promise<void> {
  await supabase.from('invoices').delete().eq('id', id);
}

export async function duplicateInvoice(id: string, newInvoiceNumber: string): Promise<Invoice | null> {
  const original = await getInvoiceById(id);
  if (!original) return null;
  const { items, id: _id, created_at: _ca, updated_at: _ua,
    invoice_number: _in, paid_at, printed_at, downloaded_at, ...rest } = original;
  const newInvoice = {
    ...rest,
    invoice_number: newInvoiceNumber,
    invoice_year: new Date().getFullYear(),
    invoice_seq: 0,
    status: 'Draft' as const,
    paid_amount: 0,
    pending_amount: rest.grand_total,
    invoice_date: new Date().toISOString().split('T')[0],
    paid_at: null,
    printed_at: null,
    downloaded_at: null,
    payment_date: null,
    transaction_id: '',
    payment_notes: '',
  };
  return createInvoice(newInvoice, (items || []).map(({ id: _iid, invoice_id: _iinv, created_at: _ica, ...i }) => i));
}

export async function updateInvoiceStatus(
  id: string,
  status: string,
  paidAmount?: number
): Promise<void> {
  const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === 'Paid') {
    const inv = await getInvoiceById(id);
    if (inv) {
      updates.paid_amount = inv.grand_total;
      updates.pending_amount = 0;
      updates.paid_at = new Date().toISOString();
    }
  } else if (status === 'Partially Paid' && paidAmount !== undefined) {
    const inv = await getInvoiceById(id);
    if (inv) {
      updates.paid_amount = paidAmount;
      updates.pending_amount = Math.max(0, inv.grand_total - paidAmount);
    }
  } else if (status === 'Pending') {
    updates.paid_amount = 0;
    const inv = await getInvoiceById(id);
    if (inv) updates.pending_amount = inv.grand_total;
  }
  await supabase.from('invoices').update(updates).eq('id', id);
  await supabase.from('invoice_history').insert({
    invoice_id: id,
    action: `Status Changed to ${status}`,
    description: `Invoice status updated to ${status}`,
  });
}

export async function markInvoicePrinted(id: string): Promise<void> {
  await supabase.from('invoices').update({ printed_at: new Date().toISOString() }).eq('id', id);
  await supabase.from('invoice_history').insert({
    invoice_id: id, action: 'Printed', description: 'Invoice was printed',
  });
}

export async function markInvoiceDownloaded(id: string): Promise<void> {
  await supabase.from('invoices').update({ downloaded_at: new Date().toISOString() }).eq('id', id);
  await supabase.from('invoice_history').insert({
    invoice_id: id, action: 'Downloaded', description: 'Invoice PDF downloaded',
  });
}

export async function getInvoiceHistory(invoiceId: string): Promise<InvoiceHistory[]> {
  const { data } = await supabase
    .from('invoice_history')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('created_at', { ascending: false })
    .limit(50);
  return Array.isArray(data) ? data : [];
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  const today = new Date().toISOString().split('T')[0];

  const [totalRes, clientRes, overdueRes] = await Promise.all([
    supabase.from('invoices').select('status,grand_total,paid_amount,pending_amount,due_date', { count: 'exact' }).limit(10000),
    supabase.from('clients').select('id', { count: 'exact' }).limit(1),
    supabase.from('invoices')
      .select('id,pending_amount')
      .in('status', ['Pending', 'Partially Paid'])
      .lt('due_date', today)
      .limit(1000),
  ]);

  const invoices = Array.isArray(totalRes.data) ? totalRes.data : [];
  const paid_amount = invoices.filter(i => i.status === 'Paid').reduce((s: number, i) => s + (i.grand_total || 0), 0);
  const pending_amount = invoices.filter(i => ['Pending', 'Partially Paid'].includes(i.status)).reduce((s: number, i) => s + (i.pending_amount || 0), 0);
  const overdueRows = Array.isArray(overdueRes.data) ? overdueRes.data : [];
  const overdue_amount = overdueRows.reduce((s: number, r) => s + (r.pending_amount || 0), 0);

  return {
    total_invoices: totalRes.count || 0,
    paid_amount,
    pending_amount,
    overdue_amount,
    total_clients: clientRes.count || 0,
    draft_count: invoices.filter(i => i.status === 'Draft').length,
    overdue_count: overdueRes.data?.length || 0,
  };
}

export async function getMonthlyRevenue(year?: number): Promise<MonthlyRevenue[]> {
  const y = year || new Date().getFullYear();
  const { data } = await supabase
    .from('invoices')
    .select('invoice_date,grand_total,paid_amount,status')
    .eq('invoice_year', y)
    .order('invoice_date', { ascending: true })
    .limit(10000);

  const months = Array.from({ length: 12 }, (_, i) => ({
    month: new Date(y, i).toLocaleString('en', { month: 'short' }),
    month_num: i + 1,
    year: y,
    paid: 0,
    pending: 0,
    total: 0,
  }));

  (Array.isArray(data) ? data : []).forEach(inv => {
    const m = new Date(inv.invoice_date).getMonth();
    months[m].total += inv.grand_total || 0;
    if (inv.status === 'Paid') months[m].paid += inv.grand_total || 0;
    else months[m].pending += inv.grand_total || 0;
  });

  return months;
}

export async function getRecentInvoices(limit = 10): Promise<Invoice[]> {
  const { data } = await supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  return Array.isArray(data) ? data : [];
}

export async function getUpcomingDueInvoices(): Promise<Invoice[]> {
  const today = new Date().toISOString().split('T')[0];
  const future = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const { data } = await supabase
    .from('invoices')
    .select('*')
    .in('status', ['Pending', 'Partially Paid', 'Sent'])
    .gte('due_date', today)
    .lte('due_date', future)
    .order('due_date', { ascending: true })
    .limit(5);
  return Array.isArray(data) ? data : [];
}

export async function getTopClients(limit = 5): Promise<{ client_name: string; total: number; count: number }[]> {
  const { data } = await supabase
    .from('invoices')
    .select('client_name,grand_total')
    .not('status', 'eq', 'Cancelled')
    .limit(10000);

  const map: Record<string, { total: number; count: number }> = {};
  (Array.isArray(data) ? data : []).forEach(inv => {
    const n = inv.client_name || 'Unknown';
    if (!map[n]) map[n] = { total: 0, count: 0 };
    map[n].total += inv.grand_total || 0;
    map[n].count += 1;
  });

  return Object.entries(map)
    .map(([client_name, v]) => ({ client_name, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

// ─── Invoice Action Logger ────────────────────────────────────────────────────

export async function recordInvoiceAction(
  invoiceId: string,
  action: string,
  description?: string
): Promise<void> {
  await supabase.from('invoice_history').insert({
    invoice_id: invoiceId,
    action,
    description: description || action,
  });
}

// ─── Get Invoices by Date Range (for reports) ─────────────────────────────────

export async function getInvoicesByDateRange(
  dateFrom: string,
  dateTo: string
): Promise<Invoice[]> {
  const { data } = await supabase
    .from('invoices')
    .select('*')
    .gte('invoice_date', dateFrom)
    .lte('invoice_date', dateTo)
    .order('invoice_date', { ascending: true })
    .limit(5000);
  return Array.isArray(data) ? data : [];
}

// ─── Get Client With Stats ────────────────────────────────────────────────────

export async function getClientStats(clientId: string): Promise<{
  total_invoices: number;
  total_revenue: number;
  paid_revenue: number;
  pending_revenue: number;
}> {
  const { data } = await supabase
    .from('invoices')
    .select('status,grand_total,paid_amount,pending_amount')
    .eq('client_id', clientId)
    .not('status', 'eq', 'Cancelled')
    .limit(10000);

  const rows = Array.isArray(data) ? data : [];
  return {
    total_invoices: rows.length,
    total_revenue: rows.reduce((s, r) => s + (r.grand_total || 0), 0),
    paid_revenue: rows.filter(r => r.status === 'Paid').reduce((s, r) => s + (r.grand_total || 0), 0),
    pending_revenue: rows.filter(r => r.status !== 'Paid').reduce((s, r) => s + (r.pending_amount || 0), 0),
  };
}

// ─── Get Invoices by Client ────────────────────────────────────────────────────

export async function getInvoicesByClient(
  clientId: string,
  page = 1,
  pageSize = 10
): Promise<{ data: Invoice[]; count: number }> {
  const { data, count } = await supabase
    .from('invoices')
    .select('*', { count: 'exact' })
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  return { data: Array.isArray(data) ? data : [], count: count || 0 };
}

// ─── Storage Upload ───────────────────────────────────────────────────────────

export async function uploadAsset(
  file: File,
  bucket: 'company-assets' | 'invoice-attachments',
  path: string,
  onProgress?: (pct: number) => void
): Promise<string | null> {
  let uploadFile = file;
  if (file.size > 1048576) {
    try {
      uploadFile = await compressImage(file);
    } catch {
      // use original if compression fails
    }
  }
  onProgress?.(10);
  const safeName = path.replace(/[^a-z0-9._/-]/gi, '_').toLowerCase();
  const { data, error } = await supabase.storage.from(bucket).upload(safeName, uploadFile, {
    contentType: uploadFile.type,
    upsert: true,
  });
  onProgress?.(90);
  if (error || !data) return null;
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  onProgress?.(100);
  return urlData.publicUrl;
}
