// public/js/auth/login-google.js
import { initFirebase } from './firebase-init.js';
import { GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { generateRandomColor, generateUniqueUsername } from './utils.js';
import { showLoadingOverlay, hideLoadingOverlay } from './loadingOverlay.js';

// Pre-initialize Firebase and the Google Auth Provider
let auth;
let provider;

try {
  auth = initFirebase(); // initFirebase is synchronous as per firebase-init.js
  provider = new GoogleAuthProvider();
  provider.addScope('email');
  provider.setCustomParameters({ prompt: 'select_account' });
} catch (error) {
  console.error('Errore durante la pre-inizializzazione di Firebase:', error);
  // Potresti voler mostrare un messaggio all'utente qui se la pre-inizializzazione fallisce
  alert('Errore di configurazione. Impossibile inizializzare il login con Google.');
}

async function handleGoogleAuth(e) {
  e.preventDefault();

  if (!auth || !provider) {
    console.error('Firebase Auth o Provider non inizializzati.');
    alert('Errore: il servizio di login con Google non è pronto. Riprova tra poco.');
    return;
  }
  
  showLoadingOverlay();

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
    if (err.code === 'auth/popup-blocked') {
      alert('Il popup di Google è stato bloccato dal browser. Assicurati che i popup siano abilitati per questo sito e riprova.');
    } else if (err.code === 'auth/cancelled-popup-request') {
      alert('Hai annullato più richieste di popup. Riprova il login.');
    } else if (err.code === 'auth/popup-closed-by-user') {
      // L'utente ha chiuso il popup, potrebbe non essere necessario un alert aggressivo
      console.log('Popup di login chiuso dall\'utente.');
    } else {
      alert(`Errore durante il login con Google: ${err.message}`);
    }
  } finally {
    hideLoadingOverlay();
  }
}

const btn = document.getElementById('googleLogin');
// Assicurati che il bottone esista e che auth e provider siano stati inizializzati
if (btn && auth && provider) {
  btn.addEventListener('click', handleGoogleAuth);
} else if (btn) {
  // Se il bottone esiste ma auth/provider no, disabilitalo o mostra un messaggio
  btn.disabled = true;
  console.warn('Pulsante Google Login disabilitato a causa di un errore di inizializzazione di Firebase.');
  // Potresti anche cambiare il testo del bottone per informare l'utente
  // btn.textContent = 'Google Login non disponibile'; 
}
