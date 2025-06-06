// public/js/user/leagueRecap/ui.js

import { getAvatarSrc } from '../utils/avatar.js';

export function initLeagueRecap({ contestName, fantasyTeams, currentUserId }) {
  // 1) Imposta il nome della League nell’header
  const leagueNameEl = document.getElementById('leagueName');
  if (leagueNameEl) leagueNameEl.textContent = contestName.toUpperCase();

  // 2) Calcola i contatori (Members, Rejected, Confirmed)
  const membersCount   = fantasyTeams.length;
  const refusedCount   = fantasyTeams.filter(ft => ft.ft_status === -1).length;
  const confirmedCount = fantasyTeams.filter(ft => ft.ft_status > 1).length;

    const invitedEl   = document.getElementById('countInvited');
    const refusedEl   = document.getElementById('countRefused');
    const confirmedEl = document.getElementById('countConfirmed');
  
    if (invitedEl)   invitedEl.textContent   = membersCount;
    if (refusedEl)   refusedEl.textContent   = refusedCount;
    if (confirmedEl) confirmedEl.textContent = confirmedCount;

  // 3) Costruisci la lista di tutti gli utenti
  const container = document.getElementById('teamsContainer');
  container.innerHTML = ''; // ripulisci prima

  fantasyTeams.forEach(ft => {
    const row = document.createElement('div');
    row.className = 'opponent-item'; // oppure la classe che preferisci

    // Se ft_status === -1 => “REJECTED” in rosso
    if (ft.ft_status === -1) {
      row.innerHTML = `
        <div class="opponent-info">
          <img src="${getAvatarSrc(ft.avatar, ft.username)}" class="opponent-avatar" />
          <div class="opponent-data">
            <div class="opponent-name">${ft.username}</div>
          </div>

        </div>
       <div class="league-status rej">REJECTED</div>
      `;
    }
    // Se ft_status === 1 => “INVITED” in giallo
    else if (ft.ft_status === 1) {
      row.innerHTML = `
        <div class="opponent-info">
          <img src="${getAvatarSrc(ft.avatar, ft.username)}" class="opponent-avatar" />
          <div class="opponent-data">
            <div class="opponent-name">${ft.username}</div>
          </div>
        </div>
        <div class="league-status inv">INVITED</div>
      `;
    }
    // Se ft_status > 1 => “CONFIRMED” (o Creator se è il creator)
    else {
      // Controllo se è creator (se user_id === owner)
      // In questo contesto il backend può restituire un flag “isCreator” o possiamo
      // confrontare ft.user_id === currentUserId se sappiamo che currentUser è owner.
      const label = (String(ft.user_id) === String(currentUserId))
                      ? 'CREATOR'
                      : 'CONFIRMED';
      row.innerHTML = `
        <div class="opponent-info">
          <img src="${getAvatarSrc(ft.avatar, ft.username)}" class="opponent-avatar" />
          <div class="opponent-data">
            <div class="opponent-name">${ft.username}</div>
           </div>
        </div>
       <div class="league-status cnf">${label}</div>
      `;
    }

    container.appendChild(row);
  });
}
