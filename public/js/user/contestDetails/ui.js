// public/js/user/contestDetails/ui.js

import { getAvatarSrc, generateColoredInitialsAvatar } from './utils.js';

export function createPlayerRow(player, side) {
    const wrapper = document.createElement("div");
    const row = document.createElement("div");
    row.classList.add("player-row");
    
    // Avatar block
    const avatarBlock = document.createElement("div");
    avatarBlock.classList.add("avatar-block");
    avatarBlock.style.position = "relative";
  
    const avatarContainer = document.createElement("div");
    avatarContainer.classList.add("atheleteAvatar");
    const iconImg = document.createElement("img");
    iconImg.src = player.picture ? `pictures/${player.picture}` : `pictures/player_placeholder.png`;
    iconImg.onerror = () => iconImg.src = 'pictures/player_placeholder.png';
    avatarContainer.appendChild(iconImg);
    avatarBlock.appendChild(avatarContainer);
  
    // Info block
    const infoBlock = document.createElement("div");
    infoBlock.classList.add("player-info");
    const nameSpan = document.createElement("div");
    nameSpan.classList.add("athlete_shortname");
    nameSpan.textContent = player.athlete_shortname;
    const matchSpan = document.createElement("div");
    matchSpan.classList.add("match_3letter");
    matchSpan.innerHTML = `<span style="font-weight:800">${player.player_team_code||""}</span>`;
    infoBlock.append(nameSpan, matchSpan);
  
    // Points & cost
    const pointsCostBlock = document.createElement("div");
    pointsCostBlock.classList.add("points-cost-block");
    const pointsContainer = document.createElement("div");
    pointsContainer.classList.add("points-container");
    updatePointsDisplay(player.athlete_points, player.is_ended, pointsContainer);
  
    const costSpan = document.createElement("div");
    costSpan.classList.add("athlete_cost");
    costSpan.textContent = parseFloat(player.cost || 0).toFixed(1);
  
    pointsCostBlock.append(pointsContainer, costSpan);
  
    // Monta riga in base al lato
    if (side === "left") {
      row.append(avatarBlock, infoBlock, pointsCostBlock);
    } else {
      row.append(pointsCostBlock, infoBlock, avatarBlock);
    }
  
    wrapper.append(row);
    const sep = document.createElement("div");
    sep.classList.add("player-separator");
    wrapper.appendChild(sep);
  
    return wrapper;
  }
  
/**
 * Mostra un messaggio di errore in cima alla pagina
 */
export function showError(message) {
  let errorMessage = document.getElementById("errorMessage");
  if (!errorMessage) {
    errorMessage = document.createElement("div");
    errorMessage.id = "errorMessage";
    errorMessage.style.color = "red";
    errorMessage.style.padding = "10px";
    errorMessage.style.margin = "10px";
    errorMessage.style.backgroundColor = "rgba(255, 0, 0, 0.1)";
    errorMessage.style.borderRadius = "5px";
    document.body.insertBefore(errorMessage, document.querySelector("section.teams-section"));
  }
  errorMessage.textContent = message;
  errorMessage.style.display = "block";
}

/**
 * Aggiorna il bilancio Teex nell'header
 */
export function renderTeexBalance(balance) {
  const teexContainer = document.getElementById("teexContainer");
  if (teexContainer) {
    teexContainer.textContent = balance;
  }
}

/**
 * Mostra i punti nell'elemento container, con styling diverso se è finito o meno
 */
export function updatePointsDisplay(points, isEnded, container) {
    container.innerHTML = "";
    const ptsStr = parseFloat(points).toFixed(1);
    const [ptsInt, ptsDec] = ptsStr.split(".");
    
    const intSpan = document.createElement("span");
    intSpan.classList.add("athlete_points_integer", isEnded ? "is_ended" : "not_ended");
    intSpan.textContent = ptsInt;
  
    const decSpan = document.createElement("span");
    decSpan.classList.add("athlete_points_decimal", isEnded ? "is_ended" : "not_ended");
    decSpan.textContent = `.${ptsDec}`;
  
    container.appendChild(intSpan);
    container.appendChild(decSpan);
  }

/**
 * Renderizza la card header del contest, gestendo tutti i casi di status
 */
export async function renderContestHeader(contestData, currentUserId) {
    const container = document.getElementById("contestHeaderContainer");
    container.innerHTML = "";
  
    // 1. Determina se sono owner o invited
    const iAmOwner = parseInt(currentUserId, 10) === parseInt(contestData.owner_id, 10);
  
    // 2. Prepara dati "my" e "opp"
    const my = {
      name:   iAmOwner ? contestData.owner_name    : contestData.opponent_name,
      avatar: iAmOwner ? contestData.owner_avatar  : contestData.opponent_avatar,
      color:  iAmOwner ? contestData.owner_color   : contestData.opponent_color,
      cost:   iAmOwner
                ? (contestData.owner_cost    != null ? parseFloat(contestData.owner_cost).toFixed(1)    : "-")
                : (contestData.opponent_cost != null ? parseFloat(contestData.opponent_cost).toFixed(1) : "-")
    };
    const opp = {
      name:   iAmOwner ? contestData.opponent_name : contestData.owner_name,
      avatar: iAmOwner ? contestData.opponent_avatar : contestData.owner_avatar,
      color:  iAmOwner ? contestData.opponent_color : contestData.owner_color,
      cost:   iAmOwner
                ? (contestData.opponent_cost != null ? parseFloat(contestData.opponent_cost).toFixed(1) : "-")
                : (contestData.owner_cost    != null ? parseFloat(contestData.owner_cost).toFixed(1)    : "-")
    };
  
    // 3. Crea wrapper
    const contestCard = document.createElement("div");
    contestCard.classList.add("contest-cell");
  
    // 4. Helper per il markup base
    const baseMarkup = (leftCost, rightCost, statusClass, statusText, scoreHTML = "") => `
      <div class="contest-container cc-header">
        <div class="contest-bar">
          <img src="${getAvatarSrc(my.avatar, my.name, my.color)}" alt="${my.name}" class="player-avatar-contest left-avatar">
          <div class="triletter_contest left-name">${my.name.slice(0,3)}</div>
          ${scoreHTML || `<div class="result_bold">VS</div>`}
          <div class="triletter_contest right-name">${opp.name.slice(0,3)}</div>
          <img src="${getAvatarSrc(opp.avatar, opp.name, opp.color)}" alt="${opp.name}" class="player-avatar-contest right-avatar">
          <div class="teex_spent left-teex">${leftCost}</div>
          <div class="teex_spent right-teex">${rightCost}</div>
        </div>
        <div class="status-badge-base ${statusClass}">${statusText}</div>
        ${contestData.multiply > 1 ? `<div class="multiply-contest-mini">${Math.floor(contestData.multiply)}</div>` : ""}
      </div>
    `;
  
    // 5. Genera markup in base allo status
    switch (contestData.status) {
  
      case 1: // PENDING (owner) / INVITED
        {
          const statusClass = iAmOwner ? "status-badge-pending" : "status-badge-invited";
          const statusText  = iAmOwner ? "PENDING" : "INVITED";
          contestCard.innerHTML = baseMarkup(my.cost, opp.cost, statusClass, statusText);
        }
        break;
  
      case 2: // READY
        {
          contestCard.innerHTML = baseMarkup(my.cost, opp.cost, "status-badge-ready", "READY");
        }
        break;
  
      case 4: // LIVE (mostro 0.0 iniziali, poi aggiorno)
        {
          // markup iniziale con 0.0
          const scoreHTML = `
            <div style="
              position: absolute; top: calc(50% - 14px);
              left: 50%; transform: translate(-50%, -50%);
              display: flex; align-items: baseline;
            ">
              <span class="result_bold" id="leftScoreInt">0</span>
              <span class="win_index_perc" id="leftScoreDec">.0</span>
              <span style="margin:0 5px;font-size:20px;"> </span>
              <span class="result_bold" id="rightScoreInt">0</span>
              <span class="win_index_perc" id="rightScoreDec">.0</span>
            </div>
          `;
          contestCard.innerHTML = baseMarkup(my.cost, opp.cost, "status-badge-live", "LIVE", scoreHTML);
  
          // fetch e update dei punteggi
          fetch(`/fantasy/contest-points?contest_id=${contestData.contest_id}`)
            .then(r => r.json())
            .then(data => {
              const lp = parseFloat(iAmOwner ? data.owner_points : data.opponent_points) || 0;
              const rp = parseFloat(iAmOwner ? data.opponent_points : data.owner_points) || 0;
              const [li, ld] = lp.toFixed(1).split('.');
              const [ri, rd] = rp.toFixed(1).split('.');
              document.getElementById("leftScoreInt").textContent  = li;
              document.getElementById("leftScoreDec").textContent  = `.${ld}`;
              document.getElementById("rightScoreInt").textContent = ri;
              document.getElementById("rightScoreDec").textContent = `.${rd}`;
            })
            .catch(console.error);
        }
        break;
  
      case 5: // COMPLETED
        {
          // calcolo punteggi e teexWon
          let leftScore = 0, rightScore = 0, ftTeexWon = 0;
          // 1) Estrai punteggi totali
          if (contestData.fantasy_teams) {
            contestData.fantasy_teams.forEach(team => {
              if ((iAmOwner && team.user_id == contestData.owner_id) ||
                  (!iAmOwner && team.user_id == contestData.opponent_id)) {
                ftTeexWon = parseFloat(team.ft_teex_won) || 0;
                leftScore = parseFloat(team.total_points) || 0;
              } else {
                rightScore = parseFloat(team.total_points) || 0;
              }
            });
          }
          // 2) Calcolo teex vinti: ftTeexWon - (myCost * multiply)
          const costNum = parseFloat(iAmOwner ? contestData.owner_cost : contestData.opponent_cost) || 0;
          const won = ftTeexWon - (costNum * (parseFloat(contestData.multiply) || 1));
          const sign = won < 0 ? "-" : "+";
          const wonStr = Math.abs(won).toFixed(1);
  
          // preparo scoreHTML con punteggi finali
          const scoreHTML = `
            <div style="
              position: absolute; top: calc(50% - 14px);
              left: 50%; transform: translate(-50%, -50%);
              display: flex; align-items: baseline;
            ">
              <span class="result_bold">${leftScore.toFixed(1).split('.')[0]}</span>
              <span class="win_index_perc">.${leftScore.toFixed(1).split('.')[1]}</span>
              <span style="margin:0 5px;font-size:20px;"> </span>
              <span class="result_bold">${rightScore.toFixed(1).split('.')[0]}</span>
              <span class="win_index_perc">.${rightScore.toFixed(1).split('.')[1]}</span>
            </div>
          `;
          const badgeClass = won > 0 ? "status-badge-win" : won < 0 ? "status-badge-loss" : "status-badge-draw";
          const badgeText  = `${sign}${wonStr}`;
  
          contestCard.innerHTML = baseMarkup(my.cost, opp.cost, badgeClass, badgeText, scoreHTML);
        }
        break;
  
      default: // UNKNOWN
        contestCard.innerHTML = `
          <div class="contest-container cc-header">
            <div class="contest-bar">
              <span>Stato sconosciuto</span>
            </div>
          </div>
        `;
    }
  
    // 6. Aggiungi al DOM
    container.appendChild(contestCard);
  }
  

/**
 * Renderizza le due liste di giocatori owner/opponent
 */
export function renderTeamLists(ownerTeam, opponentTeam, contestData, currentUserId) {
    const leftList  = document.getElementById("leftTeamList");
    const rightList = document.getElementById("rightTeamList");
    leftList.innerHTML  = "";
    rightList.innerHTML = "";
  
    const isOwner = parseInt(currentUserId, 10) === parseInt(contestData.owner_id, 10);
    const [first, second] = isOwner
      ? [ownerTeam, opponentTeam]
      : [opponentTeam, ownerTeam];
  
    first.forEach(player => leftList.appendChild(createPlayerRow(player, "left")));
    second.forEach(player => rightList.appendChild(createPlayerRow(player, "right")));
  }