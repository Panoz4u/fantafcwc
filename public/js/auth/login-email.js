// public/js/auth/login-email.js
import { initFirebase } from './firebase-init.js';

async function handleLogin(e) {
  e.preventDefault();
  const auth = await initFirebase();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const { user } = await auth.signInWithEmailAndPassword(email, password);
    const dbUser = await (await fetch(`/user-by-email?email=${encodeURIComponent(user.email)}`)).json();
    localStorage.setItem('userId', dbUser.user_id);

    const tok = await (await fetch('/generate-token', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ userId: dbUser.user_id })
    })).json();
    localStorage.setItem('authToken', tok.token);

    window.location.href = 'user-landing.html';
  } catch (err) {
    console.error('Errore durante il login:', err);
    alert(err.message);
  }
}

const form = document.getElementById('loginForm');
if (form) form.addEventListener('submit', handleLogin);
