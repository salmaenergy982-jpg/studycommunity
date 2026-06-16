/* ============================================
   StudyCommunity — shared Supabase client
   Used by every page (index, profile, rooms, etc.)
   ============================================ */

const SUPABASE_URL = 'https://wushnsfqbbmvpzgmegui.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Nz6emYtXb1G7Dn2oGGsKMw_XKwAaP9v';
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;

/**
 * Guards a page: redirects to index.html if not logged in.
 * Call this at the top of every protected page.
 * Returns the user object once resolved.
 */
async function requireAuth() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    window.location.href = 'index.html';
    return null;
  }
  currentUser = session.user;
  return currentUser;
}

async function logout() {
  await sb.auth.signOut();
  window.location.href = 'index.html';
}

/** Fetches (or creates) the profile row for the current user. */
async function getOrCreateProfile(userId, fallbackUsername) {
  let { data } = await sb.from('profiles').select('*').eq('user_id', userId).single();

  if (!data) {
    const { data: created } = await sb
      .from('profiles')
      .insert({ user_id: userId, username: fallbackUsername })
      .select()
      .single();
    data = created;
  }
  return data;
}

/** Loads the streak row for the current user and updates the topbar pill. */
async function refreshStreakPill() {
  const { data } = await sb.from('streaks').select('count').eq('user_id', currentUser.id).single();
  const pill = document.getElementById('streakCount');
  if (pill) pill.textContent = data ? data.count : 0;
}
