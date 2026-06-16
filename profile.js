/* ============================================
   StudyCommunity — profile page script
   ============================================ */

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

(async function init() {
  const user = await requireAuth();
  if (!user) return;

  await refreshStreakPill();

  const profile = await getOrCreateProfile(user.id, user.email.split('@')[0]);
  const { data: streak } = await sb.from('streaks').select('*').eq('user_id', user.id).single();

  document.getElementById('profileUsername').textContent = profile.username || user.email.split('@')[0];
  document.getElementById('profileEmail').textContent = user.email;
  document.getElementById('profileJoined').textContent = 'Member since ' + new Date(user.created_at).toLocaleDateString();

  if (profile.avatar_url) {
    document.getElementById('avatarImg').src = profile.avatar_url;
  } else {
    document.getElementById('avatarImg').src = `https://api.dicebear.com/7.x/shapes/svg?seed=${profile.username || user.id}`;
  }

  const streakCount = streak ? streak.count : 0;
  const totalSessions = profile.total_sessions || 0;
  const totalMinutes = profile.total_minutes || 0;

  document.getElementById('statStreak').textContent = streakCount;
  document.getElementById('statSessions').textContent = totalSessions;
  document.getElementById('statMinutes').textContent = totalMinutes;
  document.getElementById('statHours').textContent = (totalMinutes / 60).toFixed(1);

  // Render week
  const history = streak ? (streak.history || []) : [];
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
})();
