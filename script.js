/* ==========================================================
   MENTOR ATTENDANCE TRACKER — script.js
   ==========================================================
   State  →  Render  →  Events  →  Storage
   Single-file, no frameworks, localStorage persistence.
   ========================================================== */

// ─────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────
const state = {
  slots:         [],          // { id, date, start, end, student, tag, status, income }
  selectedDate:  '',          // 'YYYY-MM-DD'
  selectedTag:   'all',       // tag string | 'all'
  searchQuery:   '',
  viewMonth:     null,        // dayjs instance
  editingId:     null,        // slot id being edited
  incomeVisible: true,
  theme:         'light',
};

// ─────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  state.viewMonth    = dayjs();
  state.selectedDate = dayjs().format('YYYY-MM-DD');

  hydrateFromStorage();
  initFlatpickr();
  bindEvents();
  render();
});

// ─────────────────────────────────────────────
//  STORAGE
// ─────────────────────────────────────────────
function hydrateFromStorage() {
  // Slots
  try {
    const raw = localStorage.getItem('slots');
    state.slots = raw ? JSON.parse(raw) : [];
  } catch { state.slots = []; }

  // Theme
  state.theme = localStorage.getItem('theme') || 'light';
  applyTheme(state.theme);

  // Income visibility
  const iv = localStorage.getItem('incomeVisible');
  state.incomeVisible = (iv === null) ? true : (iv === 'true');
}

function persist() {
  localStorage.setItem('slots', JSON.stringify(state.slots));
}

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  const sun  = document.getElementById('themeIconSun');
  const moon = document.getElementById('themeIconMoon');
  if (t === 'dark') {
    sun.style.display  = 'none';
    moon.style.display = '';
  } else {
    sun.style.display  = '';
    moon.style.display = 'none';
  }
}

// ─────────────────────────────────────────────
//  FLATPICKR
// ─────────────────────────────────────────────
let fpInstance = null;

function initFlatpickr() {
  fpInstance = flatpickr('#slotDate', {
    dateFormat:    'Y-m-d',
    disableMobile: false,
    allowInput:    false,
  });
}

// ─────────────────────────────────────────────
//  MASTER RENDER
// ─────────────────────────────────────────────
function render() {
  renderCalendar();
  renderSlotList();
  renderSidebar();
  renderIncome();
  updateDateLabel();
}

// ─────────────────────────────────────────────
//  CALENDAR
// ─────────────────────────────────────────────
function renderCalendar() {
  const grid  = document.getElementById('calGrid');
  const label = document.getElementById('calMonthLabel');
  const vm    = state.viewMonth;

  label.textContent = vm.format('MMMM YYYY');

  const firstDayOfWeek = vm.startOf('month').day(); // 0 = Sun
  const daysInMonth    = vm.daysInMonth();
  const todayStr       = dayjs().format('YYYY-MM-DD');

  grid.innerHTML = '';

  // Leading empty cells
  for (let i = 0; i < firstDayOfWeek; i++) {
    const el = document.createElement('div');
    el.className = 'cal-day empty';
    grid.appendChild(el);
  }

  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr  = vm.date(d).format('YYYY-MM-DD');
    const daySlots = state.slots.filter(s => s.date === dateStr);

    const cell = document.createElement('div');
    cell.className   = 'cal-day';
    cell.setAttribute('role', 'gridcell');
    cell.setAttribute('aria-label', vm.date(d).format('D MMMM YYYY'));

    if (dateStr === todayStr)          cell.classList.add('today');
    if (dateStr === state.selectedDate) cell.classList.add('selected');

    // Day number
    const numEl = document.createElement('div');
    numEl.className   = 'day-num';
    numEl.textContent = d;
    cell.appendChild(numEl);

    // Status dots
    if (daySlots.length > 0) {
      const dotsEl = document.createElement('div');
      dotsEl.className = 'day-dots';

      const hasC = daySlots.some(s => s.status === 'completed');
      const hasM = daySlots.some(s => s.status === 'missed');
      const hasP = daySlots.some(s => s.status === 'pending');

      if (hasC) dotsEl.innerHTML += '<span class="dot dot-c"></span>';
      if (hasM) dotsEl.innerHTML += '<span class="dot dot-m"></span>';
      if (hasP) dotsEl.innerHTML += '<span class="dot dot-p"></span>';

      cell.appendChild(dotsEl);
    }

    cell.addEventListener('click', () => {
      state.selectedDate = dateStr;
      state.searchQuery  = '';
      clearSearchUI();
      renderCalendar();
      renderSlotList();
      renderIncome();
      updateDateLabel();
    });

    grid.appendChild(cell);
  }
}

// ─────────────────────────────────────────────
//  FILTER & SORT SLOTS
// ─────────────────────────────────────────────
function getFilteredSlots() {
  let result = [...state.slots];

  // Search overrides date filter
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase().trim();
    result = result.filter(s =>
      (s.student && s.student.toLowerCase().includes(q)) ||
      (s.tag     && s.tag.toLowerCase().includes(q))
    );
  } else if (state.selectedDate) {
    result = result.filter(s => s.date === state.selectedDate);
  }

  // Tag filter
  if (state.selectedTag !== 'all') {
    result = result.filter(s => s.tag === state.selectedTag);
  }

  // Sort by date ↑ then start time ↑
  result.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.start.localeCompare(b.start);
  });

  return result;
}

// ─────────────────────────────────────────────
//  SLOT LIST
// ─────────────────────────────────────────────
function renderSlotList() {
  const list   = document.getElementById('slotList');
  const empty  = document.getElementById('emptyState');
  const countEl = document.getElementById('slotsCount');

  const slots = getFilteredSlots();

  list.innerHTML = '';

  if (slots.length === 0) {
    list.style.display  = 'none';
    empty.style.display = '';
    countEl.textContent = '';
  } else {
    list.style.display  = 'flex';
    empty.style.display = 'none';
    countEl.textContent = `· ${slots.length}`;

    slots.forEach(slot => {
      list.appendChild(buildSlotCard(slot));
    });
  }
}

function buildSlotCard(slot) {
  const isFree = !slot.student;

  const card = document.createElement('div');
  card.className = `slot-card status-${slot.status}${isFree ? ' free-slot' : ''}`;
  card.setAttribute('role', 'listitem');

  // Status label map
  const statusLabel = { completed: 'Done', missed: 'Missed', pending: 'Pending' };

  // Income display
  const incHtml = (state.incomeVisible && slot.income !== null && slot.income > 0)
    ? `<span class="card-income">₹${Number(slot.income).toLocaleString('en-IN')}</span>`
    : '';

  // Tag display
  const tagHtml = slot.tag
    ? `<span class="card-tag">${escHtml(slot.tag)}</span>`
    : '';

  card.innerHTML = `
    <div class="card-top">
      <span class="card-time">${fmtTime(slot.start)} – ${fmtTime(slot.end)}</span>
      <button class="card-edit-btn" data-id="${slot.id}" title="Edit session" aria-label="Edit session">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
    <div class="card-student ${isFree ? 'is-free' : ''}">
      ${isFree ? 'Free Slot' : escHtml(slot.student)}
    </div>
    <div class="card-bottom">
      <div class="card-meta">
        ${tagHtml}
        ${incHtml}
      </div>
      <button class="status-badge ${slot.status}"
        data-id="${slot.id}"
        title="Tap to change status"
        aria-label="Status: ${statusLabel[slot.status]}. Tap to change.">
        ${statusLabel[slot.status]}
      </button>
    </div>
  `;

  // Status cycle on badge click
  card.querySelector('.status-badge').addEventListener('click', e => {
    e.stopPropagation();
    cycleStatus(slot.id);
  });

  // Edit button
  card.querySelector('.card-edit-btn').addEventListener('click', e => {
    e.stopPropagation();
    openModal(slot.id);
  });

  return card;
}

// ─────────────────────────────────────────────
//  STATUS CYCLE
// ─────────────────────────────────────────────
function cycleStatus(id) {
  const slot = state.slots.find(s => s.id === id);
  if (!slot) return;

  const cycle = { pending: 'completed', completed: 'missed', missed: 'pending' };
  slot.status = cycle[slot.status] ?? 'pending';

  persist();
  renderCalendar();
  renderSlotList();
  renderIncome();
}

// ─────────────────────────────────────────────
//  SIDEBAR / TAGS
// ─────────────────────────────────────────────
function renderSidebar() {
  const tagList = document.getElementById('tagList');

  // Build tag → count map
  const counts = {};
  state.slots.forEach(s => {
    if (s.tag) counts[s.tag] = (counts[s.tag] || 0) + 1;
  });

  tagList.innerHTML = '';

  // "All" item
  tagList.appendChild(buildTagItem('all', 'All Classes', state.slots.length));

  // Individual tags (sorted a–z)
  Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([tag, count]) => {
      tagList.appendChild(buildTagItem(tag, tag, count));
    });

  // Stats
  document.getElementById('statTotal').textContent     = state.slots.length;
  document.getElementById('statCompleted').textContent = state.slots.filter(s => s.status === 'completed').length;
  document.getElementById('statMissed').textContent    = state.slots.filter(s => s.status === 'missed').length;

  // Populate datalist in modal
  const datalist = document.getElementById('tagSuggestions');
  datalist.innerHTML = '';
  Object.keys(counts).sort().forEach(tag => {
    const opt = document.createElement('option');
    opt.value = tag;
    datalist.appendChild(opt);
  });
}

function buildTagItem(value, label, count) {
  const li = document.createElement('li');
  li.className   = `tag-item${state.selectedTag === value ? ' active' : ''}`;
  li.dataset.tag = value;
  li.setAttribute('role', 'option');
  li.setAttribute('aria-selected', state.selectedTag === value);

  li.innerHTML = `
    <span>${escHtml(label)}</span>
    <span class="tag-count">${count}</span>
  `;

  li.addEventListener('click', () => {
    state.selectedTag = value;
    closeSidebar();
    renderSidebar();
    renderSlotList();
  });

  return li;
}

// ─────────────────────────────────────────────
//  INCOME
// ─────────────────────────────────────────────
function renderIncome() {
  const todayStr = dayjs().format('YYYY-MM-DD');
  const monthStr = dayjs().format('YYYY-MM');

  const earned = state.slots.filter(s => s.status === 'completed' && s.income !== null && s.income > 0);

  const todayAmt = earned.filter(s => s.date === todayStr)
                         .reduce((sum, s) => sum + Number(s.income), 0);
  const monthAmt = earned.filter(s => s.date.startsWith(monthStr))
                         .reduce((sum, s) => sum + Number(s.income), 0);
  const allAmt   = earned.reduce((sum, s) => sum + Number(s.income), 0);

  const fmt = n => `₹${n.toLocaleString('en-IN')}`;

  document.getElementById('incomeToday').textContent = fmt(todayAmt);
  document.getElementById('incomeMonth').textContent = fmt(monthAmt);
  document.getElementById('incomeAll').textContent   = fmt(allAmt);

  // Toggle visibility
  const amounts   = document.getElementById('incomeAmounts');
  const toggleBtn = document.getElementById('incomeToggle');

  if (state.incomeVisible) {
    amounts.style.opacity = '1';
    amounts.style.filter  = '';
    toggleBtn.textContent = 'Hide ₹';
  } else {
    amounts.style.opacity = '0.12';
    amounts.style.filter  = 'blur(5px)';
    toggleBtn.textContent = 'Show ₹';
  }
}

// ─────────────────────────────────────────────
//  DATE LABEL
// ─────────────────────────────────────────────
function updateDateLabel() {
  const label    = document.getElementById('slotsDateLabel');
  const clearBtn = document.getElementById('clearDateFilter');
  const todayStr = dayjs().format('YYYY-MM-DD');

  if (state.searchQuery) {
    label.textContent       = 'Search results';
    clearBtn.style.display  = 'none';
    return;
  }

  if (!state.selectedDate) {
    label.textContent      = 'All Sessions';
    clearBtn.textContent   = 'Today →';
    clearBtn.style.display = '';
    return;
  }

  const d = dayjs(state.selectedDate);

  let labelText;
  if      (state.selectedDate === todayStr)                    labelText = 'Today';
  else if (state.selectedDate === dayjs().subtract(1,'day').format('YYYY-MM-DD')) labelText = 'Yesterday';
  else if (state.selectedDate === dayjs().add(1,'day').format('YYYY-MM-DD'))      labelText = 'Tomorrow';
  else     labelText = d.format('ddd, D MMM YYYY');

  label.textContent     = labelText;
  clearBtn.textContent  = 'Today →';
  clearBtn.style.display = (state.selectedDate === todayStr) ? 'none' : '';
}

// ─────────────────────────────────────────────
//  MODAL
// ─────────────────────────────────────────────
function openModal(editId = null) {
  state.editingId = editId;

  const titleEl    = document.getElementById('modalTitle');
  const deleteBtn  = document.getElementById('deleteBtn');

  if (editId) {
    const slot = state.slots.find(s => s.id === editId);
    if (!slot) return;

    titleEl.textContent       = 'Edit Session';
    deleteBtn.style.display   = '';

    fpInstance.setDate(slot.date, false);
    document.getElementById('slotStart').value   = slot.start;
    document.getElementById('slotEnd').value     = slot.end;
    document.getElementById('slotStudent').value = slot.student || '';
    document.getElementById('slotTag').value     = slot.tag    || '';
    document.getElementById('slotIncome').value  = slot.income != null ? slot.income : '';
  } else {
    titleEl.textContent      = 'New Session';
    deleteBtn.style.display  = 'none';

    const defaultDate = state.selectedDate || dayjs().format('YYYY-MM-DD');
    fpInstance.setDate(defaultDate, false);

    document.getElementById('slotStart').value   = '';
    document.getElementById('slotEnd').value     = '';
    document.getElementById('slotStudent').value = '';
    document.getElementById('slotTag').value     = '';
    document.getElementById('slotIncome').value  = '';
  }

  document.getElementById('modalBackdrop').classList.add('open');
  document.body.style.overflow = 'hidden';

  // Focus first interactive field after animation
  setTimeout(() => {
    if (!editId) document.getElementById('slotStart').focus();
  }, 360);
}

function closeModal() {
  document.getElementById('modalBackdrop').classList.remove('open');
  document.body.style.overflow = '';
  state.editingId = null;
}

function saveSlot() {
  const date    = document.getElementById('slotDate').value.trim();
  const start   = document.getElementById('slotStart').value.trim();
  const end     = document.getElementById('slotEnd').value.trim();
  const student = document.getElementById('slotStudent').value.trim();
  const tag     = document.getElementById('slotTag').value.trim();
  const rawInc  = document.getElementById('slotIncome').value;
  const income  = rawInc !== '' ? parseFloat(rawInc) : null;

  // Validate
  if (!date)  { shakeInput('slotDate');  return; }
  if (!start) { shakeInput('slotStart'); return; }
  if (!end)   { shakeInput('slotEnd');   return; }

  if (state.editingId) {
    // Update existing
    const idx = state.slots.findIndex(s => s.id === state.editingId);
    if (idx !== -1) {
      state.slots[idx] = {
        ...state.slots[idx],
        date, start, end,
        student: student || null,
        tag,
        income,
      };
    }
  } else {
    // Create new
    state.slots.push({
      id:      uid(),
      date, start, end,
      student: student || null,
      tag,
      status:  'pending',
      income,
    });

    // Navigate calendar to the new slot's date
    state.selectedDate = date;
    state.viewMonth    = dayjs(date);
  }

  persist();
  closeModal();
  render();
}

function deleteSlot() {
  if (!state.editingId) return;

  // Soft confirmation via button color pulse (avoid native confirm on mobile)
  const btn = document.getElementById('deleteBtn');
  if (!btn.dataset.confirm) {
    btn.dataset.confirm = '1';
    btn.textContent = 'Tap again to confirm';
    setTimeout(() => {
      delete btn.dataset.confirm;
      btn.textContent = 'Delete';
    }, 2500);
    return;
  }

  state.slots = state.slots.filter(s => s.id !== state.editingId);
  persist();
  closeModal();
  render();
}

// ─────────────────────────────────────────────
//  SIDEBAR OPEN / CLOSE
// ─────────────────────────────────────────────
function openSidebar() {
  renderSidebar(); // refresh tag list & counts
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('overlay').classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('visible');
  document.body.style.overflow = '';
}

// ─────────────────────────────────────────────
//  EVENTS
// ─────────────────────────────────────────────
function bindEvents() {
  // Sidebar
  document.getElementById('menuBtn').addEventListener('click', openSidebar);
  document.getElementById('closeSidebar').addEventListener('click', closeSidebar);

  // Overlay closes sidebar OR modal
  document.getElementById('overlay').addEventListener('click', closeSidebar);

  // Theme toggle
  document.getElementById('themeBtn').addEventListener('click', () => {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    applyTheme(state.theme);
    localStorage.setItem('theme', state.theme);
  });

  // Calendar prev / next month
  document.getElementById('prevMonth').addEventListener('click', () => {
    state.viewMonth = state.viewMonth.subtract(1, 'month');
    renderCalendar();
  });

  document.getElementById('nextMonth').addEventListener('click', () => {
    state.viewMonth = state.viewMonth.add(1, 'month');
    renderCalendar();
  });

  // Search
  const searchInput = document.getElementById('searchInput');
  const searchClear = document.getElementById('searchClear');

  searchInput.addEventListener('input', e => {
    state.searchQuery = e.target.value;
    searchClear.style.display = state.searchQuery ? '' : 'none';
    renderSlotList();
    updateDateLabel();
  });

  searchClear.addEventListener('click', () => {
    state.searchQuery = '';
    searchInput.value = '';
    searchClear.style.display = 'none';
    renderSlotList();
    updateDateLabel();
  });

  // Income toggle
  document.getElementById('incomeToggle').addEventListener('click', () => {
    state.incomeVisible = !state.incomeVisible;
    localStorage.setItem('incomeVisible', String(state.incomeVisible));
    renderIncome();
    renderSlotList(); // refresh cards (show/hide per-slot income)
  });

  // Jump to today
  document.getElementById('clearDateFilter').addEventListener('click', () => {
    state.selectedDate = dayjs().format('YYYY-MM-DD');
    state.viewMonth    = dayjs();
    renderCalendar();
    renderSlotList();
    renderIncome();
    updateDateLabel();
  });

  // FAB — open modal
  document.getElementById('fabBtn').addEventListener('click', () => openModal(null));

  // Modal controls
  document.getElementById('closeModal').addEventListener('click', closeModal);
  document.getElementById('saveBtn').addEventListener('click', saveSlot);
  document.getElementById('deleteBtn').addEventListener('click', deleteSlot);

  // Close modal by clicking outside the sheet
  document.getElementById('modalBackdrop').addEventListener('click', e => {
    if (e.target === document.getElementById('modalBackdrop')) closeModal();
  });

  // Keyboard: Escape closes open layers
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (document.getElementById('modalBackdrop').classList.contains('open')) {
      closeModal();
    } else if (document.getElementById('sidebar').classList.contains('open')) {
      closeSidebar();
    }
  });

  // Enter on form fields submits
  ['slotDate','slotStart','slotEnd','slotStudent','slotTag','slotIncome'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') saveSlot();
    });
  });
}

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────

/** Generate a short unique id */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** Escape HTML to prevent XSS */
function escHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#039;');
}

/** Format HH:mm to 12h or keep 24h nicely */
function fmtTime(t) {
  if (!t) return '--';
  const [hh, mm] = t.split(':').map(Number);
  const period = hh < 12 ? 'AM' : 'PM';
  const h      = hh % 12 || 12;
  return `${h}:${String(mm).padStart(2,'0')} ${period}`;
}

/** Briefly highlight an invalid input */
function shakeInput(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.borderColor = 'var(--missed)';
  el.focus();
  setTimeout(() => { el.style.borderColor = ''; }, 1200);
}

/** Clear search UI */
function clearSearchUI() {
  document.getElementById('searchInput').value     = '';
  document.getElementById('searchClear').style.display = 'none';
}
