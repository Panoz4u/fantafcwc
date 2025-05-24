// public/js/auth/firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth }        from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
// Importa la config statica che hai già messo in public/js/firebase-config.js
import { firebaseConfig } from '../firebase-config.js';

let _auth = null;

export function initFirebase() {
  if (_auth) return _auth;
  const app  = initializeApp(firebaseConfig);
  _auth = getAuth(app);
  return _auth;
}