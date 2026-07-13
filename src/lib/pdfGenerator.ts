import type { Invoice } from '@/types/types';
import { amountToWords } from '@/lib/utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

function buildInvoiceHTML(invoice: Invoice): string {
  const curr = invoice.currency || 'INR';
  const sym = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ' }[curr] || curr;
  const fmt = (n: number) => `${sym}${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const fmtDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';

  const isPaid = invoice.status === 'Paid';
  const isPending = invoice.status === 'Pending' || invoice.status === 'Overdue';

  const items = (invoice.items || []).map((item, i) => `
    <tr style="border-bottom:1px solid #e5e7eb;">
      <td style="padding:7px 8px;font-size:11px;">${i + 1}</td>
      <td style="padding:7px 8px;font-size:11px;">${item.description || ''}</td>
      <td style="padding:7px 8px;font-size:11px;">${item.hsn_sac || ''}</td>
      <td style="padding:7px 8px;font-size:11px;text-align:right;">${item.quantity}</td>
      <td style="padding:7px 8px;font-size:11px;">${item.unit || ''}</td>
      <td style="padding:7px 8px;font-size:11px;text-align:right;">${fmt(item.rate)}</td>
      ${item.discount_percent > 0 ? `<td style="padding:7px 8px;font-size:11px;text-align:right;">${item.discount_percent}%</td>` : '<td style="padding:7px 8px;font-size:11px;text-align:right;">-</td>'}
      ${invoice.gst_enabled ? `<td style="padding:7px 8px;font-size:11px;text-align:right;">${item.tax_percent}%</td>` : ''}
      <td style="padding:7px 8px;font-size:11px;text-align:right;font-weight:600;">${fmt(item.amount)}</td>
    </tr>
  `).join('');

  const gstRows = invoice.gst_enabled ? `
    ${invoice.cgst_amount > 0 ? `<tr><td colspan="2" style="padding:5px 8px;font-size:11px;text-align:right;">CGST (${invoice.cgst_rate}%):</td><td style="padding:5px 8px;font-size:11px;text-align:right;">${fmt(invoice.cgst_amount)}</td></tr>` : ''}
    ${invoice.sgst_amount > 0 ? `<tr><td colspan="2" style="padding:5px 8px;font-size:11px;text-align:right;">SGST (${invoice.sgst_rate}%):</td><td style="padding:5px 8px;font-size:11px;text-align:right;">${fmt(invoice.sgst_amount)}</td></tr>` : ''}
    ${invoice.igst_amount > 0 ? `<tr><td colspan="2" style="padding:5px 8px;font-size:11px;text-align:right;">IGST (${invoice.igst_rate}%):</td><td style="padding:5px 8px;font-size:11px;text-align:right;">${fmt(invoice.igst_amount)}</td></tr>` : ''}
  ` : '';

  const watermark = isPaid
    ? `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-45deg);font-size:80px;font-weight:900;color:rgba(22,163,74,0.08);pointer-events:none;z-index:0;letter-spacing:4px;">PAID</div>`
    : isPending
    ? `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-45deg);font-size:80px;font-weight:900;color:rgba(249,115,22,0.08);pointer-events:none;z-index:0;letter-spacing:4px;">PENDING</div>`
    : '';

  const itemColHeaders = `
    <tr style="background:#1e40af;color:white;">
      <th style="padding:8px;font-size:11px;font-weight:600;text-align:left;">#</th>
      <th style="padding:8px;font-size:11px;font-weight:600;text-align:left;">Description</th>
      <th style="padding:8px;font-size:11px;font-weight:600;">HSN/SAC</th>
      <th style="padding:8px;font-size:11px;font-weight:600;text-align:right;">Qty</th>
      <th style="padding:8px;font-size:11px;font-weight:600;">Unit</th>
      <th style="padding:8px;font-size:11px;font-weight:600;text-align:right;">Rate</th>
      <th style="padding:8px;font-size:11px;font-weight:600;text-align:right;">Disc.</th>
      ${invoice.gst_enabled ? '<th style="padding:8px;font-size:11px;font-weight:600;text-align:right;">Tax</th>' : ''}
      <th style="padding:8px;font-size:11px;font-weight:600;text-align:right;">Amount</th>
    </tr>
  `;

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Montserrat', Arial, sans-serif; font-size:12px; color:#111827; background:white; }
  .page { width:794px; min-height:1123px; padding:40px; position:relative; background:white; }
</style>
</head>
<body>
<div class="page">
  ${watermark}
  <div style="position:relative;z-index:1;">

    <!-- Header -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;border-bottom:2px solid #1e40af;padding-bottom:20px;">
      <div style="display:flex;align-items:center;gap:12px;">
        ${invoice.company_logo_url
          ? `<img src="${invoice.company_logo_url}" style="height:48px;object-fit:contain;" />`
          : `<div style="width:48px;height:48px;background:#1e40af;border-radius:6px;display:flex;align-items:center;justify-content:center;color:white;font-size:18px;font-weight:700;">${(invoice.company_name || 'S').charAt(0)}</div>`
        }
        <div>
          <p style="font-size:16px;font-weight:700;color:#111827;">${invoice.company_name || 'Company Name'}</p>
          ${invoice.company_gst ? `<p style="font-size:10px;color:#6b7280;">GSTIN: ${invoice.company_gst}</p>` : ''}
        </div>
      </div>
      <div style="text-align:right;">
        <p style="font-size:22px;font-weight:800;color:#1e40af;letter-spacing:2px;">TAX INVOICE</p>
        <p style="font-size:11px;color:#6b7280;margin-top:4px;"><b>Invoice No:</b> ${invoice.invoice_number}</p>
        <p style="font-size:11px;color:#6b7280;"><b>Invoice Date:</b> ${fmtDate(invoice.invoice_date)}</p>
        ${invoice.due_date ? `<p style="font-size:11px;color:#6b7280;"><b>Due Date:</b> ${fmtDate(invoice.due_date)}</p>` : ''}
      </div>
    </div>

    <!-- From / To -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px;">
      <div style="border:1px solid #e5e7eb;border-radius:6px;padding:14px;">
        <p style="font-size:11px;font-weight:700;color:#1e40af;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">Invoice From</p>
        <p style="font-size:12px;font-weight:600;color:#111827;">${invoice.company_name || ''}</p>
        ${invoice.company_email ? `<p style="font-size:11px;color:#2563eb;">${invoice.company_email}</p>` : ''}
        ${invoice.company_phone ? `<p style="font-size:11px;color:#6b7280;">${invoice.company_phone}</p>` : ''}
        ${invoice.company_gst ? `<p style="font-size:11px;color:#374151;"><b>GSTIN:</b> ${invoice.company_gst}</p>` : ''}
        ${invoice.company_address ? `<p style="font-size:11px;color:#6b7280;margin-top:4px;"><b>Address:</b> ${invoice.company_address}</p>` : ''}
        ${invoice.company_website ? `<p style="font-size:11px;color:#2563eb;">${invoice.company_website}</p>` : ''}
      </div>
      <div style="border:1px solid #e5e7eb;border-radius:6px;padding:14px;">
        <p style="font-size:11px;font-weight:700;color:#1e40af;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">Invoice To</p>
        <p style="font-size:12px;font-weight:600;color:#111827;">${invoice.client_name || ''}</p>
        ${invoice.client_company ? `<p style="font-size:11px;color:#374151;">${invoice.client_company}</p>` : ''}
        ${invoice.client_email ? `<p style="font-size:11px;color:#2563eb;">${invoice.client_email}</p>` : ''}
        ${invoice.client_phone ? `<p style="font-size:11px;color:#6b7280;">${invoice.client_phone}</p>` : ''}
        ${invoice.client_gst ? `<p style="font-size:11px;color:#374151;"><b>GSTIN:</b> ${invoice.client_gst}</p>` : ''}
        ${invoice.client_address ? `<p style="font-size:11px;color:#6b7280;margin-top:4px;"><b>Address:</b> ${invoice.client_address}${invoice.client_state ? ', ' + invoice.client_state : ''}${invoice.client_country ? ', ' + invoice.client_country : ''}${invoice.client_zip ? ' - ' + invoice.client_zip : ''}</p>` : ''}
      </div>
    </div>

    <!-- Items Table -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <thead>${itemColHeaders}</thead>
      <tbody>${items}</tbody>
    </table>

    <!-- Totals + Bank Details -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:20px;">
      <!-- Bank Details -->
      <div>
        ${(invoice.company_bank_name || invoice.company_bank_account_name) ? `
          <p style="font-size:11px;font-weight:700;margin-bottom:8px;color:#374151;">Payment Information:</p>
          ${invoice.company_bank_account_name ? `<p style="font-size:11px;"><b>Account Name</b> : ${invoice.company_bank_account_name}</p>` : ''}
          ${invoice.company_bank_account_number ? `<p style="font-size:11px;"><b>Account Number</b> : ${invoice.company_bank_account_number}</p>` : ''}
          ${invoice.company_bank_name ? `<p style="font-size:11px;"><b>Bank Name</b> : ${invoice.company_bank_name}</p>` : ''}
          ${invoice.company_bank_ifsc ? `<p style="font-size:11px;"><b>IFSC code</b> : ${invoice.company_bank_ifsc}</p>` : ''}
          ${invoice.company_bank_swift ? `<p style="font-size:11px;"><b>SWIFT code</b> : ${invoice.company_bank_swift}</p>` : ''}
        ` : ''}
        ${invoice.company_upi_qr_url ? `<img src="${invoice.company_upi_qr_url}" style="width:72px;height:72px;margin-top:10px;" />` : ''}
      </div>

      <!-- Totals -->
      <div>
        <table style="width:100%;border-collapse:collapse;">
          <tr style="border-bottom:1px solid #e5e7eb;">
            <td colspan="2" style="padding:5px 8px;font-size:11px;text-align:right;color:#6b7280;">Subtotal:</td>
            <td style="padding:5px 8px;font-size:11px;text-align:right;">${fmt(invoice.subtotal)}</td>
          </tr>
          ${invoice.discount_amount > 0 ? `<tr style="border-bottom:1px solid #e5e7eb;"><td colspan="2" style="padding:5px 8px;font-size:11px;text-align:right;color:#6b7280;">Discount:</td><td style="padding:5px 8px;font-size:11px;text-align:right;color:#16a34a;">- ${fmt(invoice.discount_amount)}</td></tr>` : ''}
          ${gstRows}
          ${invoice.gst_enabled && invoice.total_gst > 0 ? `<tr style="border-bottom:1px solid #e5e7eb;"><td colspan="2" style="padding:5px 8px;font-size:11px;text-align:right;color:#6b7280;">Total GST:</td><td style="padding:5px 8px;font-size:11px;text-align:right;">${fmt(invoice.total_gst)}</td></tr>` : ''}
          ${invoice.round_off !== 0 ? `<tr style="border-bottom:1px solid #e5e7eb;"><td colspan="2" style="padding:5px 8px;font-size:11px;text-align:right;color:#6b7280;">Round Off:</td><td style="padding:5px 8px;font-size:11px;text-align:right;">${invoice.round_off > 0 ? '+' : ''}${fmt(invoice.round_off)}</td></tr>` : ''}
          <tr style="background:#1e40af;color:white;">
            <td colspan="2" style="padding:10px 8px;font-size:13px;text-align:right;font-weight:700;">Total:</td>
            <td style="padding:10px 8px;font-size:13px;font-weight:700;text-align:right;">${fmt(invoice.grand_total)}</td>
          </tr>
        </table>
        ${invoice.paid_amount > 0 && invoice.status !== 'Paid' ? `
          <div style="margin-top:8px;">
            <p style="font-size:11px;color:#16a34a;">Paid: ${fmt(invoice.paid_amount)}</p>
            <p style="font-size:11px;color:#f97316;">Balance Due: ${fmt(invoice.pending_amount)}</p>
          </div>
        ` : ''}
      </div>
    </div>

    <!-- Amount in Words -->
    <div style="border:1px solid #e5e7eb;border-radius:6px;padding:10px 14px;margin-bottom:16px;background:#f9fafb;">
      <p style="font-size:11px;color:#6b7280;">Amount in Words:</p>
      <p style="font-size:12px;font-weight:600;color:#111827;">${amountToWords(invoice.grand_total, curr)}</p>
    </div>

    <!-- Signature + Seal -->
    ${(invoice.company_signature_url || invoice.company_seal_url) ? `
    <div style="display:flex;gap:24px;margin-bottom:16px;">
      ${invoice.company_signature_url ? `
        <div style="text-align:center;">
          <img src="${invoice.company_signature_url}" style="height:48px;object-fit:contain;" />
          <p style="font-size:10px;color:#6b7280;border-top:1px solid #d1d5db;padding-top:4px;margin-top:4px;">Authorized Signature</p>
        </div>
      ` : ''}
      ${invoice.company_seal_url ? `
        <div style="text-align:center;">
          <img src="${invoice.company_seal_url}" style="height:48px;object-fit:contain;" />
          <p style="font-size:10px;color:#6b7280;border-top:1px solid #d1d5db;padding-top:4px;margin-top:4px;">Company Seal</p>
        </div>
      ` : ''}
    </div>
    ` : ''}

    <!-- Notes & Terms -->
    ${invoice.notes ? `
    <div style="margin-bottom:12px;">
      <p style="font-size:11px;font-weight:600;margin-bottom:4px;color:#374151;">Notes:</p>
      <p style="font-size:11px;color:#6b7280;">${invoice.notes}</p>
    </div>
    ` : ''}
    ${invoice.terms ? `
    <div style="margin-bottom:12px;">
      <p style="font-size:11px;font-weight:600;margin-bottom:4px;color:#374151;">Terms & Conditions:</p>
      <p style="font-size:11px;color:#6b7280;">${invoice.terms}</p>
    </div>
    ` : ''}

    <!-- Footer -->
    <div style="border-top:1px solid #e5e7eb;padding-top:12px;text-align:center;">
      <p style="font-size:12px;font-weight:600;color:#1e40af;">Thank you for your business!</p>
      ${invoice.company_email || invoice.company_phone ? `
        <p style="font-size:10px;color:#6b7280;margin-top:4px;">
          ${invoice.company_email || ''} ${invoice.company_phone ? '· ' + invoice.company_phone : ''}
        </p>
      ` : ''}
    </div>

  </div>
</div>
</body>
</html>`;
}

export async function generateInvoicePDF(
  invoice: Invoice,
  options: { download?: boolean; print?: boolean } = {}
): Promise<void> {
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;';
  container.innerHTML = buildInvoiceHTML(invoice);
  document.body.appendChild(container);

  try {
    const pageEl = container.querySelector('.page') as HTMLElement;
    const canvas = await html2canvas(pageEl, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    if (options.download) {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
      pdf.save(`${invoice.invoice_number}.pdf`);
    }

    if (options.print) {
      const dataUrl = canvas.toDataURL('image/png');
      const printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.write(`
          <html><head><title>${invoice.invoice_number}</title>
          <style>@media print{body{margin:0;}img{width:100%;height:auto;}}</style>
          </head><body><img src="${dataUrl}" /></body></html>
        `);
        printWin.document.close();
        printWin.onload = () => { printWin.print(); };
      }
    }
  } finally {
    document.body.removeChild(container);
  }
}

export function getInvoiceHTMLForPreview(invoice: Invoice): string {
  return buildInvoiceHTML(invoice);
}
