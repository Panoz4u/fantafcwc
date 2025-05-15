// public/js/renderPlayerList.js

import { loadChosenPlayers, saveChosenPlayers, getTotalCost, getAvailableBudget, enrichPlayerData } from './teamUtils.js';

// Funzione per renderizzare la lista dei giocatori
export async function renderPlayerList() {
  let players = loadChosenPlayers();
  // Arricchisci i dati dei giocatori
  players = await enrichPlayerData(players);
  const ul = document.getElementById("playerList");
  if (ul) ul.innerHTML = "";
  // Aggiorna la visualizzazione dei giocatori nella griglia
  const playersContainer = document.querySelector(".players-grid");
  // Rimuovi tutti i giocatori esistenti (ma mantieni la cella "Add Player")
  const existingPlayers = document.querySelectorAll(".player-card");
  existingPlayers.forEach(el => el.remove());
  // Calcola il costo totale della squadra
  const totalTeamCost = getTotalCost();
  // Aggiorna il punteggio dell'utente corrente nell'header
  const currentUserScoreEl = document.getElementById("currentUserScore");
  if (currentUserScoreEl) currentUserScoreEl.textContent = totalTeamCost.toFixed(1);
  // Aggiorna i Teex rimasti (20 - costo totale)
  const teexLeft = getAvailableBudget();
  const teexLeftEl = document.getElementById("teexLeft");
  if (teexLeftEl) {
    teexLeftEl.innerHTML = `<span class="teex-left-text-cyan">${teexLeft.toFixed(1)}</span> <span class="teex-left-text-white">SwissHearts left</span>`;
  }
  // Aggiorna le classi dei pulsanti CONFIRM e RESET in base alla presenza di giocatori
  const confirmBtn = document.getElementById("confirmFooterBtn");
  const resetBtn = document.getElementById("resetTeamBtn");
  if (confirmBtn && resetBtn) {
    const hasPlayers = players.length > 0;
    // Aggiorna le classi invece di modificare l'opacità
    if (hasPlayers) {
      confirmBtn.className = "footer_button footer_button_orange";
      resetBtn.className = "footer_button footer_button_blue";
      confirmBtn.disabled = false;
      resetBtn.disabled = false;
    } else {
      confirmBtn.className = "footer_button fb_unable_orange";
      resetBtn.className = "footer_button fb_unable_blu";
      confirmBtn.disabled = true;
      resetBtn.disabled = true;
    }
  }
  // Aggiorna la lista dei giocatori nel nuovo formato
  const playersList = document.getElementById("playersList");
  if (playersList) {
    playersList.innerHTML = "";
    if (!players.length) {
      // Se non ci sono giocatori, mostra il messaggio di benvenuto con le frecce animate
      playersList.innerHTML = `
        <div class="welcome-container">
          <div class="welcome-text">
            <div class="welcome-to">START ADDING</div>
            <div class="fanteex-title">ARTISTS</div>
            <div class="start-game">TO YOUR TEAM</div>
          </div>
          <div class="animated-arrows">
            <img src="icons/arrow-down.png" alt="Arrow" class="arrow arrow1"><img src="icons/arrow-down.png" alt="Arrow" class="arrow arrow2"><img src="icons/arrow-down.png" alt="Arrow" class="arrow arrow3">
          </div>
        </div>`;
      return;
    }
    players.forEach((player, index) => {
      playersList.appendChild(createPlayerRow(player, index));
    });
  }
}

// Funzione ausiliaria per creare una riga per un giocatore
function createPlayerRow(player, index) {
  // Create a wrapper to contain both the player row and the separator
  const wrapper = document.createElement("div");
  // Crea il container per la riga
  const row = document.createElement("div");
  row.classList.add("player-row");
  // BLOCCO AVATAR: Immagine e posizione
  const avatarBlock = document.createElement("div");
  avatarBlock.classList.add("avatar-block");
  avatarBlock.style.position = "relative";
  // Create the athlete avatar container
  const avatarContainer = document.createElement("div");
  avatarContainer.classList.add("atheleteAvatar");
  // Create the image inside the container
  const iconImg = document.createElement("img");
  iconImg.src = player.picture ? `pictures/${player.picture}` : `pictures/player_placeholder.png`;
  iconImg.onerror = function() {
    this.src = 'pictures/player_placeholder.png';
  };
  // Add the image to the avatar container
  avatarContainer.appendChild(iconImg);
  //const posCircle = document.createElement("div");
  //posCircle.classList.add("position_circle");
  //posCircle.textContent = player.position;
  avatarBlock.appendChild(avatarContainer);
  //avatarBlock.appendChild(posCircle);
  // BLOCCO INFO: Nome e match info
  const infoBlock = document.createElement("div");
  infoBlock.classList.add("player-info");
  const nameSpan = document.createElement("div");
  nameSpan.classList.add("athlete_shortname");
  nameSpan.textContent = player.athlete_shortname;
  const matchSpan = document.createElement("div");
 
  // if (player.home_team_code && player.away_team_code) {
  //   // Determina se il giocatore è della squadra di casa o trasferta
  //   const playerTeamId = parseInt(player.team_id);
  //   const homeTeamId = parseInt(player.home_team);
  //   const awayTeamId = parseInt(player.away_team);
  //   const isHomeTeam = playerTeamId === homeTeamId;
  //   const isAwayTeam = playerTeamId === awayTeamId;
  //   // Crea il testo del match con il team del giocatore in grassetto
  //   const homeSpan = document.createElement("span");
  //   homeSpan.textContent = player.home_team_code;
  //   if (isHomeTeam) homeSpan.classList.add("team-bold");
  //   const dashSpan = document.createElement("span");
  //   dashSpan.textContent = "-";
  //   const awaySpan = document.createElement("span");
  //   awaySpan.textContent = player.away_team_code;
  //   if (isAwayTeam) awaySpan.classList.add("team-bold");
  //   matchSpan.appendChild(homeSpan);
  //   matchSpan.appendChild(dashSpan);
  //   matchSpan.appendChild(awaySpan);
  // } else {
    // Nuovo formato: Codice paese | CONCLAVE event_unit_id
    matchSpan.innerHTML = `<span style="font-family: 'Montserrat', sans-serif; font-weight: 800;">${player.player_team_code || ''}</span>`;
  // }
  infoBlock.appendChild(nameSpan);
  infoBlock.appendChild(matchSpan);
  // BLOCCO COSTO
  const costBlock = document.createElement("div");
  costBlock.classList.add("athlete_cost", "ac-long");
  costBlock.textContent = parseFloat(player.event_unit_cost || 0).toFixed(1);
  // BLOCCO RIMOZIONE con icona delete.png
  const removeBtn = document.createElement("div");
  removeBtn.classList.add("remove-player-btn");
  // Crea l'elemento immagine per l'icona di eliminazione
  const deleteIcon = document.createElement("img");
  deleteIcon.src = "icons/delete.png";
  deleteIcon.alt = "Remove";
  deleteIcon.style.width = "24px";
  deleteIcon.style.height = "24px";
  deleteIcon.style.cursor = "pointer";
  // Aggiungi l'evento click per rimuovere il giocatore
  deleteIcon.addEventListener("click", () => {
    removePlayer(index);
  });
  // Aggiungi l'icona al pulsante di rimozione
  removeBtn.appendChild(deleteIcon);
  // Aggiungi i blocchi alla riga
  row.appendChild(avatarBlock);
  row.appendChild(infoBlock);
  row.appendChild(costBlock);
  row.appendChild(removeBtn);
  // Add the row to the wrapper
  wrapper.appendChild(row);
  // Add the separator line
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