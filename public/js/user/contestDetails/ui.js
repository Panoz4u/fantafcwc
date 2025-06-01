// public/js/user/contestDetails/ui.js

import { getAvatarSrc, generateColoredInitialsAvatar } from './utils.js';

/**
 * Crea una riga "player-row" con:
 *  - avatar (player.picture oppure placeholder)
 *  - athlete_shortname
 *  - match (home_team_code – away_team_code) con le classi condizionali
 *  - punti (player.athlete_unit_points)
 *  - costo (player.event_unit_cost)
 *  - styling “ended” se player.is_ended === 1
 */
/**
 * Crea una riga "player-row" con:
 *  - avatar (player.picture oppure placeholder)
 *  - athlete_shortname
 *  - match (home_team_code-away_team_code) con le classi condizionali
 *  - punti (player.athlete_unit_points)
 *  - costo (player.event_unit_cost)
 *  - styling “ended” se player.is_ended === 1
 */
export function createPlayerRow(player, side) {
  const wrapper = document.createElement("div");
  const row = document.createElement("div");
  row.classList.add("player-row");

  // ─── Avatar block ───
  const avatarBlock = document.createElement("div");
  avatarBlock.classList.add("avatar-block");
  avatarBlock.style.position = "relative";

  const avatarContainer = document.createElement("div");
  avatarContainer.classList.add("atheleteAvatar");
  const iconImg = document.createElement("img");
  iconImg.src = player.picture
    ? `pictures/${player.picture}`
    : `pictures/player_placeholder.png`;
  iconImg.onerror = () => (iconImg.src = "pictures/player_placeholder.png");
  avatarContainer.appendChild(iconImg);
  avatarBlock.appendChild(avatarContainer);

  // ─── Info block ───
  const infoBlock = document.createElement("div");
  infoBlock.classList.add("player-info");

  // Athlete shortname (es. "R. Nadal")
  const nameSpan = document.createElement("div");
  nameSpan.classList.add("athlete_shortname");
  nameSpan.textContent = player.athlete_shortname || "";

  // ─── Nuovo: mostriamo il match (home_team_code-away_team_code) ───
  // Prendiamo il codice 3‐letter dal JSON: player.player_team_code
  // Confrontiamo in uppercase per sicurezza (case‐insensitive)
  const playerCode = (player.player_team_code || "").toUpperCase();
  const homeCode   = (player.home_team_code   || "").toUpperCase();
  const awayCode   = (player.away_team_code   || "").toUpperCase();

  // Assegniamo "match_3letter-team-bold" se corrisponde, altrimenti "player-match"
  const homeClass = playerCode === homeCode
    ? "match_3letter-team-bold"
    : "player-match";
  const awayClass = playerCode === awayCode
    ? "match_3letter-team-bold"
    : "player-match";

  // Creiamo il contenitore <div class="player-match">
  const matchContainer = document.createElement("div");
  matchContainer.classList.add("player-match");

  // Span per la squadra di casa
  const homeSpan = document.createElement("span");
  homeSpan.classList.add(homeClass);
  homeSpan.textContent = player.home_team_code || "";

  // Separatore “-” (senza spazi)
  const separator = document.createTextNode("-");

  // Span per la squadra ospite
  const awaySpan = document.createElement("span");
  awaySpan.classList.add(awayClass);
  awaySpan.textContent = player.away_team_code || "";

  matchContainer.append(homeSpan, separator, awaySpan);

  // Infine appendiamo nome + matchContainer
  infoBlock.append(nameSpan, matchContainer);

  // ─── Points & cost block ───
  const pointsCostBlock = document.createElement("div");
  pointsCostBlock.classList.add("points-cost-block");

  const pointsContainer = document.createElement("div");
  pointsContainer.classList.add("points-container");
  updatePointsDisplay(
    player.athlete_unit_points,
    player.is_ended === 1,
    pointsContainer
  );

  const costSpan = document.createElement("div");
  costSpan.classList.add("athlete_cost");
  costSpan.textContent = parseFloat(player.event_unit_cost || 0).toFixed(1);

  pointsCostBlock.append(pointsContainer, costSpan);

  // ─── Assemblaggio finale della riga ───
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
        // 1) Calcolo punti e risultato
        let myPts  = 0,
            oppPts = 0,
            myRes  = 0,
            myTeex = 0;
    
        if (contest.fantasy_teams?.length) {
          contest.fantasy_teams.forEach(t => {
            if (String(t.user_id) === String(currentUserId)) {
              myPts  = parseFloat(t.total_points  || 0);
              myRes  = parseFloat(t.ft_result      || 0);
              myTeex = parseFloat(t.ft_teex_won    || 0);
            } else {
              oppPts = parseFloat(t.total_points    || 0);
            }
          });
        } else {
          // Fallback se non ci sono ancora fantasy_teams
          if (iAmOwner) {
            myPts  = parseFloat(contest.owner_points   || 0);
            myRes  = parseFloat(contest.owner_result   || 0);
            myTeex = parseFloat(contest.owner_teex_won || 0);
            oppPts = parseFloat(contest.opponent_points|| 0);
          } else {
            myPts  = parseFloat(contest.opponent_points   || 0);
            myRes  = parseFloat(contest.opponent_result   || 0);
            myTeex = parseFloat(contest.opponent_teex_won || 0);
            oppPts = parseFloat(contest.owner_points      || 0);
          }
        }
        
        // Determina il risultato in base ai punteggi
        // Questo assicura che myRes rifletta il risultato reale
        if (myPts > oppPts) {
          myRes = 1; // Vittoria
        } else if (myPts < oppPts) {
          myRes = -1; // Sconfitta
        } else {
          myRes = 0; // Pareggio
        }

        // 2) Calcolo myTeex (vincita/perdita) usando total_cost, come in contestCard.js
        const stake = parseFloat(contest.stake || 0);
        
        // Assicuriamoci di ottenere il costo corretto
        let costNumeric = 0;
        if (iAmOwner) {
          // Se sono owner, uso il mio costo (owner_cost)
          costNumeric = parseFloat(contest.owner_fantasy_team?.total_cost || contest.owner_cost || 0);
        } else {
          // Se sono opponent, uso il mio costo (opponent_cost)
          costNumeric = parseFloat(contest.opponent_fantasy_team?.total_cost || contest.opponent_cost || 0);
        }
        
        const mult = parseFloat(contest.multiply || 1);
    
        // Calcolo corretto del valore di vincita/perdita
        if (myRes === 1) {
          // Vittoria
          myTeex = stake - (costNumeric * mult);
        } else if (myRes === -1) {
          // Sconfitta
          myTeex = -(costNumeric * mult);
        } else {
          // Pareggio
          myTeex = (stake / 2) - (costNumeric * mult);
        }
    
        // 3) Splitting dei punti per il markup
        const [mInt, mDec] = myPts.toFixed(1).split('.');
        const [oInt, oDec] = oppPts.toFixed(1).split('.');
    
        // 4) Classe e testo badge Win/Loss/Draw
        const badgeClass5 = myTeex > 0
          ? 'status-badge-win'
          : myTeex < 0
            ? 'status-badge-loss'
            : 'status-badge-draw';
        const badgeText5 = (myTeex > 0 ? '+' : '') + myTeex.toFixed(1);
    
        // 5) Costruisco il blocco "result-bignum"
        const scoreHTML = `
          <div class="result-bignum">
            <div class="result_block left_block">
              <span class="result_bold left">${mInt}</span>
              <span class="win_index_perc left">.${mDec}</span>
            </div>
            <span class="vs-separator"> </span>
            <div class="result_block right_block${Number(oInt) < 10 ? ' onedigit' : ''}">
              <span class="result_bold right">${oInt}</span>
              <span class="win_index_perc right">.${oDec}</span>
            </div>
          </div>
        `;
        
        // 6) Utilizziamo i costi originali my.cost e opp.cost per la visualizzazione
        // ma assicuriamoci che siano valori validi
        const leftCost = my.cost !== "-" ? my.cost : 
                        (iAmOwner && contest.owner_fantasy_team?.total_cost ? 
                         parseFloat(contest.owner_fantasy_team.total_cost).toFixed(1) : 
                         (!iAmOwner && contest.opponent_fantasy_team?.total_cost ? 
                          parseFloat(contest.opponent_fantasy_team.total_cost).toFixed(1) : 
                          "0.0"));
                          
        const rightCost = opp.cost !== "-" ? opp.cost : 
                         (iAmOwner && contest.opponent_fantasy_team?.total_cost ? 
                          parseFloat(contest.opponent_fantasy_team.total_cost).toFixed(1) : 
                          (!iAmOwner && contest.owner_fantasy_team?.total_cost ? 
                           parseFloat(contest.owner_fantasy_team.total_cost).toFixed(1) : 
                           "0.0"));
    
        // 7) Chiamo baseMarkup passando i costi corretti
        container.innerHTML = baseMarkup(
          leftCost,
          rightCost,
          badgeClass5,
          badgeText5,
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
