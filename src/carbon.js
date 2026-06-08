export const EMISSION_FACTORS = Object.freeze({
  carKm: 0.192,
  transitKm: 0.041,
  flightHour: 90,
  electricityKwh: 0.42,
  naturalGasTherm: 5.3,
  meatMeal: 6.5,
  plantMeal: 1.1,
  shoppingDollar: 0.35,
});

export const DEFAULT_PROFILE = Object.freeze({
  carKm: 60,
  transitKm: 30,
  flightHours: 1,
  electricityKwh: 75,
  naturalGasTherms: 4,
  meatMeals: 7,
  plantMeals: 8,
  shoppingDollars: 45,
  householdSize: 1,
});

export const REDUCTION_ACTIONS = Object.freeze([
  {
    id: 'commute-swap',
    title: 'Swap 20 km of car travel for transit or biking',
    category: 'Transport',
    weeklySavingsKg: 3.8,
    effort: 'Medium',
    trigger(profile) {
      return profile.carKm >= 20;
    },
  },
  {
    id: 'meatless-days',
    title: 'Choose two more plant-forward meals',
    category: 'Food',
    weeklySavingsKg: 10.8,
    effort: 'Low',
    trigger(profile) {
      return profile.meatMeals >= 2;
    },
  },
  {
    id: 'smart-power',
    title: 'Cut standby power and shift laundry to cold water',
    category: 'Home energy',
    weeklySavingsKg: 4.2,
    effort: 'Low',
    trigger(profile) {
      return profile.electricityKwh >= 35;
    },
  },
  {
    id: 'flight-budget',
    title: 'Create a flight budget and replace one short trip with rail or virtual meetings',
    category: 'Travel',
    weeklySavingsKg: 22.5,
    effort: 'High',
    trigger(profile) {
      return profile.flightHours >= 1;
    },
  },
  {
    id: 'buy-less',
    title: 'Pause one non-essential purchase and buy second-hand first',
    category: 'Purchases',
    weeklySavingsKg: 7,
    effort: 'Low',
    trigger(profile) {
      return profile.shoppingDollars >= 25;
    },
  },
]);

export function sanitizeNumber(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    return fallback;
  }
  return number;
}

export function normalizeProfile(profile = {}) {
  return {
    carKm: sanitizeNumber(profile.carKm),
    transitKm: sanitizeNumber(profile.transitKm),
    flightHours: sanitizeNumber(profile.flightHours),
    electricityKwh: sanitizeNumber(profile.electricityKwh),
    naturalGasTherms: sanitizeNumber(profile.naturalGasTherms),
    meatMeals: sanitizeNumber(profile.meatMeals),
    plantMeals: sanitizeNumber(profile.plantMeals),
    shoppingDollars: sanitizeNumber(profile.shoppingDollars),
    householdSize: Math.max(1, sanitizeNumber(profile.householdSize, 1)),
  };
}

export function calculateFootprint(rawProfile) {
  const profile = normalizeProfile(rawProfile);
  const transport = profile.carKm * EMISSION_FACTORS.carKm + profile.transitKm * EMISSION_FACTORS.transitKm;
  const flights = profile.flightHours * EMISSION_FACTORS.flightHour;
  const home =
    (profile.electricityKwh * EMISSION_FACTORS.electricityKwh +
      profile.naturalGasTherms * EMISSION_FACTORS.naturalGasTherm) /
    profile.householdSize;
  const food = profile.meatMeals * EMISSION_FACTORS.meatMeal + profile.plantMeals * EMISSION_FACTORS.plantMeal;
  const purchases = profile.shoppingDollars * EMISSION_FACTORS.shoppingDollar;
  const categories = { transport, flights, home, food, purchases };
  const weeklyTotal = Object.values(categories).reduce((sum, value) => sum + value, 0);

  return {
    profile,
    categories,
    weeklyTotal,
    annualTotal: weeklyTotal * 52,
  };
}

export function getTopCategory(categories = {}) {
  return Object.entries(categories).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'transport';
}

export function getPersonalizedActions(profile, limit = 4) {
  const normalizedProfile = normalizeProfile(profile);
  return REDUCTION_ACTIONS.filter((action) => action.trigger(normalizedProfile))
    .sort((a, b) => b.weeklySavingsKg - a.weeklySavingsKg)
    .slice(0, limit);
}

export function getScore(weeklyTotal) {
  if (weeklyTotal < 60) return { label: 'Low impact', value: 88, tone: 'good' };
  if (weeklyTotal < 140) return { label: 'Moderate impact', value: 64, tone: 'caution' };
  return { label: 'High impact', value: 36, tone: 'attention' };
}

export function getReductionProgress(actions = [], completedActionIds = new Set(), annualTotal = 0, targetReductionPercent = 20) {
  const completedIds = completedActionIds instanceof Set ? completedActionIds : new Set(completedActionIds);
  const annualSavingsKg = actions
    .filter((action) => completedIds.has(action.id))
    .reduce((sum, action) => sum + action.weeklySavingsKg * 52, 0);
  const targetSavingsKg = Math.max(0, annualTotal * (targetReductionPercent / 100));
  const progressPercent = targetSavingsKg > 0 ? Math.min(100, (annualSavingsKg / targetSavingsKg) * 100) : 100;

  return {
    annualSavingsKg,
    targetSavingsKg,
    progressPercent,
    remainingKg: Math.max(0, targetSavingsKg - annualSavingsKg),
  };
}

export function formatKg(value) {
  return new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(value);
}
