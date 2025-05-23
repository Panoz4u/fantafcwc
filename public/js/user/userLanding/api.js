// public/js/user/userLanding/api.js
export async function fetchUserInfo(token) {
    const res = await fetch('/user-landing-info', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Impossibile caricare header utente');
    return res.json(); // { user: { … } }
  }
  
  export async function fetchUserContests(token) {
    const res = await fetch('/api/user-contests', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Impossibile caricare contests');
    return res.json(); // { contests: { active: [...], completed: [...] } }
  }
  