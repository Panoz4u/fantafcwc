// ====================================================
// CONFIGURAZIONE DI GOOGLE IDENTITY PLATFORM (Firebase)
const firebaseConfig = {
  apiKey: "AIzaSyCx5SFVJ7FiheNBn4iucIBjVB1lYuKZRDU",
  authDomain: "fantaconclave-52877.firebaseapp.com",
  projectId: "fantaconclave-52877",
  // eventuali altri campi se richiesti (messagingSenderId, appId, ecc.)
};

// Inizializza Firebase (se non è già inizializzato)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
} else {
  firebase.app();
}
const auth = firebase.auth();

// Funzione per generare un colore esadecimale casuale (senza #)
function generateRandomColor() {
  // Genera un colore esadecimale casuale a 6 cifre
  return Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
}

// Funzione per verificare l'unicità del nome utente e generare un nome univoco se necessario
async function generateUniqueUsername(username) {
  try {
    // Verifica se il nome utente esiste già
    const response = await fetch(`/check-username?username=${encodeURIComponent(username)}`);
    
    if (response.status === 200) {
      // Il nome utente esiste già, aggiungiamo un numero casuale
      const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return username + randomNum;
    } else if (response.status === 404) {
      // Il nome utente non esiste, possiamo usarlo
      return username;
    } else {
      // In caso di errore, aggiungiamo comunque un numero casuale per sicurezza
      const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return username + randomNum;
    }
  } catch (error) {
    console.error("Errore durante la verifica del nome utente:", error);
    // In caso di errore, aggiungiamo un numero casuale
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return username + randomNum;
  }
}

// ====================================================
// REGISTRAZIONE CON EMAIL/PASSWORD
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async function(e) {
    e.preventDefault();
    const username = document.getElementById("regUsername").value;
    const email = document.getElementById("regEmail").value;
    const password = document.getElementById("regPassword").value;
    
    try {
      // Genera un nome utente univoco
      const uniquename = await generateUniqueUsername(username);
      
      // Genera un colore casuale per l'avatar
      const userColor = generateRandomColor();
      
      // Genera un numero casuale tra 1 e 27 per l'avatar predefinito
      const avatarNumber = Math.floor(Math.random() * 27) + 1;
      const avatarFileName = avatarNumber.toString().padStart(2, '0') + '.png';
      
      // Crea l'utente in Firebase
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      
      // Invia la richiesta al backend per salvare il record utente nel DB
      const response = await fetch("/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username,
          uniquename: uniquename,
          email: email,
          teex_balance: 500,
          color: userColor,
          avatar: avatarFileName
        })
      });
      
      const data = await response.json();
      
      // Salva l'ID utente nel localStorage invece di passarlo nell'URL
      localStorage.setItem('userId', data.userId);
      
      // Ottieni un token di autenticazione dal server (da implementare sul backend)
      const tokenResponse = await fetch("/generate-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: data.userId })
      });
      
      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();
        localStorage.setItem('authToken', tokenData.token);
      }
      
      // Reindirizza alla pagina prototipo
      window.location.href = 'user-landing.html';
    } catch (error) {
      console.error("Errore durante la registrazione:", error);
      alert(error.message);
    }
  });
}

// ====================================================
// LOGIN CON EMAIL/PASSWORD
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", function(e) {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    
    auth.signInWithEmailAndPassword(email, password)
      .then(function(userCredential) {
        const user = userCredential.user;
        // Recupera il record utente dal DB usando l'email
        fetch(`/user-by-email?email=${encodeURIComponent(user.email)}`)
          .then(function(response) {
            return response.json();
          })
          .then(async function(dbUser) {
            // Salva l'ID utente nel localStorage
            localStorage.setItem('userId', dbUser.user_id);
            
            // Ottieni un token di autenticazione dal server
            const tokenResponse = await fetch("/generate-token", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: dbUser.user_id })
            });
            
            if (tokenResponse.ok) {
              const tokenData = await tokenResponse.json();
              localStorage.setItem('authToken', tokenData.token);
            }
            
            // Reindirizza alla pagina prototipo
            window.location.href = 'user-landing.html';
          })
          .catch(function(err) {
            console.error("Errore nel recupero dell'utente dal DB:", err);
            alert("Errore nel recupero dell'utente dal DB");
          });
      })
      .catch(function(error) {
        console.error("Errore durante il login:", error);
        alert(error.message);
      });
  });
}

// ====================================================
// LOGIN CON GOOGLE
const googleLoginBtn = document.getElementById("googleLogin");
if (googleLoginBtn) {
  googleLoginBtn.addEventListener("click", function(e) {
    e.preventDefault();
    
    const googleProvider = new firebase.auth.GoogleAuthProvider();
    googleProvider.addScope('email');
    
    // Forza la selezione dell'account ogni volta
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
    
    auth.signInWithPopup(googleProvider)
      .then(async function(result) {
        const user = result.user;
        
        try {
          // Controlla se l'utente esiste già nel database
          const response = await fetch(`/user-by-email?email=${encodeURIComponent(user.email)}`);
          
          if (!response.ok && response.status !== 404) {
            throw new Error('Errore nella verifica utente: ' + response.status);
          }
          
          let dbUser;
          
          if (response.status === 404) {
            // L'utente non esiste, lo registriamo
            const username = user.displayName || user.email.split('@')[0];
            const uniquename = await generateUniqueUsername(username);
            const userColor = generateRandomColor();
            
            const registerResponse = await fetch("/users", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                username: username,
                uniquename: uniquename,
                email: user.email,
                teex_balance: 500,
                avatar: user.photoURL,
                google_id: user.uid,
                color: userColor
              })
            });
            
            if (!registerResponse.ok) {
              throw new Error('Errore nella registrazione utente: ' + registerResponse.status);
            }
            
            dbUser = await registerResponse.json();
            // Salva l'ID utente nel localStorage
            localStorage.setItem('userId', dbUser.userId);
          } else {
            // L'utente esiste già, otteniamo i suoi dati
            dbUser = await response.json();
            // Salva l'ID utente nel localStorage
            localStorage.setItem('userId', dbUser.user_id);
          }
          
          // Ottieni un token di autenticazione dal server
          const tokenResponse = await fetch("/generate-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: dbUser.user_id || dbUser.userId })
          });
          
          if (tokenResponse.ok) {
            const tokenData = await tokenResponse.json();
            localStorage.setItem('authToken', tokenData.token);
          }
          
          // Reindirizza alla pagina prototipo
          window.location.href = 'user-landing.html';
        } catch (error) {
          console.error("Errore durante il login con Google:", error);
          alert(error.message);
        }
      })
      .catch(function(error) {
        console.error("Errore durante il login con Google:", error);
        alert(error.message);
      });
  });
}

// Funzione per verificare l'autenticazione dell'utente
function checkAuth() {
  const authToken = localStorage.getItem('authToken');
  const userId = localStorage.getItem('userId');
  
  if (!authToken || !userId) {
    // Utente non autenticato, reindirizza alla pagina di login
    window.location.href = 'index.html';
    return false;
  }
  
  // Verifica la validità del token con il server
  return fetch('/verify-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({ userId: userId })
  })
  .then(response => {
    if (!response.ok) {
      // Token non valido, cancella localStorage e reindirizza al login
      localStorage.removeItem('authToken');
      localStorage.removeItem('userId');
      localStorage.removeItem('userEmail');
      window.location.href = 'index.html';
      return false;
    }
    return true;
  })
  .catch(error => {
    console.error("Errore nella verifica del token:", error);
    return false;
  });
}

// Funzione per effettuare il logout
function logout() {
  // Rimuovi i dati di autenticazione dal localStorage
  localStorage.removeItem('authToken');
  localStorage.removeItem('userId');
  localStorage.removeItem('userEmail');
  
  // Esegui il logout da Firebase
  auth.signOut().then(function() {
    // Reindirizza alla pagina iniziale
    window.location.href = 'index.html';
  }).catch(function(error) {
    console.error("Errore durante il logout:", error);
  });
}

// Aggiungi un event listener per il pulsante di logout
document.addEventListener('DOMContentLoaded', function() {
  const logoutBtn = document.querySelector('.footer-item:last-child');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
});

// Gestione del risultato del redirect
firebase.auth().getRedirectResult().then(async function(result) {
  if (result.user) {
    const user = result.user;
    console.log("User authenticated via redirect:", user.email);
    
    try {
      // Controlla se l'utente esiste già nel database
      const response = await fetch(`/user-by-email?email=${encodeURIComponent(user.email)}`);
      
      if (response.ok) {
        const dbUser = await response.json();
        window.location.href = `user-landing.html?user=${dbUser.user_id}`;
      } else if (response.status === 404) {
        // Se l'utente non esiste, lo registriamo
        const username = user.displayName ? user.displayName : user.email;
        
        // Genera un nome utente univoco
        const uniquename = await generateUniqueUsername(username);
        
        // Genera un colore casuale per l'avatar
        const userColor = generateRandomColor();
        
        const registerResponse = await fetch("/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: username,
            uniquename: uniquename,
            email: user.email,
            teex_balance: 500,
            avatar: user.photoURL,
            google_id: user.uid,
            user_color: userColor
          })
        });
        
        const data = await registerResponse.json();
        window.location.href = `user-landing.html?user=${data.userId}`;
      }
    } catch (error) {
      console.error("Errore durante il login con redirect:", error);
      alert("Errore durante il login: " + error.message);
    }
  }
}).catch(function(error) {
  console.error("Errore nel redirect result:", error);
});
