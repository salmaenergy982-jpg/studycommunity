/* ============================================
   StudyCommunity — leaderboard page script
   ============================================ */

let currentSort = 'streak';

async function switchSort(sort) {
  currentSort = sort;
  document.getElementById('tabStreak').classList.toggle('active', sort === 'streak');
  document.getElementById('tabMinutes').classList.toggle('active', sort === 'minutes');
  await renderLeaderboard();
}

async function renderLeaderboard() {
  const listEl = document.getElementById('leaderboardList');
  listEl.innerHTML = '<p class="todo-empty">Loading leaderboard…</p>';

  const { data: profiles } = await sb.from('profiles').select('*');
  const { data: streaks } = await sb.from('streaks').select('*');

  if (!profiles) {
    listEl.innerHTML = '<p class="todo-empty">Could not load leaderboard.</p>';
    return;
  }

  const streakByUser = {};
  (streaks || []).forEach(s => { streakByUser[s.user_id] = s.count; });

  const rows = profiles.map(p => ({
    username: p.username || 'Anonymous',
    avatar: p.avatar_url,
    streak: streakByUser[p.user_id] || 0,
    minutes: p.total_minutes || 0,
    isMe: currentUser && p.user_id === currentUser.id
  }));

  rows.sort((a, b) => currentSort === 'streak' ? b.streak - a.streak : b.minutes - a.minutes);

  listEl.innerHTML = '';

  if (rows.length === 0) {
    listEl.innerHTML = '<p class="todo-empty">No students yet — be the first!</p>';
    return;
  }

  rows.forEach((row, index) => {
    const item = document.createElement('div');
    item.className = 'leaderboard-row' + (row.isMe ? ' me' : '');

    const rank = document.createElement('span');
    rank.className = 'leaderboard-rank';
    rank.textContent = '#' + (index + 1);

    const avatar = document.createElement('img');
    avatar.className = 'leaderboard-avatar';
    avatar.src = row.avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${row.username}`;

    const name = document.createElement('span');
    name.className = 'leaderboard-name';
    name.textContent = row.username + (row.isMe ? ' (you)' : '');

    const value = document.createElement('span');
    value.className = 'leaderboard-value';
    value.textContent = currentSort === 'streak' ? `🔥 ${row.streak} days` : `⏱ ${row.minutes} min`;

    item.appendChild(rank);
    item.appendChild(avatar);
    item.appendChild(name);
    item.appendChild(value);
    listEl.appendChild(item);
  });
}

(async function init() {
  const user = await requireAuth();
  if (!user) return;
  await refreshStreakPill();
  await renderLeaderboard();
})();
