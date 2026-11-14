// 台灣進項憑證解析核心（給營業稅 401 申報用）
// 電子發票左邊 QR Code 解析、格式代號判斷、統編與發票號碼驗證、國字金額轉換、申報期別。
// 純函式、無 DOM 依賴，瀏覽器與 Node 都能用。

export const FORMAT_CODES = {
  21: '進項三聯式、電子計算機統一發票',
  22: '進項二聯式收銀機統一發票、載有稅額之其他憑證',
  25: '進項三聯式收銀機統一發票、一般稅額計算之電子發票',
};
export const TAX_TYPES = { 1: '應稅', 2: '零稅率', 3: '免稅' };
export const DEDUCT_CODES = { 1: '進貨及費用', 2: '固定資產', 0: '不可扣抵' };

const latin1 = (bytes) => Array.from(bytes, (b) => String.fromCharCode(b)).join('');
const toStr = (input) => (input instanceof Uint8Array ? latin1(input) : String(input));

const LEFT_QR = /^([A-Z]{2}\d{8})(\d{7})([0-9A-Za-z]{4})([0-9a-fA-F]{8})([0-9a-fA-F]{8})(\d{8})(\d{8})/;

/** 判斷 QR 內容是電子發票左邊（含 77 碼表頭）、右邊（** 開頭）或都不是。 */
export function classifyQr(input) {
  const s = toStr(input);
  if (s.startsWith('**')) return 'right';
  if (LEFT_QR.test(s)) return 'left';
  return null;
}

/** 民國 yyyMMdd → 西元 YYYY-MM-DD */
export function rocToIso(roc) {
  const m = /^(\d{3})(\d{2})(\d{2})$/.exec(roc);
  if (!m) return null;
  return `${Number(m[1]) + 1911}-${m[2]}-${m[3]}`;
}

/** 解析電子發票左邊 QR Code，只取 401 申報需要的欄位。 */
export function parseEInvoice(left) {
  const m = LEFT_QR.exec(toStr(left));
  if (!m) throw new Error('不是電子發票左邊的 QR Code');
  const [, invoiceNo, rocDate, randomCode, salesHex, totalHex, buyer, seller] = m;
  const total = parseInt(totalHex, 16);
  const buyerId = buyer === '00000000' ? null : buyer;
  // 有買方統編（B2B）時，QR 裡的「銷售額」是未稅金額；沒有統編時通常等於含稅總額，申報時用總額回推。
  let sales = parseInt(salesHex, 16);
  if (!buyerId || sales >= total) sales = null;
  const r = {
    doc_type: 'e_invoice',
    format_code: 25,
    invoice_no: invoiceNo,
    date: rocToIso(rocDate),
    random_code: randomCode,
    seller_tax_id: seller,
    seller_name: null,
    buyer_tax_id: buyerId,
    total,
    sales_amount: sales,
    tax: sales == null ? null : total - sales,
    tax_type: 1,
    source: 'qr',
    reviewed: true,
  };
  return fillAmounts(r);
}

/** 只有總額時，依 5% 回推銷售額與稅額（四捨五入到元）。 */
export function splitTax(total) {
  const sales = Math.round(Number(total) / 1.05);
  return { sales_amount: sales, tax: Number(total) - sales };
}

/** 補齊 銷售額／稅額／總計 三者中缺的欄位。免稅與零稅率稅額為 0。 */
export function fillAmounts(r) {
  const out = { ...r };
  const num = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v));
  let { sales_amount: s, tax: t, total: T } = { sales_amount: num(out.sales_amount), tax: num(out.tax), total: num(out.total) };
  const taxable = Number(out.tax_type ?? 1) === 1;
  if (!taxable) {
    t = 0;
    if (s == null && T != null) s = T;
    if (T == null && s != null) T = s;
  } else if (s != null && t != null && T == null) T = s + t;
  else if (s != null && T != null && t == null) t = T - s;
  else if (t != null && T != null && s == null) s = T - t;
  else if (T != null && s == null && t == null) ({ sales_amount: s, tax: t } = splitTax(T));
  else if (s != null && t == null && T == null) {
    t = Math.round(s * 0.05);
    T = s + t;
  }
  out.sales_amount = s;
  out.tax = t;
  out.total = T;
  return out;
}

/** 發票號碼：2 碼英文 + 8 碼數字 */
export function normalizeInvoiceNo(s) {
  return String(s ?? '').toUpperCase().replace(/[-\s]/g, '');
}
export function isValidInvoiceNo(s) {
  return /^[A-Z]{2}\d{8}$/.test(normalizeInvoiceNo(s));
}

/** 統一編號檢查碼（2023 年起的「可被 5 整除」規則，舊規則可被 10 整除者也通過）。 */
export function isValidTaxId(id) {
  if (!/^\d{8}$/.test(id ?? '')) return false;
  const w = [1, 2, 1, 2, 1, 2, 4, 1];
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    const p = Number(id[i]) * w[i];
    sum += Math.floor(p / 10) + (p % 10);
  }
  if (sum % 5 === 0) return true;
  return id[6] === '7' && (sum + 1) % 5 === 0;
}

const DIGITS = {
  零: 0, 〇: 0, 一: 1, 壹: 1, 二: 2, 貳: 2, 贰: 2, 兩: 2, 两: 2, 三: 3, 參: 3, 叁: 3, 参: 3, 四: 4, 肆: 4,
  五: 5, 伍: 5, 六: 6, 陸: 6, 陆: 6, 七: 7, 柒: 7, 八: 8, 捌: 8, 九: 9, 玖: 9,
};
const SMALL = { 十: 10, 拾: 10, 百: 100, 佰: 100, 千: 1000, 仟: 1000 };
const BIG = { 萬: 1e4, 万: 1e4, 億: 1e8, 亿: 1e8 };

/** 國字金額（含大寫）轉數字，例如「新台幣壹萬貳仟參佰元整」→ 12300。無法解析回傳 null。 */
export function chineseAmountToNumber(text) {
  if (!text) return null;
  const s = String(text).replace(/新臺幣|新台幣|NT\$?|元|圓|整|正|\s/g, '');
  if (!s) return null;
  if (/^[\d,]+$/.test(s)) return Number(s.replace(/,/g, ''));
  let total = 0;
  let section = 0;
  let digit = null;
  for (const ch of s) {
    if (ch in DIGITS) digit = DIGITS[ch];
    else if (ch in SMALL) {
      section += (digit ?? 1) * SMALL[ch];
      digit = null;
    } else if (ch in BIG) {
      section += digit ?? 0;
      total += section * BIG[ch];
      section = 0;
      digit = null;
    } else if (ch === '角' || ch === '分') break;
    else return null;
  }
  return total + section + (digit ?? 0);
}

/** 申報期別：每兩個月一期，回傳例如 "115年09-10月"。 */
export function filingPeriod(isoDate) {
  const m = /^(\d{4})-(\d{2})/.exec(isoDate ?? '');
  if (!m) return null;
  const roc = Number(m[1]) - 1911;
  const start = Math.floor((Number(m[2]) - 1) / 2) * 2 + 1;
  const pad = (n) => String(n).padStart(2, '0');
  return `${roc}年${pad(start)}-${pad(start + 1)}月`;
}

/**
 * 檢查一筆結果，回傳 { errors: {field: msg}, deductible: boolean, reason: string }
 * @param {object} r
 * @param {{companyTaxId?: string}} [opts]
 */
export function validate(r, opts = {}) {
  const e = {};
  const company = (opts.companyTaxId ?? '').trim();
  const isReceipt = r.doc_type === 'receipt' || !FORMAT_CODES[r.format_code];
  if (!r.invoice_no) { if (!isReceipt) e.invoice_no = '缺少發票號碼'; }
  else if (!isValidInvoiceNo(r.invoice_no)) e.invoice_no = '發票號碼應為 2 碼英文 + 8 碼數字';
  if (!r.seller_tax_id) { if (!isReceipt) e.seller_tax_id = '缺少賣方統編'; }
  else if (!isValidTaxId(r.seller_tax_id)) e.seller_tax_id = '賣方統編檢查碼不正確';
  if (r.buyer_tax_id && !isValidTaxId(r.buyer_tax_id)) e.buyer_tax_id = '買方統編檢查碼不正確';
  else if (company && r.buyer_tax_id && r.buyer_tax_id !== company) e.buyer_tax_id = `買方統編不是貴公司（${company}）`;
  if (!r.date) e.date = '缺少日期';
  else {
    const d = new Date(r.date + 'T00:00:00+08:00');
    if (Number.isNaN(d.getTime())) e.date = '日期格式不正確';
    else if (d.getTime() > Date.now() + 86400000) e.date = '日期在未來';
  }
  const s = Number(r.sales_amount);
  const t = Number(r.tax);
  const T = Number(r.total);
  if (r.total == null || r.total === '') e.total = '缺少總計金額';
  else if (r.sales_amount != null && r.tax != null && Math.abs(s + t - T) > 0) e.total = `銷售額 ${s} + 稅額 ${t} ≠ 總計 ${T}`;
  if (Number(r.tax_type ?? 1) === 1 && r.sales_amount != null && r.tax != null && Math.abs(Math.round(s * 0.05) - t) > 1)
    e.tax = `稅額和銷售額的 5%（${Math.round(s * 0.05)}）差太多`;
  if (r.amount_in_chinese) {
    const n = chineseAmountToNumber(r.amount_in_chinese);
    if (n != null && r.total != null && n !== T) e.total = `國字金額（${r.amount_in_chinese} = ${n}）和數字 ${T} 不一致`;
  }

  let deductible = true;
  let reason = '';
  if (r.doc_type === 'receipt' || !FORMAT_CODES[r.format_code]) {
    deductible = false;
    reason = '收據或非統一發票，不能扣抵進項稅額（可當費用憑證入帳）';
  } else if (!r.buyer_tax_id) {
    deductible = false;
    reason = '沒有買方統編，不能扣抵進項稅額';
  } else if (Number(r.deduct_code) === 0) {
    deductible = false;
    reason = '已標記為不可扣抵';
  }
  return { errors: e, deductible, reason };
}

export const CSV_COLUMNS = [
  ['period', '申報期別'],
  ['format_code', '格式代號'],
  ['date', '發票日期'],
  ['invoice_no', '發票號碼'],
  ['seller_tax_id', '賣方統編'],
  ['seller_name', '賣方名稱'],
  ['buyer_tax_id', '買方統編'],
  ['sales_amount', '銷售額'],
  ['tax', '稅額'],
  ['total', '總計'],
  ['tax_type', '課稅別'],
  ['deduct_code', '扣抵代號'],
  ['deductible', '可扣抵'],
  ['note', '備註'],
];

export function toCsv(rows, opts = {}) {
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [CSV_COLUMNS.map(([, h]) => h).join(',')];
  for (const r of rows) {
    const v = validate(r, opts);
    const row = { ...r, period: filingPeriod(r.date), deductible: v.deductible ? 'Y' : 'N', note: v.deductible ? r.note ?? '' : v.reason };
    if (!v.deductible) row.deduct_code = '';
    lines.push(CSV_COLUMNS.map(([k]) => esc(row[k])).join(','));
  }
  return '﻿' + lines.join('\r\n');
}

/** 依期別彙總可扣抵的銷售額與稅額，分 扣抵代號 1/2。 */
export function summarize(rows, period, opts = {}) {
  const sum = { count: 0, 1: { sales: 0, tax: 0 }, 2: { sales: 0, tax: 0 }, nonDeductible: 0 };
  for (const r of rows) {
    if (period && filingPeriod(r.date) !== period) continue;
    const v = validate(r, opts);
    sum.count++;
    if (!v.deductible) {
      sum.nonDeductible++;
      continue;
    }
    const k = Number(r.deduct_code) === 2 ? 2 : 1;
    sum[k].sales += Number(r.sales_amount) || 0;
    sum[k].tax += Number(r.tax) || 0;
  }
  return sum;
}
