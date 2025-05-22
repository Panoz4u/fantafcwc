// public/js/user/addMembers/events.js
import { fetchAllAthletes } from './api.js';
import { renderPlayers, updateHeaderStats } from './ui.js';
import { loadChosenPlayers, saveChosenPlayers } from './utils.js';

let allAthletes = [];
let currentList = [];   // la lista filtrata+ordinata
let currentSort = { field: null, asc: true };


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
  renderPlayers(currentList, handleToggle); // ri-render per disabilitare i costi fuori budget
  updateHeaderStats();
};

export async function initAddMembers() {
  allAthletes = await fetchAllAthletes();
    // 1) copia array e imposta sort di default su Name ASC
    currentList = [...allAthletes];
    currentSort = { field: 'athlete_shortname', asc: true };
    sortList(currentSort.field, currentSort.asc);
  
    setupEventListeners();
  
    // 2) evidenzia Name come colonna attiva e freccia
    const nameHeader = document.querySelector('.sort-item[data-sort="athlete_shortname"]');
    nameHeader.classList.add('active');
    const tri = document.createElement('div');
    tri.className = 'sort-triangle asc';
    nameHeader.appendChild(tri);
  
    // 3) render iniziale già ordinato
    renderPlayers(currentList, handleToggle);
    updateHeaderStats();
  
}

export function setupEventListeners() {
  // back arrow...
  document.getElementById('backArrow')
  .addEventListener('click', () => {
    window.location.href = '/contest-creation.html';
  });
    // UPDATE TEAM: rimanda a contest-creation.html
    document.getElementById('addToTeamBtn')
    .addEventListener('click', () => {
      // chosenPlayers è già salvato onToggle
      window.location.href = '/contest-creation.html';
    });
  // UPDATE TEAM...

  // --- SEARCH ---
  const searchInput = document.getElementById('searchInput');
  const clearBtn   = document.getElementById('clearSearch');

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    currentList = allAthletes.filter(p =>
      p.athlete_shortname.toLowerCase().includes(q) ||
      (p.player_team_code||'').toLowerCase().includes(q)
    );
    // dopo il filter, applica anche il sort corrente
    if (currentSort.field) {
      sortList(currentSort.field, currentSort.asc);
    }
    renderPlayers(currentList, handleToggle);
    updateHeaderStats();
  });

  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    currentList = [...allAthletes];
    if (currentSort.field) sortList(currentSort.field, currentSort.asc);
    renderPlayers(currentList, handleToggle);
    updateHeaderStats();
  });

;
  
document.querySelectorAll('.sort-item').forEach(el => {
  el.addEventListener('click', () => {
    const fieldName = el.dataset.sort;  // "athlete_shortname", "player_team_code", o "event_unit_cost"

    if (currentSort.field === fieldName) {
      // stesso campo: toggle direzione
      currentSort.asc = !currentSort.asc;
    } else {
      // nuovo campo: default ASC, tranne Cost → DESC
      currentSort.field = fieldName;
      currentSort.asc   = fieldName === 'event_unit_cost' ? false : true;
    }

    // Applica il sort e ridisegna
    sortList(currentSort.field, currentSort.asc);
    renderPlayers(currentList, handleToggle);
    updateHeaderStats();

    // Aggiorna UI: colonna attiva + freccia
    document.querySelectorAll('.sort-item').forEach(x => x.classList.remove('active'));
    el.classList.add('active');

    // Rimuovi vecchie frecce e aggiungi la nuova
    document.querySelectorAll('.sort-triangle').forEach(t => t.remove());
    const triangle = document.createElement('div');
    triangle.className = `sort-triangle ${currentSort.asc ? 'asc' : 'desc'}`;
    el.appendChild(triangle);
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