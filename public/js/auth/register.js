// public/js/auth/register.js
import { initFirebase } from './firebase-init.js';
import { generateRandomColor, generateUniqueUsername } from './utils.js';

async function handleRegister(e) {
  e.preventDefault();
  const auth = await initFirebase();
  const username = document.getElementById('regUsername').value;
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;

  try {
    const uniquename = await generateUniqueUsername(username);
    const color = generateRandomColor();
    const avatarNum = String(Math.floor(Math.random()*27)+1).padStart(2,'0') + '.png';

    const { user } = await auth.createUserWithEmailAndPassword(email, password);
    const res = await fetch('/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, uniquename, email, teex_balance: 500, color, avatar: avatarNum }),
    });
    const data = await res.json();
    localStorage.setItem('userId', data.userId);

    // genera e salva il token
    const tok = await (await fetch('/generate-token', {
      method: 'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ userId: data.userId })
    })).json();
    localStorage.setItem('authToken', tok.token);

    window.location.href = 'user-landing.html';
  } catch (err) {
    console.error('Errore durante la registrazione:', err);
    alert(err.message);
  }
}

// Collegamento al form
const form = document.getElementById('registerForm');
if (form) form.addEventListener('submit', handleRegister);
