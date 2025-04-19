// ====================================================
// CONFIGURAZIONE DI GOOGLE IDENTITY PLATFORM (Firebase)
const firebaseConfig = {
  apiKey: "AIzaSyBiYZJBkI_cvzp2eLrerYAhAdH_PWPRyEI",
  authDomain: "crafty-vista-455914-s6.firebaseapp.com",
  projectId: "crafty-vista-455914-s6",
  // eventuali altri campi se richiesti (messagingSenderId, appId, ecc.)
};

// Funzione di debug per verificare lo stato all'avvio
function debugInitialState() {
  console.log("[DEBUG INIT] Page loaded:", window.location.href);
  console.log("[DEBUG INIT] localStorage flags:", {
    googleLoginAttempt: localStorage.getItem('googleLoginAttempt'),
    googleRedirectFlow: localStorage.getItem('googleRedirectFlow')
  });
}
debugInitialState();

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
  googleRegisterBtn.addEventListener("click", function(e) {
    e.preventDefault();
    
    // Rimuoviamo il signOut che sta causando problemi
    const googleProvider = new firebase.auth.GoogleAuthProvider();
    
    // Forza la selezione dell'account ogni volta
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
    
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
    
    // Rimuoviamo il signOut che sta causando problemi
    const googleProvider = new firebase.auth.GoogleAuthProvider();
    googleProvider.addScope('email');
    
    // Forza la selezione dell'account ogni volta
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
    
    // Salva un flag nel localStorage per indicare che stiamo tentando un login Google
    localStorage.setItem('googleLoginAttempt', 'true');
    
    console.log("[DEBUG] Google login button clicked, attempting popup");
    
    auth.signInWithPopup(googleProvider)
      .then(function(result) {
        // Resto del codice rimane invariato
      })
      .catch(function(error) {
        // Resto del codice rimane invariato
      });
  });
}

// Aggiungi questo codice per gestire il risultato del redirect
// Questo deve essere eseguito prima di onAuthStateChanged
console.log("[DEBUG] Setting up getRedirectResult handler");
firebase.auth().getRedirectResult().then(function(result) {
  console.log("[DEBUG] Redirect result received:", result);
  if (result.user) {
    console.log("[DEBUG] User authenticated via redirect:", result.user.email);
    const user = result.user;
    
    // Controlla se l'utente esiste già nel database
    fetch(`/user-by-email?email=${encodeURIComponent(user.email)}`)
      .then(function(response) {
        console.log("User verification response status (redirect result):", response.status);
        if (response.ok) {
          return response.json();
        } else if (response.status === 404) {
          console.log("User not found in database (redirect result), will create new user");
          return null;
        } else {
          throw new Error('Errore nella verifica utente: ' + response.status);
        }
      })
      .then(function(dbUser) {
        // Rimuovi i flag
        localStorage.removeItem('googleLoginAttempt');
        localStorage.removeItem('googleRedirectFlow');
        
        if (dbUser && dbUser.user_id) {
          console.log("User exists in redirect result, redirecting to landing page:", dbUser.user_id);
          window.location.href = `user-landing.html?user=${dbUser.user_id}`;
        } else {
          console.log("User does not exist in redirect result, creating new user:", user.email);
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
          .then(registerResponse => {
            console.log("Registration response status (redirect result):", registerResponse.status);
            if (!registerResponse.ok) {
              throw new Error('Errore nella registrazione utente: ' + registerResponse.status);
            }
            return registerResponse.json();
          })
          .then(function(data) {
            console.log("User created successfully in redirect result:", data.userId);
            window.location.href = `user-landing.html?user=${data.userId}`;
          });
        }
      })
      .catch(function(err) {
        localStorage.removeItem('googleLoginAttempt');
        localStorage.removeItem('googleRedirectFlow');
        console.error("Errore nel controllo dell'utente (redirect result):", err);
        
        const errorContainer = document.getElementById('errorContainer');
        const errorText = document.getElementById('errorText');
        if (errorContainer && errorText) {
          errorText.textContent = "Errore nel recupero o registrazione dell'utente: " + err.message;
          errorContainer.style.display = 'block';
        } else {
          alert("Errore nel recupero o registrazione dell'utente: " + err.message);
        }
      });
  } else {
    console.log("[DEBUG] No user from redirect result, checking current user");
    // Se non abbiamo un utente dal redirect ma abbiamo un flag di redirect,
    // proviamo a usare l'utente corrente
    const googleRedirectFlow = localStorage.getItem('googleRedirectFlow');
    if (googleRedirectFlow === 'true') {
      // Aspettiamo un momento per assicurarci che l'utente sia caricato
      setTimeout(() => {
        const currentUser = firebase.auth().currentUser;
        if (currentUser) {
          console.log("[DEBUG] Using current user for redirect flow:", currentUser.email);
          
          // Controlla se l'utente esiste già nel database
          fetch(`/user-by-email?email=${encodeURIComponent(currentUser.email)}`)
            .then(function(response) {
              console.log("User verification response status (current user):", response.status);
              if (response.ok) {
                return response.json();
              } else if (response.status === 404) {
                console.log("User not found in database (current user), will create new user");
                return null;
              } else {
                throw new Error('Errore nella verifica utente: ' + response.status);
              }
            })
            .then(function(dbUser) {
              // Rimuovi i flag
              localStorage.removeItem('googleLoginAttempt');
              localStorage.removeItem('googleRedirectFlow');
              
              if (dbUser && dbUser.user_id) {
                console.log("User exists (current user), redirecting to landing page:", dbUser.user_id);
                window.location.href = `user-landing.html?user=${dbUser.user_id}`;
              } else {
                console.log("User does not exist (current user), creating new user:", currentUser.email);
                const username = currentUser.displayName ? currentUser.displayName : currentUser.email;
                return fetch("/users", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    username: username,
                    email: currentUser.email,
                    teex_balance: 500,
                    avatar: currentUser.photoURL,
                    google_id: currentUser.uid
                  })
                })
                .then(registerResponse => {
                  console.log("Registration response status (current user):", registerResponse.status);
                  if (!registerResponse.ok) {
                    throw new Error('Errore nella registrazione utente: ' + registerResponse.status);
                  }
                  return registerResponse.json();
                })
                .then(function(data) {
                  console.log("User created successfully (current user):", data.userId);
                  window.location.href = `user-landing.html?user=${data.userId}`;
                });
              }
            })
            .catch(function(err) {
              localStorage.removeItem('googleLoginAttempt');
              localStorage.removeItem('googleRedirectFlow');
              console.error("Errore nel controllo dell'utente (current user):", err);
              
              const errorContainer = document.getElementById('errorContainer');
              const errorText = document.getElementById('errorText');
              if (errorContainer && errorText) {
                errorText.textContent = "Errore nel recupero o registrazione dell'utente: " + err.message;
                errorContainer.style.display = 'block';
              } else {
                alert("Errore nel recupero o registrazione dell'utente: " + err.message);
              }
            });
        } else {
          console.log("[DEBUG] No current user available after redirect");
        }
      }, 1000); // Attendi 1 secondo per assicurarci che l'utente sia caricato
    }
  }
}).catch(function(error) {
  console.error("[DEBUG] Redirect result error:", error.code, error.message);
  localStorage.removeItem('googleLoginAttempt');
  localStorage.removeItem('googleRedirectFlow');
});

// Modifica il controllo dell'autenticazione per gestire meglio i redirect
firebase.auth().onAuthStateChanged(function(user) {
  if (user) {
    console.log("[DEBUG] Utente autenticato:", user.email);
    console.log("[DEBUG] Current flags:", {
      googleLoginAttempt: localStorage.getItem('googleLoginAttempt'),
      googleRedirectFlow: localStorage.getItem('googleRedirectFlow')
    });
    console.log("[DEBUG] Current page:", window.location.pathname);
    
    // Controlla se c'è un tentativo di login Google in corso o un redirect
    const googleLoginAttempt = localStorage.getItem('googleLoginAttempt');
    const googleRedirectFlow = localStorage.getItem('googleRedirectFlow');
    
    // Solo per le pagine che richiedono autenticazione (non index)
    const isIndexPage = window.location.pathname === '/index.html' || 
                        window.location.pathname === '/' || 
                        window.location.pathname.endsWith('/index.html');
    
    // Se siamo in un redirect flow, non facciamo nulla qui perché è gestito da getRedirectResult
    if (googleRedirectFlow === 'true') {
      console.log("[DEBUG] Google redirect flow detected in onAuthStateChanged, waiting for getRedirectResult");
      // Non fare nulla qui, lascia che getRedirectResult gestisca il flusso
    } else if (googleLoginAttempt === 'true') {
      console.log("[DEBUG] Google login attempt detected in onAuthStateChanged");
      // Mantieni il codice esistente per il flusso di login normale
      // Resto del codice esistente...
    } else {
      console.log("[DEBUG] Normal authentication state change, no special flags");
    }
  } else {
    console.log("[DEBUG] Nessun utente autenticato");
  }
});
