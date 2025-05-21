// public/js/user/landing.js
export async function loadUserHeader() {
    const token = localStorage.getItem('authToken');
    if (!token) return;
  
    const res = await fetch('/user-landing-info', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Impossibile caricare header utente');
    const { user } = await res.json();
  
    // Avatar
    const avatarEl = document.getElementById('userAvatar');
    avatarEl.src = user.avatar && !user.avatar.startsWith('http')
      ? `avatars/${user.avatar}`
      : decodeURIComponent(user.avatar || '');
      avatarEl.onerror = () => {
        avatarEl.src = '../pictures/silouette.jpg';
        avatarEl.onerror = null; 
        avatarEl.src = '../pictures/silouette.jpg';
      }
   
    // Username
    document.getElementById('userName')
      .textContent = user.username.toUpperCase();
  
    // Teex balance
    document.getElementById('teexBalance')
      .textContent = parseFloat(user.balance).toFixed(1);
  }
  