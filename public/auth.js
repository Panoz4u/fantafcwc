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


// ====================================================
// REGISTRAZIONE CON EMAIL/PASSWORD
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", function(e) {
    e.preventDefault();
    const username = document.getElementById("regUsername").value;
    const email = document.getElementById("regEmail").value;
    const password = document.getElementById("regPassword").value;
    
    auth.createUserWithEmailAndPassword(email, password)
      .then(function(userCredential) {
        const user = userCredential.user;
        // Invia la richiesta al backend per salvare il record utente nel DB
        fetch("/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: username,
            email: email,
            teex_balance: 500
          })
        })
        .then(function(response) {
          return response.json();
        })
        .then(function(data) {
          // Dopo la registrazione, reindirizza alla user-landing.html
          window.location.href = `user-landing.html?user=${data.userId}`;
        })
        .catch(function(err) {
          console.error("Errore durante la registrazione sul DB:", err);
          alert("Errore nella registrazione sul database");
        });
      })
      .catch(function(error) {
        console.error("Errore di registrazione:", error);
        alert(error.message);
      });
  });
}


// ====================================================
// REGISTRAZIONE CON GOOGLE
const googleRegisterBtn = document.getElementById("googleRegister");
if (googleRegisterBtn) {
  const googleProvider = new firebase.auth.GoogleAuthProvider();
  googleRegisterBtn.addEventListener("click", function(e) {
    e.preventDefault();
    
    auth.signInWithPopup(googleProvider)
      .then(function(result) {
        const user = result.user;
        // Per Google, usiamo user.displayName (se presente) altrimenti user.email per il campo username.
        const username = user.displayName ? user.displayName : user.email;
        
        fetch("/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: username,
            email: user.email,
            teex_balance: 500,
            avatar: user.photoURL,
            google_id: user.uid
          })
        })
        .then(function(response) {
          return response.json();
        })
        .then(function(data) {
          window.location.href = `user-landing.html?user=${data.userId}`;
        })
        .catch(function(err) {
          console.error("Errore durante la registrazione con Google sul DB:", err);
          alert("Errore nella registrazione sul database");
        });
      })
      .catch(function(error) {
        console.error("Errore di registrazione con Google:", error);
        alert(error.message);
      });
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
          .then(function(dbUser) {
            // Reindirizza a user-landing.html passando l'id ottenuto dal DB
            window.location.href = `user-landing.html?user=${dbUser.user_id}`;
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
      .then(function(result) {
        const user = result.user;
        console.log("Google login successful for:", user.email);
        
        // Controlla se l'utente esiste già nel database
        fetch(`/user-by-email?email=${encodeURIComponent(user.email)}`)
          .then(function(response) {
            console.log("User verification response status:", response.status);
            if (response.ok) {
              return response.json();
            } else if (response.status === 404) {
              // Utente non trovato, restituisci null per crearne uno nuovo
              console.log("User not found in database, will create new user");
              return null;
            } else {
              throw new Error('Errore nella verifica utente: ' + response.status);
            }
          })
          .then(function(dbUser) {
            if (dbUser && dbUser.user_id) {
              console.log("User exists, redirecting to landing page:", dbUser.user_id);
              // L'utente esiste già, reindirizza alla pagina utente
              window.location.href = `user-landing.html?user=${dbUser.user_id}`;
            } else {
              // Se l'utente non esiste, lo registriamo
              console.log("Creating new user from Google login:", user.email);
              const username = user.displayName ? user.displayName : user.email;
              
              return fetch("/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  username: username,
                  email: user.email,
                  teex_balance: 500,
                  avatar: user.photoURL,
                  google_id: user.uid
                })
              })
              .then(function(registerResponse) {
                console.log("Registration response status:", registerResponse.status);
                if (!registerResponse.ok) {
                  throw new Error('Errore nella registrazione utente: ' + registerResponse.status);
                }
                return registerResponse.json();
              })
              .then(function(data) {
                console.log("User created successfully:", data.userId);
                window.location.href = `user-landing.html?user=${data.userId}`;
              });
            }
          })
          .catch(function(err) {
            console.error("Errore nel recupero/registrazione dell'utente:", err);
            const errorContainer = document.getElementById('errorContainer');
            const errorText = document.getElementById('errorText');
            if (errorContainer && errorText) {
              errorText.textContent = "Errore nel recupero o registrazione dell'utente: " + err.message;
              errorContainer.style.display = 'block';
            } else {
              alert("Errore nel recupero o registrazione dell'utente: " + err.message);
            }
          });
      })
      .catch(function(error) {
        console.error("Errore durante il login con Google:", error);
        const errorContainer = document.getElementById('errorContainer');
        const errorText = document.getElementById('errorText');
        if (errorContainer && errorText) {
          errorText.textContent = "Errore durante il login con Google: " + error.message;
          errorContainer.style.display = 'block';
        } else {
          alert("Errore durante il login con Google: " + error.message);
        }
      });
  });
}

// Modifica il controllo dell'autenticazione per non reindirizzare automaticamente
firebase.auth().onAuthStateChanged(function(user) {
  if (user) {
    console.log("Utente autenticato:", user.email);
    // Non reindirizzare automaticamente dalla pagina index
    // Lasciamo che l'utente scelga esplicitamente di effettuare il login
    
    // Solo per le pagine che richiedono autenticazione (non index)
    const isIndexPage = window.location.pathname === '/index.html' || 
                        window.location.pathname === '/' || 
                        window.location.pathname.endsWith('/index.html');
    
    if (!isIndexPage) {
      // Per le altre pagine, verifica che l'utente esista nel database
      fetch(`/user-by-email?email=${encodeURIComponent(user.email)}`)
        .then(function(response) {
          if (response.ok) {
            return response.json();
          } else {
            throw new Error('Errore nella verifica utente');
          }
        })
        .then(function(dbUser) {
          if (dbUser && dbUser.user_id) {
            // Non fare nulla, l'utente è già nella pagina corretta
          } else {
            // Se l'utente non esiste nel DB, reindirizza alla pagina index
            window.location.href = 'index.html';
          }
        })
        .catch(function(err) {
          console.error("Errore nel controllo dell'utente:", err);
        });
    }
  }
});
