import { getAvatarSrc }        from '../../utils/avatar.js';
import { isCurrentUserOwner }  from '../../utils/user.js';
import { renderPrivateLeagueCard } from './privateLeagueCard.js';

export function createContestCard(contest, userId) {
 // Skip status=0
 if (contest.status === 0) return null;
  
 // Utilizziamo current_user_id dall'array active se presente
 // altrimenti usiamo l'userId passato come parametro o getCurrentUserId()
 let currentUserId;
 
 if (contest.current_user_id) {
   currentUserId = contest.current_user_id;
 } else if (userId) {
   currentUserId = userId;
 } else {
   currentUserId = getCurrentUserId();
 }
 

 // Determino se current user è owner usando la funzione importata o comparando direttamente
 const isCurrentOwner = isCurrentUserOwner(contest, currentUserId);

  // ──────────────── GESTIONE PRIVATE LEAGUE ────────────────
  if (contest.contest_type === 2) {
    return renderPrivateLeagueCard(contest, currentUserId);
  }
  // ────────────────────────────────────────────────────────

 // Definisco dati per sinistra (my) e destra (opp)
 const my = {
   name:   isCurrentOwner ? contest.owner_name    : contest.opponent_name,
   avatar: isCurrentOwner ? contest.owner_avatar  : contest.opponent_avatar,
   color:  isCurrentOwner ? contest.owner_color   : contest.opponent_color,
    cost:   parseFloat(
               isCurrentOwner 
                  ? (contest.owner_cost    || 0) 
                  : (contest.opponent_cost || 0)
              ).toFixed(1)
   };
 const opp = {
   name:   isCurrentOwner ? contest.opponent_name : contest.owner_name,
   avatar: isCurrentOwner ? contest.opponent_avatar : contest.owner_avatar,
   color:  isCurrentOwner ? contest.opponent_color : contest.owner_color,
    cost:   parseFloat(
                isCurrentOwner 
                  ? (contest.opponent_cost || 0) 
                  : (contest.owner_cost    || 0)
              ).toFixed(1)
    
  };



 const card = document.createElement('div');
 card.className = 'contest-cell clickable';
 card.dataset.contestId = contest.contest_id;

 // Quando clicco sulla card, salvo i parametri e vado al dettaglio
 card.addEventListener('click', () => {
 localStorage.setItem('contestId',    contest.contest_id);
 localStorage.setItem('ownerId',      contest.owner_user_id);
 localStorage.setItem('opponentId',   contest.opponent_user_id);
 localStorage.setItem('eventUnitId',  contest.event_unit_id);
 // (opzionale) se ti serve il currentUserId in contest-details, salvalo anche:
 // localStorage.setItem('userId', currentUserId);
 window.location.href = '/contest-details.html';
});

 // Switch sui vari status, usando ALWAYS my (left) e opp (right)
 switch (contest.status) {
   case 1:

     // Determino i costi corretti per il caso 1
     let myCost = "-";
     let oppCost = "-";
     
     // Se ci sono fantasy_teams, cerco il costo
     if (contest.fantasy_teams && contest.fantasy_teams.length > 0) {
       // Trovo il team dell'utente corrente (se esiste)
       const myTeam = contest.fantasy_teams.find(team => 
         String(team.user_id) === String(currentUserId));
         
       if (myTeam) {
         myCost = parseFloat(myTeam.total_cost || 0).toFixed(1);
       }
     }
     
     // Utilizzo owner_fantasy_team se esiste e l'utente corrente non è owner
     if (!isCurrentOwner && contest.owner_fantasy_team) {
       oppCost = parseFloat(contest.owner_fantasy_team.total_cost || 0).toFixed(1);
     }

     card.innerHTML = `
       <div class="contest-container cc-list">
         <div class="contest-bar">
           <!-- my sempre sinistra -->
           <img src="${getAvatarSrc(my.avatar)}" alt="${my.name}" class="player-avatar-contest left-avatar">
           <div class="triletter_contest left-name">${my.name.substring(0,3)}</div>

           <div class="result_bold">VS</div>

           <!-- opp sempre destra -->
           <div class="triletter_contest right-name">${opp.name.substring(0,3)}</div>
           <img src="${getAvatarSrc(opp.avatar)}" alt="${opp.name}" class="player-avatar-contest right-avatar">

           <div class="teex_spent left-teex">${myCost}</div>
           <div class="teex_spent right-teex">${oppCost}</div>
         </div>
     <div class="status-badge-base status-badge-${isCurrentOwner ? 'pending' : 'invited'}">
           ${isCurrentOwner ? 'PENDING' : 'INVITED'}
         </div>
         ${contest.multiply > 1 
           ? `<div class="multiply-contest-mini">${Math.floor(contest.multiply)}</div>` 
           : ''}
       </div>
     `;
     break;

     case 2:
      // Determino i costi corretti per il caso 2
      let myCost2 = "-";
      let oppCost2 = "-";
      
      // Se sono l'owner, uso owner_fantasy_team, altrimenti opponent_fantasy_team
      if (isCurrentOwner && contest.owner_fantasy_team) {
        myCost2 = parseFloat(contest.owner_fantasy_team.total_cost || 0).toFixed(1);
      } else if (!isCurrentOwner && contest.opponent_fantasy_team) {
        myCost2 = parseFloat(contest.opponent_fantasy_team.total_cost || 0).toFixed(1);
      }
      
      // Per lo sfidante, faccio l'opposto
      if (isCurrentOwner && contest.opponent_fantasy_team) {
        oppCost2 = parseFloat(contest.opponent_fantasy_team.total_cost || 0).toFixed(1);
      } else if (!isCurrentOwner && contest.owner_fantasy_team) {
        oppCost2 = parseFloat(contest.owner_fantasy_team.total_cost || 0).toFixed(1);
      }
    
      // → Qui sostituisci "READY" con il valore di contest.stake
      card.innerHTML = `
        <div class="contest-container cc-list">
          <div class="contest-bar">
            <img src="${getAvatarSrc(my.avatar)}" alt="${my.name}" class="player-avatar-contest left-avatar">
            <div class="triletter_contest left-name">${my.name.substring(0,3)}</div>
    
            <div class="result_bold">VS</div>
    
            <div class="triletter_contest right-name">${opp.name.substring(0,3)}</div>
            <img src="${getAvatarSrc(opp.avatar)}" alt="${opp.name}" class="player-avatar-contest right-avatar">
    
            <div class="teex_spent left-teex">${myCost2}</div>
            <div class="teex_spent right-teex">${oppCost2}</div>
          </div>
    
          <!-- Invece di “READY”, mostro lo stake -->
          <div class="status-badge-base status-badge-ready">
            ${ typeof contest.stake !== "undefined" ? contest.stake : "-" }
          </div>
    
          ${contest.multiply > 1 
            ? `<div class="multiply-contest-mini">${Math.floor(contest.multiply)}</div>` 
            : ''}
    
        </div>
      `;
      break;

      case 4:
        // Svuoto il contenitore e poi vado a cercare i punti “live”
        card.innerHTML = '';
        fetch(`/fantasy/contest-points?contest_id=${contest.contest_id}`)
          .then(r => {
            if (!r.ok) {
              // Se ricevo 404, 500, ecc. => vado sul catch
              throw new Error(`Impossibile caricare i punti (HTTP ${r.status})`);
            }
            return r.json();
          })
          .then(data => {
            // Estraggo i punti in base a chi è “my” (sinistra) e “opp” (destra)
            const myPts  = isCurrentOwner ? data.owner_points   : data.opponent_points;
            const oppPts = isCurrentOwner ? data.opponent_points : data.owner_points;
            const [myI, myD] = parseFloat(myPts || 0).toFixed(1).split('.');
            const [opI, opD] = parseFloat(oppPts || 0).toFixed(1).split('.');
      
            // Calcolo di myCost / oppCost come al solito (fallback a “0.0” se assente)
            let myCost = '-';
            let oppCost = '-';
            if (isCurrentOwner && contest.owner_fantasy_team) {
              myCost = parseFloat(contest.owner_fantasy_team.total_cost || 0).toFixed(1);
            } else if (!isCurrentOwner && contest.opponent_fantasy_team) {
              myCost = parseFloat(contest.opponent_fantasy_team.total_cost || 0).toFixed(1);
            }
            if (isCurrentOwner && contest.opponent_fantasy_team) {
              oppCost = parseFloat(contest.opponent_fantasy_team.total_cost || 0).toFixed(1);
            } else if (!isCurrentOwner && contest.owner_fantasy_team) {
              oppCost = parseFloat(contest.owner_fantasy_team.total_cost || 0).toFixed(1);
            }
      
            // Qui costruisco l’HTML finale con il blocco “result-bignum”
            card.innerHTML = `
              <div class="contest-container cc-list">
                <div class="contest-bar">
                  <!-- Avatar e nome a sinistra -->
                  <img src="${getAvatarSrc(my.avatar)}"
                       alt="${my.name}"
                       class="player-avatar-contest left-avatar">
                  <div class="triletter_contest left-name">${my.name.substring(0,3)}</div>
      
                  <!-- Blocco risultato con due “result_block” -->
                  <div class="result-bignum">
                    <div class="result_block left_block">
                      <span class="result_bold left">${myI}</span>
                      <span class="win_index_perc left">.${myD}</span>
                    </div>
                    <span class="vs-separator"> </span>
                    <div class="result_block right_block${Number(opI) < 10 ? ' onedigit' : ''}">
                      <span class="result_bold right">${opI}</span>
                      <span class="win_index_perc right">.${opD}</span>
                    </div>
                  </div>
      
                  <!-- Avatar e nome a destra -->
                  <div class="triletter_contest right-name">${opp.name.substring(0,3)}</div>
                  <img src="${getAvatarSrc(opp.avatar)}"
                       alt="${opp.name}"
                       class="player-avatar-contest right-avatar">
      
                  <!-- Costi del fantasy team -->
                  <div class="teex_spent left-teex">${myCost}</div>
                  <div class="teex_spent right-teex">${oppCost}</div>
                </div>
      
                <!-- Badge “LIVE” (uso contest.stake come dentro case 4) -->
                <div class="status-badge-base status-badge-live">
                  ${contest.stake || ''}
                </div>
      
                ${contest.multiply > 1 
                  ? `<div class="multiply-contest-mini">${Math.floor(contest.multiply)}</div>` 
                  : ''}
              </div>
            `;
          })
          .catch(err => {
            console.error(`Errore punti contest ${contest.contest_id}:`, err);
            // Se fallisce il fetch, uso contest.status_display → es. “12.5-8.0”
            const display = contest.status_display || '0-0';
            const [m, o] = display
              .split('-')
              .map(n => parseFloat(n).toFixed(1).split('.'));
            const mInt = m[0], mDec = m[1] || '0';
            const oInt = o[0], oDec = o[1] || '0';
      
            // Ricalcolo myCost / oppCost in fallback
            let myCost = '-';
            let oppCost = '-';
            if (isCurrentOwner && contest.owner_fantasy_team) {
              myCost = parseFloat(contest.owner_fantasy_team.total_cost || 0).toFixed(1);
            } else if (!isCurrentOwner && contest.opponent_fantasy_team) {
              myCost = parseFloat(contest.opponent_fantasy_team.total_cost || 0).toFixed(1);
            }
            if (isCurrentOwner && contest.opponent_fantasy_team) {
              oppCost = parseFloat(contest.opponent_fantasy_team.total_cost || 0).toFixed(1);
            } else if (!isCurrentOwner && contest.owner_fantasy_team) {
              oppCost = parseFloat(contest.owner_fantasy_team.total_cost || 0).toFixed(1);
            }
      
            // Markup fallback (utilizzando gli stessi blocchi con onedigit)
            card.innerHTML = `
              <div class="contest-container cc-list">
                <div class="contest-bar">
                  <img src="${getAvatarSrc(my.avatar)}"
                       alt="${my.name}"
                       class="player-avatar-contest left-avatar">
                  <div class="triletter_contest left-name">${my.name.substring(0,3)}</div>
      
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
      
                  <div class="triletter_contest right-name">${opp.name.substring(0,3)}</div>
                  <img src="${getAvatarSrc(opp.avatar)}"
                       alt="${opp.name}"
                       class="player-avatar-contest right-avatar">
                  <div class="teex_spent left-teex">${myCost}</div>
                  <div class="teex_spent right-teex">${oppCost}</div>
                </div>
      
                <div class="status-badge-base status-badge-live">
                  ${contest.stake || ''}
                </div>
      
                ${contest.multiply > 1 
                  ? `<div class="multiply-contest-mini">${Math.floor(contest.multiply)}</div>` 
                  : ''}
              </div>
            `;
          });
        break;
      
        case 5:
          // 1) Calcolo punti e risultato (come già facevi)
          let myPts = 0,
              oppPts = 0,
              myRes = 0,
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
            // fallback se non ci sono ancora fantasy_teams
            if (isCurrentOwner) {
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
    
          // 2) Calcolo finale dei teex vinti o persi in base a myRes
          const stake = parseFloat(contest.stake   || 0);
          // *** qui recupero i costi dai fantasy_teams, non da contest.owner_cost ***
          let myCost5 = '-', oppCost5 = '-';
    
          if (isCurrentOwner && contest.owner_fantasy_team) {
            myCost5 = parseFloat(contest.owner_fantasy_team.total_cost || 0).toFixed(1);
          } else if (!isCurrentOwner && contest.opponent_fantasy_team) {
            myCost5 = parseFloat(contest.opponent_fantasy_team.total_cost || 0).toFixed(1);
          }
          if (isCurrentOwner && contest.opponent_fantasy_team) {
            oppCost5 = parseFloat(contest.opponent_fantasy_team.total_cost || 0).toFixed(1);
          } else if (!isCurrentOwner && contest.owner_fantasy_team) {
            oppCost5 = parseFloat(contest.owner_fantasy_team.total_cost || 0).toFixed(1);
          }
    
          // Adesso calcolo myTeex definitivo
          // Nota: "cost" qui deve corrispondere al costo che ho preso sopra per myCost5/oppCost5,
          //       quindi lo ricalcolo ancora in forma numerica (non stringa) per i calcoli.
          const costNumeric = parseFloat(
            isCurrentOwner
              ? (contest.owner_fantasy_team?.total_cost || 0)
              : (contest.opponent_fantasy_team?.total_cost || 0)
          );
          const mult  = parseFloat(contest.multiply || 1);
          if      (myRes === 1)   myTeex = stake - (costNumeric * mult);
          else if (myRes === -1)  myTeex = -(costNumeric * mult);
          else                    myTeex = (stake / 2) - (costNumeric * mult);
    
          // 3) Splitting dei punti per il markup
          const [mInt, mDec] = myPts.toFixed(1).split('.');
          const [oInt, oDec] = oppPts.toFixed(1).split('.');
    
          // 4) Scelgo classe e testo badge finale (Win/Loss/Draw)
          const badgeClass5 = myTeex > 0 
            ? 'status-badge-win'
            : myTeex < 0 
              ? 'status-badge-loss'
              : 'status-badge-draw';
          const badgeText5  = (myTeex > 0 ? '+' : '') + myTeex.toFixed(1);
    
          // 5) Costi (usiamo myCost5 e oppCost5 che abbiamo già calcolato)
          // E infine il markup vero e proprio:
    
          card.innerHTML = `
            <div class="contest-container cc-list">
              <div class="contest-bar">
                <!-- Avatar e nome sinistra -->
                <img src="${getAvatarSrc(my.avatar)}"
                     alt="${my.name}"
                     class="player-avatar-contest left-avatar">
                <div class="triletter_contest left-name">
                  ${my.name.substring(0,3)}
                </div>
    
                <!-- Blocco risultato -->
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
    
                <!-- Avatar e nome destra -->
                <div class="triletter_contest right-name">
                  ${opp.name.substring(0,3)}
                </div>
                <img src="${getAvatarSrc(opp.avatar)}"
                     alt="${opp.name}"
                     class="player-avatar-contest right-avatar">
    
                <!-- Costi del fantasy team -->
                <div class="teex_spent left-teex">${myCost5}</div>
                <div class="teex_spent right-teex">${oppCost5}</div>
              </div>
    
              <!-- Badge “Vinto / Perso / Pareggiato” -->
              <div class="status-badge-base ${badgeClass5}">
                ${badgeText5}
              </div>
    
              ${contest.multiply > 1
                ? `<div class="multiply-contest-mini">
                     ${Math.floor(contest.multiply)}
                   </div>`
                : ''}
            </div>
          `;
          break;
    
        
   default:
     // Layout di fallback
     card.innerHTML = `
       <div class="contest-container cc-list">
         <div class="contest-bar">
           <img src="${getAvatarSrc(my.avatar)}" alt="${my.name}" class="player-avatar-contest left-avatar">
           <div class="triletter_contest left-name">${my.name.substring(0,3)}</div>
           <div class="result_bold">VS</div>
           <div class="triletter_contest right-name">${opp.name.substring(0,3)}</div>
           <img src="${getAvatarSrc(opp.avatar)}" alt="${opp.name}" class="player-avatar-contest right-avatar">
           <div class="teex_spent left-teex">${my.cost}</div>
           <div class="teex_spent right-teex">${opp.cost}</div>
         </div>
         <div class="status-badge-base">${contest.status_name || 'UNKNOWN'}</div>
         ${contest.multiply > 1 ? `<div class="multiply-contest-mini">${Math.floor(contest.multiply)}</div>` : ''}
       </div>
     `;
 }

// Click handler
card.addEventListener('click', () => {
 // Se è status=1 e non sei owner → vai a creare / completare la tua squadra
 if (contest.status === 1 && !isCurrentOwner) {
   // 1) Rimuovi eventuali dati vecchi
   localStorage.removeItem('contestData');

   // 2) Prepara l’oggetto da passare in contest-creation.html
   const contestData = {
     contestId:    contest.contest_id,
     ownerId:      contest.owner_id,
     opponentId:   contest.opponent_id,
     eventUnitId:  contest.event_unit_id,  
     userId:       currentUserId,
     status:       contest.status,
     fantasyTeams: contest.fantasy_teams || [],
     multiply:     contest.multiply,
     stake:        contest.stake
     // aggiungi qui altri campi se ti servono
   };

   // 3) Salva in un unico JSON
   localStorage.setItem('contestData', JSON.stringify(contestData));

   // 4) Vai alla pagina di creazione/completamento
   window.location.href = '/contest-creation.html';
   return;  // esci qui, non eseguire altro
 }

 // Altrimenti (owner o altri status) → dettagli
  // Salvo i singoli valori
localStorage.setItem('contestId',    contest.contest_id);
localStorage.setItem('ownerId',      contest.owner_id);
localStorage.setItem('opponentId',   contest.opponent_id);
localStorage.setItem('eventUnitId',  contest.event_unit_id);
localStorage.setItem('userId',       currentUserId);
 window.location.href = '/contest-details.html';
});

 return card;

  
}
