// public/js/auth/login-google.js
import { initFirebase } from './firebase-init.js';
import { generateRandomColor, generateUniqueUsername } from './utils.js';

async function handleGoogleAuth() {
  const auth = await initFirebase();
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.addScope('email');
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const result = await auth.signInWithPopup(provider);
    const user = result.user;

    let res = await fetch(`/user-by-email?email=${encodeURIComponent(user.email)}`);
    let dbUser;
    if (res.status === 404) {
      // nuovo utente: registralo
      const uname = await generateUniqueUsername(user.displayName || user.email.split('@')[0]);
      const color = generateRandomColor();
      res = await fetch('/users', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ username: user.displayName, uniquename: uname, email: user.email, teex_balance:500, avatar: user.photoURL, google_id: user.uid, color })
      });
      dbUser = await res.json();
      localStorage.setItem('userId', dbUser.userId);
    } else {
      dbUser = await res.json();
      localStorage.setItem('userId', dbUser.user_id);
    }

    const tok = await (await fetch('/generate-token', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ userId: dbUser.user_id || dbUser.userId })
    })).json();
    localStorage.setItem('authToken', tok.token);

    window.location.href = 'user-landing.html';
  } catch (err) {
    console.error('Errore Google Auth:', err);
    alert(err.message);
  }
}

const btn = document.getElementById('googleLogin');
if (btn) btn.addEventListener('click', e => { e.preventDefault(); handleGoogleAuth(); });
