// public/js/user/selectCompetitors/ui.js
// —————————————————————————————————————————————————————————————————————————
// All’interno di ui.js mettiamo TUTTE le funzioni che modificano il DOM:
//  - showLoading(): mostra “Caricamento…” dentro #opponentList
//  - hideLoading(): rimuove eventuale loader
//  - renderCompetitorList(users, selectedIds, appendFlag): disegna la lista
//  - updateStats(invited, refused, confirmed): aggiorna i contatori in alto
//  - showError(msg): se c’è un errore, lo mostra nell’area #opponentList
//  - clearList(): svuota #opponentList
//  - updateCreateButton(enabled): abilita/disabilita “CREATE TEAM”
// —————————————————————————————————————————————————————————————————————————

/**
 * Mostra un indicatore di caricamento all’interno di #opponentList
 */
export function showLoading() {
    const listEl = document.getElementById('opponentList');
    if (!listEl) return;
    if (!document.getElementById('loadingIndicator')) {
      const loader = document.createElement('div');
      loader.id = 'loadingIndicator';
      loader.innerHTML = `<p class="loading">Caricamento…</p>`;
      listEl.append(loader);
    }
  }
  
  /**
   * Rimuove l’indicatore di caricamento da #opponentList
   */
  export function hideLoading() {
    const loader = document.getElementById('loadingIndicator');
    if (loader) loader.remove();
  }
  
  /**
   * Mostra un messaggio di errore dentro #opponentList
   * @param {String} msg 
   */
  export function showError(msg) {
    const listEl = document.getElementById('opponentList');
    if (!listEl) return;
    listEl.innerHTML = `<p class="error">${msg}</p>`;
  }
  
  /**
   * Svuota interamente la lista #opponentList
   */
  export function clearList() {
    const listEl = document.getElementById('opponentList');
    if (listEl) listEl.innerHTML = '';
  }
  
  /**
   * Aggiorna i contatori in alto:
   *  @param {Number} invitedCount
   *  @param {Number} refusedCount
   *  @param {Number} confirmedCount
   */
  export function updateStats(invitedCount, refusedCount, confirmedCount) {
    const elInv = document.getElementById('countInvited');
    const elRef = document.getElementById('countRefused');
    const elCon = document.getElementById('countConfirmed');
    if (elInv) elInv.textContent = invitedCount;
    if (elRef) elRef.textContent = refusedCount;
    if (elCon) elCon.textContent = confirmedCount;
  }
  
  /**
   * Disegna la “pagina” di potenziali competitor:
   *  @param {Array<Object>} list      → array di utenti da mostrare
   *  @param {Set<Number>} selectedSet → set di userId già selezionati
   *  @param {Boolean} append          → se true, aggiunge sotto, altrimenti riscrive tutto
   */
  export function renderCompetitorList(list, selectedSet = new Set(), append = false) {
    const listEl = document.getElementById('opponentList');
    if (!listEl) return;
  
    // Rimuovo loading/error del passato
    const leftover = listEl.querySelector('p.loading, p.error');
    if (leftover) leftover.remove();
  
    if (!append) {
      listEl.innerHTML = '';
    } else {
      const oldBtn = document.getElementById('loadMoreBtn');
      if (oldBtn) oldBtn.remove();
    }
  
    if (Array.isArray(list) && list.length === 0) {
      listEl.innerHTML = `<p class="empty">Nessun utente trovato</p>`;
      return;
    }
  
    list.forEach(u => {
      const item = document.createElement('div');
      item.className = 'opponent-item';
      item.setAttribute('data-id', u.id);
  
      // se l’utente è già selezionato, aggiungo classe .selected
      if (selectedSet.has(u.id)) {
        item.classList.add('selected');
      }
  
      // Costruisco l’HTML base
      item.innerHTML = `
        <div class="opponent-info">
          <img
            src="${u.avatar && u.avatar.startsWith('http') 
                    ? decodeURIComponent(u.avatar) 
                    : '/avatars/' + (u.avatar || 'default.png')}"
            alt="${u.username}"
            class="opponent-avatar"
          />
          <div class="opponent-data">
            <p class="opponent-name">${u.username}</p>
            <div class="ppc-value">
              <img src="icons/sh.png" class="ppc-icon" alt="PPC">
              ${parseFloat(u.balance || 0).toFixed(1)}
            </div>
          </div>
        </div>
        <div>
          <!-- Bottone che di default mostra "SELECT" a meno che selectedSet.has(u.id) -->
          <button class="play-contest-button ${selectedSet.has(u.id) ? 'on' : ''}">
            ${selectedSet.has(u.id) ? 'REMOVE' : 'SELECT'}
          </button>
        </div>
      `;
  
      listEl.append(item);
    });
  
    // “Carica altri” (se serve)
    const loadMoreBtn = document.createElement('button');
    loadMoreBtn.id = 'loadMoreBtn';
    loadMoreBtn.className = 'load-more-button';
    loadMoreBtn.textContent = 'CARICA ALTRI';
    loadMoreBtn.style.display = 'none';
    listEl.appendChild(loadMoreBtn);
  }
  
  
/**
 * Abilita o disabilita il bottone “CREATE TEAM”.
 * @param {Boolean} enabled  → true = abilita, false = disabilita
 */
export function updateCreateButton(enabled = false) {
  const btn = document.getElementById('createTeamBtn');
  if (!btn) return;

  if (enabled) {
    btn.disabled = false;
    // rimuovo eventuale classe di “disabled” e metto quella di “attivo”
    btn.classList.remove('footer_button', 'fb_unable_orange');
    btn.classList.add('footer_button', 'footer_button_orange');
  } else {
    btn.disabled = true;
    // rimuovo classe “attivo” e metto quelle di “base + disabled”
    btn.classList.remove('footer_button', 'footer_button_orange');
    btn.classList.add('footer_button', 'fb_unable_orange');
  }
}