// public/js/user/selectCompetitors/events.js

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

let allUsers       = [];       // lista completa da backend
let filteredUsers  = [];       // lista filtrata da ricerca+sort
let currentPage    = 1;        // per paginazione lato client (se serve)
const pageSize     = 30;       // se fai “Carica altri”
let totalPages     = 1;
let isLoading      = false;

// Set di userId selezionati
const selectedSet = new Set();

// Variabile di ordinamento attuale
// Init: vogliamo partire su “balance desc”
let currentSort = { field: 'balance', direction: 'desc' };

/**
 * Inizializza la pagina. Viene eseguito all’evento DOMContentLoaded.
 */
export async function initPage() {
  const token  = localStorage.getItem('authToken');
  const userId = localStorage.getItem('userId');
  if (!token || !userId) {
    return window.location.href = 'signin.html';
  }

  // 1) Contatori iniziali: “owner” è sempre confermato (1), invited=0, refused=0
  updateStats(0, 0, 1);

  // 2) Show loading + chiamata API
  showLoading();
  try {
    allUsers = await fetchCompetitors(); // restituisce array di { id, username, avatar, balance, … }
    // 2a) Filtriamo per ricerca vuota e ordiniamo di default su “balance desc”
    filteredUsers = allUsers.slice();
    applySort(); // definita più sotto

    totalPages = Math.ceil(filteredUsers.length / pageSize);
    currentPage = 1;

    // 3) Render della prima pagina
    const toRender = filteredUsers.slice(0, pageSize);
    renderCompetitorList(toRender, selectedSet, false);

    // 3b) Mostriamo “Carica altri” solo se serve
    if (currentPage < totalPages) {
      document.getElementById('loadMoreBtn').style.display = 'block';
    }
  } catch (err) {
    console.error('Errore fetchCompetitors:', err);
    showError('Errore caricamento utenti. Riprova più tardi.');
  } finally {
    hideLoading();
  }

  // 4) Event Listeners

  // 4a) Ricerca + Clear
  const inp = document.getElementById('searchInput');
  const clr = document.getElementById('clearSearch');
  let searchTimeout = null;
  inp.addEventListener('input', () => {
    clr.style.display = inp.value ? 'block' : 'none';
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(function() {
      handleSearch(inp.value.trim());
    }, 300);
  });
  clr.addEventListener('click', () => {
    inp.value = '';
    clr.style.display = 'none';
    handleSearch('');
  });

  // 4b) Ordinamento (tutti e tre i campi: selected, username, balance)
  document.querySelectorAll('.sort-item').forEach(function(el) {
    el.addEventListener('click', function() {
      const field = el.dataset.sort; // 'selected' | 'username' | 'balance'

      // 4b.1) Determina nuova direzione
      if (currentSort.field === field) {
        // se riclicco stesso campo, inverto
        currentSort.direction = (currentSort.direction === 'asc') ? 'desc' : 'asc';
      } else {
        // campo diverso: imposto “asc” di default
        currentSort.field = field;
        currentSort.direction = 'asc';
      }

      // 4b.2) Rimuovo ‘active’ da tutti i sort-item e tolgo asc/desc da ciascun triangolino
      document.querySelectorAll('.sort-item').forEach(function(x) {
        x.classList.remove('active');
        const triX = x.querySelector('.sort-triangle');
        if (triX) {
          triX.classList.remove('asc');
          triX.classList.remove('desc');
        }
      });

      // 4b.3) Aggiungo ‘active’ solo all’elemento cliccato
      el.classList.add('active');

      // 4b.4) Aggiungo al triangolino la classe corrispondente
      const tri = el.querySelector('.sort-triangle');
      if (tri) {
        if (currentSort.direction === 'asc') {
          tri.classList.add('asc');
        } else {
          tri.classList.add('desc');
        }
      }

      // 4b.5) Applico il sort a filteredUsers
      applySort();

      // 4b.6) Ricarico la prima pagina (paginazione lato client)
      currentPage = 1;
      const slice = filteredUsers.slice(0, pageSize);
      clearList();
      renderCompetitorList(slice, selectedSet, false);

      // 4b.7) Mostro “Carica altri” se serve
      if (currentPage < totalPages) {
        document.getElementById('loadMoreBtn').style.display = 'block';
      } else {
        document.getElementById('loadMoreBtn').style.display = 'none';
      }
    });
  });

// 4c) “Carica altri” via event delegation su #opponentList
document.getElementById('opponentList').addEventListener('click', function(ev) {
  const btn = ev.target;
  if (btn.id !== 'loadMoreBtn' || isLoading) return;

  // Se c’era una ricerca attiva, resetto filteredUsers ma NON resetto currentPage
  const inp = document.getElementById('searchInput');
  if (inp.value.trim()) {
    inp.value = '';
    document.getElementById('clearSearch').style.display = 'none';
    filteredUsers = allUsers.slice();
    applySort();
    totalPages = Math.ceil(filteredUsers.length / pageSize);
  }

  // carico pagina successiva in append
  if (currentPage < totalPages) {
    currentPage++;
    const start = (currentPage - 1) * pageSize;
    const slice = filteredUsers.slice(start, start + pageSize);
    renderCompetitorList(slice, selectedSet, true);

    // ➤ Qui mostro o nascondo il NUOVO bottone in base alle pagine rimanenti
    const newBtn = document.getElementById('loadMoreBtn');
    if (currentPage < totalPages) {
      newBtn.style.display = 'block';
    } else {
      newBtn.style.display = 'none';
    }

    // Rimuovo il vecchio btn (cliccato) se siamo all’ultima pagina
    if (currentPage >= totalPages) {
      btn.style.display = 'none';
    }
  }
});

  // 4d) Selezione / Deselezione utente (click su riga intera)
  document.getElementById('opponentList').addEventListener('click', function(ev) {
    const card = ev.target.closest('.opponent-item');
    if (!card) return;
    const uid = Number(card.dataset.id);
    if (!uid) return;

    const btn = card.querySelector('.play-contest-button');
    // Toggle nel Set
    if (selectedSet.has(uid)) {
      selectedSet.delete(uid);
      card.classList.remove('selected');
      if (btn) {
        btn.textContent = 'SELECT';
        btn.classList.remove('on');
      }
    } else {
      if (selectedSet.size >= 9) {
        alert('Puoi invitare al massimo 9 user oltre a te.');
        return;
      }
      selectedSet.add(uid);
      card.classList.add('selected');
      if (btn) {
        btn.textContent = 'REMOVE';
        btn.classList.add('on');
      }
    }

    // Aggiorno i contatori: invited = selectedSet.size, refused=0, confirmed=1
    updateStats(selectedSet.size, 0, 1);

       // Abilito/disabilito “CREATE TEAM” non appena ho almeno 1 utente selezionato
       updateCreateButton(selectedSet.size > 0);
  });

  // 4e) Show/hide “CREATE TEAM” in base al nome della lega
  document.getElementById('leagueNameInput').addEventListener('input', function() {
       // Se c’è almeno 1 utente selezionato, il pulsante resta abilitato
       updateCreateButton(selectedSet.size > 0);
  });

  // 4f) Click su “CREATE TEAM”
  // Nel gestore del click su "CREATE TEAM"
  document.getElementById('createTeamBtn').addEventListener('click', async function() {
    const leagueName = document.getElementById('leagueNameInput').value.trim();
    if (!leagueName) {
      alert('ENTER LEAGUE NAME is required');
      return;
    }
        // per le leghe servono almeno 2 utenti oltre a te
        if (selectedSet.size < 2) {
          alert(
            'Servono almeno 2 utenti oltre a te per creare una lega.\n' +
            'Se vuoi giocare un testa a testa scegli la modalità Head2Head'
          );
          return;
        }
    // Preparo array di competitorIds
    const competitorIds = Array.from(selectedSet);
  
    try {
      updateCreateButton(false); // blocco multi‐click
      const res = await createLeagueRequest(leagueName, competitorIds);
      // Dentro l'handler di click su "CREATE TEAM":
      const newContestId = res.contestId;
  
      // Preparo l'oggetto contestData in localStorage
      const ownerUserId = Number(localStorage.getItem('userId')); 
      const contestDataObj = {
        contestId:   newContestId,
        userId:      ownerUserId,
        ownerId:     ownerUserId,
        opponentId:  ownerUserId,  // Manteniamo l'owner come "avversario" per compatibilità
        eventUnitId: 1,            // Usiamo un event_unit_id esistente (es. "1")
        status:      0,
        multiply:    1,
        contest_type: 2,           // Aggiungiamo contest_type = 2 per indicare che è una lega
        contest_name: leagueName   // Aggiungiamo il nome della lega
      };
      localStorage.setItem('contestData', JSON.stringify(contestDataObj));
  
      // Salvo invitati e nome lega
      localStorage.setItem('invitedCount', selectedSet.size);
      localStorage.setItem('leagueName', leagueName);
  
      // Redirect
      window.location.href = 'contest-creation.html';
    } catch (err) {
      console.error('Errore createLeague:', err);
      alert('Errore creazione lega: ' + err.message);
      updateCreateButton(true);
    }
  });
}

/**
 * Funzione che applica il sorting a filteredUsers in base a currentSort
 * e aggiorna totalPages.
 */
function applySort() {
  const field = currentSort.field;
  const dir = currentSort.direction;

  if (field === 'selected') {
    // ----> Before: selected “in cima” (asc), poi gli altri; 
    //           After: non‐selected “in cima” (asc), poi selected
    filteredUsers.sort(function(a, b) {
      const aSel = selectedSet.has(a.id) ? 1 : 0;
      const bSel = selectedSet.has(b.id) ? 1 : 0;
      if (dir === 'asc') {
        // salta prima i selezionati (1) → vogliamo ordine 1→0
        if (aSel !== bSel) {
          return bSel - aSel; // se aSel=1, bSel=0 => -1 → a prima
        }
      } else {
        // salta prima i non selezionati (0) → ordine 0→1
        if (aSel !== bSel) {
          return aSel - bSel; // se aSel=0, bSel=1 => -1 → a prima
        }
      }
      // se entrambi hanno aSel==bSel, ordina alfabeticamente per username
      return a.username.localeCompare(b.username);
    });

  } else if (field === 'username') {
    filteredUsers.sort(function(a, b) {
      return dir === 'asc'
        ? a.username.localeCompare(b.username)
        : b.username.localeCompare(a.username);
    });

  } else if (field === 'balance') {
    filteredUsers.sort(function(a, b) {
      return dir === 'asc'
        ? a.balance - b.balance
        : b.balance - a.balance;
    });
  }

  totalPages = Math.ceil(filteredUsers.length / pageSize);
}

/**
 * Funzione di ricerca invocata al debounce (300ms)
 * @param {String} query 
 */
function handleSearch(query) {
  const lower = query.toLowerCase();
  filteredUsers = allUsers.filter(function(u) {
    return u.username.toLowerCase().includes(lower);
    // OPPURE, se hai un campo team: 
    // || u.teamName.toLowerCase().includes(lower)
  });

  // Applico nuovamente il sorting attuale (su filteredUsers)
  applySort();

  // Reset paginazione e render
  currentPage = 1;
  totalPages = Math.ceil(filteredUsers.length / pageSize);
  clearList();
  const slice = filteredUsers.slice(0, pageSize);
  renderCompetitorList(slice, selectedSet, false);

  // Mostra o nascondi “Carica altri”
  if (currentPage < totalPages) {
    document.getElementById('loadMoreBtn').style.display = 'block';
  } else {
    document.getElementById('loadMoreBtn').style.display = 'none';
  }
}
