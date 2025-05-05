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
          if (user) {
            // Verifica se l'utente è admin@fantaconclave.it o ha un token valido
            if (user.email === 'admin@fantaconclave.it' || localStorage.getItem('adminToken')) {
              // L'utente è autenticato come amministratore
              // Salva un token per le future verifiche
              localStorage.setItem('adminToken', 'authenticated');
              resolve(true);
            } else {
              // L'utente non è l'amministratore
              console.log('Utente non autorizzato:', user.email);
              window.location.href = '/FanteexBackend.html';
              resolve(false);
            }
          } else {
            // L'utente non è autenticato
            console.log('Nessun utente autenticato');
            window.location.href = '/FanteexBackend.html';
            resolve(false);
          }
        }, function(error) {
          console.error('Errore durante la verifica dell\'autenticazione:', error);
          window.location.href = '/FanteexBackend.html';
          resolve(false);
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
    // Verifica se esiste già un token di amministratore
    if (localStorage.getItem('adminToken') === 'authenticated') {
      console.log('Token di amministratore trovato, accesso consentito');
      return; // Consenti l'accesso senza ulteriori verifiche
    }
    
    // Altrimenti, verifica l'autenticazione con Firebase
    checkAdminAuth();
  });