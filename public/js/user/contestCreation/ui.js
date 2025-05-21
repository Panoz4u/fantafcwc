import {
    loadChosenPlayers,
    saveChosenPlayers,
    enrichPlayerData,
    getTotalCost,
    getAvailableBudget,
    getAvatarSrc
  } from './utils.js';
  
 export function renderContestHeader({ owner_name, owner_avatar, opponent_name, opponent_avatar, owner_cost, opponent_cost, status, multiply }) {
    const container = document.getElementById("contestHeaderContainer");
    container.innerHTML = `
      <div class="contest-container cc-header">
        <div class="contest-bar">
          <img src="${getAvatarSrc(owner_avatar)}" class="player-avatar-contest left-avatar">
          <div class="triletter_contest left-name">${owner_name.slice(0,3)}</div>
          <div class="result_bold">VS</div>
          <div class="triletter_contest right-name">${opponent_name.slice(0,3)}</div>
          <img src="${getAvatarSrc(opponent_avatar)}" class="player-avatar-contest right-avatar">
          <div class="teex_spent left-teex" id="currentUserScore">${getTotalCost().toFixed(1)}</div>
          <div class="teex_spent right-teex">${opponent_cost?parseFloat(opponent_cost).toFixed(1):"-"}</div>
        </div>
        <div class="status-badge-base status-badge">${["CREATED","PENDING","READY","LIVE","COMPLETED"][status]}</div>
        ${ multiply>1? `<div class="multiply-contest-mini">${multiply}</div>` : ""}
      </div>`;

  }

  export async function renderPlayerList() {
    let players = await enrichPlayerData(loadChosenPlayers());
    const list = document.getElementById("playersList");
    list.innerHTML = "";
    if (players.length === 0) {
      list.innerHTML = `<div class="welcome-container">…</div>`;
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
        <div class="match_3letter-team-bold">${p.player_team_code}</div>
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
      <span class="teex-left-text-white">SwissHearts left</span>`;
  
    // 2) balance header (alto destra)
    const bal = parseFloat(localStorage.getItem('userTeexBalance') || '0');
    document.getElementById('teexBalance').textContent = bal.toFixed(1);
  
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
  
  export function showMultiplyOverlay(getTotalCostFn, onConfirm) {
    const overlay = document.getElementById("multiplyOverlay");
    const circles = document.querySelectorAll('.multiply-circle');
    let selectedMultiplier = 1;
  
    // —— STEP 1: DEFAULT ×1 SELEZIONATO —— 
    circles.forEach(c => {
      if (c.dataset.multiply === "1") {
        c.classList.add('mc-on');
        c.classList.remove('mc-off');
      } else {
        c.classList.add('mc-off');
        c.classList.remove('mc-on');
      }
    });
    // Mostra subito il costo ×1
    document.getElementById('multipliedCost').textContent = getTotalCostFn().toFixed(1);
  
    // —— STEP 2: listener sui cerchietti ——
    circles.forEach(c => {
      c.onclick = () => {
        selectedMultiplier = parseInt(c.dataset.multiply);
        circles.forEach(x => {
          x.classList.remove('mc-on');
          x.classList.add('mc-off');
        });
        c.classList.remove('mc-off');
        c.classList.add('mc-on');
        document.getElementById('multipliedCost')
          .textContent = (getTotalCostFn() * selectedMultiplier).toFixed(1);
      };
    });
  
    // —— STEP 3: cancel/confirm —— 
    document.getElementById('cancelMultiply').onclick = () => overlay.style.display = 'none';
    document.getElementById('confirmMultiply').onclick = () => {
      overlay.style.display = 'none';
      onConfirm(selectedMultiplier);
    };
  
    // —— STEP 4: mostra l’overlay ——
    overlay.style.display = 'flex';
  }
  
// at the bottom of public/js/user/contestCreation/ui.js
export function hideOverlay() {
    const overlay = document.getElementById("multiplyOverlay");
    if (overlay) overlay.style.display = "none";
  }