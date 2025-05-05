// Funzione per caricare la configurazione Firebase
async function loadFirebaseConfig() {
  try {
    const response = await fetch('/api/firebase-config');
    if (!response.ok) {
      throw new Error(`Errore nel caricamento della configurazione: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Errore nel caricamento della configurazione Firebase:', error);
    
    // Mostra un messaggio di errore
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
      errorMessage.textContent = 'Errore di configurazione. Contatta l\'amministratore.';
      errorMessage.style.display = 'block';
    }
    
    return null;
  }
}

// Funzione principale per inizializzare l'app
async function initApp() {
  const loader = document.getElementById('loader');
  const errorMessage = document.getElementById('errorMessage');
  
  if (!loader || !errorMessage) {
    console.error("Elementi DOM non trovati");
    return;
  }
  
  loader.style.display = 'block';
  
  try {
    // Carica la configurazione Firebase dal server
    const firebaseConfig = await loadFirebaseConfig();
    if (!firebaseConfig) {
      throw new Error('Configurazione Firebase non disponibile');
    }
    
    // Inizializza Firebase
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    
    // Riferimenti agli elementi DOM
    const loginContainer = document.getElementById('loginContainer');
    const adminContent = document.getElementById('adminContent');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    // Email dell'amministratore autorizzato
    const adminEmail = 'admin@fantaconclave.it'; // Sostituisci con l'email dell'admin
    
    // Funzione per verificare se un utente è l'amministratore
    function isAdmin(user) {
      return user.email === adminEmail;
    }
    
    // Gestione dello stato di autenticazione
    firebase.auth().onAuthStateChanged(function(user) {
      loader.style.display = 'none';
      
      if (user) {
        // Utente autenticato
        if (isAdmin(user)) {
          // Utente è l'amministratore, mostra il contenuto admin
          loginContainer.style.display = 'none';
          adminContent.style.display = 'block';
        } else {
          // Utente non è l'amministratore, mostra un messaggio di errore e fai logout
          errorMessage.textContent = 'Non sei autorizzato ad accedere a questa pagina.';
          errorMessage.style.display = 'block';
          firebase.auth().signOut();
        }
      } else {
        // Utente non autenticato, mostra il form di login
        loginContainer.style.display = 'block';
        adminContent.style.display = 'none';
        errorMessage.style.display = 'none';
      }
    });
    
    // Gestione del login
    loginBtn.addEventListener('click', function() {
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      
      if (!email || !password) {
        errorMessage.textContent = 'Inserisci email e password.';
        errorMessage.style.display = 'block';
        return;
      }
      
      // Mostra il loader
      loader.style.display = 'block';
      errorMessage.style.display = 'none';
      
      firebase.auth().signInWithEmailAndPassword(email, password)
        .catch(function(error) {
          // Gestione degli errori di login
          loader.style.display = 'none';
          errorMessage.textContent = 'Credenziali non valide. Riprova.';
          errorMessage.style.display = 'block';
          console.error('Errore di login:', error);
        });
    });
    
    // Gestione del logout
    logoutBtn.addEventListener('click', function() {
      firebase.auth().signOut();
    });
    
    // Gestione dell'invio del form con il tasto Enter
    passwordInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        loginBtn.click();
      }
    });
  } catch (error) {
    console.error('Errore di inizializzazione:', error);
    loader.style.display = 'none';
    errorMessage.textContent = 'Errore di configurazione. Contatta l\'amministratore.';
    errorMessage.style.display = 'block';
  }
}

// Funzione per verificare l'autenticazione dell'amministratore
async function checkAdminAuth() {
  try {
    // Carica la configurazione Firebase
    const firebaseConfig = await loadFirebaseConfig();
    if (!firebaseConfig) {
      throw new Error('Configurazione Firebase non disponibile');
    }
    
    // Inizializza Firebase se non è già inizializzato
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    
    return new Promise((resolve, reject) => {
      // Verifica lo stato di autenticazione
      firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
          // Verifica se l'utente è l'amministratore
          if (user.email === 'admin@fantaconclave.it') {
            resolve(true);
          } else {
            // Reindirizza alla pagina di login
            window.location.href = '/FanteexBackend.html';
            reject('Non autorizzato');
          }
        } else {
          // Reindirizza alla pagina di login
          window.location.href = '/FanteexBackend.html';
          reject('Non autenticato');
        }
      });
    });
  } catch (error) {
    console.error('Errore di autenticazione:', error);
    window.location.href = '/FanteexBackend.html';
    throw error;
  }
}

// Avvia l'applicazione quando il documento è pronto
document.addEventListener('DOMContentLoaded', function() {
  // Se siamo nella pagina di backend principale, inizializza l'app
  if (window.location.pathname.includes('FanteexBackend.html')) {
    initApp();
  } else {
    // Altrimenti, verifica l'autenticazione per le altre pagine admin
    checkAdminAuth().catch(error => console.error(error));
  }
});