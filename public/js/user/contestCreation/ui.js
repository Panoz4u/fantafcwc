 
  import {
    loadChosenPlayers,
    saveChosenPlayers,
    enrichPlayerData,
    getTotalCost,
    getAvailableBudget,
    getAvatarSrc
  } from './utils.js';
  
  export function renderContestHeader(contest, userId, currentUserProfile = {}) {
      const {
        owner_user_id, opponent_user_id,
        owner_name, owner_avatar,
        opponent_name, opponent_avatar,
        owner_cost, opponent_cost,
        status, multiply, contest_type,
        contest_name, invited_count,
        fantasy_teams = [],
        owner_fantasy_team, opponent_fantasy_team,
      } = contest;
    
      // 1) Determino se l’utente loggato è l’owner
      const isCurrentOwner = String(userId) === String(owner_user_id);
  
    // 2) Costruisco l’oggetto "my" usando SEMPRE i valori passati da currentUserProfile,
    //    altrimenti ricaduta su dati di contest
      const my = {
          name:   currentUserProfile.username || (isCurrentOwner ? owner_name : opponent_name),
          avatar: currentUserProfile.avatar   || (isCurrentOwner ? owner_avatar : opponent_avatar),
          cost:   currentUserProfile.initialCost != null
                  ? currentUserProfile.initialCost
                  : (() => {
                      if (status === 1) {
                        // pending: prendo dal fantasy_team del currentUser
                        const team = fantasy_teams.find(t => String(t.user_id) === String(userId));
                        return team ? parseFloat(team.total_cost).toFixed(1) : '0.0';
                      }
                      return parseFloat(isCurrentOwner ? owner_cost : opponent_cost || 0).toFixed(1);
                            })()
                       };  
  
    // 3) Costruisco "opp" come prima (non toccato)
    const isLeague = contest_type === 2;
    const invitedCount = invited_count - 1 || 0;
    const leagueName   = contest_name || localStorage.getItem('leagueName') || '';
  
    const opp = isLeague
      ? {
          name: leagueName,
          avatar: 'league',
          cost: '-'
        }
      : {
          name:   isCurrentOwner ? opponent_name : owner_name,
          avatar: isCurrentOwner ? opponent_avatar : owner_avatar,
          cost: (() => {
            if (status === 0) return '-';
            if (status === 1 && !isCurrentOwner && owner_fantasy_team) {
              return parseFloat(owner_fantasy_team.total_cost).toFixed(1);
            }
            return parseFloat(
              isCurrentOwner ? opponent_cost : owner_cost || 0
            ).toFixed(1);
          })()
        };
  
    // 4) Costruiamo l’HTML
    const statusLabels = ['CREATED','PENDING','READY','LIVE','COMPLETED'];
    const badgeClass   = [
      'status-badge-created','status-badge-pending',
      'status-badge-ready','status-badge-live',
      'status-badge-completed'
    ][status];
  
    document.getElementById("contestHeaderContainer").innerHTML = `
      <div class="contest-container cc-header">
        <div class="contest-bar">
          <!-- AVATAR SINISTRA -->
          <img src="${getAvatarSrc(my.avatar)}" class="player-avatar-contest left-avatar">
          <div class="triletter_contest left-name">${my.name.slice(0,3)}</div>
  
          <div class="result_bold">VS</div>
  
          <!-- AVATAR DESTRA / LEAGUE -->
          ${isLeague
            ? `<div class="triletter_contest right-name">${opp.name.slice(0,3)}</div>
               <div class="player-avatar-contest right-avatar league-avatar">
                 <span class="MainNumber">0</span>
                 <span class="SmallNumber">/${invitedCount}</span>
               </div>`
            : `<div class="triletter_contest right-name">${opp.name.slice(0,3)}</div>
               <img src="${getAvatarSrc(opp.avatar)}" class="player-avatar-contest right-avatar">`
          }
  
          <!-- COSTI -->
          <div class="teex_spent left-teex" id="currentUserScore">${my.cost}</div>
          <div class="teex_spent right-teex">${opp.cost}</div>
        </div>
  
        <div class="status-badge-base ${badgeClass}">
          ${statusLabels[status]}
        </div>
  
        ${multiply > 1
          ? `<div class="multiply-contest-mini">${Math.floor(multiply)}</div>`
          : ''}
      </div>
    `;
  }

  function welcomeTemplate() {
    return `
      <div class="welcome-container">
        <div class="welcome-text">
          <div class="welcome-to">START ADDING</div>
          <div class="fanteex-title">PLAYERS</div>
          <div class="start-game">TO YOUR TEAM</div>
        </div>
        <div class="animated-arrows">
          <img src="icons/arrow-down.png" alt="Arrow" class="arrow arrow1">
          <img src="icons/arrow-down.png" alt="Arrow" class="arrow arrow2">
          <img src="icons/arrow-down.png" alt="Arrow" class="arrow arrow3">
        </div>
      </div>
    `;
  }


  export async function renderPlayerList() {
    let players = await enrichPlayerData(loadChosenPlayers());
    const list = document.getElementById("playersList");
    list.innerHTML = "";
    if (players.length === 0) {
      list.innerHTML = welcomeTemplate();
      return;
    }
    players.forEach((p, i) => {
      const row = createPlayerRow(p, i);
      list.appendChild(row);
    });
  }

  
  function createPlayerRow(p, i) {

  // Create a wrapper to contain both the player row and the separator
  const wrapper = document.createElement("div");
  const row = document.createElement("div");
    wrapper.innerHTML = `
    <div class="player-row">
     <div class="avatar-block" style="position: relative;">
      <div class="atheleteAvatar">
        <img src="${p.picture?`pictures/${p.picture}`:"pictures/player_placeholder.png"}"></div>
      </div>
      <div class="player-info">
        <div class="athlete_shortname">${p.athlete_shortname}</div>
          <!-- vecchio: mostrava soltanto il codice 3-letter del team “di default” dell’atleta -->
         <!-- <div class="match_3letter-team-bold">${p.player_team_code}</div> -->
         <!-- nuovo: mostra il match (home_team_code – away_team_code) -->
         ${(() => {
           // determina quale delle due span ha la classe “bold” in base a player_team_code
           const homeClass = (p.player_team_code === p.home_team_code)
                             ? 'match_3letter-team-bold'
                             : 'player-match';
           const awayClass = (p.player_team_code === p.away_team_code)
                             ? 'match_3letter-team-bold'
                             : 'player-match';
           return `
             <div class="player-match">
               <span class="${homeClass}">${p.home_team_code || ''}</span>
               -
               <span class="${awayClass}">${p.away_team_code || ''}</span>
             </div>
           `;
         })()}
 
 
 
      </div>
      <div class="athlete_cost ac-long">${parseFloat(p.event_unit_cost).toFixed(1)}</div>
      <div class="remove-player-btn">
       <img class="remove-player-btn" src="icons/delete.png" data-index="${i}"></div>
      </div>
     </div>
     <div class="player-separator"></div>
     </div>`
      ;
      
    wrapper.querySelector("img[data-index]").addEventListener("click", e => {
        const idx = +e.target.dataset.index;
        const arr = loadChosenPlayers();
        arr.splice(idx,1);
        saveChosenPlayers(arr);          // salva array aggiornato
        renderPlayerList();              // rifai il rendering della lista
        updateBudgetUI();                // aggiorna anche la barra del budget
      });
    return wrapper;
  }


  export function updateBudgetUI() {
    // 1) saldo residuo (in basso)
    const teexLeftEl = document.getElementById('teexLeft');
    teexLeftEl.innerHTML = `
      <span class="teex-left-text-cyan">${getAvailableBudget().toFixed(1)}</span>
      <span class="teex-left-text-white">Clubby left</span>`;
  
  
    // 3) costo header (sotto avatar sinistro)
    const headerCostEl = document.getElementById('currentUserScore');
    if (headerCostEl) headerCostEl.textContent = getTotalCost().toFixed(1);
  
    // 4) abilita/disabilita RESET TEAM e PLAY
    const hasPlayers = loadChosenPlayers().length > 0;
    const resetBtn = document.getElementById('resetTeamBtn');
    const playBtn  = document.getElementById('confirmFooterBtn');
  
    resetBtn.disabled = !hasPlayers;
    playBtn.disabled  = !hasPlayers;
  
    // Cambia classe CSS per rendere arancio il bottone PLAY quando abilitato
    if (hasPlayers) {
      playBtn.classList.remove('fb_unable_orange');
      playBtn.classList.add('footer_button_orange');
    } else {
      playBtn.classList.add('fb_unable_orange');
      playBtn.classList.remove('footer_button_orange');
    }
  }
  
  export function showMultiplyOverlay(getTotalCostFn, onConfirm, lockedMultiply = null) {
    const overlay = document.getElementById("multiplyOverlay");
    const circles = overlay.querySelectorAll(".multiply-circle");
  
    // 1) CALCOLA prima il moltiplicatore selezionato (numero, non stringa)
      let selectedMultiplier = lockedMultiply != null
        ? parseInt(lockedMultiply, 10)
        : 1;

        // 2) PULIZIA classi e listener da tutti i cerchi
       circles.forEach(c => {
          c.classList.remove("mc-on", "mc-off");
          c.onclick = null;
        });
      
        // 3) RIGENERO gli stati:
          if (lockedMultiply != null) {
              // — INVITATO: mc-on al selezionato, mc-off a tutti gli altri e nessun click —
              circles.forEach(c => {
                const m = parseInt(c.dataset.multiply, 10);
                c.classList.toggle("mc-on", m === selectedMultiplier);
                c.classList.toggle("mc-locked", m !== selectedMultiplier);
                // onclick già rimosso prima
              });
            } else {
              // — NUOVA SFIDA: mc-on al selezionato, mc-off a tutti gli altri, e click sempre attivo —
              circles.forEach(c => {
                const m = parseInt(c.dataset.multiply, 10);
                // imposta la classe di default
                c.classList.toggle("mc-on", m === selectedMultiplier);
                c.classList.toggle("mc-off", m !== selectedMultiplier);
                // assegna (o ri-assegna) il listener SEMPRE
                c.onclick = () => {
                  // aggiorna visivo di tutti
                  circles.forEach(x => {
                    const mm = parseInt(x.dataset.multiply, 10);
                    x.classList.toggle("mc-on", mm === m);
                    x.classList.toggle("mc-off", mm !== m);
                  });
                  // aggiorna costo
                  document.getElementById("multipliedCost")
                    .textContent = (getTotalCostFn() * m).toFixed(1);
                  // **CORREZIONE**: aggiorno la variabile selectedMultiplier nel contesto esterno
                  selectedMultiplier = m;
                };
              });
            }
        // 4) AGGIORNA il costo visualizzato
    const costEl = document.getElementById("multipliedCost");
    costEl.textContent = (getTotalCostFn() * selectedMultiplier).toFixed(1);
  
    // 5) COLLEGA SEMPRE CANCEL e CONFIRM
    const btnCancel  = document.getElementById("cancelMultiply");
    const btnConfirm = document.getElementById("confirmMultiply");
    btnCancel.onclick  = () => overlay.style.display = "none";
    btnConfirm.onclick = () => {
      overlay.style.display = "none";
      console.log("DEBUG: confermo multiplier =", selectedMultiplier);
      onConfirm(selectedMultiplier);
    };
    
    // 6) SE INVITATO: blocca i cerchi (nessun onclick)
    if (lockedMultiply != null) {
      overlay.style.display = "flex";
      return;
    }
  
  
    // 8) MOSTRA l'overlay
    overlay.style.display = "flex";
  }
  
// at the bottom of public/js/user/contestCreation/ui.js
export function hideOverlay() {
    const overlay = document.getElementById("multiplyOverlay");
    if (overlay) overlay.style.display = "none";
  }