// public/js/auth/session.js

/** Verifica che l’utente sia loggato, altrimenti redirige */
export async function checkAuth() {
    const token = localStorage.getItem('authToken');
    const userId = localStorage.getItem('userId');
    if (!token || !userId) {
      window.location.href = 'index.html';
      return false;
    }
    const res = await fetch('/verify-token', {
      method:'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) {
      localStorage.clear();
      window.location.href = 'index.html';
      return false;
    }
    return true;
  }
  
  /** Effettua il logout */
  export function logout() {
    localStorage.clear();
    firebase.auth().signOut().then(() => window.location.href='index.html');
  }
  