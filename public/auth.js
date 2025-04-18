// ====================================================
// CONFIGURAZIONE DI GOOGLE IDENTITY PLATFORM (Firebase)
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
    .catch(function(error) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/popup-blocked') {
        // popup bloccata o chiusa → fallback a redirect
        auth.signInWithRedirect(googleProvider);
      } else {
        const errorContainer = document.getElementById('errorContainer');
        const errorText = document.getElementById('errorText');
        if (errorContainer && errorText) {
          errorText.textContent = "Errore durante il login con Google: " + error.message;
          errorContainer.style.display = 'block';
        } else {
          alert("Errore durante il login con Google: " + error.message);
        }
      }
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
    
    // Salva un flag nel localStorage per indicare che stiamo tentando un login Google
    localStorage.setItem('googleLoginAttempt', 'true');
    
    auth.signInWithPopup(googleProvider)
    .then(function(result) {
      // Rimuovi il flag dopo un login riuscito
      localStorage.removeItem('googleLoginAttempt');
      
      const user = result.user;
      // Controlla se l'utente esiste già nel database
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
            // L'utente esiste già, reindirizza alla pagina utente
            window.location.href = `user-landing.html?user=${dbUser.user_id}`;
          } else {
            // Se l'utente non esiste, lo registriamo
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
            .then(registerResponse => registerResponse.json())
            .then(function(data) {
              window.location.href = `user-landing.html?user=${data.userId}`;
            });
          }
        })
        .catch(function(err) {
          // Rimuovi il flag in caso di errore
          localStorage.removeItem('googleLoginAttempt');
          
          console.error("Errore nel recupero/registrazione dell'utente:", err);
          const errorContainer = document.getElementById('errorContainer');
          const errorText = document.getElementById('errorText');
          const msg = "Errore nel recupero o registrazione dell'utente: " + err.message;
          if (errorContainer && errorText) {
            errorText.textContent = msg;
            errorContainer.style.display = 'block';
          } else {
            alert(msg);
          }
        });
    })
    .catch(function(error) {
      // se la popup è stata chiusa o bloccata, proviamo col redirect
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/popup-blocked') {
        // Mantieni il flag per il redirect
        auth.signInWithRedirect(googleProvider);
      } else {
        // Rimuovi il flag in caso di errore
        localStorage.removeItem('googleLoginAttempt');
        
        const errorContainer = document.getElementById('errorContainer');
        const errorText      = document.getElementById('errorText');
        const msg = "Errore durante il login con Google: " + error.message;
        if (errorContainer && errorText) {
          errorText.textContent   = msg;
          errorContainer.style.display = 'block';
        } else {
          alert(msg);
        }
      }
    });
  
  });
}

// Modifica il controllo dell'autenticazione per gestire meglio i redirect
firebase.auth().onAuthStateChanged(function(user) {
  if (user) {
    console.log("Utente autenticato:", user.email);
    
    // Controlla se c'è un tentativo di login Google in corso
    const googleLoginAttempt = localStorage.getItem('googleLoginAttempt');
    
    // Solo per le pagine che richiedono autenticazione (non index)
    const isIndexPage = window.location.pathname === '/index.html' || 
                        window.location.pathname === '/' || 
                        window.location.pathname.endsWith('/index.html');
    
    if (googleLoginAttempt === 'true') {
      // Se c'è un tentativo di login Google, procedi con il redirect
      fetch(`/user-by-email?email=${encodeURIComponent(user.email)}`)
        .then(function(response) {
          if (response.ok) {
            return response.json();
          } else {
            throw new Error('Errore nella verifica utente');
          }
        })
        .then(function(dbUser) {
          // Rimuovi il flag dopo aver ottenuto i dati
          localStorage.removeItem('googleLoginAttempt');
          
          if (dbUser && dbUser.user_id) {
            // Reindirizza alla landing page
            window.location.href = `user-landing.html?user=${dbUser.user_id}`;
          } else {
            // Se l'utente non esiste nel DB, registralo
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
            .then(registerResponse => registerResponse.json())
            .then(function(data) {
              window.location.href = `user-landing.html?user=${data.userId}`;
            });
          }
        })
        .catch(function(err) {
          // Rimuovi il flag in caso di errore
          localStorage.removeItem('googleLoginAttempt');
          console.error("Errore nel controllo dell'utente:", err);
        });
    } else if (!isIndexPage) {
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
