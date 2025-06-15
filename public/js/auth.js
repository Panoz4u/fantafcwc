(async () => {
  try {
    // 1) Carica la config Firebase dal server
    const res = await fetch('/api/firebase-config');
    const cfg = await res.json();

    // 2) Inizializza Firebase con la config dinamica
    firebase.initializeApp(cfg);
    const auth = firebase.auth();
    

    // —————— QUI INIZIA IL VOSTRO CODICE AUTH ESISTENTE ——————

    // Funzione per generare un colore esadecimale casuale (senza #)
    function generateRandomColor() {
      return Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, '0');
    }

    // Funzione per verificare l'unicità del nome utente
    async function generateUniqueUsername(username) {
      try {
        const response = await fetch(
          `/check-username?username=${encodeURIComponent(username)}`
        );
        if (response.status === 200) {
          const randomNum = Math.floor(Math.random() * 1000)
            .toString()
            .padStart(3, '0');
          return username + randomNum;
        } else if (response.status === 404) {
          return username;
        } else {
          const randomNum = Math.floor(Math.random() * 1000)
            .toString()
            .padStart(3, '0');
          return username + randomNum;
        }
      } catch (error) {
        console.error('Errore durante la verifica del nome utente:', error);
        const randomNum = Math.floor(Math.random() * 1000)
          .toString()
          .padStart(3, '0');
        return username + randomNum;
      }
    }

    // ====================================================
    // REGISTRAZIONE CON EMAIL/PASSWORD
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
      registerForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const username = document.getElementById('regUsername').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;

        try {
          const uniquename = await generateUniqueUsername(username);
          const userColor = generateRandomColor();
          const avatarNumber = Math.floor(Math.random() * 27) + 1;
          const avatarFileName =
            avatarNumber.toString().padStart(2, '0') + '.png';

          const userCredential =
            await auth.createUserWithEmailAndPassword(email, password);
          const user = userCredential.user;

          const response = await fetch('/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: username,
              uniquename: uniquename,
              email: email,
              teex_balance: 500,
              color: userColor,
              avatar: avatarFileName,
            }),
          });

          const data = await response.json();
          localStorage.setItem('userId', data.userId);

          const tokenResponse = await fetch('/generate-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: data.userId }),
          });

          if (tokenResponse.ok) {
            const tokenData = await tokenResponse.json();
            localStorage.setItem('authToken', tokenData.token);
          }

          window.location.href = 'user-landing.html';
        } catch (error) {
          console.error('Errore durante la registrazione:', error);
          alert(error.message);
        }
      });
    }

    // ====================================================
    // LOGIN CON EMAIL/PASSWORD
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        auth
          .signInWithEmailAndPassword(email, password)
          .then(function (userCredential) {
            const user = userCredential.user;
            fetch(`/user-by-email?email=${encodeURIComponent(user.email)}`)
              .then(function (response) {
                return response.json();
              })
              .then(async function (dbUser) {
                localStorage.setItem('userId', dbUser.user_id);
                const tokenResponse = await fetch('/generate-token', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId: dbUser.user_id }),
                });
                if (tokenResponse.ok) {
                  const tokenData = await tokenResponse.json();
                  localStorage.setItem('authToken', tokenData.token);
                }
                window.location.href = 'user-landing.html';
              })
              .catch(function (err) {
                console.error('Errore nel recupero dell"utente dal DB:', err);
                alert('Errore nel recupero dell"utente dal DB');
              });
          })
          .catch(function (error) {
            console.error('Errore durante il login:', error);
            alert(error.message);
          });
      });
    }

    // ====================================================
    // LOGIN CON GOOGLE
    const googleLoginBtn = document.getElementById('googleLogin');
    if (googleLoginBtn) {
      googleLoginBtn.addEventListener('click', function (e) {
        e.preventDefault();

        const googleProvider = new firebase.auth.GoogleAuthProvider();
        googleProvider.addScope('email');
        googleProvider.setCustomParameters({ prompt: 'select_account' });

        auth
          .signInWithPopup(googleProvider)
          .then(async function (result) {
            const user = result.user;
            try {
              const response = await fetch(
                `/user-by-email?email=${encodeURIComponent(user.email)}`
              );
              if (!response.ok && response.status !== 404) {
                throw new Error('Errore nella verifica utente: ' +
                  response.status);
              }
              let dbUser;
              if (response.status === 404) {
                const username = user.displayName ||
                  user.email.split('@')[0];
                const uniquename = await generateUniqueUsername(username);
                const userColor = generateRandomColor();
                const registerResponse = await fetch('/users', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    username: username,
                    uniquename: uniquename,
                    email: user.email,
                    teex_balance: 500,
                    avatar: user.photoURL,
                    google_id: user.uid,
                    color: userColor,
                  }),
                });
                if (!registerResponse.ok) {
                  throw new Error(
                    'Errore nella registrazione utente: ' +
                      registerResponse.status
                  );
                }
                dbUser = await registerResponse.json();
                localStorage.setItem('userId', dbUser.userId);
              } else {
                dbUser = await response.json();
                localStorage.setItem('userId', dbUser.user_id);
              }
              const tokenResponse = await fetch('/generate-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: dbUser.user_id || dbUser.userId }),
              });
              if (tokenResponse.ok) {
                const tokenData = await tokenResponse.json();
                localStorage.setItem('authToken', tokenData.token);
              }
              window.location.href = 'user-landing.html';
            } catch (error) {
              console.error('Errore durante il login con Google:', error);
              alert(error.message);
            }
          })
          .catch(function (error) {
            console.error('Errore durante il login con Google:', error);
            alert(error.message);
          });
      });
    }

    // ====================================================
    // REGISTRAZIONE CON GOOGLE
    const googleRegisterBtn = document.getElementById('googleRegister');
    if (googleRegisterBtn) {
      googleRegisterBtn.addEventListener('click', function (e) {
        e.preventDefault();
    
        const googleProvider = new firebase.auth.GoogleAuthProvider();
        googleProvider.addScope('email');
        googleProvider.setCustomParameters({ prompt: 'select_account' });
    
        auth
          .signInWithPopup(googleProvider)
          .then(async function (result) {
            const user = result.user;
            try {
              const response = await fetch(
                `/user-by-email?email=${encodeURIComponent(user.email)}`
              );
              if (!response.ok && response.status !== 404) {
                throw new Error('Errore nella verifica utente: ' +
                  response.status);
              }
              let dbUser;
              if (response.status === 404) {
                const username = user.displayName ||
                  user.email.split('@')[0];
                const uniquename = await generateUniqueUsername(username);
                const userColor = generateRandomColor();
                const registerResponse = await fetch('/users', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    username: username,
                    uniquename: uniquename,
                    email: user.email,
                    teex_balance: 500,
                    avatar: user.photoURL,
                    google_id: user.uid,
                    color: userColor,
                  }),
                });
                if (!registerResponse.ok) {
                  throw new Error(
                    'Errore nella registrazione utente: ' +
                      registerResponse.status
                  );
                }
                dbUser = await registerResponse.json();
                localStorage.setItem('userId', dbUser.userId);
              } else {
                dbUser = await response.json();
                localStorage.setItem('userId', dbUser.user_id);
              }
              const tokenResponse = await fetch('/generate-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: dbUser.user_id || dbUser.userId }),
              });
              if (tokenResponse.ok) {
                const tokenData = await tokenResponse.json();
                localStorage.setItem('authToken', tokenData.token);
              }
              window.location.href = 'user-landing.html';
            } catch (error) {
              console.error('Errore durante la registrazione con Google:', error);
              alert(error.message);
            }
          })
          .catch(function (error) {
            console.error('Errore durante la registrazione con Google:', error);
            alert(error.message);
          });
      });
    }

    // Funzione per verificare l'autenticazione dell'utente
    function checkAuth() {
      const authToken = localStorage.getItem('authToken');
      const userId = localStorage.getItem('userId');
      if (!authToken || !userId) {
        window.location.href = 'index.html';
        return false;
      }
      return fetch('/verify-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ userId: userId }),
      })
        .then(response => {
          if (!response.ok) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('userId');
            localStorage.removeItem('userEmail');
            window.location.href = 'index.html';
            return false;
          }
          return true;
        })
        .catch(error => {
          console.error('Errore nella verifica del token:', error);
          return false;
        });
    }

    // Funzione per effettuare il logout
    function logout() {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userId');
      localStorage.removeItem('userEmail');
      auth
        .signOut()
        .then(function () {
          window.location.href = 'index.html';
        })
        .catch(function (error) {
          console.error('Errore durante il logout:', error);
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
      const logoutBtn = document.querySelector('.footer-item:last-child');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
      }
    });

    firebase.auth()
      .getRedirectResult()
      .then(async function (result) {
        if (result.user) {
          const user = result.user;
          
          try {
            const response = await fetch(
              `/user-by-email?email=${encodeURIComponent(user.email)}`
            );
            if (response.ok) {
              const dbUser = await response.json();
              window.location.href = `user-landing.html?user=${dbUser.user_id}`;
            } else if (response.status === 404) {
              const username =
                user.displayName ? user.displayName : user.email;
              const uniquename = await generateUniqueUsername(username);
              const userColor = generateRandomColor();
              const registerResponse = await fetch('/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  username: username,
                  uniquename: uniquename,
                  email: user.email,
                  teex_balance: 500,
                  avatar: user.photoURL,
                  google_id: user.uid,
                  user_color: userColor,
                }),
              });
              const data = await registerResponse.json();
              window.location.href = `user-landing.html?user=${data.userId}`;
            }
          } catch (error) {
            console.error('Errore durante il login con redirect:', error);
            alert('Errore durante il login: ' + error.message);
          }
        }
      })
      .catch(function (error) {
        console.error('Errore nel redirect result:', error);
      });

  } catch (err) {
    console.error('❌ Errore caricamento config Firebase:', err);
    alert('Errore di configurazione. Riprova più tardi.');
  }
})();
