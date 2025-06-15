/**
 * Funzione ottimizzata per recuperare dati utente essenziali per l'intestazione del contest
 * @param {number|string} userId - ID dell'utente corrente
 * @param {number|string} opponentId - ID dell'avversario (opzionale)
 * @returns {Promise<Object>} - Oggetto contenente i dati degli utenti richiesti
 */
export async function fetchContestUserData(userId, opponentId = null) {
  try {
    // Ottieni il token di autenticazione
    const authToken = localStorage.getItem('authToken');
    
    if (!authToken) {
      console.warn("Token di autenticazione mancante");
      
      // Crea utenti fittizi per il debug in ambiente di sviluppo
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        
        // Crea un utente fittizio per l'utente corrente
        const mockCurrentUser = {
          user_id: userId,
          username: "Utente " + userId,
          teex_balance: 10.0,
          avatar: "default"
        };
        
        // Crea un utente fittizio per l'avversario se richiesto
        let mockOpponent = null;
        if (opponentId) {
          mockOpponent = {
            user_id: opponentId,
            username: "Avversario " + opponentId,
            teex_balance: 10.0,
            avatar: "default"
          };
        }
        
        return {
          currentUser: mockCurrentUser,
          opponent: mockOpponent
        };
      }
      
      // Se non siamo in ambiente di sviluppo, reindirizza alla pagina di login
      throw new Error("Autenticazione richiesta. Effettua il login.");
    }
    
    // Tenta di recuperare i dati utente con il token di autenticazione
    const usersResp = await fetch("/users", {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (!usersResp.ok) {
      // Se il token non è valido, prova a reindirizzare alla pagina di login
      if (usersResp.status === 401) {
        console.error("Token di autenticazione non valido");
        
        // Se siamo in ambiente di sviluppo, usa dati fittizi
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          
          const mockCurrentUser = {
            user_id: userId,
            username: "Utente " + userId,
            teex_balance: 10.0,
            avatar: "default"
          };
          
          let mockOpponent = null;
          if (opponentId) {
            mockOpponent = {
              user_id: opponentId,
              username: "Avversario " + opponentId,
              teex_balance: 10.0,
              avatar: "default"
            };
          }
          
          return {
            currentUser: mockCurrentUser,
            opponent: mockOpponent
          };
        }
        
        // Altrimenti, lancia un errore
        throw new Error(`Errore nel recupero degli utenti: ${usersResp.status}`);
      }
      
      throw new Error(`Errore nel recupero degli utenti: ${usersResp.status}`);
    }
    
    const allUsers = await usersResp.json();
    
    
    // Verifica che allUsers sia un array prima di utilizzare find()
    if (!Array.isArray(allUsers)) {
    
      
      // Se allUsers è un oggetto con una proprietà che contiene l'array degli utenti
      // (ad esempio allUsers.users o allUsers.data), prova a utilizzare quella
      let usersArray = null;
      if (allUsers && typeof allUsers === 'object') {
        if (Array.isArray(allUsers.users)) {
          usersArray = allUsers.users;
        } else if (Array.isArray(allUsers.data)) {
          usersArray = allUsers.data;
        } else {
          // Cerca una proprietà che contiene un array
          for (const key in allUsers) {
            if (Array.isArray(allUsers[key])) {
              usersArray = allUsers[key];
             
              break;
            }
          }
        }
      }
      
      if (!usersArray) {
        throw new Error("Impossibile trovare un array di utenti nei dati ricevuti");
      }
      
      // Usa l'array trovato
      const currentUser = usersArray.find(x => x.user_id == userId);
      const opponent = opponentId ? usersArray.find(x => x.user_id == opponentId) : null;
      
      if (!currentUser) {
        throw new Error(`Utente con ID ${userId} non trovato`);
      }
      
;
      
      return {
        currentUser,
        opponent
      };
    }
    
    // Se allUsers è un array, procedi normalmente
    const currentUser = allUsers.find(x => x.user_id == userId);
    const opponent = opponentId ? allUsers.find(x => x.user_id == opponentId) : null;
    
    if (!currentUser) {
      throw new Error(`Utente con ID ${userId} non trovato`);
    }
    
    
    return {
      currentUser,
      opponent
    };
  } catch (error) {
    console.error("Errore in fetchContestUserData:", error);
    
    // Restituiamo un oggetto con dati fittizi per consentire il funzionamento dell'app in modalità debug
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      
      return {
        currentUser: {
          user_id: userId,
          username: "Debug User",
          teex_balance: 10.0,
          avatar: "default"
        },
        opponent: opponentId ? {
          user_id: opponentId,
          username: "Debug Opponent",
          teex_balance: 10.0,
          avatar: "default"
        } : null
      };
    }
    
    // In produzione, propaghiamo l'errore
    throw error;
  }
}
export async function updateContestHeader(userId, opponentId, ownerId, contestId) {
  try {
    // Recupera i dati utente
    const userData = await fetchContestUserData(userId, opponentId);
    
    // Determina chi è l'utente corrente e chi è l'avversario
    const currentUser = userData.currentUser;
    const opponent = userData.opponent;
    
    if (!currentUser) {
      console.error("Utente corrente non trovato");
      return;
    }
    
    // Aggiorna il saldo Teex nell'header se l'elemento esiste
    const teexBalanceEl = document.getElementById("teexBalance");
    if (teexBalanceEl && currentUser.teex_balance !== undefined) {
      teexBalanceEl.textContent = parseFloat(currentUser.teex_balance).toFixed(1);
    }
    
    // Recupera i dettagli del contest
    const authToken = localStorage.getItem('authToken');
    const contestResp = await fetch(`/contest-details?contest=${contestId}&user=${userId}`, {
      headers: {
        'Authorization': `Bearer ${authToken || ''}`
      }
    });
    
    if (!contestResp.ok) {
      throw new Error(`Errore nel recupero dei dettagli del contest: ${contestResp.status}`);
    }
    
    const contestData = await contestResp.json();
    
    // Verifica che i dati del contest siano validi
    if (!contestData || !contestData.contest) {
      throw new Error("Dati del contest mancanti o in formato non valido");
    }
    
    // Renderizza l'intestazione del contest
    if (typeof renderContestHeader === 'function') {
      renderContestHeader(contestData.contest);
    } else {
      console.error("Funzione renderContestHeader non disponibile");
    }
  } catch (error) {
    console.error("Errore in updateContestHeader:", error);
    // Gestisci l'errore in modo appropriato
  }
}