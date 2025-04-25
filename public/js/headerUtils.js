// public/js/headerUtils.js
const getAvatarSrc = window.getAvatarSrc;
import { getTotalCost } from './teamUtils.js';

export function renderContestHeader(contestData) {
  const container = document.getElementById("contestHeaderContainer");
  if (!container) {
    console.error("Container contestHeaderContainer non trovato");
    return;
  }
  container.innerHTML = "";
  
  // Determina se il current user è owner
  // Prima prova a ottenere l'ID utente dai parametri URL
  const params = new URLSearchParams(window.location.search);
  let currentUserId = params.get("user");
  
  // Se non è presente nell'URL, prova a ottenerlo dal localStorage
  if (!currentUserId) {
    currentUserId = localStorage.getItem('userId');
  }
  
  // Se ancora non abbiamo un ID utente, usa una logica di fallback
  if (!currentUserId && window.contestId) {
    console.log("Usando logica di fallback per determinare l'utente corrente");
    // Assumiamo che l'utente corrente sia l'owner se non specificato diversamente
    currentUserId = contestData.owner_id;
  }
  
  const iAmOwner = (parseInt(currentUserId) === parseInt(contestData.owner_id));
  
  // Calcola il costo totale della squadra attuale
  const totalTeamCost = getTotalCost();
  
  // Importante: l'utente corrente deve sempre essere a sinistra
  // Non invertire mai le posizioni
  const myName = iAmOwner ? contestData.owner_name : contestData.opponent_name;
  const myAvatar = iAmOwner ? contestData.owner_avatar : contestData.opponent_avatar;
  const myCost = totalTeamCost.toFixed(1); // Usa il costo calcolato dai giocatori scelti
  const oppName = iAmOwner ? contestData.opponent_name : contestData.owner_name;
  const oppAvatar = iAmOwner ? contestData.opponent_avatar : contestData.owner_avatar;
  const oppCost = iAmOwner ? (contestData.opponent_cost || "-") : (contestData.owner_cost || "-");
  
  // ricostruisci la card completa
  const statusBadges = {
    0: "CREATED",
    1: iAmOwner ? "PENDING" : "INVITED",
    2: "READY",
    4: "LIVE",
    5: "COMPLETED"
  };
  const statusText = statusBadges[contestData.status] || contestData.status_name;

  const card = document.createElement("div");
  card.classList.add("contest-container", "cc-header");
  
  // Determina la classe corretta per il badge di stato
  let statusBadgeClass = "status-badge";
  if (contestData.status === 1 && !iAmOwner) {
    statusBadgeClass = "status-invited";
  }
  
  card.innerHTML = `
    <div class="contest-bar">
      <img src="${getAvatarSrc(myAvatar)}" alt="${myName}" class="player-avatar-contest left-avatar">
      <div class="triletter_contest left-name">${myName.substring(0, 3)}</div>
      <div class="result_bold">VS</div>
      <div class="triletter_contest right-name">${oppName.substring(0, 3)}</div>
      <img src="${getAvatarSrc(oppAvatar)}" alt="${oppName}" class="player-avatar-contest right-avatar">
      <div class="teex_spent left-teex" id="currentUserScore">${myCost}</div>
      <div class="teex_spent right-teex">${oppCost}</div>
    </div>
    <div class="status-badge-base ${statusBadgeClass}">${statusText}</div>
    ${contestData.multiply && parseInt(contestData.multiply) > 1 ? `<div class="multiply-contest-mini">${Math.floor(contestData.multiply)}</div>` : ''}
  `;

  container.appendChild(card);
  console.log("Header del contest renderizzato con successo");
}

// Ho analizzato i file del tuo progetto e ho identificato i problemi che stai riscontrando. Ecco le soluzioni:
// Problema 1: Classe dello Status "INVITED"
//
// Nel file `headerUtils.js`, lo status badge viene sempre creato con la classe "status-badge-base status-badge", ma per lo stato "INVITED" dovrebbe usare "status-badge-base status-invited".
//
// Ecco la modifica necessaria:
