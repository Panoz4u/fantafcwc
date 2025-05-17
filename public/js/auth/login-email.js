// public/js/auth/login-email.js
import { initFirebase } from './firebase-init.js';
console.log('✅ login-email.js caricato, form id=', document.getElementById('loginForm'));

async function handleLogin(e) {
  console.log('📝 submitting login…');
  e.preventDefault();
  const auth = await initFirebase();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const { user } = await auth.signInWithEmailAndPassword(email, password);
    // Recupera il record utente dal server
    const dbUser = await fetch(
      `/user-by-email?email=${encodeURIComponent(user.email)}`
    ).then(r => {
      if (!r.ok) throw new Error(`Utente non trovato (${r.status})`);
      return r.json();
    });

    // Estrai l'ID reale, qualunque sia la chiave del JSON
    const id = dbUser.user_id ?? dbUser.userId ?? dbUser.id;
    if (!id) throw new Error('userId mancante nella risposta');

    // Salva in localStorage
    localStorage.setItem('userId', id);
    console.log('→ localStorage.userId =', localStorage.getItem('userId'));

// Genera il token passando l’ID corretto
const tok = await fetch('/generate-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: id })
})
  .then(r => {
    if (!r.ok) throw new Error(`Impossibile generare token (${r.status})`);
    return r.json();
  });
localStorage.setItem('authToken', tok.token);
console.log('→ localStorage.authToken =', localStorage.getItem('authToken'));


    window.location.href = 'user-landing.html';
  } catch (err) {
    console.error('Errore durante il login:', err);
    alert(err.message);
  }
}

const form = document.getElementById('loginForm');
if (form) form.addEventListener('submit', handleLogin);
