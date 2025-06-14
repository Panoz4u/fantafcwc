// public/js/user/addMembers/events.js
import { fetchAllAthletes } from './api.js';
import { renderPlayers, updateHeaderStats } from './ui.js';
import { loadChosenPlayers, saveChosenPlayers } from './utils.js';

// — Pagina e paginazione —
const pageSize       = 50;          // numero di elementi per “fetta”
let currentPage      = 1;
let totalPages       = 1;
let isLoading        = false;
let searchTimeout    = null;

let allAthletes = [];
let currentList = [];   // la lista filtrata+ordinata
let currentSort      = { field: 'athlete_shortname', asc: true };


 // Funzione di toggle: aggiunge/rimuove il player da chosenPlayers
 const handleToggle = (player, el) => {
  let chosen = loadChosenPlayers();
  const idx = chosen.findIndex(p => p.aep_id === player.aep_id);
  if (idx >= 0) {
    chosen.splice(idx, 1);
    el.classList.remove('selected');
  } else {
    chosen.push(player);
    el.classList.add('selected');
  }
  saveChosenPlayers(chosen);
  
    // 🔄 ricostruisci tutta la vista corrente,
    //   includendo tutte le pagine già caricate
    const cumulative = currentList.slice(0, currentPage * pageSize);
    renderPlayerList(cumulative, false);
  
  updateHeaderStats();
};


// 1) Recupera, filtra, ordina e restituisce una “fetta” di atleti
async function fetchPlayers(page = 1, search = '') {
  if (isLoading) return [];
  isLoading = true;
  const listEl = document.getElementById('playerList');
  // loader
  if (!document.getElementById('loadingIndicator')) {
    const loader = document.createElement('div');
    loader.id = 'loadingIndicator';
    loader.innerHTML = '<p class="loading">Caricamento…</p>';
    listEl.append(loader);
  }

  try {
    // FULL LISTA
    const athletes = allAthletes;
    // FILTRO
    const lower = search.toLowerCase();
    const filtered = search
      ? athletes.filter(p =>
          p.athlete_shortname.toLowerCase().includes(lower) ||
          (p.player_team_code || '').toLowerCase().includes(lower)
        )
      : [...athletes];
    // SORT DINAMICO
    filtered.sort((a, b) => {
      const dir = currentSort.asc ? 1 : -1;
      if (currentSort.field === 'event_unit_cost') {
        return (a.event_unit_cost - b.event_unit_cost) * dir;
      } else {
        return ('' + a[currentSort.field])
          .localeCompare(b[currentSort.field]) * dir;
      }
    });

      // 👈 tieni traccia di tutta la lista filtrata+ordinata
      currentList = filtered;

    // PAGINAZIONE
    totalPages = Math.ceil(filtered.length / pageSize);
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  } catch (e) {
    console.error('fetchPlayers:', e);
    return [];
  } finally {
    isLoading = false;
    const loader = document.getElementById('loadingIndicator');
    if (loader) loader.remove();
  }
}

// 2) Renderizza lista + pulsante “CARICA ALTRI”
function renderPlayerList(list, append = false) {
  const listEl = document.getElementById('playerList');
  // rimuovi eventuale loader
  const oldLoad = listEl.querySelector('p.loading');
  if (oldLoad) oldLoad.remove();

  if (!append) {
    listEl.innerHTML = '';
  } else {
    const oldBtn = document.getElementById('loadMoreBtn');
    if (oldBtn) oldBtn.remove();
  }

  // lista vuota a pagina 1
  if (list.length === 0 && currentPage === 1) {
    listEl.innerHTML = '<p class="empty">Nessun giocatore trovato</p>';
    updateHeaderStats();
    return;
  }

    // render “fetta” (se append=true, aggiunge in coda)
    renderPlayers(list, handleToggle, append);
  updateHeaderStats();

  // se ci sono altre pagine, metti il pulsante
  if (currentPage < totalPages) {
    const moreBtn = document.createElement('button');
    moreBtn.id = 'loadMoreBtn';
    moreBtn.className = 'load-more-button';
    moreBtn.textContent = 'CARICA ALTRI';
    moreBtn.addEventListener('click', () => loadAndRender(false));
    listEl.append(moreBtn);
  }
}

// 3) Carica e renderizza (reset = true → pagina 1; false → pagina successiva)
async function loadAndRender(reset = true) {
  if (reset) currentPage = 1;
  else      currentPage += 1;
  const searchVal = document.getElementById('searchInput').value.trim();
  const slice = await fetchPlayers(currentPage, searchVal);
  renderPlayerList(slice, !reset);
}



export async function initAddMembers() {
  const token = localStorage.getItem('authToken');
  const userId = localStorage.getItem('userId');
  if (!token || !userId) {
    window.location.href = '/signin.html';
    return;
  }

  try {
    allAthletes = await fetchAllAthletes();
  } catch (err) {
    console.error('initAddMembers', err);
    alert('Impossibile caricare gli atleti');
    return;
  }

    // → setup listener e primo caricamento paginato
  setupEventListeners();
  loadAndRender(true);
  
}

function setupEventListeners() {

    // ← Back Arrow: torna a contest-creation.html
    document.getElementById('backArrow').addEventListener('click', () => {
      window.location.href = '/contest-creation.html';
    });
  
    // ← UPDATE TEAM: rimanda a contest-creation.html con i giocatori già salvati
    document.getElementById('addToTeamBtn').addEventListener('click', () => {
      // i chosenPlayers sono già in localStorage grazie a handleToggle
      window.location.href = '/contest-creation.html';
    });

  const searchInput = document.getElementById('searchInput');
  const clearBtn    = document.getElementById('clearSearch');
  const headers     = document.querySelectorAll('.sort-item');

  // 1) Ricerca con debounce e “CARICA ALTRI” dalla pagina 1
  searchInput.addEventListener('input', () => {
    // Mostra/nascondi la “x” per cancellare
    clearBtn.style.display = searchInput.value ? 'block' : 'none';
    // Reset del debounce
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      loadAndRender(true);
    }, 300);
  });

  // 2) Pulsante “x” per cancellare il testo di ricerca
  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearBtn.style.display = 'none';
    loadAndRender(true);
  });

  // 3) Sort: cliccando sull’header riordini e ricarichi da pagina 1
  headers.forEach(header => {
    header.addEventListener('click', () => {
      const field = header.dataset.sort;

      // 3.1) Toggle direzione se è lo stesso campo, altrimenti asc su nuovo campo
      if (currentSort.field === field) {
        currentSort.asc = !currentSort.asc;
      } else {
        currentSort.field = field;
        currentSort.asc   = true;
      }

      // 3.2) Aggiorna classi CSS per evidenziare colonna e triangolo
      headers.forEach(h => {
        h.classList.toggle('active', h.dataset.sort === currentSort.field);
        const tri = h.querySelector('.sort-triangle');
        if (tri) tri.remove();
        if (h.dataset.sort === currentSort.field) {
          const newTri = document.createElement('div');
          newTri.className = `sort-triangle ${currentSort.asc ? 'asc' : 'desc'}`;
          h.appendChild(newTri);
        }
      });

      // 3.3) Ricarica la lista (pagina 1) con nuovo ordinamento
      loadAndRender(true);
    });
  });
}


function sortList(field, asc) {
  currentList.sort((a, b) => {
    let vA = a[field], vB = b[field];
    // numeric sort se campo cost, altrimenti string
    if (field === 'event_unit_cost') {
      return asc ? vA - vB : vB - vA;
    } else {
      vA = (vA||'').toString().toLowerCase();
      vB = (vB||'').toString().toLowerCase();
      if (vA < vB) return asc ? -1 : 1;
      if (vA > vB) return asc ? 1  : -1;
      return 0;
    }
  });
}