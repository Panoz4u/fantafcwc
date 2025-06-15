import { getAvatarSrc } from './utils/avatar.js';
import '../session-expired-handler.js';

// Variabili globali
const pageSize     = 30;
let currentPage    = 1;
let totalPages     = 1;
let isLoading      = false;
let searchTimeout  = null;
let opponents      = [];
let currentSort    = { field: 'balance', direction: 'desc' };

// Prendo l'ID utente e lo converto a numero
const ownerId       = Number(localStorage.getItem('userId'));
const eventUnitId   = new URLSearchParams(window.location.search).get('event_unit_id') || '1';

// =======================
// Fetch API
// =======================
async function fetchUsers(page = 1, search = '') {
  if (isLoading) return null;
  isLoading = true;

  const listEl = document.getElementById('opponentList');
  if (!document.getElementById('loadingIndicator')) {
    const loader = document.createElement('div');
    loader.id = 'loadingIndicator';
    loader.innerHTML = '<p class="loading">Caricamento…</p>';
    listEl.append(loader);
  }

  try {
    const url = '/api/users/except';
    const resp = await fetch(url, {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('authToken') }
    });
    if (!resp.ok) throw new Error(await resp.text());

    // 1) prendo il JSON
    const data = await resp.json();
    const usersArray = Array.isArray(data) ? data : (data.users || []);

    // 2) filtro la ricerca su username (case-insensitive)
    let filtered;
    if (search) {
      const lower = search.toLowerCase();
      filtered = usersArray.filter(function(u) {
        return u.username.toLowerCase().includes(lower);
      });
    } else {
      filtered = usersArray;
    }

    // 3) ordino secondo currentSort
    filtered.sort(function(a, b) {
      if (currentSort.field === 'username') {
        if (currentSort.direction === 'asc') {
          return a.username.localeCompare(b.username);
        } else {
          return b.username.localeCompare(a.username);
        }
      } else {
        // balance numeric
        if (currentSort.direction === 'asc') {
          return a.balance - b.balance;
        } else {
          return b.balance - a.balance;
        }
      }
    });

    // 4) aggiorno il numero totale di pagine
    totalPages = Math.ceil(filtered.length / pageSize);

    // 5) estraggo la “fetta” corrispondente alla pagina
    const start = (page - 1) * pageSize;
    const paginated = filtered.slice(start, start + pageSize);
    return paginated;

  } catch (e) {
    console.error('Errore fetchUsers:', e);
    if (page === 1) {
      document.getElementById('opponentList').innerHTML =
        '<p class="error">Errore nel caricamento. Riprova.</p>';
    }
    return [];
  } finally {
    isLoading = false;
    const loader = document.getElementById('loadingIndicator');
    if (loader) loader.remove();
  }
}

// =======================
// Rendering
// =======================
function renderOpponentList(list, append = false) {
  const listEl = document.getElementById('opponentList');
  // Rimuove eventuali <p class="loading"> rimasti
  const leftover = listEl.querySelector('p.loading');
  if (leftover) leftover.remove();

  if (!append) {
    listEl.innerHTML = '';
  } else {
    // rimuovi il pulsante “Carica altri” precedente
    const oldBtn = document.getElementById('loadMoreBtn');
    if (oldBtn) oldBtn.remove();
  }

  if (list.length === 0 && currentPage === 1) {
    listEl.innerHTML = '<p class="empty">Nessun utente trovato</p>';
    return;
  }

  list.forEach(function(u) {
    const item = document.createElement('div');
    item.className = 'opponent-item';
    item.setAttribute('data-id', u.id);

    item.innerHTML =
      '<div class="opponent-info">' +
        '<img src="' + getAvatarSrc(u.avatar) + '" alt="' + u.username + '" class="opponent-avatar">' +
        '<div class="opponent-data">' +
          '<h3 class="opponent-name">' + u.username + '</h3>' +
          '<div class="ppc-value">' +
            '<img src="icons/sh.png" class="ppc-icon" alt="PPC">' +
            parseFloat(u.balance || 0).toFixed(1) +
          '</div>' +
        '</div>' +
      '</div>' +
      '<button class="play-contest-button">PLAY</button>';

    item.addEventListener('click', function() {
      createContest(u.id);
    });

    listEl.append(item);
  });

  // Carica altri?
  if (currentPage < totalPages) {
    const moreBtn = document.createElement('button');
    moreBtn.id = 'loadMoreBtn';
    moreBtn.className = 'load-more-button';
    moreBtn.textContent = 'CARICA ALTRI';
    moreBtn.addEventListener('click', function() {
      loadAndRender(false);
    });
    listEl.append(moreBtn);
  }
}

// =======================
// Creazione contest
// =======================
async function createContest(opponentId) {
  try {
    const resp = await fetch('/contests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('authToken')
      },
      body: JSON.stringify({
        owner: ownerId,
        opponent: opponentId,
        event_unit_id: eventUnitId,
        multiply: 1
      })
    });
    if (!resp.ok) throw new Error(await resp.text());
    const json = await resp.json();
    const contestId = json.contestId;

    localStorage.setItem('contestData', JSON.stringify({
      contestId:  contestId,
      eventUnitId: eventUnitId,
      opponentId: opponentId,
      ownerId:    ownerId,
      userId:     ownerId               // <── serve per orientare l'header
    }));
    window.location.href = 'contest-creation.html';
  } catch (e) {
    alert('Errore creazione sfida: ' + e.message);
  }
}

// =======================
// Caricamento + render
// =======================
async function loadAndRender(reset = true) {
  // 1) Decido quale pagina caricare
  if (reset) {
    currentPage = 1; // primo caricamento
  } else {
    currentPage += 1; // click “Carica altri” → pagina successiva
  }

  // 2) Chiamo l’API con il numero di pagina corretto
  const list = await fetchUsers(
    currentPage,
    document.getElementById('searchInput').value.trim()
  );
  renderOpponentList(list, !reset);
}

// =======================
// Event Listeners
// =======================
window.addEventListener('DOMContentLoaded', function() {
  // Redirect back
  document.getElementById('backArrow').addEventListener('click', function() {
    history.back();
  });

  // Fetch initial teex balance
  fetch('/user-landing-info', {
    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('authToken') }
  })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      document.getElementById('teexBalance').textContent =
        d.user.teex_balance.toLocaleString();
    });

  // Search debounce
  const inp = document.getElementById('searchInput');
  const clear = document.getElementById('clearSearch');
  inp.addEventListener('input', function() {
    clear.style.display = inp.value ? 'block' : 'none';
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(function() {
      loadAndRender(true);
    }, 300);
  });
  clear.addEventListener('click', function() {
    inp.value = '';
    clear.style.display = 'none';
    loadAndRender(true);
  });

  // Sort
  document.querySelectorAll('.sort-item').forEach(function(el) {
    el.addEventListener('click', function() {
      const field = el.dataset.sort;
  
      // 1) Se riclicco sullo stesso campo, inverto asc <-> desc.
      //    Altrimenti (campo diverso), imposto sempre asc di default.
      if (currentSort.field === field) {
        currentSort.direction = (currentSort.direction === 'asc') ? 'desc' : 'asc';
      } else {
        currentSort.field = field;
        currentSort.direction = 'asc';
      }

    // 2) Rimuovo ‘active’ da tutti i sort-item e tolgo asc/desc da ognuno
    document.querySelectorAll('.sort-item').forEach(function(x) {
      x.classList.remove('active');
      const triX = x.querySelector('.sort-triangle');
      if (triX) {
        triX.classList.remove('asc');
        triX.classList.remove('desc');
      }
    });

    // 3) Assegno ‘active’ SOLO all’elemento cliccato
    el.classList.add('active');

    // 4) Trovo il triangolino proprio di “el” e gli aggiungo asc o desc
    const tri = el.querySelector('.sort-triangle');
    if (tri) {
      if (currentSort.direction === 'asc') {
        tri.classList.add('asc');
      } else {
        tri.classList.add('desc');
      }
    }

    // 5) Ricarico la lista con il nuovo ordinamento
    loadAndRender(true);
    });
  });

  // Carica prima pagina
  loadAndRender(true);
});
