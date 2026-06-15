/* ============================================
   StudyCommunity — main script with Supabase backend
   Auth + Tasks + Streak synced across all devices
   ============================================ */

// ---------- SUPABASE SETUP ----------
const SUPABASE_URL = 'https://wushnsfqbbmvpzgmegui.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Nz6emYtXb1G7Dn2oGGsKMw_XKwAaP9v';
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;

// ---------- AUTH ----------
function switchTab(tab) {
  document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('signupForm').style.display = tab === 'signup' ? 'block' : 'none';
  document.getElementById('tabLogin').classList.toggle('active', tab === 'login');
  document.getElementById('tabSignup').classList.toggle('active', tab === 'signup');
  clearAuthMessages();
}

function clearAuthMessages() {
  document.getElementById('authError').textContent = '';
  document.getElementById('authSuccess').textContent = '';
}

function showError(msg) {
  document.getElementById('authError').textContent = msg;
  document.getElementById('authSuccess').textContent = '';
}

function showSuccess(msg) {
  document.getElementById('authSuccess').textContent = msg;
  document.getElementById('authError').textContent = '';
}

async function login() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!email || !password) return showError('Please fill in all fields.');

  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return showError(error.message);
}

async function signup() {
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  if (!email || !password) return showError('Please fill in all fields.');
  if (password.length < 6) return showError('Password must be at least 6 characters.');

  const { error } = await sb.auth.signUp({ email, password });
  if (error) return showError(error.message);
  showSuccess('Account created! Check your email to confirm, then sign in.');
}

async function logout() {
  await sb.auth.signOut();
  currentUser = null;
  document.getElementById('appScreen').style.display = 'none';
  document.getElementById('authScreen').style.display = 'flex';
}

// Listen for auth state changes
sb.auth.onAuthStateChange(async (event, session) => {
  if (session && session.user) {
    currentUser = session.user;
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('appScreen').style.display = 'block';
    await loadUserData();
    initTimer();
  } else {
    document.getElementById('authScreen').style.display = 'flex';
    document.getElementById('appScreen').style.display = 'none';
  }
});

async function loadUserData() {
  await loadTodos();
  await loadStreak();
}

// ---------- TIMER ----------
const RING_CIRCUMFERENCE = 678.6;

let totalSeconds = 25 * 60;
let remainingSeconds = totalSeconds;
let timerInterval = null;
let isRunning = false;
let timerInitialized = false;

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function updateDisplay() {
  document.getElementById('timerDisplay').textContent = formatTime(remainingSeconds);
  const progress = remainingSeconds / totalSeconds;
  document.getElementById('ringProgress').style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - progress);
}

function tick() {
  if (remainingSeconds > 0) {
    remainingSeconds--;
    updateDisplay();
  } else {
    clearInterval(timerInterval);
    isRunning = false;
    document.getElementById('startBtn').textContent = 'Start';
    document.getElementById('timerStatus').textContent = 'Session complete!';
    registerSessionCompleted();
  }
}

function startPause() {
  if (isRunning) {
    clearInterval(timerInterval);
    isRunning = false;
    document.getElementById('startBtn').textContent = 'Resume';
    document.getElementById('timerStatus').textContent = 'Paused';
  } else {
    if (remainingSeconds === 0) remainingSeconds = totalSeconds;
    timerInterval = setInterval(tick, 1000);
    isRunning = true;
    document.getElementById('startBtn').textContent = 'Pause';
    document.getElementById('timerStatus').textContent = 'Focusing…';
  }
  updateDisplay();
}

function resetTimer() {
  clearInterval(timerInterval);
  isRunning = false;
  remainingSeconds = totalSeconds;
  document.getElementById('startBtn').textContent = 'Start';
  document.getElementById('timerStatus').textContent = 'Ready to start';
  updateDisplay();
}

function initTimer() {
  if (timerInitialized) return;
  timerInitialized = true;

  document.getElementById('startBtn').addEventListener('click', startPause);
  document.getElementById('resetBtn').addEventListener('click', resetTimer);

  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      totalSeconds = parseInt(btn.dataset.minutes, 10) * 60;
      resetTimer();
    });
  });

  updateDisplay();
}

// ---------- TASKS ----------
let todos = [];

async function loadTodos() {
  const { data, error } = await sb
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: true });

  if (!error && data) {
    todos = data;
    renderTodos();
  }
}

async function addTodo(text) {
  const { data, error } = await sb
    .from('tasks')
    .insert({ text, done: false, user_id: currentUser.id })
    .select()
    .single();

  if (!error && data) {
    todos.push(data);
    renderTodos();
  }
}

async function toggleTodo(id, done) {
  await sb.from('tasks').update({ done }).eq('id', id);
  const todo = todos.find(t => t.id === id);
  if (todo) todo.done = done;
  renderTodos();
}

async function deleteTodo(id) {
  await sb.from('tasks').delete().eq('id', id);
  todos = todos.filter(t => t.id !== id);
  renderTodos();
}

function renderTodos() {
  const todoList = document.getElementById('todoList');
  const todoEmpty = document.getElementById('todoEmpty');
  const todoProgressFill = document.getElementById('todoProgressFill');
  const todoProgressLabel = document.getElementById('todoProgressLabel');

  todoList.innerHTML = '';
  todoEmpty.style.display = todos.length === 0 ? 'block' : 'none';

  todos.forEach(todo => {
    const li = document.createElement('li');
    li.className = 'todo-item' + (todo.done ? ' done' : '');

    const check = document.createElement('button');
    check.className = 'todo-check' + (todo.done ? ' checked' : '');
    check.textContent = todo.done ? '✓' : '';
    check.addEventListener('click', () => toggleTodo(todo.id, !todo.done));

    const text = document.createElement('span');
    text.className = 'todo-text';
    text.textContent = todo.text;

    const del = document.createElement('button');
    del.className = 'todo-delete';
    del.textContent = '✕';
    del.addEventListener('click', () => deleteTodo(todo.id));

    li.appendChild(check);
    li.appendChild(text);
    li.appendChild(del);
    todoList.appendChild(li);
  });

  const total = todos.length;
  const done = todos.filter(t => t.done).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  todoProgressFill.style.width = percent + '%';
  todoProgressLabel.textContent = `${done} / ${total} done`;
}

document.getElementById('todoForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const value = document.getElementById('todoInput').value.trim();
  if (!value) return;
  document.getElementById('todoInput').value = '';
  await addTodo(value);
});

// ---------- STREAK ----------
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

async function loadStreak() {
  const { data } = await sb
    .from('streaks')
    .select('*')
    .eq('user_id', currentUser.id)
    .single();

  renderStreak(data || { count: 0, last_date: null, history: [] });
}

async function registerSessionCompleted() {
  const { data: existing } = await sb
    .from('streaks')
    .select('*')
    .eq('user_id', currentUser.id)
    .single();

  const today = new Date().toDateString();
  const key = todayKey();

  let count = existing ? existing.count : 0;
  let lastDate = existing ? existing.last_date : null;
  let history = existing ? (existing.history || []) : [];

  if (lastDate === today) {
    // Already counted today
  } else if (!lastDate) {
    count = 1;
  } else {
    const d1 = new Date(lastDate);
    const d2 = new Date(today);
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
    count = diff === 1 ? count + 1 : 1;
  }

  if (!history.includes(key)) history.push(key);

  const streakData = { user_id: currentUser.id, count, last_date: today, history };

  if (existing) {
    await sb.from('streaks').update(streakData).eq('user_id', currentUser.id);
  } else {
    await sb.from('streaks').insert(streakData);
  }

  renderStreak(streakData);
}

function renderStreak(data) {
  const count = data ? data.count : 0;
  const history = data ? (data.history || []) : [];

  document.getElementById('streakCount').textContent = count;
  document.getElementById('streakBig').textContent = count;

  const streakWeek = document.getElementById('streakWeek');
  streakWeek.innerHTML = '';
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    const filled = history.includes(key);

    const dayDiv = document.createElement('div');
    dayDiv.className = 'streak-day' + (filled ? ' filled' : '');
    dayDiv.textContent = DAY_LABELS[d.getDay() === 0 ? 6 : d.getDay() - 1];
    streakWeek.appendChild(dayDiv);
  }
}
