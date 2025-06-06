// frontend/js/user/userLanding/components/privateLeagueCard.js

import { getAvatarSrc } from '../../utils/avatar.js';

/**
 * Renderizza la card per un contest di tipo 'Private League' (contest_type = 2).
 *
 * Adesso ogni contest di tipo 2 (private league) arriva dal backend con questi campi aggiuntivi:
 *   • current_user_avatar  (URL stringa)
 *   • current_user_name    (stringa)
 *   • current_user_cost    (numero, il total_cost del fantasy_team del current user, 0 se inesistente)
 *   • contest_name         (stringa)
 *
 * Cose da mostrare nella card:
 *   – Avatar a sinistra: sempre current_user_avatar  
 *   – Sotto avatar a sinistra: se current_user_cost > 0, mostra il numero a una cifra decimale; 
 *     altrimenti, "-"
 *   – Sotto l’avatar giallo a destra: le prime 3 lettere di contest_name
 *   – Giallo a destra: cerchio con NCONF/NINVIT  
 *   – Sopra cerchio giallo: le prime 3 lettere di contest_name, con classe "triletter_contest right-name"
 *   – Badge: se myTeam.ft_status === 1 → "INVITED"; altrimenti come da contest.status
 *   – Al click:
 *       • Se stai come "INVITED" (ft_status = 1), apri '/contest-creation.html'
 *       • Altrimenti, apri '/contest-details.html'
 *
 * @param {Object} contest     — Oggetto contest restituito dal backend
 *   {
 *     contest_id,
 *     contest_name,
 *     owner_id,
 *     opponent_id,
 *     status,
 *     stake,
 *     event_unit_id,
 *     multiply,
 *     contest_type: 2,
 *     owner_name,
 *     owner_avatar,
 *     owner_color,
 *     opponent_name,
 *     opponent_avatar,
 *     opponent_color,
 *     fantasy_teams: [
 *       { user_id, total_cost, total_points, ft_teex_won, ft_result, ft_status },
 *       …  
 *     ],
 *     current_user_id,
 *     current_user_avatar,   // ADESSO JSON
 *     current_user_name,     // ADESSO JSON
 *     current_user_cost      // ADESSO JSON
 *   }
 *
 * @param {string|number} userId  — L’ID dell’utente corrente (currentUserId).
 * @returns {HTMLElement}         — La card DOM pronta da appendere.
 */
export function renderPrivateLeagueCard(contest, userId) {
  // 1) Creo il contenitore principale
  const card = document.createElement('div');
  card.className = 'contest-cell clickable';
  card.dataset.contestId = contest.contest_id;

  // 2) Calcolo NINVIT = numero di fantasy_teams con ft_status > 0
  const NINVIT = (contest.fantasy_teams || [])
    .filter(ft => ft.ft_status > 0)
    .length;

  // 3) Calcolo NCONF = numero di fantasy_teams con ft_status > 1
  const NCONF = (contest.fantasy_teams || [])
    .filter(ft => ft.ft_status > 1)
    .length;

  // 4) Calcolo maxCost = massimo total_cost di tutti gli altri (escludendo il currentUser)
  const otherCosts = (contest.fantasy_teams || [])
    .filter(ft => String(ft.user_id) !== String(userId))
    .map(ft => parseFloat(ft.total_cost || 0));
  const maxCost = otherCosts.length ? Math.max(...otherCosts) : 0;

  // 5) Trovo l’oggetto fantasy_team del currentUser (se esiste)
  const myTeam = (contest.fantasy_teams || []).find(ft =>
    String(ft.user_id) === String(userId)
  );

  // 6) Avatar e nome sempre del current user, letti dai campi passati dal backend
  const myAvatar = contest.current_user_avatar;
  const myName   = contest.current_user_name;
  // il colore, per creare un bordo/colorazione differente: 
  // se current_user_id === owner_id uso owner_color, altrimenti opponent_color
  const isOwner  = String(contest.current_user_id) === String(contest.owner_id);
  const myColor  = isOwner
    ? contest.owner_color
    : contest.opponent_color;

  // 7) Avatar a sinistra
  const leftAvatarHTML = `
    <img
      src="${getAvatarSrc(myAvatar, myName, myColor)}"
      alt="${myName}"
      class="player-avatar-contest left-avatar">
  `;

  // 8) Avatar “giallo” a destra: NCONF/NINVIT
  const rightAvatarHTML = `
    <div class="player-avatar-contest right-avatar league-avatar">
      <span class="MainNumber">${NCONF}</span>
      <span class="SmallNumber">/${NINVIT}</span>
    </div>
  `;

  // 9) Badge di status:
  //    • Se myTeam.ft_status === 1 → "INVITED"
  //    • Altrimenti → in base a contest.status (1=PENDING/INVITED, 2=stake, 4=LIVE, 5=FINISHED)
  let statusText;
  let statusClass = 'status-badge-base';

  if (myTeam && myTeam.ft_status === 1) {
    statusText   = 'INVITED';
    statusClass  = 'status-badge-base status-badge-invited';
  } else {
    switch (contest.status) {
      case 1:
        statusText  = isOwner ? 'PENDING' : 'INVITED';
        statusClass = `status-badge-base status-badge-${isOwner ? 'pending' : 'invited'}`;
        break;
      case 2:
        // Qui mostro esattamente lo stake (il valore numerico)
        statusText  = String(contest.stake ?? '-');
        statusClass = 'status-badge-base status-badge-ready';
        break;
      case 4:
        statusText  = 'LIVE';
        statusClass = 'status-badge-base status-badge-live';
        break;
      case 5:
        statusText  = 'FINISHED';
        statusClass = 'status-badge-base status-badge-finished';
        break;
      default:
        statusText  = contest.status_name || 'UNKNOWN';
        statusClass = 'status-badge-base';
        break;
    }
  }

  // 10) Se contest.multiply > 1, preparo la piccola etichetta “Multiply”
  const multiplyHTML = contest.multiply > 1
    ? `<div class="multiply-contest-mini">${Math.floor(contest.multiply)}</div>`
    : '';

  // 11) Testo “Max X.X” sotto l’avatar giallo
  const maxCostText = `Max ${maxCost.toFixed(1)}`;

  // 12) Cost per il “current user” (a sinistra):
  //     se current_user_cost > 0, lo mostro con una cifra decimale; altrimenti, '-'
  const leftCostText = (contest.current_user_cost && contest.current_user_cost > 0)
    ? contest.current_user_cost.toFixed(1)
    : '-';

  // 13) Prendo le prime 3 lettere di contest_name (per la piccola etichetta a destra)
  const rightLabelName = contest.contest_name
    ? contest.contest_name.substring(0,3)
    : '';

  // Composizione finale del markup:
  card.innerHTML = `
    <div class="contest-container cc-list">
      <div class="contest-bar">
        ${leftAvatarHTML}
        <div class="triletter_contest left-name">
          ${myName.substring(0,3)}
        </div>

        <div class="result_bold">VS</div>

        <div class="triletter_contest right-name">
          ${rightLabelName}
        </div>
        ${rightAvatarHTML}

        <div class="teex_spent left-teex">
          ${leftCostText}
        </div>
        <div class="teex_spent right-teex">
          ${maxCostText}
        </div>
      </div>

      <div class="${statusClass}">${statusText}</div>
      ${multiplyHTML}
    </div>
  `;

  // 14) Click handler:
  card.addEventListener('click', () => {
    if (myTeam && myTeam.ft_status === 1) {
      // Sono invitato: vado a contest-creation.html per completare la squadra
      const payload = {
        contestId:    contest.contest_id,
        ownerId:      contest.owner_id,
        opponentId:   contest.opponent_id,
        eventUnitId:  contest.event_unit_id,
        userId,
        fantasyTeams: contest.fantasy_teams,
        multiply:     contest.multiply,
        stake:        contest.stake,
        status:       contest.status
      };
      localStorage.setItem('contestData', JSON.stringify(payload));
      window.location.href = '/contest-creation.html';
      return;
    }
    // Altrimenti, apro contest-details:
    localStorage.setItem('contestId',    contest.contest_id);
    localStorage.setItem('ownerId',      contest.owner_id);
    localStorage.setItem('opponentId',   contest.opponent_id);
    localStorage.setItem('eventUnitId',  contest.event_unit_id);
    localStorage.setItem('userId',       userId);
    window.location.href = '/contest-details.html';
  });

  return card;
}
