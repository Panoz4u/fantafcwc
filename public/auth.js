// ====================================================
// CONFIGURAZIONE DI GOOGLE IDENTITY PLATFORM (Firebase)
// Inserisci qui i dati di configurazione ottenuti dalla tua console Firebase/GIP
const firebaseConfig = {
  apiKey: "AIzaSyBiYZJBkI_cvzp2eLrerYAhAdH_PWPRyEI",
  authDomain: "crafty-vista-455914-s6.firebaseapp.com",
  projectId: "crafty-vista-455914-s6",
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
            avatar: user.photoURL,  // Qui inviamo direttamente l'URL dell'avatar
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
    console.log("Submit login form");
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    
    auth.signInWithEmailAndPassword(email, password)
      .then(function(userCredential) {
        const user = userCredential.user;
        console.log("Login avvenuto con successo:", user);
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
} else {
  console.log("loginForm non trovato");
}


// ====================================================
// LOGIN CON GOOGLE
const googleLoginBtn = document.getElementById("googleLogin");
if (googleLoginBtn) {
  googleLoginBtn.addEventListener("click", function(e) {
    e.preventDefault();
    console.log("Pulsante Google login cliccato");
    
    // Chiudi eventuali popup aperti in precedenza
    auth.signOut().catch(e => console.log('Nessuna sessione attiva'));
    
    const googleProvider = new firebase.auth.GoogleAuthProvider();
    // Opzionale: richiedi l'accesso all'email dell'utente
    googleProvider.addScope('email');
    
    auth.signInWithPopup(googleProvider)
      .then(function(result) {
        const user = result.user;
        console.log("Login con Google avvenuto con successo:", user);
        
        // Controlla se l'utente esiste già nel database
        fetch(`/user-by-email?email=${encodeURIComponent(user.email)}`)
          .then(function(response) {
            if (response.ok) {
              return response.json();
            } else {
              // Se l'utente non esiste, lo registriamo
              console.log('Utente non trovato, procedo con la registrazione...');
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
                return registerResponse.json();
              });
            }
          })
          .then(function(dbUser) {
            // Reindirizza alla pagina utente
            const userId = dbUser.user_id || dbUser.userId;
            window.location.href = `user-landing.html?user=${userId}`;
          })
          .catch(function(err) {
            console.error("Errore nel recupero/registrazione dell'utente:", err);
            alert("Errore nel recupero o registrazione dell'utente");
          });
      })
      .catch(function(error) {
        console.error("Errore durante il login con Google:", error);
        alert("Errore durante il login con Google: " + error.message);
      });
  });
} else {
  console.log("googleLoginBtn non trovato");
}


// Gestisci il risultato del redirect quando l'utente torna dalla pagina di autenticazione Google
auth.getRedirectResult().then(function(result) {
  if (result.user) {
    console.log("Redirect result:", result.user.email);
  }
}).catch(function(error) {
  console.error("Errore nel redirect:", error);
});
