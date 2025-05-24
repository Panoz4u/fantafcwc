// public/js/auth/session.js
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { initFirebase } from './firebase-init.js';

/**
 * Controlla token + userId, altrimenti redirige alla index.
 */
export async function checkAuth() {
  const token = localStorage.getItem('authToken');
  const userId = localStorage.getItem('userId');
  if (!token || !userId) {
    window.location.href = 'index.html';
    return false;
  }
  const res = await fetch('/verify-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ userId })
  });
  if (!res.ok) {
    localStorage.clear();
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

/** Pulisce localStorage e fa logout da Firebase */
export async function logout() {
  localStorage.clear();
  // assicuriamoci di aver inizializzato Firebase
  await initFirebase();
  const auth = getAuth();
  await signOut(auth);
  window.location.href = 'index.html';
}
