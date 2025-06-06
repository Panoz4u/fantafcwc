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

  document.getElementById('countInvited')?.textContent   = membersCount;
  document.getElementById('countRefused')?.textContent   = refusedCount;
  document.getElementById('countConfirmed')?.textContent = confirmedCount;

  // 3) Costruisci la lista di tutti gli utenti
  const container = document.getElementById('teamsContainer');
  container.innerHTML = ''; // ripulisci prima

  fantasyTeams.forEach(ft => {
    const row = document.createElement('div');
    row.className = 'contest-row'; // oppure la classe che preferisci

    // Se ft_status === -1 => “REJECTED” in rosso
    if (ft.ft_status === -1) {
      row.innerHTML = `
        <div class="user-card">
          <img src="${getAvatarSrc(ft.avatar, ft.username)}" class="avatar-small" />
          <div class="user-info">
            <div class="user-name">${ft.username}</div>
            <div class="user-sub">REJECTED</div>
          </div>
        </div>
      `;
    }
    // Se ft_status === 1 => “INVITED” in giallo
    else if (ft.ft_status === 1) {
      row.innerHTML = `
        <div class="user-card">
          <img src="${getAvatarSrc(ft.avatar, ft.username)}" class="avatar-small" />
          <div class="user-info">
            <div class="user-name">${ft.username}</div>
            <div class="user-sub">INVITED</div>
          </div>
        </div>
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
        <div class="user-card">
          <img src="${getAvatarSrc(ft.avatar, ft.username)}" class="avatar-small" />
          <div class="user-info">
            <div class="user-name">${ft.username}</div>
            <div class="user-sub">${label}</div>
          </div>
        </div>
      `;
    }

    container.appendChild(row);
  });
}
