// public/js/user/contestDetails/ui.js

import { getAvatarSrc, generateColoredInitialsAvatar } from './utils.js';

/**
 * Crea una riga "player-row" con avatar, info e punti/costo
 */
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
  iconImg.src = player.picture 
    ? `pictures/${player.picture}` 
    : `pictures/player_placeholder.png`;
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
 * Mostra un messaggio di errore in cima alla pagina (contest details)
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
 * @param {Object} contest          - L’oggetto contest restituito dal server (data.contest)
 * @param {string|number} currentUserId - L’ID dell’utente corrente come stringa/numero
 * @param {boolean} iAmOwner        - Booleano già calcolato in initContestDetails
 */
export function renderContestHeader(contest, currentUserId, iAmOwner) {
  const container = document.getElementById("contestHeaderContainer");
  container.innerHTML = "";

  // 1. Preparo dati "my" e "opp"
  const my = {
    name:   iAmOwner ? contest.owner_name    : contest.opponent_name,
    avatar: iAmOwner ? contest.owner_avatar  : contest.opponent_avatar,
    color:  iAmOwner ? contest.owner_color   : contest.opponent_color,
    cost:   iAmOwner
              ? (contest.owner_cost    != null ? parseFloat(contest.owner_cost).toFixed(1)    : "-")
              : (contest.opponent_cost != null ? parseFloat(contest.opponent_cost).toFixed(1) : "-")
  };
  const opp = {
    name:   iAmOwner ? contest.opponent_name : contest.owner_name,
    avatar: iAmOwner ? contest.opponent_avatar : contest.owner_avatar,
    color:  iAmOwner ? contest.opponent_color : contest.owner_color,
    cost:   iAmOwner
              ? (contest.opponent_cost != null ? parseFloat(contest.opponent_cost).toFixed(1) : "-")
              : (contest.owner_cost    != null ? parseFloat(contest.owner_cost).toFixed(1)    : "-")
  };

  // 2. Funzione helper per il markup base
  const baseMarkup = (leftCost, rightCost, statusClass, statusText, scoreHTML = "") => `
    <div class="contest-container cc-header">
      <div class="contest-bar">
        <img src="${getAvatarSrc(my.avatar, my.name, my.color)}"
             alt="${my.name}"
             class="player-avatar-contest left-avatar">
        <div class="triletter_contest left-name">${my.name.slice(0,3)}</div>
        ${scoreHTML || `<div class="result_bold">VS</div>`}
        <div class="triletter_contest right-name">${opp.name.slice(0,3)}</div>
        <img src="${getAvatarSrc(opp.avatar, opp.name, opp.color)}"
             alt="${opp.name}"
             class="player-avatar-contest right-avatar">
        <div class="teex_spent left-teex">${leftCost}</div>
        <div class="teex_spent right-teex">${rightCost}</div>
      </div>
      <div class="status-badge-base ${statusClass}">${statusText}</div>
      ${contest.multiply > 1 
         ? `<div class="multiply-contest-mini">${Math.floor(contest.multiply)}</div>`
         : ""}
    </div>
  `;

  // 3. Genero (diverse) versioni dell’header in base al contest.status
  switch (contest.status) {
    case 1: // PENDING (se sei owner) / INVITED (se sei invitato)
      {
        const statusClass = iAmOwner ? "status-badge-pending" : "status-badge-invited";
        const statusText  = iAmOwner ? "PENDING" : "INVITED";
        container.innerHTML = baseMarkup(my.cost, opp.cost, statusClass, statusText);
      }
      break;

    case 2: // READY (mostro lo stake anziché “READY”)
      {
        container.innerHTML = baseMarkup(
          my.cost,
          opp.cost,
          "status-badge-ready",
          typeof contest.stake !== "undefined" ? contest.stake : "-"
        );
      }
      break;

      case 4: // LIVE (mostro lo stake anziché la parola "LIVE")
      {
        // 1) Costruisco un placeholder con "0.0 vs 0.0" per l’impostazione iniziale
        const scoreHTML = `
          <div class="result-bignum">
            <div class="result_block left_block">
              <span class="result_bold left">0</span>
              <span class="win_index_perc left">.0</span>
            </div>
            <span class="vs-separator"> </span>
            <div class="result_block right_block onedigit">
              <span class="result_bold right">0</span>
              <span class="win_index_perc right">.0</span>
            </div>
          </div>
        `;
        // 2) Inserisco il markup iniziale mostrando contest.stake nel badge
        const stakeText = typeof contest.stake !== "undefined" ? contest.stake : "-";
        container.innerHTML = baseMarkup(
          my.cost,
          opp.cost,
          "status-badge-live",
          stakeText,
          scoreHTML
        );
    
        // 3) Recupero i punti "live" e li sostituisco
        fetch(`/fantasy/contest-points?contest_id=${contest.contest_id}`)
          .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
          })
          .then(data => {
            // Estrazione dei due valori: left / right in base a iAmOwner
            const leftPts  = iAmOwner ? data.owner_points   : data.opponent_points;
            const rightPts = iAmOwner ? data.opponent_points : data.owner_points;
            const [li, ld] = parseFloat(leftPts  || 0).toFixed(1).split('.');
            const [ri, rd] = parseFloat(rightPts || 0).toFixed(1).split('.');
    
            // 4) Modifico direttamente i nodi del DOM: le prime due <span> sinistre e destre
            const leftIntEl  = container.querySelector(".result_block.left_block .result_bold.left");
            const leftDecEl  = container.querySelector(".result_block.left_block .win_index_perc.left");
            const rightIntEl = container.querySelector(".result_block.right_block .result_bold.right");
            const rightDecEl = container.querySelector(".result_block.right_block .win_index_perc.right");
    
            if (leftIntEl)  leftIntEl.textContent  = li;
            if (leftDecEl)  leftDecEl.textContent  = `.${ld}`;
            if (rightIntEl) rightIntEl.textContent = ri;
            if (rightDecEl) rightDecEl.textContent = `.${rd}`;
    
            // 5) Gestisco eventuale <10 per aggiungere/rimuovere la classe "onedigit"
            const rightBlockEl = container.querySelector(".result_block.right_block");
            if (Number(ri) < 10) {
              rightBlockEl.classList.add("onedigit");
            } else {
              rightBlockEl.classList.remove("onedigit");
            }
          })
          .catch(err => {
            console.error("Errore live contest:", err);
            // Se fallisce, lascio i 0.0 vs 0.0 nel placeholder iniziale
          });
      }
      break;
    

    case 5: // COMPLETED (risultato definitivo + badge Win/Loss/Draw)
      {
        // 1) Estraggo leftScore e rightScore dai fantasy_teams (o fallback)
        let leftScore = 0, rightScore = 0, ftTeexWon = 0;
        if (Array.isArray(contest.fantasy_teams) && contest.fantasy_teams.length) {
          contest.fantasy_teams.forEach(team => {
            if (
               (iAmOwner && String(team.user_id) === String(contest.owner_id)) ||
               (!iAmOwner && String(team.user_id) === String(contest.opponent_id))
            ) {
              leftScore  = parseFloat(team.total_points  || 0);
              ftTeexWon = parseFloat(team.ft_teex_won    || 0);
            } else {
              rightScore = parseFloat(team.total_points || 0);
            }
          });
        } else {
          // Fallback: prendo direttamente contest.owner_points / contest.opponent_points
          if (iAmOwner) {
            leftScore  = parseFloat(contest.owner_points    || 0);
            ftTeexWon = parseFloat(contest.owner_teex_won  || 0);
            rightScore = parseFloat(contest.opponent_points|| 0);
          } else {
            leftScore  = parseFloat(contest.opponent_points   || 0);
            ftTeexWon = parseFloat(contest.opponent_teex_won || 0);
            rightScore = parseFloat(contest.owner_points      || 0);
          }
        }

        // 2) Calcolo il guadagno/perdita finale di teex
        const stake = parseFloat(contest.stake   || 0);
        const cost  = parseFloat(
          iAmOwner 
            ? (contest.owner_cost    || 0)
            : (contest.opponent_cost || 0)
        );
        const mult  = parseFloat(contest.multiply || 1);
        let myTeex  = 0;
        if      (ftTeexWon === 1)   myTeex = stake - (cost * mult);
        else if (ftTeexWon === -1)  myTeex = -(cost * mult);
        else                        myTeex = (stake / 2) - (cost * mult);

        // 3) Splitting dei punteggi per parte intera e decimale
        const [liInt, liDec] = leftScore .toFixed(1).split('.');
        const [riInt, riDec] = rightScore.toFixed(1).split('.');

        // 4) Scelgo classe e testo badge finale (Win/Loss/Draw)
        const badgeClass = myTeex > 0 
          ? "status-badge-win"
          : myTeex < 0 
            ? "status-badge-loss"
            : "status-badge-draw";
        const badgeText  = (myTeex > 0 ? "+" : "") + myTeex.toFixed(1);

        // 5) Costi già calcolati in "my.cost" e "opp.cost"

        // 6) Markup finale con “result-bignum”
        const scoreHTML = `
          <div class="result-bignum">
            <div class="result_block left_block">
              <span class="result_bold left">${liInt}</span>
              <span class="win_index_perc left">.${liDec}</span>
            </div>
            <span class="vs-separator"> </span>
            <div class="result_block right_block${Number(riInt) < 10 ? ' onedigit' : ''}">
              <span class="result_bold right">${riInt}</span>
              <span class="win_index_perc right">.${riDec}</span>
            </div>
          </div>
        `;

        container.innerHTML = baseMarkup(
          my.cost,
          opp.cost,
          badgeClass,
          badgeText,
          scoreHTML
        );
      }
      break;

    default: // UNKNOWN
      container.innerHTML = `
        <div class="contest-container cc-header">
          <div class="contest-bar">
            <span>Stato sconosciuto</span>
          </div>
        </div>
      `;
  }
}

/**
 * Renderizza le due liste di giocatori owner/opponent
 * @param {Array} ownerTeam     - Array di giocatori dell’owner
 * @param {Array} opponentTeam  - Array di giocatori dell’opponent
 * @param {Object} contest      - Oggetto contest restituito dal server
 * @param {string|number} currentUserId - ID dell’utente corrente
 * @param {boolean} iAmOwner    - Booleano già calcolato in initContestDetails
 */
export function renderTeamLists(ownerTeam, opponentTeam, contest, currentUserId, iAmOwner) {
  const leftList  = document.getElementById("leftTeamList");
  const rightList = document.getElementById("rightTeamList");
  leftList.innerHTML  = "";
  rightList.innerHTML = "";

  // Non ricalcolo più “sono owner?” qui, uso iAmOwner
  const [firstList, secondList] = iAmOwner
    ? [ownerTeam, opponentTeam]
    : [opponentTeam, ownerTeam];

  firstList.forEach(player => leftList.appendChild(createPlayerRow(player, "left")));
  secondList.forEach(player => rightList.appendChild(createPlayerRow(player, "right")));
}
