// public/js/auth/firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { firebaseConfig } from '../firebase-config.js';


let _auth = null;

/**
 * Inizializza Firebase (una sola volta) e restituisce
 * l'istanza di Auth.
 */
export async function initFirebase() {
  if (_auth) return _auth;

  const res = await fetch('/api/firebase-config');
  if (!res.ok) {
    throw new Error('Impossibile caricare firebase-config: ' + res.status);
  }
  const cfg = await res.json();

  const app = initializeApp(cfg);
  _auth = getAuth(app);
  return _auth;
}
