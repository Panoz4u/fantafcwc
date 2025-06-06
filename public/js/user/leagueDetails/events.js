// public/js/user/leagueDetails/events.js

/**
 * Aggiunge il click‐handler a tutti i bottoni “▼” (.expand-btn)
 * in modo da mostrare o nascondere la rispettiva <div class="entities-list">.
 */
export function bindLeagueEvents() {
    document.querySelectorAll('.expand-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.fantasy-team-card');
        if (!card) return;
        const entList = card.querySelector('.entities-list');
        if (!entList) return;
  
        entList.classList.toggle('hidden');
        btn.textContent = entList.classList.contains('hidden') ? '▼' : '▲';
      });
    });
  }
  