import { seatCoordsPx, managerName, planImageDataUrl, planWidth, planHeight } from '../constants/seatingData';

export function norm(s: string | null | undefined): string {
  return String(s ?? '')
    .replace(/\u200c/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeNameList(list: string[]): string[] {
  const out = list
    .map(norm)
    .filter(Boolean)
    .map(n => (n === 'سعید پوررجایی' ? 'نفر جدید' : n));
  if (!out.includes('محمد قاسمی')) {
    out.push('محمد قاسمی');
  }
  return out;
}

export function formatPersianDate(dateStr?: string | Date): string {
  if (!dateStr) return '';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return String(dateStr);
  try {
    return (
      d.toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' }) +
      ' ساعت ' +
      d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
    );
  } catch (e) {
    return d.toLocaleString();
  }
}

function esc(s: string | null | undefined): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function rtlText(text: string, fontSize: number, x: number, y: number, color: string, weight = '700') {
  return `<text x="${x}" y="${y}" font-family="Vazirmatn, Tahoma, Arial, sans-serif" font-size="${fontSize}" font-weight="${weight}" fill="${color}" text-anchor="middle" direction="rtl" unicode-bidi="plaintext">${esc(text)}</text>`;
}

function fitSeatName(name: string) {
  const clean = String(name || '').trim();
  if (clean.length <= 10) return { text: clean, size: 14 };
  if (clean.length <= 14) return { text: clean, size: 12 };
  if (clean.length <= 18) return { text: clean, size: 10 };
  return { text: clean.slice(0, 17) + '…', size: 9 };
}

export function createExportSvg(
  assignments: Record<string, string>,
  options: {
    preparedBy?: string;
    title?: string;
  } = {}
): string {
  const preparedBy = norm(options.preparedBy) || 'تکمیل‌کننده نامشخص';
  const title = norm(options.title) || 'چیدمان نهایی سیت‌ها';
  const now = new Date();
  const dateText = formatPersianDate(now);

  const headerHeight = 140;
  const totalH = planHeight + headerHeight + 20;

  let svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${planWidth}" height="${totalH}" viewBox="0 0 ${planWidth} ${totalH}">
    <rect width="100%" height="100%" fill="#ffffff"/>
    <rect x="25" y="20" width="${planWidth - 50}" height="100}" rx="18" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
    ${rtlText(title, 24, planWidth / 2, 52, '#312e81', '800')}
    ${rtlText(`تکمیل‌کننده: ${preparedBy}`, 17, planWidth / 2, 82, '#0f172a', '700')}
    ${rtlText(`تاریخ و زمان ثبت: ${dateText}`, 13, planWidth / 2, 106, '#64748b', '500')}
    <image href="${planImageDataUrl}" x="0" y="${headerHeight}" width="${planWidth}" height="${planHeight}"/>
  `;

  for (const [seat, [x, y]] of Object.entries(seatCoordsPx)) {
    const person = assignments[seat] || 'خالی';
    const fitted = fitSeatName(person);
    const boxWidth = 106;
    const boxHeight = 46;
    const boxX = x - boxWidth / 2;
    const boxY = y - 23 + headerHeight;
    const fill = assignments[seat] ? '#ecfdf5' : '#fffbeb';
    const stroke = assignments[seat] ? '#10b981' : '#f59e0b';

    svg += `
      <rect x="${boxX}" y="${boxY}" width="${boxWidth}" height="${boxHeight}" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="1.4"/>
      ${rtlText(seat, 10, x, boxY + 13, '#475569', '800')}
      ${rtlText(fitted.text, fitted.size, x, boxY + 31, assignments[seat] ? '#064e3b' : '#78350f', '700')}
    `;
  }

  // اتاق مدیریت
  svg += `
    <rect x="660" y="${headerHeight + 808}" width="210" height="82" rx="10" fill="#4338ca" stroke="#312e81" stroke-width="2"/>
    ${rtlText('اتاق مدیریت', 14, 765, headerHeight + 835, '#c7d2fe', '500')}
    ${rtlText(managerName, 20, 765, headerHeight + 865, '#ffffff', '800')}
  `;

  svg += '</svg>';
  return svg;
}

export function downloadImage(
  assignments: Record<string, string>,
  options: {
    preparedBy?: string;
    title?: string;
  } = {}
): Promise<boolean> {
  return new Promise((resolve) => {
    const svg = createExportSvg(assignments, options);
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = function () {
      const canvas = document.createElement('canvas');
      canvas.width = planWidth;
      canvas.height = planHeight + 170;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        resolve(false);
        return;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      URL.revokeObjectURL(url);
      canvas.toBlob(function (pngBlob) {
        if (!pngBlob) {
          resolve(false);
          return;
        }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(pngBlob);
        const fileName = `seat-layout-${options.preparedBy ? norm(options.preparedBy).replace(/\s+/g, '_') : 'export'}.png`;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        resolve(true);
      }, 'image/png');
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      resolve(false);
    };
    img.src = url;
  });
}

function csvEscape(val: any): string {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function downloadCSV(
  assignments: Record<string, string>,
  metadata: {
    preparedBy?: string;
    title?: string;
    notes?: string;
  } = {}
) {
  const rows: string[][] = [
    ['عنوان چیدمان', metadata.title || 'چیدمان سیت‌ها'],
    ['تکمیل‌کننده', metadata.preparedBy || 'ثبت نشده'],
    ['تاریخ ثبت', new Date().toLocaleString('fa-IR')],
    ['یادداشت‌ها', metadata.notes || '-'],
    [],
    ['کد سیت (صندلی)', 'نام و نام خانوادگی تخصیص یافته'],
  ];

  for (const seat of Object.keys(seatCoordsPx)) {
    rows.push([seat, assignments[seat] || 'خالی']);
  }

  const text = '\uFEFF' + rows.map((r) => r.map(csvEscape).join(',')).join('\r\n');
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `seat-assignments-${metadata.preparedBy ? norm(metadata.preparedBy).replace(/\s+/g, '_') : 'export'}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        q = false;
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') {
        q = true;
      } else if (ch === ',') {
        row.push(cell);
        cell = '';
      } else if (ch === '\n') {
        row.push(cell.replace(/\r$/, ''));
        rows.push(row);
        row = [];
        cell = '';
      } else {
        cell += ch;
      }
    }
  }
  if (cell.length || row.length) {
    row.push(cell.replace(/\r$/, ''));
    rows.push(row);
  }
  return rows;
}
