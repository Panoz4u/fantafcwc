// frontend/js/user/userLanding/components/privateLeagueCard.js

import { getAvatarSrc } from '../../utils/avatar.js';

/**
 * Renderizza la card per un contest di tipo 'Private League' (contest_type = 2).
 *
 * Per ogni contest_type = 2:
 *   • L’avatar a sinistra è sempre quello dell’utente corrente (owner se currentUserId === owner_id, altrimenti opponent).
 *   • Mostra l’avatar “giallo” a destra con NCONF/NINVIT.
 *   • Sotto l’avatar giallo, il testo “Max X.X” (il massimo total_cost fra gli altri).
 *   • Se ft_status === 1 per il current user, badge “INVITED” e click → '/contest-creation.html';
 *     altrimenti, badge basato su `contest.status` e click → '/contest-details.html'.
 *
 * @param {Object} contest     — Oggetto contest ricevuto dal backend (vedi getUserContests).
 *   shape tipica (campi rilevanti):
 *     {
 *       contest_id,
 *       owner_id,
 *       opponent_id,
 *       status,
 *       stake,
 *       event_unit_id,
 *       multiply,
 *       contest_type: 2,
 *       owner_name,
 *       owner_avatar,
 *       owner_color,
 *       opponent_name,
 *       opponent_avatar,
 *       opponent_color,
 *       fantasy_teams: [
 *         { user_id, total_cost, total_points, ft_teex_won, ft_result, ft_status },
 *         …  
 *       ],
 *       current_user_id  // impostato da getUserContests
 *     }
 *
 * @param {string|number} userId  — L’ID dell’utente corrente (currentUserId).
 * @returns {HTMLElement}         — La card DOM pronta da appendere.
 */
export function renderPrivateLeagueCard(contest, userId) {
  // 1) Creo il container “base”
  const card = document.createElement('div');
  card.className = 'contest-cell clickable';
  card.dataset.contestId = contest.contest_id;

  // 2) Calcolo NINVIT (conteggio dei fantasy_teams con ft_status > 0)
  const NINVIT = (contest.fantasy_teams || [])
    .filter(ft => ft.ft_status > 0)
    .length;

  // 3) Calcolo NCONF (conteggio dei fantasy_teams con ft_status > 1)
  const NCONF = (contest.fantasy_teams || [])
    .filter(ft => ft.ft_status > 1)
    .length;

  // 4) Calcolo maxCost: massimo total_cost tra gli altri utenti
  const otherCosts = (contest.fantasy_teams || [])
    .filter(ft => String(ft.user_id) !== String(userId))
    .map(ft => parseFloat(ft.total_cost || 0));
  const maxCost = otherCosts.length ? Math.max(...otherCosts) : 0;

  // 5) Trovo subito l’oggetto fantasy_team del current user (se esiste)
  const myTeam = (contest.fantasy_teams || []).find(ft =>
    String(ft.user_id) === String(userId)
  );

    // 6) Ora prendo direttamente current_user_avatar e current_user_name che 
    //    il backend ha inserito in ogni contest:
    const myAvatar = contest.current_user_avatar;
    const myName   = contest.current_user_name;
    // Per il colore, possiamo ancora differenziare se sono owner o invitato:
    //  se current_user_id === contest.owner_id → owner_color, altrimenti opponent_color
    const isOwner = String(contest.current_user_id) === String(contest.owner_id);
    const myColor = isOwner
      ? contest.owner_color
      : contest.opponent_color;

  // 7) Creo l’HTML dell’avatar a sinistra (sempre current user):
  const leftAvatarHTML = `
    <img
      src="${getAvatarSrc(myAvatar, myName, myColor)}"
      alt="${myName}"
      class="player-avatar-contest left-avatar">
  `;

  // 8) Creo l’avatar giallo a destra con NCONF/NINVIT:
  const rightAvatarHTML = `
    <div class="player-avatar-contest right-avatar league-avatar">
      <span class="MainNumber">${NCONF}</span>
      <span class="SmallNumber">/${NINVIT}</span>
    </div>
  `;

  // 9) Determino il badge di status:
  //    – Se myTeam.ft_status === 1 → “INVITED”
  //    – Altrimenti, badge in base a contest.status (1=PENDING/INVITED, 2=READY, 4=LIVE, 5=FINISHED)
  let statusText;
  let statusClass = 'status-badge-base';

  if (myTeam && myTeam.ft_status === 1) {
    statusText = 'INVITED';
    statusClass = 'status-badge-base status-badge-invited';
  } else {
    switch (contest.status) {
      case 1:
        statusText = isOwner ? 'PENDING' : 'INVITED';
        statusClass = `status-badge-base status-badge-${isOwner ? 'pending' : 'invited'}`;
        break;
      case 2:
        // Nel caso “READY” mostriamo lo stake (come “valore numerico”)
        statusText = String(contest.stake ?? '-');
        statusClass = 'status-badge-base status-badge-ready';
        break;
      case 4:
        statusText = 'LIVE';
        statusClass = 'status-badge-base status-badge-live';
        break;
      case 5:
        statusText = 'FINISHED';
        statusClass = 'status-badge-base status-badge-finished';
        break;
      default:
        statusText = contest.status_name || 'UNKNOWN';
        statusClass = 'status-badge-base';
        break;
    }
  }

  // 10) Se contest.multiply > 1, preparo il “tag Multiply”:
  const multiplyHTML = contest.multiply > 1
    ? `<div class="multiply-contest-mini">${Math.floor(contest.multiply)}</div>`
    : '';

  // 11) Testo “Max X.X” che compare sotto l’avatar giallo:
  const maxCostText = `Max ${maxCost.toFixed(1)}`;

  // 12) Composizione finale del markup interno:
  card.innerHTML = `
    <div class="contest-container cc-list">
      <div class="contest-bar">
        ${leftAvatarHTML}
        <div class="triletter_contest left-name">${myName.substring(0,3)}</div>

        <div class="result_bold">VS</div>

        <div class="triletter_contest right-name"></div>
        ${rightAvatarHTML}

        <div class="teex_spent left-teex">${
          (myTeam && myTeam.ft_status > 1)
            ? parseFloat(myTeam.total_cost).toFixed(1)
            : '-'
        }</div>
        <div class="teex_spent right-teex">${maxCostText}</div>
      </div>

      <div class="${statusClass}">${statusText}</div>
      ${multiplyHTML}
    </div>
  `;

  // 13) Gestione click:
  //     – Se sei “INVITED” (myTeam.ft_status === 1) → contest-creation.html
  //     – Altrimenti → contest-details.html
  card.addEventListener('click', () => {
    if (myTeam && myTeam.ft_status === 1) {
      // Passo i dati per creare/completare la squadra in contest-creation.html
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
    // Altrimenti apro contest-details
    localStorage.setItem('contestId',    contest.contest_id);
    localStorage.setItem('ownerId',      contest.owner_id);
    localStorage.setItem('opponentId',   contest.opponent_id);
    localStorage.setItem('eventUnitId',  contest.event_unit_id);
    localStorage.setItem('userId',       userId);
    window.location.href = '/contest-details.html';
  });

  return card;
}
