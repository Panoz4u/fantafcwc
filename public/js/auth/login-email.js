// public/js/auth/login-email.js
import { initFirebase } from './firebase-init.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { showLoadingOverlay, hideLoadingOverlay } from './loadingOverlay.js';

console.log('✅ login-email.js caricato, form id=', document.getElementById('loginForm'));

async function handleLogin(e) {
  e.preventDefault();
  console.log("Tentativo di login con email");
  showLoadingOverlay();

  const auth = await initFirebase();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  
  if (!email || !password) {
    alert("Inserisci email e password");
    return;
  }

  try {
    const { user } = await signInWithEmailAndPassword(auth, email, password);

    // Recupera dati utente e salva userId
    const dbUser = await fetch(`/user-by-email?email=${encodeURIComponent(user.email)}`)
      .then(r => { if (!r.ok) throw new Error(`Utente non trovato (${r.status})`); return r.json(); });
    const id = dbUser.user_id ?? dbUser.userId ?? dbUser.id;
    localStorage.setItem('userId', id);

    // Genera token da server e salva in localStorage
    const tok = await fetch('/generate-token', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ userId: id })
    }).then(r => { if (!r.ok) throw new Error(`Impossibile generare token (${r.status})`); return r.json(); });
    localStorage.setItem('authToken', tok.token);

    // Per debug (opzionale)
    // import { debugLogin } from './utils.js';
    // debugLogin();

    window.location.href = 'user-landing.html';
  } catch (err) {
    console.error("Errore durante il login:", err);
    alert(err.message);
  } finally {
    hideLoadingOverlay();
  }
}

const form = document.getElementById('loginForm');
if (form) form.addEventListener('submit', handleLogin);
