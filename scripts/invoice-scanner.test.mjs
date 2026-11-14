import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyQr, parseEInvoice, isValidTaxId, isValidInvoiceNo, chineseAmountToNumber,
  filingPeriod, validate, fillAmounts, splitTax, toCsv, summarize,
} from '../public/invoice-scanner/invoice-core.js';

const hex8 = (n) => n.toString(16).toUpperCase().padStart(8, '0');
const leftQr = ({ no = 'AB12345678', roc = '1131105', rnd = '1234', sales = 1000, total = 1050, buyer = '22099131', seller = '04595257' } = {}) =>
  `${no}${roc}${rnd}${hex8(sales)}${hex8(total)}${buyer}${seller}${'x'.repeat(24)}:**********:2:2:1:咖啡:1:50:蛋糕:1:1000`;

test('統編檢查碼', () => {
  assert.equal(isValidTaxId('22099131'), true); // 台積電
  assert.equal(isValidTaxId('04595257'), true);
  assert.equal(isValidTaxId('22099132'), false);
  assert.equal(isValidTaxId('1234567'), false);
});

test('發票號碼格式', () => {
  assert.equal(isValidInvoiceNo('AB12345678'), true);
  assert.equal(isValidInvoiceNo('ab-12345678'), true);
  assert.equal(isValidInvoiceNo('A112345678'), false);
});

test('分辨左右 QR', () => {
  assert.equal(classifyQr(leftQr()), 'left');
  assert.equal(classifyQr('**:茶:1:30'), 'right');
  assert.equal(classifyQr('https://example.com'), null);
  assert.equal(classifyQr(new TextEncoder().encode(leftQr())), 'left');
});

test('解析 B2B 電子發票', () => {
  const r = parseEInvoice(leftQr());
  assert.equal(r.invoice_no, 'AB12345678');
  assert.equal(r.date, '2024-11-05');
  assert.equal(r.format_code, 25);
  assert.equal(r.sales_amount, 1000);
  assert.equal(r.tax, 50);
  assert.equal(r.total, 1050);
  assert.equal(r.buyer_tax_id, '22099131');
  assert.equal(r.seller_tax_id, '04595257');
  assert.deepEqual(validate(r).errors, {});
  assert.equal(validate(r).deductible, true);
});

test('B2C 電子發票（無買方統編）回推稅額且不可扣抵', () => {
  const r = parseEInvoice(leftQr({ buyer: '00000000', sales: 1050, total: 1050 }));
  assert.equal(r.buyer_tax_id, null);
  assert.equal(r.sales_amount, 1000);
  assert.equal(r.tax, 50);
  const v = validate(r);
  assert.equal(v.deductible, false);
  assert.match(v.reason, /買方統編/);
});

test('買方統編和公司不同會警告', () => {
  const r = parseEInvoice(leftQr());
  assert.ok(validate(r, { companyTaxId: '04595257' }).errors.buyer_tax_id);
});

test('國字金額', () => {
  assert.equal(chineseAmountToNumber('新台幣壹萬貳仟參佰元整'), 12300);
  assert.equal(chineseAmountToNumber('壹仟零伍拾元整'), 1050);
  assert.equal(chineseAmountToNumber('拾伍元'), 15);
  assert.equal(chineseAmountToNumber('貳拾萬零參佰'), 200300);
  assert.equal(chineseAmountToNumber('1,050'), 1050);
  assert.equal(chineseAmountToNumber('abc'), null);
});

test('國字和數字金額不一致會被抓到', () => {
  const r = { invoice_no: 'AB12345678', date: '2024-05-01', seller_tax_id: '04595257', buyer_tax_id: '22099131',
    format_code: 21, total: 1750, sales_amount: 1667, tax: 83, amount_in_chinese: '壹仟壹佰伍拾元整' };
  assert.match(validate(r).errors.total, /不一致/);
});

test('補齊金額', () => {
  assert.deepEqual(splitTax(1050), { sales_amount: 1000, tax: 50 });
  assert.deepEqual(splitTax(100), { sales_amount: 95, tax: 5 });
  const a = fillAmounts({ total: 1050 });
  assert.equal(a.sales_amount, 1000);
  const b = fillAmounts({ sales_amount: 1000, tax: 50 });
  assert.equal(b.total, 1050);
  const c = fillAmounts({ total: 500, tax_type: 3 });
  assert.equal(c.tax, 0);
  assert.equal(c.sales_amount, 500);
});

test('收據不可扣抵', () => {
  const v = validate({ doc_type: 'receipt', format_code: null, total: 300, date: '2024-05-01' });
  assert.equal(v.deductible, false);
});

test('申報期別', () => {
  assert.equal(filingPeriod('2024-11-05'), '113年11-12月');
  assert.equal(filingPeriod('2025-02-28'), '114年01-02月');
  assert.equal(filingPeriod(null), null);
});

test('CSV 與彙總', () => {
  const rows = [
    { ...parseEInvoice(leftQr()), deduct_code: 1 },
    { ...parseEInvoice(leftQr({ no: 'CD00000001', sales: 20000, total: 21000 })), deduct_code: 2 },
    { ...parseEInvoice(leftQr({ no: 'EF00000002', buyer: '00000000', sales: 105, total: 105 })), deduct_code: 1 },
  ];
  const s = summarize(rows, '113年11-12月');
  assert.equal(s.count, 3);
  assert.deepEqual(s[1], { sales: 1000, tax: 50 });
  assert.deepEqual(s[2], { sales: 20000, tax: 1000 });
  assert.equal(s.nonDeductible, 1);
  const csv = toCsv(rows);
  assert.ok(csv.startsWith('﻿申報期別,格式代號'));
  assert.equal(csv.split('\r\n').length, 4);
  assert.match(csv, /EF00000002.*,N,/);
});
