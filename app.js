// macrow — IBDP Economics · Macroeconomics learning app.
// Routes: home, course, lesson, simulator, glossary, about.

import { GRAPH, defaults, clamp, lerp, computeFromParams, AD, ASshape, equilibrium, adLineSegment, SRAS_VIEWS, asPolyline } from './js/calculations.js';
import { buildScenarioUrl, parseScenarioPayloadFromUrl } from './js/scenario-share.js';
import { storageGet, storageSet } from './js/local-storage.js';
import { COURSE, GLOSSARY, GLOSSARY_SORTED } from './js/course.js';
import { getDiagram, DEFAULT_CAPTION } from './js/diagrams.js';

// ---------- Tiny DOM helpers ----------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const el = (tag, attrs = {}, children = []) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'dataset') Object.assign(e.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (v === false || v == null) continue;
    else if (v === true) e.setAttribute(k, '');
    else e.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return e;
};
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));

// ---------- State ----------
const PROGRESS_KEY = 'macrow_progress_v2';
const SCENARIOS_KEY = 'macrow_scenarios_v2';
const THEME_KEY = 'macrow_theme_mode_v1';
const PROGRESS_COMPLETED_LESSONS_KEY = 'macrow_completed_lessons_v2';
const LAST_ROUTE_KEY = 'macrow_last_route_v2';
const ACCESSIBILITY_KEY = 'macrow_access';

function getProgress() {
  try { return JSON.parse(storageGet(PROGRESS_KEY) || '{}') || {}; }
  catch (_e) { return {}; }
}
function setProgress(p) { storageSet(PROGRESS_KEY, JSON.stringify(p || {})); }
function getCompletedLessons() {
  try { return JSON.parse(storageGet(PROGRESS_COMPLETED_LESSONS_KEY) || '[]') || []; }
  catch (_e) { return []; }
}
function setCompletedLessons(arr) { storageSet(PROGRESS_COMPLETED_LESSONS_KEY, JSON.stringify(arr || [])); }
function isLessonCompleted(lessonId) { return getCompletedLessons().includes(lessonId); }
function markLessonCompleted(lessonId) {
  const list = getCompletedLessons();
  if (!list.includes(lessonId)) {
    list.push(lessonId);
    setCompletedLessons(list);
  }
}
function totalLessons() { return COURSE.reduce((n, m) => n + m.lessons.length, 0); }
function completedLessonCount() { return getCompletedLessons().length; }

function getScenarios() {
  try { return JSON.parse(storageGet(SCENARIOS_KEY) || '[]') || []; }
  catch (_e) { return []; }
}
function setScenarios(s) { storageSet(SCENARIOS_KEY, JSON.stringify(s || [])); }

// ---------- Theme ----------
const ThemeMode = { LIGHT: 'light', DARK: 'dark' };
let currentTheme = ThemeMode.LIGHT;
function detectSystemDark() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}
function getPreferredTheme() {
  const stored = storageGet(THEME_KEY);
  if (stored === ThemeMode.LIGHT || stored === ThemeMode.DARK) return stored;
  return detectSystemDark() ? ThemeMode.DARK : ThemeMode.LIGHT;
}
function applyTheme(theme, { persist = true } = {}) {
  currentTheme = theme === ThemeMode.DARK ? ThemeMode.DARK : ThemeMode.LIGHT;
  document.documentElement.dataset.theme = currentTheme;
  if (persist) storageSet(THEME_KEY, currentTheme);
  const toggle = $('#themeToggle');
  if (toggle) {
    toggle.setAttribute('aria-pressed', currentTheme === ThemeMode.DARK ? 'true' : 'false');
    toggle.setAttribute('aria-label', currentTheme === ThemeMode.DARK ? 'Switch to light mode' : 'Switch to dark mode');
    const icon = toggle.querySelector('.themeToggle__icon');
    const label = toggle.querySelector('.themeToggle__label');
    if (icon) icon.textContent = currentTheme === ThemeMode.DARK ? '🌙' : '☀️';
    if (label) label.textContent = currentTheme === ThemeMode.DARK ? 'Dark' : 'Light';
  }
}
function initThemeToggle() {
  const toggle = $('#themeToggle');
  if (!toggle) return;
  toggle.addEventListener('click', () => {
    applyTheme(currentTheme === ThemeMode.DARK ? ThemeMode.LIGHT : ThemeMode.DARK);
  });
}

// ---------- Sidebar / drawer ----------
function initSidebarToggle() {
  const sidebar = $('.sidebar');
  const backdrop = $('.sidebarBackdrop');
  const openBtn = $('#btnSidebarOpen');
  const closeBtn = $('#btnSidebarClose');
  if (!sidebar) return;
  const open = () => {
    sidebar.classList.add('sidebar--open');
    backdrop?.classList.add('sidebarBackdrop--open');
    document.body.classList.add('sidebar-open');
    const first = sidebar.querySelector('.navBtn');
    if (first) setTimeout(() => first.focus(), 50);
  };
  const close = () => {
    sidebar.classList.remove('sidebar--open');
    backdrop?.classList.remove('sidebarBackdrop--open');
    document.body.classList.remove('sidebar-open');
    openBtn?.focus();
  };
  openBtn?.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  backdrop?.addEventListener('click', close);
  // Focus trap
  sidebar.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focusables = $$('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])', sidebar)
      .filter(el => !el.classList.contains('hidden'));
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  // Arrow key nav
  sidebar.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const items = $$('.navBtn', sidebar);
    const idx = items.indexOf(document.activeElement);
    if (idx === -1) return;
    e.preventDefault();
    const next = e.key === 'ArrowDown' ? (idx + 1) % items.length : (idx - 1 + items.length) % items.length;
    items[next].focus();
  });
}

// ---------- Router ----------
const ROUTES = ['home', 'course', 'simulator', 'glossary', 'about'];
let currentRoute = { name: 'home', params: {} };

function navigate(name, params = {}) {
  if (!ROUTES.includes(name) && name !== 'module' && name !== 'lesson') name = 'home';
  currentRoute = { name, params };
  storageSet(LAST_ROUTE_KEY, JSON.stringify({ name, params }));
  render();
  // Close mobile drawer
  $('.sidebar')?.classList.remove('sidebar--open');
  $('.sidebarBackdrop')?.classList.remove('sidebarBackdrop--open');
  document.body.classList.remove('sidebar-open');
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'instant' });
  // Focus main for a11y
  $('#mainContent')?.focus();
}

function render() {
  // Show only the active view
  $$('.view').forEach(v => v.hidden = true);
  $$('.navBtn').forEach(b => b.removeAttribute('aria-current'));

  const navMap = { home: 'home', course: 'course', module: 'course', lesson: 'course', simulator: 'simulator', glossary: 'glossary', about: 'about' };
  const navName = navMap[currentRoute.name];
  $(`.navBtn[data-nav="${navName}"]`)?.setAttribute('aria-current', 'page');

  if (currentRoute.name === 'home') renderHome();
  else if (currentRoute.name === 'course') renderCourseIndex();
  else if (currentRoute.name === 'module') renderModuleView(currentRoute.params.moduleId);
  else if (currentRoute.name === 'lesson') renderLessonView(currentRoute.params.moduleId, currentRoute.params.lessonId);
  else if (currentRoute.name === 'simulator') renderSimulator();
  else if (currentRoute.name === 'glossary') renderGlossary();
  else if (currentRoute.name === 'about') renderAbout();
}

// ---------- HOME ----------
function renderHome() {
  $('.view--home').hidden = false;
  renderModuleGrid();
  renderProgress();
  renderContinueCard();
}

function renderProgress() {
  const total = totalLessons();
  const done = completedLessonCount();
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const fill = $('#progressFill');
  const count = $('#progressCount');
  if (fill) fill.style.width = pct + '%';
  if (count) count.textContent = `${done} / ${total}`;
}

function renderContinueCard() {
  const card = $('#continueCard');
  if (!card) return;
  const last = getProgress().lastLesson;
  if (!last) { card.hidden = true; return; }
  const mod = COURSE.find(m => m.id === last.moduleId);
  const lesson = mod?.lessons.find(l => l.id === last.lessonId);
  if (!mod || !lesson) { card.hidden = true; return; }
  card.hidden = false;
  $('#continueMeta').textContent = `Pick up where you left off · ${mod.code}`;
  $('#continueTitle').textContent = lesson.title;
  $('#continueSub').textContent = `${mod.title} · ${lesson.minutes} min`;
}

function renderModuleGrid() {
  const grid = $('#moduleGrid');
  if (!grid) return;
  grid.innerHTML = '';
  COURSE.forEach(mod => {
    const done = mod.lessons.filter(l => isLessonCompleted(l.id)).length;
    const total = mod.lessons.length;
    const status = done === 0 ? 'not-started' : done === total ? 'completed' : 'in-progress';
    const statusText = done === 0 ? `${total} lessons` : `${done} / ${total} done`;
    const card = el('button', {
      class: 'moduleCard',
      type: 'button',
      onclick: () => navigate('module', { moduleId: mod.id }),
      'aria-label': `Open ${mod.code} ${mod.title}`,
    }, [
      el('div', { class: 'moduleCard__code' }, mod.code),
      el('div', { class: 'moduleCard__title' }, mod.title),
      el('div', { class: 'moduleCard__blurb' }, mod.blurb),
      el('div', { class: 'moduleCard__foot' }, [
        el('span', { class: 'moduleCard__count' }, statusText),
        el('span', { class: 'moduleCard__progress' + (status === 'in-progress' ? ' moduleCard__progress--inprogress' : '') },
          status === 'completed' ? '✓ Complete' : status === 'in-progress' ? 'In progress' : 'Start'),
      ]),
    ]);
    grid.appendChild(card);
  });
}

// ---------- COURSE ----------
let currentCourseFilter = 'all';
function renderCourseIndex() {
  $('.view--course').hidden = false;
  $('#courseIndex').hidden = false;
  $('#moduleView').hidden = true;
  const list = $('#moduleList');
  if (!list) return;
  list.innerHTML = '';
  let modules = COURSE;
  if (currentCourseFilter === 'inprogress') {
    modules = modules.filter(m => {
      const done = m.lessons.filter(l => isLessonCompleted(l.id)).length;
      return done > 0 && done < m.lessons.length;
    });
  } else if (currentCourseFilter === 'completed') {
    modules = modules.filter(m => m.lessons.every(l => isLessonCompleted(l.id)));
  }
  modules.forEach(mod => {
    const done = mod.lessons.filter(l => isLessonCompleted(l.id)).length;
    const total = mod.lessons.length;
    const item = el('li', { class: 'moduleListItem', role: 'button', tabindex: '0', onclick: () => navigate('module', { moduleId: mod.id }), onkeydown: (e) => { if (e.key === 'Enter') navigate('module', { moduleId: mod.id }); } }, [
      el('div', { class: 'moduleListItem__code' }, mod.code),
      el('div', { class: 'moduleListItem__body' }, [
        el('div', { class: 'moduleListItem__title' }, mod.title),
        el('div', { class: 'moduleListItem__blurb' }, mod.blurb),
      ]),
      el('div', { class: 'moduleListItem__meta' }, `${done} / ${total} lessons`),
      el('svg', { class: 'moduleListItem__arrow', width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
        Object.assign(document.createElementNS('http://www.w3.org/2000/svg', 'path'), { d: 'M9 6l6 6-6 6' }),
      ]),
    ]);
    list.appendChild(item);
  });
  if (modules.length === 0) {
    list.appendChild(el('li', { class: 'sectionHint', style: { textAlign: 'center', padding: '24px 0', listStyle: 'none' } }, 'No modules in this filter yet.'));
  }
}

function renderModuleView(moduleId) {
  $('.view--course').hidden = false;
  $('#courseIndex').hidden = true;
  $('#moduleView').hidden = false;
  const mod = COURSE.find(m => m.id === moduleId);
  if (!mod) { navigate('course'); return; }
  $('#moduleCode').textContent = mod.code;
  $('#moduleTitle').textContent = mod.title;
  $('#moduleBlurb').textContent = mod.blurb;
  const outcomes = $('#moduleOutcomes');
  outcomes.innerHTML = '';
  mod.outcomes.forEach(o => outcomes.appendChild(el('li', {}, o)));
  const list = $('#lessonList');
  list.innerHTML = '';
  mod.lessons.forEach((lesson, i) => {
    const done = isLessonCompleted(lesson.id);
    const status = done ? 'done' : 'current';
    const item = el('li', { class: 'lessonListItem', role: 'button', tabindex: '0', onclick: () => navigate('lesson', { moduleId: mod.id, lessonId: lesson.id }), onkeydown: (e) => { if (e.key === 'Enter') navigate('lesson', { moduleId: mod.id, lessonId: lesson.id }); } }, [
      el('div', { class: 'lessonListItem__index' }, lesson.id),
      el('div', { class: 'lessonListItem__body' }, [
        el('div', { class: 'lessonListItem__title' }, lesson.title),
        el('div', { class: 'lessonListItem__meta' }, `${lesson.minutes} min read`),
      ]),
      el('div', { class: `lessonListItem__status lessonListItem__status--${status}` }, done ? '✓ Done' : (i === 0 ? 'Start' : 'Up next')),
    ]);
    list.appendChild(item);
  });
}

// ---------- LESSON ----------
function renderLessonView(moduleId, lessonId) {
  $('.view--lesson').hidden = false;
  const mod = COURSE.find(m => m.id === moduleId);
  const lesson = mod?.lessons.find(l => l.id === lessonId);
  if (!mod || !lesson) { navigate('course'); return; }

  // Save as "last lesson" for the home continue card
  const progress = getProgress();
  progress.lastLesson = { moduleId: mod.id, lessonId: lesson.id };
  setProgress(progress);

  // Breadcrumb
  $('#lessonModuleLink').textContent = `${mod.code} ${mod.title}`;
  $('#lessonModuleLink').onclick = (e) => { e.preventDefault(); navigate('module', { moduleId: mod.id }); };
  $('#lessonCrumbTitle').textContent = lesson.title;
  $('#lessonCode').textContent = lesson.id;
  $('#lessonTitle').textContent = lesson.title;
  $('#lessonTime').innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg> ${lesson.minutes} min read`;
  const done = isLessonCompleted(lesson.id);
  const statusEl = $('#lessonStatus');
  statusEl.textContent = done ? '✓ Completed' : '○ Not started';
  statusEl.className = `lessonMeta__chip ${done ? 'lessonMeta__chip--done' : 'lessonMeta__chip--muted'}`;
  $('#lessonComplete').hidden = done;
  $('#lessonCompleted').hidden = !done;
  if (done) $('#lessonComplete').hidden = true, $('#lessonCompleted').hidden = false;

  // Body
  const body = $('#lessonBody');
  body.innerHTML = '';
  // Paragraphs
  const renderList = (items) => {
    const ul = el('ul', {});
    items.forEach(p => ul.appendChild(el('li', {}, p)));
    return ul;
  };
  if (lesson.body) lesson.body.forEach(p => body.appendChild(el('p', {}, p)));
  if (lesson.bullets) body.appendChild(renderList(lesson.bullets));
  if (lesson.bodyAfter) lesson.bodyAfter.forEach(p => body.appendChild(el('p', {}, p)));
  if (lesson.formula) {
    body.appendChild(el('div', { class: 'formulaCallout' }, [
      el('span', { class: 'formulaCallout__label' }, 'Formula'),
      lesson.formula,
    ]));
  }
  // Diagram
  if (lesson.diagram) {
    const diag = getDiagram(lesson.diagram);
    if (diag.src) {
      const figure = el('figure', { class: 'diagramFrame' });
      const img = el('img', {
        class: 'diagramImg',
        src: diag.src,
        alt: diag.alt,
        loading: 'lazy',
        decoding: 'async',
      });
      figure.appendChild(img);
      if (diag.caption && diag.caption !== DEFAULT_CAPTION) {
        const cap = el('figcaption', { class: 'diagramFrame__caption' }, diag.caption);
        figure.appendChild(cap);
      }
      body.appendChild(figure);
    }
  }

  // Key terms
  if (lesson.keyTerms && lesson.keyTerms.length) {
    $('#keyTermsBox').hidden = false;
    const list = $('#keyTermsList');
    list.innerHTML = '';
    lesson.keyTerms.forEach(term => {
      const chip = el('button', { class: 'keyTerm', type: 'button', onclick: () => { navigate('glossary', { search: term }); } }, term);
      list.appendChild(chip);
    });
  } else {
    $('#keyTermsBox').hidden = true;
  }

  // Nav buttons
  const lessonIdx = mod.lessons.findIndex(l => l.id === lesson.id);
  const prev = lessonIdx > 0 ? mod.lessons[lessonIdx - 1] : null;
  const next = lessonIdx < mod.lessons.length - 1 ? mod.lessons[lessonIdx + 1] : null;
  const prevBtn = $('#lessonPrev');
  const nextBtn = $('#lessonNext');
  prevBtn.disabled = !prev;
  nextBtn.disabled = !next;
  prevBtn.onclick = () => prev && navigate('lesson', { moduleId: mod.id, lessonId: prev.id });
  nextBtn.onclick = () => next && navigate('lesson', { moduleId: mod.id, lessonId: next.id });

  // Mark complete
  $('#lessonComplete').onclick = () => {
    markLessonCompleted(lesson.id);
    renderLessonView(moduleId, lessonId);
  };
}

// ---------- GLOSSARY ----------
function renderGlossary() {
  $('.view--glossary').hidden = false;
  const list = $('#glossaryList');
  if (!list) return;
  const search = (currentRoute.params.search || $('#glossarySearch')?.value || '').trim().toLowerCase();
  if (search) {
    const searchEl = $('#glossarySearch');
    if (searchEl && searchEl.value !== search) searchEl.value = search;
  }
  list.innerHTML = '';
  const sorted = GLOSSARY_SORTED;
  const filtered = search
    ? sorted.filter(e => e.term.toLowerCase().includes(search) || e.definition.toLowerCase().includes(search))
    : sorted;
  filtered.forEach(entry => {
    const isHl = search && entry.term.toLowerCase().includes(search);
    const item = el('div', { class: 'glossaryItem' + (isHl ? ' glossaryItem--hl' : '') }, [
      el('div', { class: 'glossaryItem__term' }, entry.term),
      el('div', { class: 'glossaryItem__def' }, entry.definition),
    ]);
    list.appendChild(item);
  });
  if (filtered.length === 0) {
    list.appendChild(el('div', { class: 'sectionHint' }, 'No terms match.'));
  }
}

// ---------- ABOUT ----------
function renderAbout() {
  $('.view--about').hidden = false;
  const accessToggle = $('#toggleAccess');
  if (accessToggle) {
    accessToggle.checked = storageGet(ACCESSIBILITY_KEY) === '1';
    accessToggle.onchange = (e) => {
      storageSet(ACCESSIBILITY_KEY, e.target.checked ? '1' : '0');
      document.body.classList.toggle('accessibility-mode', e.target.checked);
    };
  }
  const shortcutsBtn = $('#btnOpenShortcuts');
  shortcutsBtn?.addEventListener('click', () => openShortcuts());
}

// ---------- SIMULATOR ----------
// Self-contained AD–AS simulation. We reimplement chart rendering here so we
// don't depend on app.js internals from the previous version.
const simState = {
  params: { ...defaults.params },
  history: [],
  historyIndex: -1,
  compare: { on: false, snapshot: null },
  showAxisNumbers: true,
  view: SRAS_VIEWS.KEYNESIAN,
};

const PARAM_DEFS = [
  { key: 'govSpending', label: 'Government spending (G)', hint: 'Higher G shifts AD right.', min: 0, max: 100, step: 1, format: v => `${v}` },
  { key: 'taxRate', label: 'Tax rate (T)', hint: 'Higher T shifts AD left.', min: 0, max: 50, step: 1, format: v => `${v}%` },
  { key: 'interestRate', label: 'Interest rate (i)', hint: 'Lower i shifts AD right.', min: 0, max: 10, step: 0.1, format: v => `${v.toFixed(1)}%` },
  { key: 'productionCosts', label: 'Production costs', hint: 'Higher costs shift AS left.', min: 0, max: 100, step: 1, format: v => `${v}` },
  { key: 'productivity', label: 'Productivity', hint: 'Shifts LRAS right/left.', min: 0, max: 100, step: 1, format: v => `${v}` },
  { key: 'supplySideReform', label: 'Supply-side reform intensity', hint: 'Captures tax/regulation/training bundles.', min: 0, max: 100, step: 1, format: v => `${v}` },
];

const PRESETS = {
  baseline: { govSpending: 50, taxRate: 25, interestRate: 3.5, productionCosts: 50, productivity: 50, supplySideReform: 50 },
  recession: { govSpending: 30, taxRate: 40, interestRate: 6, productionCosts: 50, productivity: 50, supplySideReform: 50 },
  demandPull: { govSpending: 80, taxRate: 10, interestRate: 1, productionCosts: 50, productivity: 50, supplySideReform: 50 },
  costPush: { govSpending: 50, taxRate: 25, interestRate: 3.5, productionCosts: 90, productivity: 40, supplySideReform: 30 },
  expFiscal: { govSpending: 80, taxRate: 10, interestRate: 3.5, productionCosts: 50, productivity: 50, supplySideReform: 50 },
  conFiscal: { govSpending: 20, taxRate: 40, interestRate: 3.5, productionCosts: 50, productivity: 50, supplySideReform: 50 },
  expMonetary: { govSpending: 50, taxRate: 25, interestRate: 1, productionCosts: 50, productivity: 50, supplySideReform: 50 },
  conMonetary: { govSpending: 50, taxRate: 25, interestRate: 8, productionCosts: 50, productivity: 50, supplySideReform: 50 },
  supplyReform: { govSpending: 50, taxRate: 25, interestRate: 3.5, productionCosts: 50, productivity: 50, supplySideReform: 90 },
  supplyInvest: { govSpending: 55, taxRate: 25, interestRate: 3.5, productionCosts: 40, productivity: 80, supplySideReform: 70 },
};

function applyPreset(presetKey) {
  const p = PRESETS[presetKey];
  if (!p) return;
  simState.params = { ...p };
  onParamsChanged(true);
  showStatus(`Loaded preset: ${presetKey}`, false, 1800);
}

function renderParametersPanel() {
  const root = $('#panelParameters');
  if (!root) return;
  root.innerHTML = '';
  PARAM_DEFS.forEach(d => {
    const wrap = el('div', { class: 'slider' });
    wrap.innerHTML = `
      <div class="slider__top">
        <div>
          <div class="slider__label">${escapeHtml(d.label)}</div>
          <div class="slider__hint">${escapeHtml(d.hint)}</div>
        </div>
        <div class="slider__value" id="val_${d.key}">—</div>
      </div>
      <input type="range" id="rng_${d.key}" min="${d.min}" max="${d.max}" step="${d.step}" />
    `;
    root.appendChild(wrap);
    const rng = wrap.querySelector(`#rng_${d.key}`);
    rng.value = simState.params[d.key];
    rng.oninput = () => {
      simState.params[d.key] = Number(rng.value);
      onParamsChanged(true);
    };
  });
  syncParamReadouts();
}

function syncParamReadouts() {
  PARAM_DEFS.forEach(d => {
    const val = $(`#val_${d.key}`);
    const rng = $(`#rng_${d.key}`);
    if (val) val.textContent = d.format(simState.params[d.key]);
    if (rng) rng.value = simState.params[d.key];
  });
}

function pushPolicyHistory() {
  const stamp = { ts: Date.now(), params: { ...simState.params } };
  simState.history = simState.history.slice(0, simState.historyIndex + 1);
  simState.history.push(stamp);
  simState.historyIndex = simState.history.length - 1;
  if (simState.history.length > 50) {
    simState.history = simState.history.slice(-50);
    simState.historyIndex = simState.history.length - 1;
  }
}

function replayHistory(dir) {
  if (!simState.history.length) return;
  simState.historyIndex = clamp(simState.historyIndex + dir, 0, simState.history.length - 1);
  simState.params = { ...simState.history[simState.historyIndex].params };
  syncParamReadouts();
  onParamsChanged(false);
}

function onParamsChanged(pushHistory) {
  if (pushHistory) pushPolicyHistory();
  syncParamReadouts();
  renderMainChart();
}

const CHART = { W: 860, H: 560, pad: { l: 86, r: 28, t: 20, b: 78 } };
const CHART_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs = {}) {
  const e = document.createElementNS(CHART_NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

function clearSvg(svg) { while (svg.firstChild) svg.removeChild(svg.firstChild); }

function renderMainChart() {
  const svg = $('#chartSvg');
  if (!svg) return;
  clearSvg(svg);
  const { W, H, pad } = CHART;
  const x = (Y) => pad.l + ((Y - GRAPH.Ymin) / (GRAPH.Ymax - GRAPH.Ymin)) * (W - pad.l - pad.r);
  const y = (P) => pad.t + (1 - (P - GRAPH.Pmin) / (GRAPH.Pmax - GRAPH.Pmin)) * (H - pad.t - pad.b);

  const base = { ...computeFromParams(defaults.params), view: simState.view };
  const cur = computeFromParams(simState.params);

  // Box / background
  svg.appendChild(svgEl('rect', { x: 0, y: 0, width: W, height: H, fill: 'transparent' }));

  // Yf vertical
  svg.appendChild(svgEl('line', { x1: x(base.yFe), y1: pad.t, x2: x(base.yFe), y2: H - pad.b, stroke: 'var(--chart-lras)', 'stroke-width': 2, 'stroke-dasharray': '4 4' }));
  svg.appendChild(svgEl('text', { x: x(base.yFe) - 6, y: H - pad.b + 16, 'font-family': 'var(--font-sans)', 'font-size': 11, fill: 'var(--chart-lras)' })).textContent = 'Yf';

  // Axes
  svg.appendChild(svgEl('line', { x1: pad.l, y1: H - pad.b, x2: W - pad.r, y2: H - pad.b, stroke: 'var(--text-2)', 'stroke-width': 1.4 }));
  svg.appendChild(svgEl('line', { x1: pad.l, y1: pad.t, x2: pad.l, y2: H - pad.b, stroke: 'var(--text-2)', 'stroke-width': 1.4 }));

  // Axis labels
  const lblX = svgEl('text', { x: (pad.l + W - pad.r) / 2, y: H - pad.b + 38, 'text-anchor': 'middle', 'font-family': 'var(--font-sans)', 'font-size': 12, fill: 'var(--text-2)' });
  lblX.textContent = 'Real output (Y)';
  svg.appendChild(lblX);
  const lblY = svgEl('text', { x: 18, y: (pad.t + H - pad.b) / 2, 'text-anchor': 'middle', 'font-family': 'var(--font-sans)', 'font-size': 12, fill: 'var(--text-2)', transform: `rotate(-90 18 ${(pad.t + H - pad.b) / 2})` });
  lblY.textContent = 'Price level (P)';
  svg.appendChild(lblY);

  // Axis numbers
  if (simState.showAxisNumbers) {
    for (let Y = 60; Y <= 180; Y += 30) {
      const tx = svgEl('text', { x: x(Y), y: H - pad.b + 14, 'text-anchor': 'middle', 'font-family': 'var(--font-sans)', 'font-size': 10, fill: 'var(--muted)' });
      tx.textContent = Y;
      svg.appendChild(tx);
    }
    for (let P = 30; P <= 110; P += 20) {
      const ty = svgEl('text', { x: pad.l - 8, y: y(P) + 4, 'text-anchor': 'end', 'font-family': 'var(--font-sans)', 'font-size': 10, fill: 'var(--muted)' });
      ty.textContent = P;
      svg.appendChild(ty);
    }
  }

  // AD curve (current)
  const AD_seg = adLineSegment(cur.adShiftY).seg;
  if (AD_seg) {
    const d = `M ${x(AD_seg[0][0])} ${y(AD_seg[0][1])} L ${x(AD_seg[1][0])} ${y(AD_seg[1][1])}`;
    svg.appendChild(svgEl('path', { d, stroke: 'var(--chart-ad)', 'stroke-width': 3, fill: 'none' }));
    const lbl = svgEl('text', { x: x(AD_seg[1][0]) - 6, y: y(AD_seg[1][1]) - 6, 'text-anchor': 'end', 'font-family': 'var(--font-sans)', 'font-size': 12, 'font-weight': 700, fill: 'var(--chart-ad)' });
    lbl.textContent = 'AD';
    svg.appendChild(lbl);
  }

  // SRAS (current) — draw the full curve as a smooth polyline. In the
  // Keynesian view this is the textbook three-region shape (flat at low Y,
  // rising in the middle, vertical near Yf). In the Monetarist view it is
  // a single vertical line at Yf.
  const sras = asPolyline({ asShiftP: cur.asShiftP, yFe: cur.yFe, view: simState.view });
  if (sras && sras.pts && sras.pts.length >= 2) {
    const d = 'M ' + sras.pts.map(([Y, P]) => `${x(Y)} ${y(P)}`).join(' L ');
    svg.appendChild(svgEl('path', { d, stroke: 'var(--chart-as)', 'stroke-width': 3, fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
    // Place the SRAS label near the upper portion of the curve, but on the
    // left side so it doesn't collide with the AD label.
    const labelPoint = simState.view === SRAS_VIEWS.MONETARIST
      ? [sras.yFe, sras.pFlat + (sras.pEnd - sras.pFlat) * 0.15]
      : [sras.yKink + 4, sras.pFlat - 4];
    const lbl = svgEl('text', { x: x(labelPoint[0]) + 6, y: y(labelPoint[1]) - 4, 'font-family': 'var(--font-sans)', 'font-size': 12, 'font-weight': 700, fill: 'var(--chart-as)' });
    lbl.textContent = 'SRAS';
    svg.appendChild(lbl);
  }

  // Equilibrium
  const eq = equilibrium({ ...cur, view: simState.view });
  svg.appendChild(svgEl('circle', { cx: x(eq.y), cy: y(eq.p), r: 5, fill: 'var(--text)' }));
  const dP = svgEl('line', { x1: x(eq.y), y1: y(eq.p), x2: x(eq.y), y2: H - pad.b, stroke: 'var(--text)', 'stroke-width': 1, 'stroke-dasharray': '3 3', opacity: 0.5 });
  svg.appendChild(dP);
  svg.appendChild(svgEl('line', { x1: pad.l, y1: y(eq.p), x2: x(eq.y), y2: y(eq.p), stroke: 'var(--text)', 'stroke-width': 1, 'stroke-dasharray': '3 3', opacity: 0.5 }));

  // Update stat boxes
  const num = (v) => Number(v).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  $('#statOutputValue').textContent = `Y ${num(eq.y)}`;
  $('#statPriceValue').textContent = `P ${num(eq.p)}`;
  $('#statPotentialValue').textContent = `Yf ${num(cur.yFe)}`;
  // Baseline equilibrium must use the SAME view as the current state, otherwise
  // deltas are apples-to-oranges (e.g. monetarist Y is always Yf, so a
  // Keynesian baseline would always show a misleading gap).
  const baseEq = equilibrium(base);
  const dY = eq.y - baseEq.y; const dP2 = eq.p - baseEq.p; const dYf = cur.yFe - base.yFe;
  $('#statOutputDelta').textContent = `Δ ${dY > 0 ? '+' : ''}${num(dY)}`;
  $('#statPriceDelta').textContent = `Δ ${dP2 > 0 ? '+' : ''}${num(dP2)}`;
  $('#statPotentialDelta').textContent = `Δ ${dYf > 0 ? '+' : ''}${num(dYf)}`;

  // State label
  const gap = eq.y - cur.yFe;
  const gapPct = (gap / cur.yFe) * 100;
  const sl = $('#gapLabel');
  if (sl) {
    if (simState.view === SRAS_VIEWS.MONETARIST) {
      sl.textContent = 'Monetarist: output pinned at Yf, prices absorb shocks';
      sl.dataset.state = 'monetarist';
    } else if (gap < -2) {
      sl.textContent = `Recessionary gap: ${Math.abs(gapPct).toFixed(1)}% below potential`;
      sl.dataset.state = 'recessionary';
    } else if (gap > 2) {
      sl.textContent = `Inflationary gap: ${gapPct.toFixed(1)}% above potential`;
      sl.dataset.state = 'inflationary';
    } else {
      sl.textContent = 'Near full-employment equilibrium';
      sl.dataset.state = '';
    }
  }

  // Chip row
  const chips = $('#changeChips');
  if (chips) {
    chips.innerHTML = '';
    const mk = (txt) => { const c = el('span', { class: 'chip' }, txt); chips.appendChild(c); };
    if (Math.abs(dY) > 0.05) mk(`Output ${dY > 0 ? '↑' : '↓'} ${Math.abs(dY).toFixed(1)}`);
    if (Math.abs(dP2) > 0.05) mk(`Prices ${dP2 > 0 ? '↑' : '↓'} ${Math.abs(dP2).toFixed(1)}`);
    if (Math.abs(dYf) > 0.05) mk(`Yf ${dYf > 0 ? '↑' : '↓'} ${Math.abs(dYf).toFixed(1)}`);
  }
}

function exportChartPng() {
  const svg = $('#chartSvg');
  if (!svg) return;
  const clone = svg.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(860));
  clone.setAttribute('height', String(560));
  const bg = svgEl('rect', { x: 0, y: 0, width: 860, height: 560, fill: getComputedStyle(document.body).getPropertyValue('--surface') || '#fff' });
  clone.insertBefore(bg, clone.firstChild);
  const markup = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 860; canvas.height = 560;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--surface') || '#fff';
    ctx.fillRect(0, 0, 860, 560);
    ctx.drawImage(img, 0, 0);
    canvas.toBlob((b) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = 'macrow-chart.png';
      a.click();
      showStatus('PNG downloaded', false, 1500);
    }, 'image/png');
    URL.revokeObjectURL(url);
  };
  img.onerror = () => showStatus('Failed to export PNG', true, 2000);
  img.src = url;
}

function exportChartSvg() {
  const svg = $('#chartSvg');
  if (!svg) return;
  const clone = svg.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const markup = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'macrow-chart.svg';
  a.click();
  URL.revokeObjectURL(url);
  showStatus('SVG downloaded', false, 1500);
}

// Scenario management
function getScenarioForShare() {
  return { v: 1, params: simState.params };
}

function openSharePanel() {
  $('#sharePanel')?.classList.remove('hidden');
  refreshShareLinkPreview();
}
function closeSharePanel() { $('#sharePanel')?.classList.add('hidden'); }
function refreshShareLinkPreview() {
  const el = $('#shareLinkPreview');
  if (!el) return;
  const url = buildScenarioUrl(getScenarioForShare());
  el.textContent = url;
  el.classList.remove('hidden');
}
async function copyScenarioShareLink() {
  const link = buildScenarioUrl(getScenarioForShare());
  try {
    await navigator.clipboard.writeText(link);
    showStatus('Scenario link copied', false, 1800);
  } catch {
    prompt('Copy scenario URL:', link);
  }
  refreshShareLinkPreview();
}

function showStatus(text, isError = false, ms = 2000) {
  const s = $('#appStatus');
  if (!s) return;
  s.textContent = text;
  s.dataset.type = isError ? 'error' : '';
  s.classList.remove('hidden');
  clearTimeout(showStatus._t);
  showStatus._t = setTimeout(() => s.classList.add('hidden'), ms);
}

function initSimulator() {
  // Sliders
  renderParametersPanel();
  // Quick scenarios
  $('#btnMakeRecession')?.addEventListener('click', () => applyPreset('recession'));
  $('#btnMakeDemandPull')?.addEventListener('click', () => applyPreset('demandPull'));
  $('#btnMakeCostPush')?.addEventListener('click', () => applyPreset('costPush'));
  $('#btnClearGap')?.addEventListener('click', () => applyPreset('baseline'));
  // Reset
  $('#btnReset')?.addEventListener('click', () => applyPreset('baseline'));
  // Presets
  $$('.presetBtn').forEach(b => b.addEventListener('click', () => applyPreset(b.dataset.preset)));
  // Chart controls
  $('#toggleAxisNumbers')?.addEventListener('change', (e) => { simState.showAxisNumbers = e.target.checked; renderMainChart(); });
  $('#btnExportPng')?.addEventListener('click', exportChartPng);
  $('#btnExportSvg')?.addEventListener('click', exportChartSvg);

  // SRAS view toggle (Keynesian vs Monetarist)
  const viewBtns = $$('.viewToggle__btn');
  const updateViewLabel = () => {
    const lbl = $('#viewLabel');
    if (lbl) lbl.textContent = simState.view === SRAS_VIEWS.MONETARIST ? 'Monetarist view' : 'Keynesian view';
    viewBtns.forEach(b => b.classList.toggle('is-active', b.dataset.view === simState.view));
  };
  viewBtns.forEach(b => b.addEventListener('click', () => {
    simState.view = b.dataset.view === SRAS_VIEWS.MONETARIST ? SRAS_VIEWS.MONETARIST : SRAS_VIEWS.KEYNESIAN;
    updateViewLabel();
    pushPolicyHistory();
    renderMainChart();
  }));
  updateViewLabel();
  // Share
  $('#btnOpenSharePanel')?.addEventListener('click', openSharePanel);
  $('#btnCloseSharePanel')?.addEventListener('click', closeSharePanel);
  $('#btnShareLinkPanel')?.addEventListener('click', copyScenarioShareLink);
  // Scenarios
  $('#btnScenarios')?.addEventListener('click', () => $('#scenarioOverlay')?.classList.remove('hidden'));
  $('#scenarioClose')?.addEventListener('click', () => $('#scenarioOverlay')?.classList.add('hidden'));
  $('#btnSaveScenario')?.addEventListener('click', saveScenario);
  $('#btnExportJson')?.addEventListener('click', exportScenariosJson);
  $('#btnShareScenario')?.addEventListener('click', () => copyScenarioShareLink());
  $('#scenarioImportFile')?.addEventListener('change', importScenariosJson);
  renderScenarioList();

  // Apply scenario from URL
  applyScenarioFromUrl();
  onParamsChanged(true);
}

function applyScenarioFromUrl() {
  const payload = parseScenarioPayloadFromUrl(location.href);
  if (payload?.params) {
    simState.params = { ...simState.params, ...payload.params };
  }
}

function saveScenario() {
  const name = $('#scenarioName')?.value?.trim();
  if (!name) { showStatus('Give the scenario a name first.', true, 2000); return; }
  const list = getScenarios();
  const entry = { id: 'sc_' + Date.now(), name, params: { ...simState.params }, createdAt: Date.now() };
  list.push(entry);
  setScenarios(list);
  renderScenarioList();
  showStatus(`Saved "${name}"`, false, 1500);
  $('#scenarioName').value = '';
}

function renderScenarioList() {
  const root = $('#scenarioListRoot');
  if (!root) return;
  const list = getScenarios();
  root.innerHTML = '';
  if (list.length === 0) {
    root.appendChild(el('div', { class: 'sectionHint' }, 'No saved scenarios yet. Save the current state to start a collection.'));
    return;
  }
  list.slice().reverse().forEach(sc => {
    const card = el('div', { class: 'lessonListItem', style: { marginBottom: '6px' } }, [
      el('div', { class: 'lessonListItem__body' }, [
        el('div', { class: 'lessonListItem__title' }, sc.name),
        el('div', { class: 'lessonListItem__meta' }, new Date(sc.createdAt).toLocaleString()),
      ]),
      el('div', { class: 'lessonListItem__meta' }, [
        el('button', { class: 'btn btn--mini', onclick: () => loadScenario(sc.id) }, 'Load'),
        el('button', { class: 'btn btn--ghost btn--mini', style: { marginLeft: '6px' }, onclick: () => deleteScenario(sc.id) }, 'Delete'),
      ]),
    ]);
    root.appendChild(card);
  });
}

function loadScenario(id) {
  const list = getScenarios();
  const sc = list.find(s => s.id === id);
  if (!sc) return;
  simState.params = { ...sc.params };
  onParamsChanged(true);
  $('#scenarioOverlay')?.classList.add('hidden');
  showStatus(`Loaded "${sc.name}"`, false, 1500);
}
function deleteScenario(id) {
  setScenarios(getScenarios().filter(s => s.id !== id));
  renderScenarioList();
}
function exportScenariosJson() {
  const blob = new Blob([JSON.stringify(getScenarios(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'macrow-scenarios.json';
  a.click();
  showStatus('Scenarios exported', false, 1500);
}
function importScenariosJson(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data)) throw new Error('Invalid format');
      setScenarios([...getScenarios(), ...data]);
      renderScenarioList();
      showStatus(`Imported ${data.length} scenarios`, false, 1500);
    } catch (err) {
      showStatus('Import failed: invalid JSON', true, 2000);
    }
  };
  reader.readAsText(file);
}

function renderSimulator() {
  $('.view--simulator').hidden = false;
  // ensure sim wiring exists once
  if (!renderSimulator._wired) {
    initSimulator();
    renderSimulator._wired = true;
  }
}

// ---------- Shortcuts overlay ----------
const SHORTCUTS = [
  { keys: ['g', 'h'], desc: 'Go to Home' },
  { keys: ['g', 'c'], desc: 'Open Course' },
  { keys: ['g', 's'], desc: 'Open Simulator' },
  { keys: ['g', 'g'], desc: 'Open Glossary' },
  { keys: ['?'], desc: 'Show all shortcuts' },
  { keys: ['Esc'], desc: 'Close overlays' },
];
function openShortcuts() {
  const ov = $('#shortcutsOverlay');
  if (!ov) return;
  const list = $('#shortcutsList');
  list.innerHTML = '';
  SHORTCUTS.forEach(s => {
    const row = el('div', { class: 'lessonListItem', style: { marginBottom: '4px' } }, [
      el('div', { class: 'lessonListItem__body' }, s.desc),
      el('div', { class: 'lessonListItem__meta' },
        s.keys.map((k, i) => el('span', {}, (i ? ' then ' : '') + k))
      ),
    ]);
    list.appendChild(row);
  });
  ov.classList.remove('hidden');
  ov.setAttribute('aria-hidden', 'false');
}
function closeShortcuts() {
  const ov = $('#shortcutsOverlay');
  if (!ov) return;
  ov.classList.add('hidden');
  ov.setAttribute('aria-hidden', 'true');
}

// ---------- Event wiring ----------
function wireGlobalEvents() {
  // Sidebar nav
  $$('.navBtn[data-nav]').forEach(b => {
    b.addEventListener('click', () => navigate(b.dataset.nav));
  });
  // Brand click goes home
  $('.brand')?.addEventListener('click', (e) => { e.preventDefault(); navigate('home'); });
  // Back buttons / course navigation
  $$('[data-action="back-to-course"]').forEach(b => b.addEventListener('click', () => navigate('course')));
  $$('[data-action="back-to-module"]').forEach(b => b.addEventListener('click', () => {
    if (currentRoute.params.moduleId) navigate('module', { moduleId: currentRoute.params.moduleId });
  }));
  // Continue / start buttons
  $$('[data-action="resume"]').forEach(b => b.addEventListener('click', () => {
    const last = getProgress().lastLesson;
    if (last) navigate('lesson', last);
    else navigate('course');
  }));
  $$('[data-action="start-course"]').forEach(b => b.addEventListener('click', () => navigate('module', { moduleId: COURSE[0].id })));
  // Course filter
  $$('input[name="courseFilter"]').forEach(r => r.addEventListener('change', (e) => {
    currentCourseFilter = e.target.value;
    renderCourseIndex();
  }));
  // Glossary search
  const s = $('#glossarySearch');
  if (s) s.addEventListener('input', (e) => { currentRoute.params.search = e.target.value; renderGlossary(); });
  // Shortcuts
  $('#shortcutsClose')?.addEventListener('click', closeShortcuts);
  $('#btnOpenShortcuts')?.addEventListener('click', openShortcuts);
  // Keyboard
  let pendingG = false;
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, select')) return;
    if (e.key === 'Escape') {
      const overlay = $('.overlay:not(.hidden)');
      if (overlay) {
        const closeBtn = overlay.querySelector('.iconBtn[aria-label*="Close" i]');
        closeBtn?.click();
        return;
      }
      if ($('.sidebar')?.classList.contains('sidebar--open')) {
        $('.sidebar')?.classList.remove('sidebar--open');
        $('.sidebarBackdrop')?.classList.remove('sidebarBackdrop--open');
        document.body.classList.remove('sidebar-open');
        $('#btnSidebarOpen')?.focus();
        return;
      }
    }
    if (e.key === '?') { openShortcuts(); return; }
    if (e.key === 'g' || e.key === 'G') { pendingG = true; setTimeout(() => pendingG = false, 600); return; }
    if (pendingG) {
      pendingG = false;
      if (e.key === 'h' || e.key === 'H') navigate('home');
      else if (e.key === 'c' || e.key === 'C') navigate('course');
      else if (e.key === 's' || e.key === 'S') navigate('simulator');
      else if (e.key === 'g' || e.key === 'G') navigate('glossary');
    }
  });
}

// ---------- Init ----------
function init() {
  applyTheme(getPreferredTheme(), { persist: false });
  initThemeToggle();
  initSidebarToggle();
  wireGlobalEvents();

  // Restore last route
  let last = null;
  try { last = JSON.parse(storageGet(LAST_ROUTE_KEY) || 'null'); } catch (_e) {}
  if (last && (ROUTES.includes(last.name) || ['module', 'lesson'].includes(last.name))) {
    currentRoute = last;
  }

  // Apply scenario from URL (overrides default state)
  const payload = parseScenarioPayloadFromUrl(location.href);
  if (payload?.params) {
    simState.params = { ...simState.params, ...payload.params };
  }

  render();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
