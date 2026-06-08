import {
  DEFAULT_PROFILE,
  calculateFootprint,
  formatKg,
  getPersonalizedActions,
  getReductionProgress,
  getScore,
  getTopCategory,
} from './carbon.js';

const INPUT_GROUPS = [
  {
    title: 'Travel',
    description: 'Weekly movement and long-distance trips.',
    fields: [
      { key: 'carKm', label: 'Car travel', suffix: 'km / week', step: 1 },
      { key: 'transitKm', label: 'Transit travel', suffix: 'km / week', step: 1 },
      { key: 'flightHours', label: 'Flight time', suffix: 'hours / week avg.', step: 0.5 },
    ],
  },
  {
    title: 'Home energy',
    description: 'Shared household energy divided by household size.',
    fields: [
      { key: 'electricityKwh', label: 'Electricity', suffix: 'kWh / week', step: 1 },
      { key: 'naturalGasTherms', label: 'Natural gas', suffix: 'therms / week', step: 0.5 },
      { key: 'householdSize', label: 'Household size', suffix: 'people', step: 1 },
    ],
  },
  {
    title: 'Food and purchases',
    description: 'Everyday consumption choices.',
    fields: [
      { key: 'meatMeals', label: 'Meat or dairy-heavy meals', suffix: 'meals / week', step: 1 },
      { key: 'plantMeals', label: 'Plant-forward meals', suffix: 'meals / week', step: 1 },
      { key: 'shoppingDollars', label: 'New goods spending', suffix: '$ / week', step: 1 },
    ],
  },
];

const CATEGORY_LABELS = {
  transport: 'Ground transport',
  flights: 'Flights',
  home: 'Home energy',
  food: 'Food',
  purchases: 'Purchases',
};

const STORAGE_KEYS = Object.freeze({
  profile: 'carbonwise.profile',
  completedActions: 'carbonwise.completedActions',
});

function loadJson(key, fallback) {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The calculator still works if storage is disabled or full.
  }
}

function loadStoredProfile() {
  const storedProfile = loadJson(STORAGE_KEYS.profile, {});
  return storedProfile && typeof storedProfile === 'object' && !Array.isArray(storedProfile) ? storedProfile : {};
}

function loadCompletedActions() {
  const storedActions = loadJson(STORAGE_KEYS.completedActions, []);
  return new Set(Array.isArray(storedActions) ? storedActions : []);
}

let profile = { ...DEFAULT_PROFILE, ...loadStoredProfile() };
let completedActionIds = loadCompletedActions();

function createElement(tag, attributes = {}, children = []) {
  const element = document.createElement(tag);
  Object.entries(attributes).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (key === 'className') element.className = value;
    else if (key === 'textContent') element.textContent = value;
    else if (key === 'style') Object.assign(element.style, value);
    else if (key === 'checked') element.checked = Boolean(value);
    else element.setAttribute(key, value);
  });
  children.forEach((child) => element.append(child));
  return element;
}

function persistProfile() {
  saveJson(STORAGE_KEYS.profile, profile);
}

function persistCompletedActions() {
  saveJson(STORAGE_KEYS.completedActions, [...completedActionIds]);
}

function renderInput(field) {
  const inputId = `input-${field.key}`;
  const unitId = `${inputId}-unit`;
  const input = createElement('input', {
    'aria-describedby': unitId,
    id: inputId,
    inputmode: 'decimal',
    name: field.key,
    min: '0',
    step: String(field.step),
    type: 'number',
    value: String(profile[field.key]),
  });
  input.addEventListener('input', (event) => {
    profile = { ...profile, [field.key]: event.target.value };
    persistProfile();
    renderResults();
  });

  return createElement('div', { className: 'field' }, [
    createElement('label', { for: inputId, textContent: field.label }),
    createElement('div', { className: 'input-shell' }, [
      input,
      createElement('span', { id: unitId, textContent: field.suffix }),
    ]),
  ]);
}

function renderForm() {
  const form = document.querySelector('#profile-form');
  form.innerHTML = '';
  form.append(
    createElement('div', { className: 'panel-heading' }, [
      createElement('div', {}, [
        createElement('p', { className: 'eyebrow', textContent: 'Personal context' }),
        createElement('h2', { textContent: 'Tell CarbonWise about your week' }),
      ]),
      createElement('button', { className: 'text-button', type: 'button', textContent: 'Reset defaults' }),
    ]),
  );

  form.querySelector('button').addEventListener('click', () => {
    profile = { ...DEFAULT_PROFILE };
    completedActionIds = new Set();
    persistProfile();
    persistCompletedActions();
    renderForm();
    renderResults();
  });

  INPUT_GROUPS.forEach((group) => {
    const fieldset = createElement('fieldset', {}, [
      createElement('legend', { textContent: group.title }),
      createElement('p', { textContent: group.description }),
      createElement('div', { className: 'field-grid' }, group.fields.map(renderInput)),
    ]);
    form.append(fieldset);
  });
}

function renderAction(action) {
  const actionId = `action-${action.id}`;
  const checkbox = createElement('input', {
    checked: completedActionIds.has(action.id),
    id: actionId,
    type: 'checkbox',
  });
  checkbox.addEventListener('change', () => {
    if (checkbox.checked) completedActionIds.add(action.id);
    else completedActionIds.delete(action.id);
    persistCompletedActions();
    renderResults();
  });

  return createElement('article', { className: 'action-card' }, [
    createElement('div', { className: 'action-card-copy' }, [
      createElement('span', { textContent: action.category }),
      createElement('strong', { textContent: action.title }),
      createElement('p', {
        textContent: `${formatKg(action.weeklySavingsKg)} kg CO₂e saved weekly · ${action.effort} effort`,
      }),
    ]),
    createElement('label', { className: 'action-check', for: actionId }, [
      checkbox,
      createElement('span', { textContent: 'Done' }),
    ]),
  ]);
}

function renderResults() {
  const footprint = calculateFootprint(profile);
  const score = getScore(footprint.weeklyTotal);
  const topCategory = getTopCategory(footprint.categories);
  const actions = getPersonalizedActions(footprint.profile);
  const annualPlanSavings = actions.reduce((sum, action) => sum + action.weeklySavingsKg * 52, 0);
  const progress = getReductionProgress(actions, completedActionIds, footprint.annualTotal);

  document.querySelector('#score-label').textContent = score.label;
  document.querySelector('#score-label').className = `status status-${score.tone}`;
  document.querySelector('#weekly-total').textContent = `${formatKg(footprint.weeklyTotal)} kg CO₂e`;
  document.querySelector('#annual-total').textContent = `per week · ${formatKg(footprint.annualTotal / 1000)} tonnes per year`;
  document.querySelector('#score-meter').style.width = `${score.value}%`;
  document.querySelector('#score-meter-wrapper').setAttribute('aria-valuenow', String(score.value));
  document.querySelector('#score-meter-wrapper').setAttribute('aria-label', `Awareness score ${score.value} out of 100`);
  document.querySelector('#update-status').textContent = `Updated footprint: ${formatKg(footprint.weeklyTotal)} kilograms CO2 equivalent per week.`;

  const insights = document.querySelector('#insights-body');
  insights.innerHTML = '';
  insights.append(
    createElement('div', { className: 'insight-banner' }, [
      createElement('span', { textContent: 'Your biggest opportunity' }),
      createElement('strong', { textContent: CATEGORY_LABELS[topCategory] }),
      createElement('p', {
        textContent:
          'CarbonWise ranks categories by calculated emissions so recommendations match the user context instead of showing generic advice.',
      }),
    ]),
  );

  const categoryList = createElement('div', { className: 'category-list', 'aria-label': 'Emission breakdown by category' });
  Object.entries(footprint.categories).forEach(([key, value]) => {
    const percent = footprint.weeklyTotal > 0 ? (value / footprint.weeklyTotal) * 100 : 0;
    categoryList.append(
      createElement('div', { className: 'category-row' }, [
        createElement('div', {}, [
          createElement('strong', { textContent: CATEGORY_LABELS[key] }),
          createElement('span', { textContent: `${formatKg(value)} kg CO₂e` }),
        ]),
        createElement(
          'div',
          {
            className: 'bar',
            'aria-label': `${CATEGORY_LABELS[key]} ${formatKg(value)} kilograms CO2 equivalent`,
          },
          [createElement('span', { style: { width: `${percent}%` } })],
        ),
      ]),
    );
  });
  insights.append(categoryList);

  insights.append(createElement('h3', { textContent: 'Action plan' }));
  const actionList = createElement('div', { className: 'actions' });
  actions.forEach((action) => actionList.append(renderAction(action)));
  insights.append(actionList);
  insights.append(
    createElement('div', { className: 'savings-card' }, [
      createElement('span', { textContent: 'Potential annual reduction from this plan' }),
      createElement('strong', { textContent: `${formatKg(annualPlanSavings / 1000)} tonnes CO₂e` }),
      createElement('p', {
        textContent: `Completed actions: ${formatKg(progress.annualSavingsKg / 1000)} tonnes saved toward a ${formatKg(progress.targetSavingsKg / 1000)} tonne 20% goal.`,
      }),
      createElement('div', { className: 'progress-bar', 'aria-label': `Goal progress ${formatKg(progress.progressPercent)} percent` }, [
        createElement('span', { style: { width: `${progress.progressPercent}%` } }),
      ]),
    ]),
  );
}

renderForm();
renderResults();
