/* ============================================
   StudyCommunity — settings page script
   ============================================ */

let myProfile = null;

function showSettingsError(msg) {
  document.getElementById('settingsError').textContent = msg;
  document.getElementById('settingsSuccess').textContent = '';
}

function showSettingsSuccess(msg) {
  document.getElementById('settingsSuccess').textContent = msg;
  document.getElementById('settingsError').textContent = '';
}

async function saveUsername() {
  const username = document.getElementById('usernameInput').value.trim();
  if (!username) return showSettingsError('Username cannot be empty.');

  const { error } = await sb.from('profiles').update({ username }).eq('user_id', currentUser.id);
  if (error) return showSettingsError('That username might already be taken.');
  showSettingsSuccess('Username updated!');
}

async function changePassword() {
  const newPassword = document.getElementById('newPassword').value;
  if (!newPassword || newPassword.length < 6) return showSettingsError('Password must be at least 6 characters.');

  const { error } = await sb.auth.updateUser({ password: newPassword });
  if (error) return showSettingsError(error.message);
  document.getElementById('newPassword').value = '';
  showSettingsSuccess('Password updated!');
}

document.getElementById('avatarInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const filePath = `${currentUser.id}/${Date.now()}_${file.name}`;
  const { error: uploadError } = await sb.storage.from('avatars').upload(filePath, file);

  if (uploadError) return showSettingsError('Could not upload image: ' + uploadError.message);

  const { data: urlData } = sb.storage.from('avatars').getPublicUrl(filePath);
  const avatarUrl = urlData.publicUrl;

  const { error: updateError } = await sb.from('profiles').update({ avatar_url: avatarUrl }).eq('user_id', currentUser.id);
  if (updateError) return showSettingsError('Could not save avatar.');

  document.getElementById('avatarPreview').src = avatarUrl;
  showSettingsSuccess('Profile picture updated!');
});

(async function init() {
  const user = await requireAuth();
  if (!user) return;
  await refreshStreakPill();

  myProfile = await getOrCreateProfile(user.id, user.email.split('@')[0]);
  document.getElementById('usernameInput').value = myProfile.username || '';

  if (myProfile.avatar_url) {
    document.getElementById('avatarPreview').src = myProfile.avatar_url;
  } else {
    document.getElementById('avatarPreview').src = `https://api.dicebear.com/7.x/shapes/svg?seed=${myProfile.username || user.id}`;
  }
})();
