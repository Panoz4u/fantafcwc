// public/js/user/leagueDetails/ui.js

import { getAvatarSrc } from '../utils/avatar.js';
// 2) Importiamo ora le due funzioni dal nuovo helpers.js
import {
  createLeaguePlayerRow,
  updateLeaguePointsDisplay
} from './helpers.js';
/**
 * Renderizza l’header per una Private League (contest_type = 2),
 * considerando il solo caso contest.status === 1 per ora.
 *
 * @param {Object} contest       – { contest_id, contest_name, multiply, status, … }
 * @param {Array}  fantasyTeams   – [
 *     { fantasy_team_id, user_id, total_cost, total_points, ft_status, username, avatar, … },
 *     …  
 *   ]
 * @param {string|number} currentUserId – ID dell’utente corrente
 */
export function renderLeagueHeader(contest, fantasyTeams, currentUserId) {
  const container = document.getElementById('leagueHeader');
  if (!container) return;
  container.innerHTML = ''; 

  // ─── 1) Trova il fantasy team del currentUser ───
  const myTeam = fantasyTeams.find(ft => String(ft.user_id) === String(currentUserId));

  // ─── 2) Dati “my” (avatar, nome, costo) ───
  const myAvatar = myTeam?.avatar || '';
  const myName   = myTeam?.username || '';
  const myCost   = (myTeam && parseFloat(myTeam.total_cost) > 0)
    ? parseFloat(myTeam.total_cost).toFixed(1)
    : '-';

      // ─── 3) Conta tutti gli altri team (meno il mio) e quelli confermati (ft_status > 1) ───
      //    Escludiamo sempre il currentUserId
      const otherTeams = fantasyTeams.filter(
        ft => String(ft.user_id) !== String(currentUserId)
      );
      const NINVIT = otherTeams.length;
      const NCONF  = otherTeams.filter(ft => ft.ft_status > 1).length;

  // ─── 4) Calcola Max cost degli altri team ───
  const otherCosts = fantasyTeams
    .filter(ft => String(ft.user_id) !== String(currentUserId))
    .map(ft => parseFloat(ft.total_cost || 0));
  const maxCost = otherCosts.length ? Math.max(...otherCosts) : 0;

  // ─── 5) Tri‐letter contest ───
  const triContest = (contest.contest_name || '').substring(0, 3).toUpperCase();

  // ─── 6) Imposta badge status (caso status === 1) ───
  let statusText  = '';
  let statusClass = 'status-badge-base';

   // ─── 6.1) Preparo vsHTML di default ───
    let vsHTML = `<div class="result_bold">VS</div>`;
  
    // ─── 6.2) Calcolo result_bignum se LIVE (4) o FINISHED (5) ───
    if (contest.status === 4 || contest.status === 5) {
      // trovo il mio team
      const myTeam = fantasyTeams.find(ft => String(ft.user_id) === String(currentUserId));
      const myPts = Number(myTeam?.total_points || 0);
      // calcolo il punti max degli altri
      const otherPts = fantasyTeams
      .filter(ft => String(ft.user_id) !== String(currentUserId))
      .map(ft => Number(ft.total_points || 0));
     const oppPts = otherPts.length ? Math.max(...otherPts) : 0;
      // splitto interi e decimali
      const [iMy, dMy] = myPts.toFixed(1).split('.');
      const [iOp, dOp] = oppPts.toFixed(1).split('.');
      vsHTML = `
        <div class="result-bignum">
          <div class="result_block left_block">
            <span class="result_bold left">${iMy}</span>
            <span class="win_index_perc left">.${dMy}</span>
          </div>
          <span class="vs-separator"></span>
          <div class="result_block right_block${iOp<10?' onedigit':''}">
            <span class="result_bold right">${iOp}</span>
            <span class="win_index_perc right">.${dOp}</span>
          </div>
        </div>
      `;
    }
   


    if (myTeam && myTeam.ft_status === 1) {
        // invitato
        statusText  = 'INVITED';
        statusClass = 'status-badge-base status-badge-invited';
          } else if (contest.status >= 2) {
              // se status>=2 mostro lo stake (o Won se finished)
              if (contest.status === 5 && contest.myFtTeexWon != null) {
                statusText  = `WON ${parseFloat(contest.myFtTeexWon).toFixed(1)}`;
                statusClass = 'status-badge-base status-badge-finished';
              } else {
                statusText  = String(contest.stake ?? '-');
                statusClass = contest.status === 2
                            ? 'status-badge-base status-badge-ready'
                            : contest.status === 4
                              ? 'status-badge-base status-badge-live'
                              : 'status-badge-base';
              }
      } else {
        // fallback prima del confirm (still pending)
        statusText  = 'PENDING';
        statusClass = 'status-badge-base status-badge-pending';
      }

  // ─── 7) Piccola etichetta Multiply (se > 1) ───
  const multiplyHTML = contest.multiply > 1
    ? `<div class="multiply-contest-mini">${Math.floor(contest.multiply)}</div>`
    : '';

  // ─── 8) Assemblaggio markup completo per l’header giallo ───
  container.innerHTML = `
    <div class="contest-container cc-header">
      <div class="contest-bar">
        <!-- Avatar SINISTRA (current user) -->
        <img
          src="${getAvatarSrc(myAvatar, myName)}"
          alt="${myName}"
          class="player-avatar-contest left-avatar">
        <div class="triletter_contest left-name">
          ${String(myName).substring(0,3).toUpperCase()}
        </div>

        <!-- VS o result-bignum -->
        ${vsHTML}

        <!-- Tri‐letter contest a destra -->
        <div class="triletter_contest right-name">
          ${triContest}
        </div>

        <!-- Avatar GIALLO a destra (NCONF / NINVIT) -->
        <div class="player-avatar-contest right-avatar league-avatar">
          <span class="MainNumber">${NCONF}</span>
          <span class="SmallNumber">/${NINVIT}</span>
        </div>

        <!-- Sotto avatar SINISTRA: costo del mio team -->
        <div class="teex_spent left-teex">${myCost}</div>

        <!-- Sotto avatar DESTRA: “Max X.X” -->
        <div class="teex_spent right-teex">
          Max ${maxCost.toFixed(1)}
        </div>
      </div>

      <!-- Badge di status (“INVITED” o “PENDING”) -->
      <div class="${statusClass}">${statusText}</div>

      <!-- Etichetta Multiply se presente -->
      ${multiplyHTML}


  `;
}


/**
 * Inizializza la pagina “League Details”:
 * 1) Header‐stats (Invited / Rejected / Confirmed)
 * 2) Header giallo completo (renderLeagueHeader)
 * 3) Nome completo del contest (contestNameFull)
 * 4) Lista fantasy teams, con:
 *    ‣ .opponent-item (stile selectCompetitors) per ogni team
 *    ‣ punti / costo / arrow‐down con classi come in contest-details
 *    ‣ se ft_status > 1 → mostra punti/costo e freccia (accordion)
 *    ‣ se ft_status === 1 → mostra “INVITED” in giallo sotto il nome
 *    ‣ se ft_status === –1 → mostra “REJECTED” in rosso sotto il nome
 *
 * @param {Object} params.contest      – { contest_id, contest_name, multiply, status, … }
 * @param {Array}  params.fantasyTeams – [
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
 * @param {string|number} currentUserId – ID dell’utente corrente
 */
/**
 * Inizializza la pagina “League Details”:
 * 1) Header-stats
 * 2) Header giallo (renderLeagueHeader)
 * 3) Nome completo del contest (contestNameFull)
 * 4) Lista fantasy teams con .opponent-item + points-cost-block + arrow-down
 *    e, per status >1, l’accordion con createLeaguePlayerRow()
 */
export function initLeagueDetails({ contest, fantasyTeams }, currentUserId) {
  // ──────────── 1) HEADER‐STATS ────────────
  const invitedCount   = fantasyTeams.length;
  const refusedCount   = fantasyTeams.filter(ft => ft.ft_status === -1).length;
  const confirmedCount = fantasyTeams.filter(ft => ft.ft_status > 1).length;

  const countInvitedEl   = document.getElementById('countInvited');
  const countRefusedEl   = document.getElementById('countRefused');
  const countConfirmedEl = document.getElementById('countConfirmed');

  if (countInvitedEl)   countInvitedEl.textContent   = invitedCount;
  if (countRefusedEl)   countRefusedEl.textContent   = refusedCount;
  if (countConfirmedEl) countConfirmedEl.textContent = confirmedCount;



  // ──────────── 2) HEADER GIALLO ────────────
  renderLeagueHeader(contest, fantasyTeams, currentUserId);

  // ──────────── 3) NOME COMPLETO DEL CONTEST ────────────
  const nameEl = document.getElementById('contestNameFull');
  if (nameEl) {
    nameEl.textContent = (contest.contest_name || '').toUpperCase();
  }

    // ─── 3.1) Calcolo posizione classifica con parimerito (solo ft_status ≥ 2) ───
    const confirmed = fantasyTeams.filter(ft => ft.ft_status >= 2);
    confirmed.sort((a, b) => Number(b.total_points || 0) - Number(a.total_points || 0));
    const rankMap = {};
    let lastPts = null, lastRank = 0;
    confirmed.forEach((ft, idx) => {
      const pts = Number(ft.total_points || 0);
      if (pts === lastPts) {
        // stesso punteggio → stesso rank
        rankMap[String(ft.user_id)] = lastRank;
      } else {
        lastRank = idx + 1;
        rankMap[String(ft.user_id)] = lastRank;
        lastPts = pts;
      }
    });
  
    
      // ─── 3.3) Calcolo Teex vinti on-the-fly per posizioni 1–3 ───
      const percentages = [0.6, 0.3, 0.1];
      const stake = parseFloat(contest.stake) || 0;
      const ppcMap = {};
      // per ogni rank 1–3
      [1,2,3].forEach(r => {
        // raccogli tutti gli user_id con rank = r
        const usersAtR = Object.entries(rankMap)
          .filter(([uid, rank]) => rank === r)
          .map(([uid]) => uid);
        if (usersAtR.length === 0) return;
        // somma le percentuali per i posti r, r+1, ..., r+count-1
        const totalPct = usersAtR.reduce((sum, _, idx) => {
          return sum + (percentages[r - 1 + idx] || 0);
        }, 0);
        // teex per ciascuno
        const eachTeex = (stake * totalPct) / usersAtR.length;
        usersAtR.forEach(uid => {
          ppcMap[uid] = eachTeex;
        });
      });


    // ─── 3.2) Riordino fantasyTeams per posizione (i non confermati restano in fondo) ───
    fantasyTeams.sort((a, b) => {
      const ra = rankMap[String(a.user_id)] || Infinity;
      const rb = rankMap[String(b.user_id)] || Infinity;
      return ra - rb;
    });

  // ──────────── 4) LISTA FANTASY TEAMS ────────────
  const teamsContainer = document.getElementById('teamsContainer');
  teamsContainer.innerHTML = '';


  fantasyTeams.forEach(team => {
    const {
      user_id,
      username,
      avatar,
      total_cost,
      total_points,
      ft_status,
      entities
    } = team;



  // ─── 4.1) Creiamo .opponent-item ───
  const item = document.createElement('div');
  item.className = 'opponent-item';
  item.setAttribute('data-id', user_id);
  if (String(user_id) === String(currentUserId)) {
    item.classList.add('selected');
  }

  // Costruiamo il markup “opponent-info” SENZA la league-rank di default
  let innerHTML = `
    <div class="opponent-info">
      <img
        src="${
          avatar && avatar.startsWith('http')
            ? decodeURIComponent(avatar)
            : '/avatars/' + (avatar || 'default.png')
        }"
        alt="${username}"
        class="opponent-avatar"
      />
      <div class="opponent-data">
        <h3 class="opponent-name">${username}</h3>
  `;
      // ─── Se ft_status ≥ 2, aggiungiamo la league-rank con posizione e, per pos≤3, i Teex ───
      if (ft_status >= 2) {
        const pos = rankMap[String(user_id)] || '-';
        if (pos <= 3) {
          const teexWon = ppcMap[String(user_id)] || 0;
          innerHTML += `
            <div class="league-rank">
              <p class="pos">Pos: ${pos}</p>
              <img src="icons/sh.png" class="ppc-icon" alt="PPC">
              Clubby:&nbsp;<span class="ppc-value">${teexWon.toFixed(1)}</span>
            </div>
          `;
        } else {
          innerHTML += `
            <div class="league-rank">
              <p class="pos">Pos: ${pos}</p>
            </div>
          `;
        }
      }

  // ─── Chiudiamo i div di opponent-data e opponent-info ───
  innerHTML += `
      </div>
    </div>
  `;

  item.innerHTML = innerHTML;
  teamsContainer.appendChild(item);

    if (ft_status > 1) {
      // ─── Se “Confirmed” ───
      const ptsStr  = parseFloat(total_points || 0).toFixed(1);
      const [ptsInt, ptsDec] = ptsStr.split('.');
      const costStr = parseFloat(total_cost || 0).toFixed(1);

      const pointsCostHTML = `
        <div class="points-cost-block">
          <div class="points-container">
            <span class="athlete_points_integer">${ptsInt}</span>
            <span class="athlete_points_decimal">.${ptsDec}</span>
          </div>
          <div class="athlete_cost">${costStr}</div>
        </div>
      `;

      const arrowHTML = `
        <img src="/icons/arrow-down.png" class="ppc-icon accordion-icon" alt="Apri elenco">
      `;

      innerHTML += pointsCostHTML + arrowHTML;

    } else if (ft_status === 1) {
      // ─── Se “Invited” ───
      innerHTML += `
        <div class="league-status inv" >
          INVITED
        </div>
      `;
    } else if (ft_status === -1) {
      // ─── Se “Rejected” ───
      innerHTML += `
        <div class="league-status rej" >
          REJECTED
        </div>
      `;
    }

    item.innerHTML = innerHTML;
    teamsContainer.appendChild(item);

    // ─── 4.2) Se “Confirmed”, creiamo l’accordion con i giocatori ───
    if (ft_status > 1) {
      const teamWrapper = document.createElement('div');
      teamWrapper.className = 'team-container-league';

      const innerList = document.createElement('div');
      innerList.className = 'team-list league';
      innerList.id = `teamList-${user_id}`;
      innerList.classList.add('hidden');

      if (Array.isArray(entities) && entities.length > 0) {
        entities.forEach(playerObj => {
          // Ora chiamiamo createLeaguePlayerRow (importato da helpers.js)
          innerList.appendChild(createLeaguePlayerRow(playerObj, 'left'));
        });
      }

      teamWrapper.appendChild(innerList);
      teamsContainer.appendChild(teamWrapper);

      // ─── 4.3) Toggle “click” su item ───
      item.addEventListener('click', () => {
        innerList.classList.toggle('hidden');
        const arrowEl = item.querySelector('.accordion-icon');
        if (arrowEl) {
          arrowEl.classList.toggle('rotated');
        }
      });
    }
  });
}