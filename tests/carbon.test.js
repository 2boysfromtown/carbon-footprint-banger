import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_PROFILE,
  calculateFootprint,
  getPersonalizedActions,
  getReductionProgress,
  getScore,
  getTopCategory,
  normalizeProfile,
} from '../src/carbon.js';

test('calculateFootprint returns category totals and annual emissions', () => {
  const footprint = calculateFootprint(DEFAULT_PROFILE);

  assert.equal(Object.keys(footprint.categories).length, 5);
  assert.ok(footprint.weeklyTotal > 0);
  assert.equal(Number(footprint.annualTotal.toFixed(6)), Number((footprint.weeklyTotal * 52).toFixed(6)));
});

test('normalizeProfile blocks negative or invalid numeric input', () => {
  const profile = normalizeProfile({ carKm: -99, householdSize: 0, electricityKwh: 'abc' });

  assert.equal(profile.carKm, 0);
  assert.equal(profile.householdSize, 1);
  assert.equal(profile.electricityKwh, 0);
});

test('recommendations are personalized and sorted by savings', () => {
  const actions = getPersonalizedActions({ ...DEFAULT_PROFILE, flightHours: 3, meatMeals: 10 });

  assert.ok(actions.length > 0);
  assert.equal(actions[0].id, 'flight-budget');
  assert.ok(actions[0].weeklySavingsKg >= actions.at(-1).weeklySavingsKg);
});

test('recommendations include occasional flights and every matching action', () => {
  const actions = getPersonalizedActions({
    ...DEFAULT_PROFILE,
    flightHours: 0.25,
    carKm: 60,
    meatMeals: 7,
    electricityKwh: 75,
    shoppingDollars: 45,
  });

  assert.equal(actions.length, 5);
  assert.ok(actions.some((action) => action.id === 'flight-budget'));
});

test('top category and score respond to totals', () => {
  const footprint = calculateFootprint({ ...DEFAULT_PROFILE, flightHours: 5 });

  assert.equal(getTopCategory(footprint.categories), 'flights');
  assert.equal(getScore(250).label, 'High impact');
  assert.equal(getScore(30).label, 'Low impact');
});

test('reduction progress tracks completed actions toward a target', () => {
  const actions = getPersonalizedActions(DEFAULT_PROFILE);
  const completed = new Set([actions[0].id]);
  const annualTotal = calculateFootprint(DEFAULT_PROFILE).annualTotal;
  const progress = getReductionProgress(actions, completed, annualTotal);
  const emptyProgress = getReductionProgress();

  assert.equal(emptyProgress.progressPercent, 100);
  assert.ok(progress.annualSavingsKg > 0);
  assert.ok(progress.targetSavingsKg > 0);
  assert.ok(progress.progressPercent > 0);
  assert.equal(progress.remainingKg, Math.max(0, progress.targetSavingsKg - progress.annualSavingsKg));
});

test('empty profiles are safe to normalize and calculate', () => {
  const footprint = calculateFootprint();

  assert.equal(footprint.weeklyTotal, 0);
  assert.equal(getTopCategory(), 'transport');
});
