import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { InvoiceStatus } from '@/types/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'INR'): string {
  const symbols: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ' };
  const sym = symbols[currency] || currency;
  return `${sym}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return '-';
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function numToWords(n: number): string {
  if (n === 0) return 'Zero';
  if (n < 0) return `Minus ${numToWords(-n)}`;
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
  if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + numToWords(n % 100) : '');
  if (n < 100000) return numToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + numToWords(n % 1000) : '');
  if (n < 10000000) return numToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + numToWords(n % 100000) : '');
  return numToWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + numToWords(n % 10000000) : '');
}

export function amountToWords(amount: number, currency = 'INR'): string {
  const currencyNames: Record<string, [string, string]> = {
    INR: ['Rupee', 'Paise'],
    USD: ['Dollar', 'Cent'],
    EUR: ['Euro', 'Cent'],
    GBP: ['Pound', 'Penny'],
  };
  const [mainUnit, subUnit] = currencyNames[currency] || ['Unit', 'Subunit'];
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let words = numToWords(rupees) + ` ${mainUnit}${rupees !== 1 ? 's' : ''}`;
  if (paise > 0) words += ` and ${numToWords(paise)} ${subUnit}${paise !== 1 ? 's' : ''}`;
  return words + ' Only';
}

export function getStatusColor(status: InvoiceStatus): string {
  const map: Record<string, string> = {
    Paid: 'bg-green-50 text-green-700 border border-green-200',
    Pending: 'bg-orange-50 text-orange-700 border border-orange-200',
    Overdue: 'bg-red-50 text-red-700 border border-red-200',
    Draft: 'bg-gray-50 text-gray-600 border border-gray-200',
    Sent: 'bg-blue-50 text-blue-700 border border-blue-200',
    Viewed: 'bg-sky-50 text-sky-700 border border-sky-200',
    'Partially Paid': 'bg-amber-50 text-amber-700 border border-amber-200',
    Cancelled: 'bg-gray-100 text-gray-500 border border-gray-200',
  };
  return map[status] || 'bg-gray-50 text-gray-600 border border-gray-200';
}

export function isOverdue(dueDate: string | null | undefined, status: InvoiceStatus): boolean {
  if (!dueDate) return false;
  if (status === 'Paid' || status === 'Cancelled') return false;
  return new Date(dueDate) < new Date();
}

export function getDaysUntilDue(dueDate: string | null | undefined): number | null {
  if (!dueDate) return null;
  const diff = new Date(dueDate).getTime() - new Date().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function compressImage(file: File, maxSizeBytes = 1048576): Promise<File> {
  return new Promise((resolve, reject) => {
    if (file.size <= maxSizeBytes) { resolve(file); return; }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      const maxDim = 1920;
      if (width > maxDim || height > maxDim) {
        if (width > height) { height = Math.round((height * maxDim) / width); width = maxDim; }
        else { width = Math.round((width * maxDim) / height); height = maxDim; }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas context failed')); return; }
      ctx.drawImage(img, 0, 0, width, height);
      let quality = 0.8;
      const tryCompress = () => {
        canvas.toBlob(blob => {
          if (!blob) { reject(new Error('Compression failed')); return; }
          if (blob.size <= maxSizeBytes || quality <= 0.2) {
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' }));
          } else {
            quality -= 0.1;
            tryCompress();
          }
        }, 'image/webp', quality);
      };
      tryCompress();
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = url;
  });
}
