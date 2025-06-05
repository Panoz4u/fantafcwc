// public/js/user/selectCompetitors/events.js
// —————————————————————————————————————————————————————————————————————————
// Qui mettiamo tutta la logica che lega UI ↔ API:
//  - initPage(): all’DOMContentLoaded, controlla token + userId,
//                  recupera lista competitors, mostra loading, li renderizza.
//  - toggleSelect(userId): aggiunge/toglie l’utente dal Set di selezionati  
//  - handleSearchInput / clearSearch  
//  - handleSortClick  
//  - handleLoadMore (se serve paginazione)  
//  - handleCreateTeamClick(): invia POST /api/leagues  
// —————————————————————————————————————————————————————————————————————————

import { fetchCompetitors, createLeagueRequest } from './api.js';
import { 
  showLoading,
  hideLoading,
  showError,
  clearList,
  renderCompetitorList,
  updateStats,
  updateCreateButton
} from './ui.js';

let allUsers       = [];           // array di tutti gli utenti recuperati da API
let filteredUsers  = [];           // array dopo ricerca + ordinamento
let currentPage    = 1;            // se implementi paginazione lato client
const pageSize     = 30;           // same as select-opponent
let totalPages     = 1;
let isLoading      = false;

// Questo Set contiene gli userId di chi è “selezionato” come competitor
const selectedSet = new Set();

/**
 * Inizializza la pagina. Viene eseguito all’evento DOMContentLoaded.
 *  1) Controllo che esistano localStorage authToken + userId → se no, redirect a signin.html
 *  2) Recupero lista competitors da API → showLoading() + fetchCompetitors()
 *  3) Filtro/ordino/pagino → renderCompetitorList()
 *  4) Inizializzo Event Listeners: ricerca, sort, selezione, createTeam
 */
export async function initPage() {
  const token  = localStorage.getItem('authToken');
  const userId = localStorage.getItem('userId');
  if (!token || !userId) {
    return window.location.href = 'signin.html';
  }

  // 1) Aggiorna i contatori iniziali
  updateStats(0, 0, 1); // owner è “confermato” (1), invited = 0, refused = 0

  // 2) Show loading + chiamata API
  showLoading();
  try {
    allUsers = await fetchCompetitors(); // restituisce TUTTI gli utenti (eccetto owner)
    // ordino di default per “username” (ascendente)
    filteredUsers = allUsers.slice().sort((a, b) => 
      a.username.localeCompare(b.username)
    );
    totalPages = Math.ceil(filteredUsers.length / pageSize);
    currentPage = 1;

    // 3) Render della prima pagina
    const toRender = filteredUsers.slice(0, pageSize);
    renderCompetitorList(toRender, selectedSet, false);
    if (currentPage < totalPages) {
      document.getElementById('loadMoreBtn').style.display = 'block';
    }
  } catch (err) {
    console.error('Errore fetchCompetitors:', err);
    showError('Errore caricamento utenti. Riprova più tardi.');
  } finally {
    hideLoading();
  }

  // 4) Inizializzo Event Listeners
  //    a) Ricerca + Clear
  const inp = document.getElementById('searchInput');
  const clr = document.getElementById('clearSearch');
  let searchTimeout = null;
  inp.addEventListener('input', () => {
    clr.style.display = inp.value ? 'block' : 'none';
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      handleSearch(inp.value.trim());
    }, 300);
  });
  clr.addEventListener('click', () => {
    inp.value = '';
    clr.style.display = 'none';
    handleSearch('');
  });

  //    b) Ordinamento
  document.querySelectorAll('.sort-item').forEach(el => {
    el.addEventListener('click', () => {
      const field = el.dataset.sort; // 'username' o 'balance'
      const allSortBtns = document.querySelectorAll('.sort-item');
      // rimuovo “active” da tutte
      allSortBtns.forEach(x => x.classList.remove('active'));
      // aggiungo a quella cliccata
      el.classList.add('active');

      // determino direzione: se era active, inverto
      const tri = el.querySelector('.sort-triangle');
      let direction = tri.classList.contains('desc') ? 'asc' : 'desc';
      // rimuovo classi da tutti i triangoli
      allSortBtns.forEach(x => {
        const t = x.querySelector('.sort-triangle');
        if (t) t.classList.remove('desc');
      });
      // assegno alla riga cliccata la direz desc se serve
      if (direction === 'desc') tri.classList.add('desc');

      // applico il sort a filteredUsers
      filteredUsers.sort((a, b) => {
        if (field === 'username') {
          return direction === 'asc'
            ? a.username.localeCompare(b.username)
            : b.username.localeCompare(a.username);
        } else {
          return direction === 'asc'
            ? a.balance - b.balance
            : b.balance - a.balance;
        }
      });

      // dopo aver ordinato, rendo di nuovo paginazione
      currentPage = 1;
      const slice = filteredUsers.slice(0, pageSize);
      clearList();
      renderCompetitorList(slice, selectedSet, false);
      if (currentPage < totalPages) {
        document.getElementById('loadMoreBtn').style.display = 'block';
      }
    });
  });

  //    c) Carica altri (paginazione)
  document.getElementById('loadMoreBtn').addEventListener('click', () => {
    if (isLoading) return;
    currentPage += 1;
    if (currentPage > totalPages) return;
    const start = (currentPage - 1) * pageSize;
    const slice = filteredUsers.slice(start, start + pageSize);
    renderCompetitorList(slice, selectedSet, true);
    if (currentPage >= totalPages) {
      document.getElementById('loadMoreBtn').style.display = 'none';
    }
  });

  //    d) Selezione / Deselezione utente
  //       (delegation: ogni `.opponent-item` ha `data-id`)
  document.getElementById('opponentList').addEventListener('click', (ev) => {
    // se sto cliccando su un checkbox o su un’intera card, recupero data-id
    const card = ev.target.closest('.opponent-item');
    if (!card) return;
    const uid = Number(card.dataset.id);
    if (!uid) return;

    // toggle nel Set
    if (selectedSet.has(uid)) {
      selectedSet.delete(uid);
      card.classList.remove('selected');
    } else {
      if (selectedSet.size >= 9) {
        alert('Puoi invitare al massimo 9 user oltre a te.');
        return;
      }
      selectedSet.add(uid);
      card.classList.add('selected');
    }

    // Aggiorno contatori: invited = selectedSet.size, 
    //                    refused = 0 (per ora), 
    //                    confirmed = 1 (owner)
    updateStats(selectedSet.size, 0, 1);

    // Abilito il bottone “CREATE TEAM” solo se almeno 1 selezionato
    // e il campo “leagueNameInput” non è vuoto
    const leagueName = document.getElementById('leagueNameInput').value.trim();
    updateCreateButton(selectedSet.size > 0 && leagueName.length > 0);
  });

  //    e) Gestione input “leagueNameInput” (per abilitare bottone)
  document.getElementById('leagueNameInput').addEventListener('input', () => {
    const leagueName = document.getElementById('leagueNameInput').value.trim();
    updateCreateButton(selectedSet.size > 0 && leagueName.length > 0);
  });

  //    f) Click su “CREATE TEAM”
  document.getElementById('createTeamBtn').addEventListener('click', async () => {
        const leagueName = document.getElementById('leagueNameInput').value.trim();
        if (!leagueName) {
          alert('ENTER LEAGUE NAME is required');
          return;
        }
    if (selectedSet.size === 0) {
      alert('Seleziona almeno un competitor');
      return;
    }
    try {
      // blocco multi‐click
      updateCreateButton(false);

            const res = await createLeagueRequest(leagueName, competitorIds);
            const newContestId = res.contestId;
            localStorage.setItem('contestId', newContestId);
            // Redirect ora passa contest_id nella query
            window.location.href = `league-details.html?contest_id=${newContestId}`;
        } catch (err) {
      console.error('Errore createLeague:', err);
      alert('Errore creazione lega: ' + err.message);
      updateCreateButton(true);
    }
  });
}

