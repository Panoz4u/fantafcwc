// public/js/auth/firebase-init.js
export async function initFirebase() {
    const res = await fetch('/api/firebase-config');
    const cfg = await res.json();
    firebase.initializeApp(cfg);
    console.log('✅ Firebase inizializzato da ENV');
    return firebase.auth();
  }
  