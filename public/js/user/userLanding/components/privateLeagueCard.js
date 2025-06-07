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


    // 2) Calcolo totalOpponents = totale fantasy_teams meno il mio
    const totalOpponents = (contest.fantasy_teams || []).length - 1;

  
   // 3) Calcolo NCONF = numero di **opponent** confermati (ft_status > 1, escludendo il current user)
   const NCONF = (contest.fantasy_teams || [])
     .filter(ft =>
       ft.ft_status > 1 &&
       String(ft.user_id) !== String(userId)
     )
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

    // 8) Avatar “giallo” a destra: NCONF/totalOpponents
      const rightAvatarHTML = `
        <div class="player-avatar-contest right-avatar league-avatar">
          <span class="MainNumber">${NCONF}</span>
          <span class="SmallNumber">/${totalOpponents}</span>
        </div>
      `;

  // 9) Badge di status:
  //    • Se myTeam.ft_status === 1 → "INVITED"
  //    • Altrimenti → in base a contest.status (1=PENDING/INVITED, 2=stake, 4=LIVE, 5=FINISHED)
  let statusText;
  let statusClass = 'status-badge-base';
  let vsHTML = `<div class="result_bold">VS</div>`;
  
  if (myTeam && myTeam.ft_status < 2) {
    // invitato
    statusText   = 'INVITED';
    statusClass  = 'status-badge-base status-badge-invited';
  } else {
    switch (contest.status) {
      case 1:
        // owner dopo accept, ma non ancora confermato
        statusText  = isOwner ? 'PENDING' : 'INVITED';
        statusClass = `status-badge-base status-badge-${isOwner ? 'pending' : 'invited'}`;
        break;

      case 2:
          // show stake
          statusText  = String(contest.stake ?? '-');
          statusClass = 'status-badge-base status-badge-ready';
          break;
   
          case 4:
            // LIVE ? replace VS con result-bignum
            // calcolo punteggi
            const allPts = (contest.fantasy_teams||[]).map(t => Number(t.total_points||0));
            const myPts4 = Number(myTeam?.total_points||0);
            const oppPts4= Math.max(...allPts.filter(p=>p!==myPts4), 0);
            const [myI4,myD4]= myPts4.toFixed(1).split('.');
            const [opI4,opD4]= oppPts4.toFixed(1).split('.');
            // eseguo override del “VS”
            vsHTML = `
              <div class="result-bignum">
                <div class="result_block left_block">
                  <span class="result_bold left">${myI4}</span>
                  <span class="win_index_perc left">.${myD4}</span>
                </div>
                <span class="vs-separator"> </span>
                <div class="result_block right_block${opI4<10?' onedigit':''}">
                  <span class="result_bold right">${opI4}</span>
                  <span class="win_index_perc right">.${opD4}</span>
                </div>
              </div>
            `;
            statusText  = String(contest.stake ?? '-');
            statusClass = 'status-badge-base status-badge-live';
            break;
            
      case 5:
        const allP5= (contest.fantasy_teams||[]).map(t=>Number(t.total_points||0));
        const myP5 = Number(myTeam?.total_points||0);
        const oppP5= Math.max(...allP5.filter(p=>p!==myP5),0);
        const [mI,mD] = myP5.toFixed(1).split('.');
        const [oI,oD] = oppP5.toFixed(1).split('.');
        vsHTML = `
        <div class="result-bignum">
          <div class="result_block left_block">
            <span class="result_bold left">${mI}</span>
            <span class="win_index_perc left">.${mD}</span>
          </div>
          <span class="vs-separator"> </span>
          <div class="result_block right_block${oI<10?' onedigit':''}">
            <span class="result_bold right">${oI}</span>
            <span class="win_index_perc right">.${oD}</span>
          </div>
        </div>
      `;
      const teex = Number(myTeam?.ft_teex_won||0);
      statusText = (teex > 0 ? '+' : '') + teex.toFixed(1);
      statusClass = teex>0
      ? 'status-badge-base status-badge-win'
      : teex<0
        ? 'status-badge-base status-badge-loss'
        : 'status-badge-base status-badge-draw';
      break;

      default:
      // fallback genera VS normale
      statusText  = contest.status_name || '';
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
        // salvo sempre l’ID del contest
        localStorage.setItem('contestId', contest.contest_id);
    

    
       // 2) se ft_status === 1 → league-recap (mantengo il tuo blocco esistente)
            // 1) se sono invitato (ft_status = 0) → PREPARO recapContestData e vado a league-recap
            if (myTeam && myTeam.ft_status === 0) {
              const recapContestData = {
                contestId:        contest.contest_id,
                contestName:      contest.contest_name,
                contestType:      contest.contest_type,
                status:           contest.status,
                stake:            contest.stake,
                multiply:         contest.multiply,
                eventUnitId:      contest.event_unit_id,
        
                ownerId:          contest.owner_id,
                ownerInfo: {
                  name:    contest.owner_name,
                  avatar:  contest.owner_avatar,
                  color:   contest.owner_color
                },
        
                opponentId:       contest.opponent_id,
                opponentInfo: {
                  name:    contest.opponent_name,
                  avatar:  contest.opponent_avatar,
                  color:   contest.opponent_color
                },
        
                fantasyTeams:     contest.fantasy_teams,
        
                currentUser: {
                  id:      contest.current_user_id,
                  avatar:  contest.current_user_avatar,
                  name:    contest.current_user_name,
                  cost:    parseFloat(contest.current_user_cost || 0).toFixed(1)
                }
              };
              // salvo i dati completi della league
              localStorage.setItem('recapContestData', JSON.stringify(recapContestData));
              window.location.href = '/league-recap.html';
              return;
            }



                // 3) tutti gli altri casi → dettagli contest
          window.location.href = '/league-details.html';
        });
  return card;
}
