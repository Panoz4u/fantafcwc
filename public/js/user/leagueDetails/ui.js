// public/js/user/leagueDetails/ui.js

import { getAvatarSrc } from '../utils/avatar.js';

/**
 * Inizializza la pagina “League Details”:
 *  - Riempe la sezione header-stats (Invited / Rejected / Confirmed)
 *  - Riempe il header giallo (div#leagueHeader)
 *  - Riempe il nome completo del contest (div#contestNameFull)
 *  - Riempe la lista dei fantasy teams (div#teamsContainer) con i relativi accordion
 *
 * @param {Object} data.contest      – { contest_id, contest_name, multiply, status, ... }
 * @param {Array}  data.fantasyTeams – [
 *     {
 *       fantasy_team_id,
 *       user_id,
 *       total_cost,
 *       total_points,
 *       ft_status,
 *       username,
 *       avatar,
 *       entities: [
 *         {
 *           athlete_id,
 *           athlete_shortname,
 *           picture,
 *           home_team_code,
 *           away_team_code,
 *           cost,
 *           athlete_unit_points
 *         },
 *         …
 *       ]
 *     },
 *     …
 *   ]
 */
export function initLeagueDetails({ contest, fantasyTeams }) {
  // ════════════════════════════════════════
  // 0) HEADER-STATS: Invited / Rejected / Confirmed
  // Invited  = numero di ft_status == 1
  // Rejected = numero di ft_status == -1
  // Confirmed = numero di ft_status > 1

  const invitedCount   = fantasyTeams.length;
  const refusedCount   = fantasyTeams.filter(ft => ft.ft_status === -1).length;
  const confirmedCount = fantasyTeams.filter(ft => ft.ft_status > 1).length;

  const countInvitedEl   = document.getElementById('countInvited');
  const countRefusedEl   = document.getElementById('countRefused');
  const countConfirmedEl = document.getElementById('countConfirmed');

  if (countInvitedEl)   countInvitedEl.textContent   = invitedCount;
  if (countRefusedEl)   countRefusedEl.textContent   = refusedCount;
  if (countConfirmedEl) countConfirmedEl.textContent = confirmedCount;

  // ════════════════════════════════════════
  // 1) HEADER GIALLO (div#leagueHeader)
  const headerEl = document.getElementById('leagueHeader');
  headerEl.innerHTML = ''; // svuota prima

  // Calcolo NINVIT e NCONF per il badge giallo
  const NINVIT = fantasyTeams.filter(ft => ft.ft_status > 0).length;
  const NCONF  = fantasyTeams.filter(ft => ft.ft_status > 1).length;

  // Calcolo il maxCost di tutti i team
  const costArray = fantasyTeams.map(ft => parseFloat(ft.total_cost || 0));
  const maxCost   = costArray.length ? Math.max(...costArray) : 0;

  // Prime 3 lettere del nome contest
  const triContest = (contest.contest_name || '').substring(0, 3).toUpperCase();

  // Markup per l’header giallo
  headerEl.innerHTML = `
    <div class="league-header-container">
      <!-- Avatar giallo con NCONF / NINVIT -->
      <div class="player-avatar-contest right-avatar league-avatar">
        <span class="MainNumber">${NCONF}</span>
        <span class="SmallNumber">/${NINVIT}</span>
      </div>
      <!-- Tre lettere contest -->
      <div class="triletter_contest right-name">${triContest}</div>
      <!-- Max cost -->
      <div class="teex_spent right-teex">Max ${maxCost.toFixed(1)}</div>
    </div>
  `;

  // ════════════════════════════════════════
  // 2) NOME COMPLETO DEL CONTEST (div#contestNameFull)
  const nameEl = document.getElementById('contestNameFull');
  if (nameEl) {
    nameEl.textContent = (contest.contest_name || '').toUpperCase();
  }

  // ════════════════════════════════════════
  // 3) LISTA FANTASY TEAMS (div#teamsContainer)
  const teamsContainer = document.getElementById('teamsContainer');
  teamsContainer.innerHTML = ''; // svuota prima

  fantasyTeams.forEach(team => {
    const { fantasy_team_id, username, avatar, total_cost, total_points, ft_status, entities } = team;

    const costStr   = parseFloat(total_cost || 0).toFixed(1);
    const pointsStr = parseFloat(total_points || 0).toFixed(1);
    const [ptsInt, ptsDec] = pointsStr.split('.');

    // Creo l’elemento principale “card” per questo fantasy team
    const teamCard = document.createElement('div');
    teamCard.className = 'fantasy-team-card';
    teamCard.dataset.teamId = fantasy_team_id;

    teamCard.innerHTML = `
      <div class="team-summary">
        <img
          src="${getAvatarSrc(avatar, username)}"
          alt="${username}"
          class="avatar-small">
        <div class="team-info">
          <div class="team-username">${username}</div>
          <div class="team-subinfo">
            <span>POS: -</span>
            <span>Clubby: -</span>
          </div>
        </div>
        <div class="team-cost">${costStr}</div>
        <div class="team-points">
          <span class="points-int">${ptsInt}</span>
          <span class="points-dec">.${ptsDec}</span>
        </div>
        <button class="expand-btn">▼</button>
      </div>
      <div class="entities-list hidden"></div>
    `;

    // Aggiungo la card al container
    teamsContainer.appendChild(teamCard);

    // ─── Popolo le entities (i giocatori scelti) ───
    const entitiesContainer = teamCard.querySelector('.entities-list');
    if (Array.isArray(entities) && entities.length > 0) {
      const htmlEnt = entities.map(ent => {
        const matchCode = `${ent.home_team_code || ''}-${ent.away_team_code || ''}`;
        const picSrc    = ent.picture
                          ? `pictures/${ent.picture}`
                          : 'pictures/player_placeholder.png';
        const costEnt   = parseFloat(ent.cost || 0).toFixed(1);
        const ptsEnt    = parseFloat(ent.athlete_unit_points || 0).toFixed(1);

        return `
          <div class="entity-row">
            <img
              src="${picSrc}"
              class="avatar-small"
              alt="${ent.athlete_shortname}">
            <div class="entity-info">
              <div class="entity-name">${ent.athlete_shortname}</div>
              <div class="entity-match">${matchCode}</div>
            </div>
            <div class="entity-cost">${costEnt}</div>
            <div class="entity-pts">${ptsEnt}</div>
          </div>
        `;
      }).join('');

      entitiesContainer.innerHTML = htmlEnt;
    }

    // ─── Listener per l’accordion “▼ / ▲” ───
    const expandBtn = teamCard.querySelector('.expand-btn');
    expandBtn.addEventListener('click', () => {
      entitiesContainer.classList.toggle('hidden');
      expandBtn.textContent = entitiesContainer.classList.contains('hidden') ? '▼' : '▲';
    });
  });
}
