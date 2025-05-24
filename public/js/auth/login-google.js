// public/js/auth/login-google.js
import { initFirebase } from './firebase-init.js';
import { GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { generateRandomColor, generateUniqueUsername } from './utils.js';

async function handleGoogleAuth(e) {
  e.preventDefault();
  const auth = await initFirebase();
  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Verifica esistenza utente
    let res = await fetch(`/user-by-email?email=${encodeURIComponent(user.email)}`);
    let dbUser;
    if (res.status === 404) {
      // crea nuovo
      const uname = await generateUniqueUsername(user.displayName || user.email.split('@')[0]);
      const color = generateRandomColor();
      res = await fetch('/users', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({
          username: user.displayName,
          uniquename: uname,
          email: user.email,
          teex_balance: 500,
          avatar: user.photoURL,
          google_id: user.uid,
          color
        })
      });
      dbUser = await res.json();
      localStorage.setItem('userId', dbUser.userId);
    } else {
      dbUser = await res.json();
      localStorage.setItem('userId', dbUser.user_id ?? dbUser.userId);
    }

    // Genera e salva token
    const tok = await fetch('/generate-token', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ userId: dbUser.user_id ?? dbUser.userId })
    }).then(r => r.json());
    localStorage.setItem('authToken', tok.token);

    window.location.href = 'user-landing.html';
  } catch (err) {
    console.error('Errore Google Auth:', err);
    alert(err.message);
  }
}

const btn = document.getElementById('googleLogin');
if (btn) btn.addEventListener('click', handleGoogleAuth);
