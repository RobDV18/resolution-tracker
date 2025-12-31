// Simple Resolution Tracker - no frameworks, uses localStorage
const STORAGE_KEY = 'resTracker:data_v1';

const defaultData = {
  resolutions: [
    { id: 'paint', name: 'Paint (Warhammer)', color: '#7c5cff', emoji: '🎨' },
    { id: 'workout', name: 'Workout', color: '#23c6b7', emoji: '💪' },
    { id: 'draw', name: 'Drawing', color: '#ff7b7b', emoji: '✏️' },
  ],
  activities: [
    // {id, date: 'YYYY-MM-DD', resolutionId, notes, hours, minutes}
  ],
  settings: { lastOpened: null }
};

let state = defaultData;
let currentPeriod = 'monthly';

async function save() {
  try {
    console.log('Saving to Firebase:', state);
    await db.collection('users').doc('user1').set(state);
    console.log('Saved to Firebase');
  } catch (e) {
    console.error('Save failed', e);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); // backup
}

async function load() {
  try {
    console.log('Loading from Firebase');
    const doc = await db.collection('users').doc('user1').get();
    if (doc.exists) {
      state = doc.data();
      console.log('Loaded from Firebase:', state);
    } else {
      console.log('No data in Firebase, using default');
    }
  } catch (e) {
    console.error('Load failed', e);
    // fallback to localStorage
    const json = localStorage.getItem(STORAGE_KEY);
    if (json) state = JSON.parse(json);
  }
}

/* DOM*/
const landingView = document.getElementById('landing-view');
const addResolutionView = document.getElementById('add-resolution-view');
const logActivityView = document.getElementById('log-activity-view');
const resolutionsView = document.getElementById('resolutions-view');
const calendarView = document.getElementById('calendar-view');
const logResolutionBtn = document.getElementById('logResolutionBtn');
const logActivityBtn = document.getElementById('logActivityBtn');
const addResolutionForm = document.getElementById('addResolutionForm');
const resolutionTitle = document.getElementById('resolutionTitle');
const cancelAddResolution = document.getElementById('cancelAddResolution');
const logActivityForm = document.getElementById('logActivityForm');
const activityDate = document.getElementById('activityDate');
const activityNotes = document.getElementById('activityNotes');
const cancelLogActivity = document.getElementById('cancelLogActivity');
const resolutionSelect = document.getElementById('resolutionSelect');
const resolutionsList = document.getElementById('resolutions-list');
const calendarContent = document.getElementById('calendar-content');
const statsView = document.getElementById('stats-view');
const activityHours = document.getElementById('activityHours');
const activityMinutes = document.getElementById('activityMinutes');

function renderStats(){
  const content = document.getElementById('stats-content');
  content.innerHTML = '';
  const wrapper = document.createElement('div');
  state.resolutions.forEach(r => {
    const el = document.createElement('div');
    el.style.marginBottom = '10px';
    const total = state.activities.filter(a => a.resolutionId === r.id).length;
    const totalTime = state.activities.filter(a => a.resolutionId === r.id).reduce((sum, a) => sum + (a.hours || 0) * 60 + (a.minutes || 0), 0);
    const totalHours = Math.floor(totalTime / 60);
    const totalMins = totalTime % 60;
    el.innerHTML = `<div style="display:flex;align-items:center;gap:10px">
      <span style="font-size:24px">${r.emoji}</span>
      <strong>${r.name}</strong>
      <div style="width:12px;height:12px;border-radius:4px;background:${r.color}"></div>
    </div>
    <div class="small">Total activities: ${total} · Total time: ${totalHours}h ${totalMins}m</div>`;
    wrapper.appendChild(el);
  });
  const totalActivities = state.activities.length;
  const totalTime = state.activities.reduce((sum, a) => sum + (a.hours || 0) * 60 + (a.minutes || 0), 0);
  const totalHours = Math.floor(totalTime / 60);
  const totalMins = totalTime % 60;
  const overall = document.createElement('div');
  overall.style.marginTop = '20px';
  overall.innerHTML = `<strong>Overall Stats</strong><br>
  Total Activities: ${totalActivities}<br>
  Total Time Spent: ${totalHours}h ${totalMins}m`;
  wrapper.appendChild(overall);
  content.appendChild(wrapper);
}

function init() {
  selectTab('landing');
  bind();
  tryRegisterSW();
  load().then(() => {
    renderResolutions();
    renderStats();
    renderCalendar('monthly', new Date());
  });
}
function bind() {
  document.querySelectorAll('.bottom-nav button').forEach(btn => {
    btn.addEventListener('click', () => selectTab(btn.dataset.tab));
  });
  logResolutionBtn.addEventListener('click', () => selectTab('add-resolution'));
  logActivityBtn.addEventListener('click', () => selectTab('log-activity'));
  addResolutionForm.addEventListener('submit', onAddResolutionSubmit);
  cancelAddResolution.addEventListener('click', () => selectTab('landing'));
  logActivityForm.addEventListener('submit', onLogActivitySubmit);
  cancelLogActivity.addEventListener('click', () => selectTab('landing'));
  document.querySelectorAll('.calendar-controls button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.calendar-controls button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPeriod = btn.dataset.period;
      renderCalendar(currentPeriod, new Date());
    });
  });
  // default date today
  activityDate.value = (new Date()).toISOString().slice(0,10);
}

function ripple(e, el){
  const r = el.querySelector('.ripple');
  r.style.left = (e.offsetX) + 'px';
  r.style.top = (e.offsetY) + 'px';
  r.style.width = r.style.height = '120px';
  r.style.opacity = '0.08';
  setTimeout(()=> r.style.opacity='0', 300);
}

function selectTab(tab){
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.querySelectorAll('.bottom-nav button').forEach(b => b.classList.remove('active'));
  if(tab === 'landing') {
    renderLanding();
    document.querySelector(`[data-tab="landing"]`).classList.add('active');
  }
  if(tab === 'add-resolution') addResolutionView.classList.remove('hidden');
  if(tab === 'log-activity') {
    logActivityView.classList.remove('hidden');
    populateResolutionOptions();
  }
  if(tab === 'resolutions') {
    resolutionsView.classList.remove('hidden');
    document.querySelector(`[data-tab="resolutions"]`).classList.add('active');
  }
  if(tab === 'stats') {
    statsView.classList.remove('hidden');
    document.querySelector(`[data-tab="stats"]`).classList.add('active');
  }
  if(tab === 'calendar') {
    calendarView.classList.remove('hidden');
    document.querySelector(`[data-tab="calendar"]`).classList.add('active');
  }
}

function renderLanding(){
  landingView.classList.remove('hidden');
  logActivityBtn.disabled = state.resolutions.length === 0;
}

function populateResolutionOptions(){
  resolutionSelect.innerHTML = '';
  state.resolutions.forEach(r => {
    const opt = document.createElement('option');
    opt.value = r.id;
    opt.textContent = r.name;
    resolutionSelect.appendChild(opt);
  });
}

function onAddResolutionSubmit(e){
  e.preventDefault();
  const name = resolutionTitle.value.trim();
  if(!name) return;
  const color = prompt('Hex color (like #7c5cff) — leave blank for default','#7c5cff') || '#7c5cff';
  const emoji = prompt('Emoji (like 🎨) — leave blank for default','🎯') || '🎯';
  const id = name.toLowerCase().replace(/\s+/g,'_') + '_' + Math.floor(Math.random()*1000);
  state.resolutions.push({id, name, color, emoji});
  save().catch(e => console.error('Save failed', e));
  resolutionTitle.value = '';
  renderLanding();
  renderResolutions();
  selectTab('landing');
  flashToast('Resolution added');
}

function onLogActivitySubmit(e){
  e.preventDefault();
  const a = {
    id: 'act_' + Date.now(),
    date: activityDate.value,
    resolutionId: resolutionSelect.value,
    notes: activityNotes.value || '',
    hours: Number(activityHours.value || 0),
    minutes: Number(activityMinutes.value || 0)
  };
  state.activities.push(a);
  save().catch(e => console.error('Save failed', e));
  activityNotes.value = '';
  activityHours.value = '';
  activityMinutes.value = '';
  renderCalendar('monthly', new Date(activityDate.value));
  renderStats();
  selectTab('landing');
  flashToast('Activity logged');
}

function renderResolutions(){
  resolutionsList.innerHTML = '';
  state.resolutions.forEach(r => {
    const el = document.createElement('div');
    el.className = 'resolution-item';
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:24px">${r.emoji}</span>
        <strong>${r.name}</strong>
        <div style="width:12px;height:12px;border-radius:4px;background:${r.color}"></div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="ghost small" data-edit-color="${r.id}">Edit Color</button>
        <button class="ghost small" data-edit-emoji="${r.id}">Edit Emoji</button>
        <button class="ghost small" data-delete="${r.id}">Delete</button>
      </div>
    `;
    resolutionsList.appendChild(el);
  });
  resolutionsList.querySelectorAll('[data-edit-color]').forEach(b => {
    b.addEventListener('click', e => {
      const id = e.target.getAttribute('data-edit-color');
      const r = state.resolutions.find(x => x.id === id);
      const color = prompt('New hex color', r.color);
      if(color) {
        r.color = color;
        save().catch(e => console.error('Save failed', e));
        renderResolutions();
        renderCalendar('monthly', new Date());
      }
    });
  });
  resolutionsList.querySelectorAll('[data-edit-emoji]').forEach(b => {
    b.addEventListener('click', e => {
      const id = e.target.getAttribute('data-edit-emoji');
      const r = state.resolutions.find(x => x.id === id);
      const emoji = prompt('New emoji', r.emoji);
      if(emoji) {
        r.emoji = emoji;
        save().catch(e => console.error('Save failed', e));
        renderResolutions();
        renderCalendar('monthly', new Date());
      }
    });
  });
  resolutionsList.querySelectorAll('[data-delete]').forEach(b => {
    b.addEventListener('click', e => {
      const id = e.target.getAttribute('data-delete');
      if(confirm('Delete this resolution?')) {
        state.resolutions = state.resolutions.filter(x => x.id !== id);
        state.activities = state.activities.filter(a => a.resolutionId !== id);
        save().catch(e => console.error('Save failed', e));
        renderLanding();
        renderResolutions();
        renderStats();
        renderCalendar('monthly', new Date());
      }
    });
  });
}

/* Stats functions */
function uniqueDaysForResolution(resId){
  const set = new Set();
  state.activities.filter(a => a.resolutionId === resId).forEach(a => set.add(a.date));
  return Array.from(set).sort();
}

function calcStreak(resId){
  const days = uniqueDaysForResolution(resId).map(d => new Date(d + 'T00:00:00').getTime()).sort((a,b) => a - b);
  if(days.length === 0) return {current: 0, longest: 0};
  let longest = 1, current = 1;
  for(let i=1; i<days.length; i++){
    if(days[i] - days[i-1] === 86400000){
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  const today = new Date(); today.setHours(0,0,0,0);
  let cur = 0;
  let check = today.getTime();
  while(true){
    const iso = new Date(check).toISOString().slice(0,10);
    if(state.activities.some(a => a.resolutionId === resId && a.date === iso)){
      cur++;
      check -= 86400000;
    } else break;
  }
  return {current: cur, longest};
}

function editOrRemoveActivity(id){
  const a = state.activities.find(act => act.id === id);
  if(!a) return;
  const choice = prompt('1: Edit, 2: Remove');
  if(choice === '1'){
    activityDate.value = a.date;
    resolutionSelect.value = a.resolutionId;
    activityNotes.value = a.notes || '';
    activityHours.value = a.hours || 0;
    activityMinutes.value = a.minutes || 0;
    selectTab('log-activity');
  } else if(choice === '2'){
    if(confirm('Remove this activity?')){
      state.activities = state.activities.filter(act => act.id !== id);
      save().catch(e => console.error('Save failed', e));
      renderCalendar(currentPeriod, new Date());
      renderStats();
    }
  }
}

/* Render calendar */
function renderCalendar(period = 'monthly', showDate = new Date()){
  calendarContent.innerHTML = '';
  const wrap = document.createElement('div');
  const header = document.createElement('div');
  header.style.display='flex';
  header.style.justifyContent='space-between';
  header.style.alignItems='center';
  header.style.marginBottom='10px';
  const title = document.createElement('div');
  if(period === 'weekly'){
    const startOfWeek = new Date(showDate);
    startOfWeek.setDate(showDate.getDate() - showDate.getDay() + 1); // Monday
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    title.textContent = `${startOfWeek.toLocaleDateString()} - ${endOfWeek.toLocaleDateString()}`;
  } else if(period === 'monthly'){
    title.textContent = showDate.toLocaleString(undefined,{month:'long',year:'numeric'});
  } else if(period === 'yearly'){
    title.textContent = showDate.getFullYear();
  }
  header.appendChild(title);
  const nav = document.createElement('div');
  const prev = document.createElement('button'); prev.textContent='◀'; prev.className='ghost';
  const next = document.createElement('button'); next.textContent='▶'; next.className='ghost';
  if(period === 'weekly'){
    prev.onclick = ()=> {
      const newDate = new Date(showDate);
      newDate.setDate(showDate.getDate() - 7);
      renderCalendar('weekly', newDate);
    };
    next.onclick = ()=> {
      const newDate = new Date(showDate);
      newDate.setDate(showDate.getDate() + 7);
      renderCalendar('weekly', newDate);
    };
  } else if(period === 'monthly'){
    prev.onclick = ()=> { renderCalendar('monthly', new Date(showDate.getFullYear(), showDate.getMonth()-1,1)); };
    next.onclick = ()=> { renderCalendar('monthly', new Date(showDate.getFullYear(), showDate.getMonth()+1,1)); };
  } else if(period === 'yearly'){
    prev.onclick = ()=> { renderCalendar('yearly', new Date(showDate.getFullYear()-1, 0,1)); };
    next.onclick = ()=> { renderCalendar('yearly', new Date(showDate.getFullYear()+1, 0,1)); };
  }
  nav.appendChild(prev); nav.appendChild(next);
  header.appendChild(nav);
  wrap.appendChild(header);

  if(period === 'weekly'){
    const grid = document.createElement('div');
    grid.className = 'calendar weekly';
    const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    days.forEach(d=>{
      const cell = document.createElement('div');
      cell.className='day-header';
      cell.textContent = d;
      grid.appendChild(cell);
    });
    const startOfWeek = new Date(showDate);
    startOfWeek.setDate(showDate.getDate() - showDate.getDay() + 1);
    for(let i=0; i<7; i++){
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const cell = document.createElement('div');
      cell.className='day';
      const dateStr = date.toISOString().slice(0,10);
      const dateRow = document.createElement('div'); dateRow.className='date';
      dateRow.textContent = date.getDate();
      cell.appendChild(dateRow);
      const emojis = document.createElement('div'); emojis.className='emojis';
      const acts = state.activities.filter(a => a.date === dateStr);
      acts.forEach(a => {
        const res = state.resolutions.find(r=>r.id===a.resolutionId);
        const emoji = res ? res.emoji : '❓';
        const span = document.createElement('span');
        span.textContent = emoji;
        span.title = res ? res.name + (a.notes ? ': ' + a.notes : '') + ((a.hours || a.minutes) ? ` (${a.hours || 0}h ${a.minutes || 0}m)` : '') : a.resolutionId;
        span.style.cursor = 'pointer';
        span.addEventListener('click', () => editOrRemoveActivity(a.id));
        emojis.appendChild(span);
      });
      cell.appendChild(emojis);
      const today = new Date(); today.setHours(0,0,0,0);
      const cellDate = new Date(dateStr + 'T00:00:00');
      if(acts.length > 0){
        cell.classList.add('has-activity');
      } else if(cellDate < today){
        cell.classList.add('no-activity-past');
      }
      grid.appendChild(cell);
    }
    wrap.appendChild(grid);
  } else if(period === 'monthly'){
    const grid = document.createElement('div');
    grid.className = 'calendar';
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    days.forEach(d=>{
      const cell = document.createElement('div');
      cell.className='day';
      cell.style.background='transparent';
      cell.style.color='var(--muted)';
      cell.style.display='flex';
      cell.style.justifyContent='center';
      cell.textContent = d;
      grid.appendChild(cell);
    });
    const year = showDate.getFullYear();
    const month = showDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startIndex = firstDay.getDay();
    const daysInMonth = new Date(year, month+1, 0).getDate();
    for(let i=0;i<startIndex;i++){
      const blank = document.createElement('div');
      blank.className='day'; blank.style.opacity='0.25'; grid.appendChild(blank);
    }
    for(let d=1; d<=daysInMonth; d++){
      const cell = document.createElement('div');
      cell.className='day';
      const dateStr = new Date(year, month, d).toISOString().slice(0,10);
      const dateRow = document.createElement('div'); dateRow.className='date';
      dateRow.textContent = d;
      cell.appendChild(dateRow);
      const emojis = document.createElement('div'); emojis.className='emojis';
      const acts = state.activities.filter(a => a.date === dateStr);
      acts.forEach(a => {
        const res = state.resolutions.find(r=>r.id===a.resolutionId);
        const emoji = res ? res.emoji : '❓';
        const span = document.createElement('span');
        span.textContent = emoji;
        span.title = res ? res.name + (a.notes ? ': ' + a.notes : '') + ((a.hours || a.minutes) ? ` (${a.hours || 0}h ${a.minutes || 0}m)` : '') : a.resolutionId;
        span.style.cursor = 'pointer';
        span.addEventListener('click', () => editOrRemoveActivity(a.id));
        emojis.appendChild(span);
      });
      cell.appendChild(emojis);
      const today = new Date(); today.setHours(0,0,0,0);
      const cellDate = new Date(dateStr + 'T00:00:00');
      if(acts.length > 0){
        cell.classList.add('has-activity');
      } else if(cellDate < today){
        cell.classList.add('no-activity-past');
      }
      grid.appendChild(cell);
    }
    wrap.appendChild(grid);
  } else if(period === 'yearly'){
    const grid = document.createElement('div');
    grid.className = 'yearly-calendar';
    for(let m=0; m<12; m++){
      const monthDiv = document.createElement('div');
      monthDiv.className = 'month';
      const monthName = new Date(showDate.getFullYear(), m).toLocaleString(undefined, {month:'short'});
      const monthHeader = document.createElement('div');
      monthHeader.textContent = monthName;
      monthDiv.appendChild(monthHeader);
      const monthGrid = document.createElement('div');
      monthGrid.className = 'month-grid';
      const firstDay = new Date(showDate.getFullYear(), m, 1);
      const startIndex = firstDay.getDay();
      const daysInMonth = new Date(showDate.getFullYear(), m+1, 0).getDate();
      for(let i=0;i<startIndex;i++){
        const blank = document.createElement('div');
        blank.className='day-small'; monthGrid.appendChild(blank);
      }
      for(let d=1; d<=daysInMonth; d++){
        const cell = document.createElement('div');
        cell.className='day-small';
        const dateStr = new Date(showDate.getFullYear(), m, d).toISOString().slice(0,10);
        const acts = state.activities.filter(a => a.date === dateStr);
        if(acts.length > 0){
          const res = state.resolutions.find(r=>r.id===acts[0].resolutionId);
          cell.textContent = res ? res.emoji : '❓';
        } else {
          cell.textContent = d;
        }
        const today = new Date(); today.setHours(0,0,0,0);
        const cellDate = new Date(dateStr + 'T00:00:00');
        if(acts.length > 0){
          cell.classList.add('has-activity');
        } else if(cellDate < today){
          cell.classList.add('no-activity-past');
        }
        monthGrid.appendChild(cell);
      }
      monthDiv.appendChild(monthGrid);
      grid.appendChild(monthDiv);
    }
    wrap.appendChild(grid);
  }

  calendarContent.appendChild(wrap);
}

/* small toast */
function flashToast(msg){
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.position='fixed';
  t.style.left='50%';
  t.style.transform='translateX(-50%)';
  t.style.bottom='140px';
  t.style.background='rgba(0,0,0,0.6)';
  t.style.padding='8px 12px';
  t.style.borderRadius='12px';
  document.body.appendChild(t);
  setTimeout(()=> t.style.opacity='0',900);
  setTimeout(()=> t.remove(),1200);
}

/* vibrate helper */
function vibrate(pattern){
  try { if(navigator.vibrate) navigator.vibrate(pattern); } catch(e) {}
}

/* service worker registration */
function tryRegisterSW(){
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('service-worker.js').catch(()=>{});
  }
}

init();