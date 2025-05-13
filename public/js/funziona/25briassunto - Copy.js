// public/js/riassunto.js
import { fetchCurrentEventUnit } from './fetchCurrentEventUnit.js';
import { loadChosenPlayers, saveChosenPlayers, getTotalCost, getAvailableBudget, enrichPlayerData } from './teamUtils.js';
import { renderContestHeader } from './headerUtils.js';
import { checkContestStatus, showErrorMessage } from './statusUtils.js';
import { showMultiplyOverlay } from './multiply.js';
import { setupMultiplyForInvitedUser, showConfirmOverlay } from './confirmSquad.js'; // Aggiungi questa riga

const getAvatarSrc = window.getAvatarSrc;

// Funzione per attendere che i dati del contest siano disponibili
function waitForContestData() {
  return new Promise((resolve) => {
    // Se i dati sono già disponibili, risolvi immediatamente
    if (window.contestDataReady) {
      resolve({
        contestId: window.contestId,
        eventUnitId: window.eventUnitId,
        opponentId: window.opponentId
      });
      return;
    }
    
    // Controlla se i dati sono nel localStorage
    const contestDataStr = localStorage.getItem('contestData');
    if (contestDataStr) {
      try {
        const contestData = JSON.parse(contestDataStr);
        // Verifica che i dati non siano troppo vecchi
        const now = new Date().getTime();
        const dataAge = now - (contestData.timestamp || 0);
        const maxAge = 10 * 60 * 1000; // 10 minuti
        
        if (dataAge <= maxAge) {
          // Imposta i dati come variabili globali
          window.contestId = contestData.contestId;
          window.eventUnitId = contestData.event_unit_id;
          window.opponentId = contestData.opponent;
          window.contestDataReady = true;
          
          resolve({
            contestId: contestData.contestId,
            eventUnitId: contestData.event_unit_id,
            opponentId: contestData.opponent
          });
          return;
        }
      } catch (e) {
        console.error("Errore nel parsing dei dati contest:", e);
      }
    }
    
    // Altrimenti, controlla ogni 100ms
    const checkInterval = setInterval(() => {
      if (window.contestDataReady) {
        clearInterval(checkInterval);
        resolve({
          contestId: window.contestId,
          eventUnitId: window.eventUnitId,
          opponentId: window.opponentId
        });
      }
    }, 100);
    
    // Timeout dopo 5 secondi
    setTimeout(() => {
      clearInterval(checkInterval);
      console.error("Timeout nel caricamento dei dati del contest");
      alert("Errore: timeout nel caricamento dei dati del contest");
      window.location.href = '/user-landing.html';
    }, 5000);
  });
}

// Inizializza l'applicazione solo quando i dati sono disponibili
async function initApp() {
  try {
    // Aggiungi event listener per il pulsante Back
    const backArrow = document.getElementById("backArrow");
    if (backArrow) {
      backArrow.addEventListener("click", () => {
        window.history.back();
      });
    }
    
    const data = await waitForContestData();
    const contestId = data.contestId;
    const eventUnitId = data.eventUnitId;
    const opponentId = data.opponentId;
    
    console.log("Dati contest pronti per l'uso:", { contestId, eventUnitId, opponentId });
    
    // Verifica che l'ID contest sia presente
    if (!contestId) {
      showErrorMessage("ID contest mancante");
      return;
    }
    
    // Ottieni l'ID utente dal localStorage
    const userId = localStorage.getItem('userId');
    if (!userId) {
      console.error("Utente non autenticato");
      window.location.href = '/index.html';
      return;
    }
    
    // Rimuovi o commenta questa chiamata iniziale, causa la richiesta non autenticata
    // await setupMultiplyForInvitedUser();

    // Aggiorna il saldo Teex nell'header
    try {
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        console.error("Token di autenticazione mancante");
        // Prova a recuperare il teex balance direttamente dalla tabella users
        const usersResp = await fetch("/users");
        if (usersResp.ok) {
          const allUsers = await usersResp.json();
          const currentUser = allUsers.find(x => x.user_id == userId);
          if (currentUser && currentUser.teex_balance !== undefined) {
            const teexBalanceEl = document.getElementById("teexBalance");
            if (teexBalanceEl) {
              // Converti in numero prima di usare toFixed
              const balance = parseFloat(currentUser.teex_balance);
              teexBalanceEl.textContent = balance.toFixed(1);
              console.log("Teex balance aggiornato dalla tabella users:", balance.toFixed(1));
              localStorage.setItem('userTeexBalance', balance.toFixed(1));
            }
          }
        }
        return;
      }
      
      const userResp = await fetch(`/user-info`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (userResp.ok) {
        const userData = await userResp.json();
        const teexBalanceEl = document.getElementById("teexBalance");
        if (teexBalanceEl && userData.teexBalance !== undefined) {
          // Converti in numero prima di usare toFixed
          const balance = parseFloat(userData.teexBalance);
          teexBalanceEl.textContent = balance.toFixed(1);
          console.log("Teex balance aggiornato:", balance.toFixed(1));
          // Salva il teex balance nel localStorage per uso futuro
          localStorage.setItem('userTeexBalance', balance.toFixed(1));
        } else if (teexBalanceEl) {
          // Se non abbiamo ricevuto il teex balance dall'API, prova a recuperarlo dal localStorage
          const savedTeexBalance = localStorage.getItem('userTeexBalance');
          if (savedTeexBalance) {
            teexBalanceEl.textContent = savedTeexBalance;
            console.log("Teex balance recuperato dal localStorage:", savedTeexBalance);
          }
        }
      } else {
        throw new Error(`Errore ${userResp.status}: ${await userResp.text()}`);
      }
    } catch (error) {
      console.error("Errore nel recupero delle informazioni utente:", error);
      // Prova a recuperare il teex balance direttamente dalla tabella users
      try {
        const usersResp = await fetch("/users");
        if (usersResp.ok) {
          const allUsers = await usersResp.json();
          const currentUser = allUsers.find(x => x.user_id == userId);
          if (currentUser && currentUser.teex_balance !== undefined) {
            const teexBalanceEl = document.getElementById("teexBalance");
            if (teexBalanceEl) {
              // Converti in numero prima di usare toFixed
              const balance = parseFloat(currentUser.teex_balance);
              teexBalanceEl.textContent = balance.toFixed(1);
              console.log("Teex balance aggiornato dalla tabella users dopo errore:", balance.toFixed(1));
              localStorage.setItem('userTeexBalance', balance.toFixed(1));
            }
          }
        }
      } catch (e) {
        console.error("Errore nel recupero degli utenti:", e);
        // Fallback al localStorage
        const teexBalanceEl = document.getElementById("teexBalance");
        const savedTeexBalance = localStorage.getItem('userTeexBalance');
        if (teexBalanceEl && savedTeexBalance) {
          teexBalanceEl.textContent = savedTeexBalance;
          console.log("Teex balance recuperato dal localStorage dopo errore:", savedTeexBalance);
        }
      }
    }
    
    // Carica i dettagli del contest
    try {
      const authToken = localStorage.getItem('authToken');
      const contestId = data.contestId; // Usa data.contestId ottenuto da waitForContestData
      const userId = localStorage.getItem('userId'); // Usa userId da localStorage
    
      // Verifica che contestId e userId siano validi prima di fare la richiesta
      if (!contestId || !userId) {
        console.error("ID contest o ID utente mancanti per caricare i dettagli del contest");
        showErrorMessage("Dati mancanti per caricare i dettagli del contest");
        return;
      }
    
      // Probabilmente la riga che causa l'errore è qui intorno (linea 228)
      // setupHeader(); // Commenta o rimuovi questa riga
    
      const contestResp = await fetch(`/contests/contest-details?contest=${contestId}&user=${userId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
    
      if (!contestResp.ok) {
        console.error(`Errore nel recupero dei dettagli del contest: ${contestResp.status}`);
        document.getElementById("errorMessage").textContent = `Errore nel recupero dei dettagli del contest: ${contestResp.status}`;
        document.getElementById("errorMessage").style.display = "block";
        return;
      }
    
      const contestData = await contestResp.json();
      console.log("Dettagli contest ricevuti:", contestData);
    
      // Renderizza l'header con i dati del contest
      renderContestHeader(contestData.contest, contestData.ownerTeam, contestData.opponentTeam);
    
      // *** CHIAMA setupMultiplyForInvitedUser QUI ***
      // Dopo aver ottenuto i dettagli del contest, chiama la funzione per verificare se bloccare il moltiplicatore
      // Questa chiamata ora userà la versione autenticata di setupMultiplyForInvitedUser
      await setupMultiplyForInvitedUser(); // Usa await se la funzione è async
    
      // Popola la pagina con i dettagli (se necessario)
      // ... logica per mostrare i team, ecc. ...
    
      // Aggiungi l'event listener al pulsante di conferma DOPO aver chiamato setupMultiplyForInvitedUser
      const confirmButton = document.getElementById('confirmFooterBtn'); // Corretto da 'confirmTeamButton'
      if (confirmButton) {
         // Rimuovi eventuali listener precedenti per sicurezza
         const newConfirmButton = confirmButton.cloneNode(true);
         confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);
         // Aggiungi il nuovo listener
         newConfirmButton.addEventListener('click', showConfirmOverlay); // showConfirmOverlay chiama showMultiplyOverlay
      } else {
         console.warn("Pulsante di conferma squadra non trovato.");
      }
    
    } catch (error) {
      console.error("Errore nel recupero dei dettagli del contest:", error);
      showErrorMessage("Errore nel caricamento dei dettagli della sfida.");
    }

    // Configura il pulsante "Add Player"
    const addPlayerBtn = document.getElementById("addPlayerBtn");
    if (addPlayerBtn) {
      addPlayerBtn.addEventListener("click", () => {
        // Salva i dati necessari nel localStorage
        const addPlayerData = {
          owner: userId,
          opponent: opponentId,
          contest: contestId,
          user: userId,
          teexBalance: document.getElementById("teexBalance")?.textContent || "0.0",
          timestamp: new Date().getTime()
        };
        localStorage.setItem('addPlayerData', JSON.stringify(addPlayerData));
        
        // Naviga alla pagina senza parametri in URL
        window.location.href = '/aggiungi-giocatore.html';
      });
    }
    
    
    // Renderizza la lista dei giocatori
    await renderPlayerList();
    
  } catch (error) {
    console.error("Errore nell'inizializzazione dell'app:", error);
    showErrorMessage("Errore generale nell'inizializzazione");
  }
}

// Funzione per renderizzare la lista dei giocatori
async function renderPlayerList() {
  try {
    let players = loadChosenPlayers();
    players = await enrichPlayerData(players);
    
    // Aggiorna la lista dei giocatori
    const playersList = document.getElementById("playersList");
    if (!playersList) return;
    
    playersList.innerHTML = "";
    
    if (!players.length) {
      // Se non ci sono giocatori, mostra il messaggio di benvenuto
      playersList.innerHTML = `
        <div class="welcome-container">
          <div class="welcome-text">
            <div class="welcome-to">START ADDING</div>
            <div class="fanteex-title">PAPABILI</div>
            <div class="start-game">TO YOUR TEAM</div>
          </div>
          <div class="animated-arrows">
            <img src="icons/arrow-down.png" alt="Arrow" class="arrow arrow1">
            <img src="icons/arrow-down.png" alt="Arrow" class="arrow arrow2">
            <img src="icons/arrow-down.png" alt="Arrow" class="arrow arrow3">
          </div>
        </div>`;
      return;
    }
    
    // Aggiorna i pulsanti in base alla presenza di giocatori
    const confirmBtn = document.getElementById("confirmFooterBtn");
    const resetBtn = document.getElementById("resetTeamBtn");
    if (confirmBtn && resetBtn) {
      confirmBtn.className = "footer_button footer_button_orange";
      resetBtn.className = "footer_button footer_button_blue";
      confirmBtn.disabled = false;
      resetBtn.disabled = false;
    }
    
    // Aggiorna il costo totale e il budget disponibile
    const totalTeamCost = getTotalCost();
    const currentUserScoreEl = document.getElementById("currentUserScore");
    if (currentUserScoreEl) {
      currentUserScoreEl.textContent = totalTeamCost.toFixed(1);
    }
    
    const teexLeft = getAvailableBudget();
    const teexLeftEl = document.getElementById("teexLeft");
    if (teexLeftEl) {
      teexLeftEl.innerHTML = `<span class="teex-left-text-cyan">${teexLeft.toFixed(1)}</span> <span class="teex-left-text-white">SwissHearts left</span>`;
    }
    
    // Renderizza i giocatori
    players.forEach((player, index) => {
      const playerRow = createPlayerRow(player, index);
      playersList.appendChild(playerRow);
    });
  } catch (error) {
    console.error("Errore nel rendering della lista giocatori:", error);
  }
}

// Funzione per creare una riga giocatore
function createPlayerRow(player, index) {
  // Crea il wrapper che conterrà sia la riga che il separatore
  const wrapper = document.createElement("div");
  
  // Crea il container per la riga
  const row = document.createElement("div");
  row.classList.add("player-row");
  
  // BLOCCO AVATAR: Immagine e posizione
  const avatarBlock = document.createElement("div");
  avatarBlock.classList.add("avatar-block");
  avatarBlock.style.position = "relative";
  
  const avatarContainer = document.createElement("div");
  avatarContainer.classList.add("atheleteAvatar");
  
  const iconImg = document.createElement("img");
  iconImg.src = player.picture ? `pictures/${player.picture}` : `pictures/player_placeholder.png`;
  iconImg.onerror = function() {
    this.src = 'pictures/player_placeholder.png';
  };
  
  avatarContainer.appendChild(iconImg);
  
  const posCircle = document.createElement("div");
  posCircle.classList.add("position_circle");
  posCircle.textContent = player.position;
  
  avatarBlock.appendChild(avatarContainer);
  avatarBlock.appendChild(posCircle);
  
  // BLOCCO INFO: Nome e match info
  const infoBlock = document.createElement("div");
  infoBlock.classList.add("player-info");
  
  const nameSpan = document.createElement("div");
  nameSpan.classList.add("athlete_shortname");
  nameSpan.textContent = player.athlete_shortname;
  
  const matchSpan = document.createElement("div");
  if (player.home_team_code && player.away_team_code) {
    // Determina se il giocatore è della squadra di casa o trasferta
    const playerTeamId = parseInt(player.team_id);
    const homeTeamId = parseInt(player.home_team);
    const awayTeamId = parseInt(player.away_team);
    const isHomeTeam = playerTeamId === homeTeamId;
    const isAwayTeam = playerTeamId === awayTeamId;
    
    // Crea il testo del match con il team del giocatore in grassetto
    const homeSpan = document.createElement("span");
    homeSpan.textContent = player.home_team_code;
    if (isHomeTeam) homeSpan.classList.add("team-bold");
    
    const dashSpan = document.createElement("span");
    dashSpan.textContent = "-";
    
    const awaySpan = document.createElement("span");
    awaySpan.textContent = player.away_team_code;
    if (isAwayTeam) awaySpan.classList.add("team-bold");
    
    matchSpan.appendChild(homeSpan);
    matchSpan.appendChild(dashSpan);
    matchSpan.appendChild(awaySpan);
  } else {
    // Nuovo formato: Codice paese | CONCLAVE event_unit_id
    matchSpan.innerHTML = `<span style="font-family: 'Montserrat', sans-serif; font-weight: 800;">${player.player_team_code || ''}</span> | CONC. <span style="font-family: 'Montserrat', sans-serif; font-weight: 800;">${player.event_unit_id || ''}</span>`;
  }
  
  infoBlock.appendChild(nameSpan);
  infoBlock.appendChild(matchSpan);
  
  // BLOCCO COSTO
  const costBlock = document.createElement("div");
  costBlock.classList.add("athlete_cost", "ac-long");
  costBlock.textContent = parseFloat(player.event_unit_cost || 0).toFixed(1);
  
  // BLOCCO RIMOZIONE con icona delete.png
  const removeBtn = document.createElement("div");
  removeBtn.classList.add("remove-player-btn");
  
  const deleteIcon = document.createElement("img");
  deleteIcon.src = "icons/delete.png";
  deleteIcon.alt = "Remove";
  deleteIcon.style.width = "24px";
  deleteIcon.style.height = "24px";
  deleteIcon.style.cursor = "pointer";
  
  deleteIcon.addEventListener("click", () => {
    removePlayer(index);
  });
  
  removeBtn.appendChild(deleteIcon);
  
  // Aggiungi i blocchi alla riga
  row.appendChild(avatarBlock);
  row.appendChild(infoBlock);
  row.appendChild(costBlock);
  row.appendChild(removeBtn);
  
  // Aggiungi la riga al wrapper
  wrapper.appendChild(row);
  
  // Aggiungi il separatore
  const separator = document.createElement("div");
  separator.classList.add("player-separator");
  wrapper.appendChild(separator);
  
  return wrapper;
}

// Funzione per rimuovere un giocatore
function removePlayer(index) {
  const players = loadChosenPlayers();
  players.splice(index, 1);
  saveChosenPlayers(players);
  renderPlayerList();
}

// Avvia l'applicazione quando il DOM è pronto
document.addEventListener("DOMContentLoaded", initApp);

// Avvia il core dell'app
import './team_creation.js';

// Assicurati che anche altre chiamate a showErrorMessage siano gestite come preferisci
// (es. commentandole o mostrando l'errore in modo permanente)
