// public/js/user/addMembers/ui.js
import { loadChosenPlayers, getTotalCost, getAvailableBudget } from './utils.js';

export function updateHeaderStats() {
  const players = loadChosenPlayers();
  document.getElementById('playersCount').textContent = players.length;
  document.getElementById('totalCost').textContent = getTotalCost().toFixed(1);
  document.getElementById('teexLeft').textContent = getAvailableBudget().toFixed(1);
  // —— GESTIONE UPDATE TEAM BUTTON —— 
  const addBtn = document.getElementById('addToTeamBtn');
  const selectedCount = loadChosenPlayers().length;
  if (selectedCount > 0) {
    addBtn.disabled = false;
    addBtn.classList.add('footer_button_orange');
    addBtn.classList.remove('fb_unable_orange');
  } else {
    addBtn.disabled = true;
    addBtn.classList.add('fb_unable_orange');
    addBtn.classList.remove('footer_button_orange');
  }
}


    /**
     * list: array di player da renderizzare
     * onToggle: callback su click
     * append: se true, NON resetta il container ma aggiunge in coda
     */
    export function renderPlayers(list, onToggle, append = false) {
      const container = document.getElementById('playerList');
      // Se append=false (default), ripulisce; altrimenti mantiene i nodi esistenti
      if (!append) container.innerHTML = '';

  const chosenAepIds = loadChosenPlayers().map(p => p.aep_id);

  list.forEach(player => {
    // DEBUG: stampo in console l'intero player e la posizione
    console.log('DEBUG player object:', player);
    console.log('DEBUG player.position:', player.position);
  
    const li = document.createElement('li');
  
    // 1) Calcola prima se è selezionato o affordabile
    const isSelected    = chosenAepIds.includes(player.aep_id);
    const currentBudget = getAvailableBudget();
    const isAffordable  = player.event_unit_cost <= currentBudget;
  
    // 2) Imposta classe principale
    li.className = `player-card ${(isAffordable || isSelected) ? 'clickable' : 'disabled'}`;
    if (isSelected) li.style.backgroundColor = "#9A6D19";
  
    // 2.b) left-team fisso per tutti (cerchio sempre a sinistra)
    
  
    // 3) Markup con match home vs away
    const homeClass = (player.aep_team_id === player.home_team)
                      ? 'match_3letter-team-bold'
                      : 'player-match';
    const awayClass = (player.aep_team_id === player.away_team)
                      ? 'match_3letter-team-bold'
                      : 'player-match';
  
    li.innerHTML = `
      <div class="player-icon-container">
        <div class="player-icon">
          <img
            src="pictures/${player.picture || 'player_placeholder.png'}"
            alt="${player.athlete_shortname}"
            onerror="this.src='pictures/player_placeholder.png'"
          />
        </div>
      </div>
      <div class="player-info-container">
        <div class="player-name">${player.athlete_shortname}</div>
        <div class="player-match">
          <span class="${homeClass}">${player.home_team_code || ''}</span>
          -
          <span class="${awayClass}">${player.away_team_code || ''}</span>
        </div>
      </div>
      <div class="player-cost">${parseFloat(player.event_unit_cost).toFixed(1)}</div>
    `;
  
    li.addEventListener('click', () => {
      if (!isAffordable && !isSelected) return;
      onToggle(player, li);
    });
  
        // 4) Iniezione cerchietto posizione
    // Cerchietto posizione
    const posCircle = document.createElement('div');
    // qui usi esattamente il valore di player.position
    posCircle.className = `position_circle ${player.position}`; 
    posCircle.textContent = player.position;
    li.prepend(posCircle);
  
    container.appendChild(li);
  });
}
