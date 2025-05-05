// Funzione per verificare se l'utente è autenticato come amministratore
async function checkAdminAuth() {
  try {
    // Carica la configurazione Firebase
    const response = await fetch('/api/firebase-config');
    if (!response.ok) {
      throw new Error('Impossibile caricare la configurazione Firebase');
    }
    const firebaseConfig = await response.json();
    
    // Inizializza Firebase se non è già inizializzato
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    
    return new Promise((resolve) => {
      // Verifica lo stato di autenticazione
      firebase.auth().onAuthStateChanged(function(user) {
        if (user && user.email === 'admin@fantaconclave.it') {
          // L'utente è autenticato come amministratore
          resolve(true);
        } else {
          // L'utente non è autenticato o non è l'amministratore
          // Reindirizza alla pagina di login
          window.location.href = '/FanteexBackend.html';
          resolve(false);
        }
      });
    });
  } catch (error) {
    console.error('Errore durante la verifica dell\'autenticazione:', error);
    // Reindirizza alla pagina di login in caso di errore
    window.location.href = '/FanteexBackend.html';
    return false;
  }
}

// Verifica l'autenticazione quando la pagina viene caricata
document.addEventListener('DOMContentLoaded', function() {
  checkAdminAuth();
});