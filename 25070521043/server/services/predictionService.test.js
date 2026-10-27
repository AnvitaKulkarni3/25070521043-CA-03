import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPrediction } from './predictionService.js';

const fixedNow = new Date(2026, 9, 10, 12, 0, 0); // 10 October 2026

test('predicts overspending and a budget exhaustion date', () => {
  const expenses = [
    { amount: 7000, date: new Date(2026, 9, 1) },
    { amount: 2100, date: new Date(2026, 9, 4) },
    { amount: 0, date: new Date(2026, 9, 8) }
  ];
  const result = buildPrediction({ expenses, monthlyBudget: 9000, now: fixedNow });
  assert.equal(result.monthToDate, 9100);
  assert.equal(result.riskLevel, 'danger');
  assert.ok(result.projectedMonthlySpend > 9000);
  assert.equal(result.exhaustedDate, '2026-10-10');
});

test('classifies a low-spend month as safe when history is adequate', () => {
  const expenses = [
    { amount: 100, date: new Date(2026, 9, 4) },
    { amount: 120, date: new Date(2026, 9, 6) },
    { amount: 80, date: new Date(2026, 9, 8) },
    { amount: 100, date: new Date(2026, 9, 10) }
  ];
  const result = buildPrediction({ expenses, monthlyBudget: 12000, now: fixedNow });
  assert.equal(result.riskLevel, 'safe');
  assert.equal(result.dataLimited, false);
});

test('flags limited history when fewer than three distinct days are represented', () => {
  const expenses = [{ amount: 100, date: new Date(2026, 9, 9) }];
  const result = buildPrediction({ expenses, monthlyBudget: 12000, now: fixedNow });
  assert.equal(result.dataLimited, true);
  assert.equal(result.riskLevel, 'caution');
});
