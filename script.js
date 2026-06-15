/* ============================================
   StudyCommunity — script principal
   Timer Pomodoro + To-do list + Streak quotidien
   Toutes les données sont sauvegardées dans
   le localStorage du navigateur (pas de serveur).
   ============================================ */

// ---------- TIMER ----------
const timerDisplay = document.getElementById('timerDisplay');
const timerStatus = document.getElementById('timerStatus');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const ringProgress = document.getElementById('ringProgress');
const modeButtons = document.querySelectorAll('.mode-btn');
const dingSound = document.getElementById('dingSound');

const RING_CIRCUMFERENCE = 678.6; // 2 * PI * 108

let totalSeconds = 25 * 60;
let remainingSeconds = totalSeconds;
let timerInterval = null;
let isRunning = false;

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function updateDisplay() {
  timerDisplay.textContent = formatTime(remainingSeconds);
  const progress = remainingSeconds / totalSeconds;
  ringProgress.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - progress);
}

function tick() {
  if (remainingSeconds > 0) {
    remainingSeconds--;
    updateDisplay();
  } else {
    clearInterval(timerInterval);
    isRunning = false;
    startBtn.textContent = 'Démarrer';
    timerStatus.textContent = 'Session terminée !';
    if (dingSound) {
      dingSound.play().catch(() => {});
    }
    registerSessionCompleted();
  }
}

function startPause() {
  if (isRunning) {
    clearInterval(timerInterval);
    isRunning = false;
    startBtn.textContent = 'Reprendre';
    timerStatus.textContent = 'En pause';
  } else {
    if (remainingSeconds === 0) {
      remainingSeconds = totalSeconds;
    }
    timerInterval = setInterval(tick, 1000);
    isRunning = true;
    startBtn.textContent = 'Pause';
    timerStatus.textContent = 'Concentration en cours…';
  }
  updateDisplay();
}

function resetTimer() {
  clearInterval(timerInterval);
  isRunning = false;
  remainingSeconds = totalSeconds;
  startBtn.textContent = 'Démarrer';
  timerStatus.textContent = 'Prêt à démarrer';
  updateDisplay();
}

startBtn.addEventListener('click', startPause);
resetBtn.addEventListener('click', resetTimer);

modeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    modeButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const minutes = parseInt(btn.dataset.minutes, 10);
    totalSeconds = minutes * 60;
    resetTimer();
  });
});

updateDisplay();

// ---------- TODO LIST ----------
const todoForm = document.getElementById('todoForm');
const todoInput = document.getElementById('todoInput');
const todoList = document.getElementById('todoList');
const todoEmpty = document.getElementById('todoEmpty');
const todoProgressFill = document.getElementById('todoProgressFill');
const todoProgressLabel = document.getElementById('todoProgressLabel');

let todos = JSON.parse(localStorage.getItem('studycommunity_todos') || '[]');

function saveTodos() {
  localStorage.setItem('studycommunity_todos', JSON.stringify(todos));
}

function renderTodos() {
  todoList.innerHTML = '';

  if (todos.length === 0) {
    todoEmpty.style.display = 'block';
  } else {
    todoEmpty.style.display = 'none';
  }

  todos.forEach((todo, index) => {
    const li = document.createElement('li');
    li.className = 'todo-item' + (todo.done ? ' done' : '');

    const check = document.createElement('button');
    check.className = 'todo-check' + (todo.done ? ' checked' : '');
    check.setAttribute('aria-label', todo.done ? 'Marquer comme non terminée' : 'Marquer comme terminée');
    check.textContent = todo.done ? '✓' : '';
    check.addEventListener('click', () => {
      todos[index].done = !todos[index].done;
      saveTodos();
      renderTodos();
    });

    const text = document.createElement('span');
    text.className = 'todo-text';
    text.textContent = todo.text;

    const del = document.createElement('button');
    del.className = 'todo-delete';
    del.setAttribute('aria-label', 'Supprimer la tâche');
    del.textContent = '✕';
    del.addEventListener('click', () => {
      todos.splice(index, 1);
      saveTodos();
      renderTodos();
    });

    li.appendChild(check);
    li.appendChild(text);
    li.appendChild(del);
    todoList.appendChild(li);
  });

  const total = todos.length;
  const done = todos.filter(t => t.done).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  todoProgressFill.style.width = percent + '%';
  todoProgressLabel.textContent = `${done} / ${total} terminées`;
}

todoForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const value = todoInput.value.trim();
  if (value === '') return;
  todos.push({ text: value, done: false });
  saveTodos();
  todoInput.value = '';
  renderTodos();
});

renderTodos();

// ---------- STREAK ----------
const streakCount = document.getElementById('streakCount');
const streakBig = document.getElementById('streakBig');
const streakWeek = document.getElementById('streakWeek');

const DAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function getStreakData() {
  return JSON.parse(localStorage.getItem('studycommunity_streak') || '{"count":0,"lastDate":null,"history":[]}');
}

function saveStreakData(data) {
  localStorage.setItem('studycommunity_streak', JSON.stringify(data));
}

function dateDiffInDays(date1, date2) {
  const oneDay = 24 * 60 * 60 * 1000;
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  return Math.round((d2 - d1) / oneDay);
}

function registerSessionCompleted() {
  const data = getStreakData();
  const today = new Date();
  const todayStr = today.toDateString();

  if (data.lastDate === todayStr) {
    // Déjà compté aujourd'hui, on ne fait rien
  } else if (data.lastDate === null) {
    data.count = 1;
  } else {
    const diff = dateDiffInDays(data.lastDate, todayStr);
    if (diff === 1) {
      data.count += 1;
    } else if (diff > 1) {
      data.count = 1;
    }
  }

  data.lastDate = todayStr;
  data.history = data.history || [];
  if (!data.history.includes(todayKey())) {
    data.history.push(todayKey());
  }

  saveStreakData(data);
  renderStreak();
}

function renderStreak() {
  const data = getStreakData();
  streakCount.textContent = data.count;
  streakBig.textContent = data.count;

  // Affiche les 7 derniers jours
  streakWeek.innerHTML = '';
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    const filled = (data.history || []).includes(key);

    const dayDiv = document.createElement('div');
    dayDiv.className = 'streak-day' + (filled ? ' filled' : '');
    dayDiv.textContent = DAY_LABELS[d.getDay() === 0 ? 6 : d.getDay() - 1];
    streakWeek.appendChild(dayDiv);
  }
}

renderStreak();
