// ─── HELPERS (copiati da gestione-sfide.js) ────────────────────────────────
/**
 * Mostra un messaggio di stato in alto nella pagina e lo nasconde dopo 3s.
 * @param {string} msg 
 * @param {'success'|'error'} type 
 */
function showStatusMessage(msg, type) {
   const status = document.getElementById('statusMessage');
   if (!status) return;
   status.textContent = msg;
    status.className = `status-message status-${type}`;
    status.style.display = 'block';
    setTimeout(() => status.style.display = 'none', 3000);
  }
  
  /**
   * Aggiorna i controlli di paginazione (prev/next e info pagina).
   */
  function updatePagination() {
    const totalPages = Math.max(1, Math.ceil(filteredContests.length / itemsPerPage));
    const info    = document.getElementById('pageInfo');
    if (info) info.textContent = `Pagina ${currentPage} di ${totalPages}`;
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
  }
  
  /**
   * Esporta la tabella corrente in CSV.
   */
  function exportContestsToCSV() {
    let csv = 'ID,Owner,Opponent,Status,Created At,Updated At\n';
    filteredContests.forEach(c => {
      const statusMap = {0:'Created',1:'Pending',2:'Ready',4:'Live',5:'Completed'};
      const row = [
        c.contest_id,
        c.owner_username||c.owner_user_id,
        c.opponent_username||c.opponent_user_id||'',
        statusMap[c.status]||c.status,
        new Date(c.created_at).toLocaleString('it-IT'),
        new Date(c.updated_at).toLocaleString('it-IT')
      ];
      csv += row.join(',') + '\n';
    });
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `expired-leagues-${new Date().toISOString().slice(0,10)}.csv`;
   document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  
  /**
   * Apre una modal coi dettagli di una league.
   */
  function viewContestDetails(contestId) {
    const c = allContests.find(x => x.contest_id === contestId);
    if (!c) return showStatusMessage('League non trovata', 'error');
    // (esempio minimale: alert con JSON)
    alert('Dettagli League #'+contestId+':\n'+JSON.stringify(c, null,2));
  }
  // ──────────────


// Variabili globali
let currentPage = 1;
const itemsPerPage = 20; // 20 ligue per pagina
let allContests = [];
let filteredContests = [];
let currentStatus = "1"; // Default: Pending
let sortDirection = "asc"; // Default: Ascendente

// Funzione per caricare le league scadute dal server
async function loadContests() {
  try {
    const response = await fetch('/admin-api/expired-leagues');
    const contests = await response.json();
    allContests = contests;
    filterAndSortContests();
    displayContests();
    updatePagination();
    showStatusMessage('Lista league caricata con successo', 'success');
  } catch (error) {
    console.error('Errore:', error);
    showStatusMessage('Errore nel caricamento delle league: ' + error.message, 'error');
  }
}

// Cancella una singola league
async function deleteContest(contestId) {
  if (confirm(`Sei sicuro di voler cancellare la league #${contestId}?`)) {
    try {
      const res = await fetch(`/admin-api/expired-leagues/${contestId}`, { method: 'DELETE' });
      const result = await res.json();
      if (res.ok) {
        allContests = allContests.filter(c => c.contest_id !== contestId);
        filterAndSortContests();
        displayContests();
        updatePagination();
        showStatusMessage(result.message || 'League cancellata', 'success');
      } else {
        showStatusMessage(result.error || 'Errore nella cancellazione', 'error');
      }
    } catch (err) {
      console.error('Errore:', err);
      showStatusMessage('Errore nella cancellazione', 'error');
    }
  }
}

// Cancella le league selezionate
function deleteSelectedContests() {
  const checkboxes = document.querySelectorAll('.contest-checkbox:checked');
  const contestIds = Array.from(checkboxes).map(cb => cb.getAttribute('data-id'));
  
  if (contestIds.length === 0) {
    showStatusMessage('Nessuna league selezionata', 'error');
    return;
  }
  
  if (!confirm(`Sei sicuro di voler cancellare ${contestIds.length} league?`)) {
    return;
  }
  
  fetch('/admin-api/expired-leagues/bulk-delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ contestIds })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      showStatusMessage(`Cancellate ${data.deleted} league con successo`, 'success');
      loadContests();
    } else {
      showStatusMessage(`Errore: ${data.error}`, 'error');
    }
  })
  .catch(error => {
    console.error('Errore:', error);
    showStatusMessage('Errore nella cancellazione delle league', 'error');
  });
}

// Filtra e ordina le league
function filterAndSortContests() {
    // Filtra in base al tab selezionato e solo contest_type = 2
    if (currentStatus === 'ready-live') {
      // Sfide “Ready” (2) **e** “Live” (4)
      filteredContests = allContests.filter(c => 
        (c.status === 2 || c.status === 4) 
        && c.contest_type === 2
      );
    } else {
      // Pending (1) o Created (0)
      filteredContests = allContests.filter(c => 
        c.status.toString() === currentStatus 
        && c.contest_type === 2
      );
    }
  
  filteredContests.sort((a, b) => {
    const dateA = new Date(a.created_at);
    const dateB = new Date(b.created_at);
    return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
  });
}

// Visualizza le league nella tabella
function displayContests() {
  const sfideList = document.getElementById('sfideList');
  sfideList.innerHTML = '';
  
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredContests.length);
  
    if (filteredContests.length === 0) {
        const emptyRow = document.createElement('tr');
        // Scegli label in base al tab
        const label = currentStatus === '1' 
          ? 'Pending' 
          : currentStatus === '0' 
            ? 'Created' 
            : 'Ready-Live';
        emptyRow.innerHTML = `<td colspan="8" style="text-align: center;">Nessuna league trovata con status ${label}</td>`;
        sfideList.appendChild(emptyRow);
        return;
      }
  
  for (let i = startIndex; i < endIndex; i++) {
    const contest = filteredContests[i];
    const row = document.createElement('tr');
    const createdDate = new Date(contest.created_at).toLocaleString('it-IT');
    const updatedDate = new Date(contest.updated_at).toLocaleString('it-IT');
    const statusText = {
      '0': 'Created',
      '1': 'Pending',
      '2': 'Ready',
      '4': 'Live',
      '5': 'Completed'
    }[contest.status] || contest.status;
    
    const ownerDisplay = contest.owner_username || contest.owner_id;
    const opponentDisplay = contest.opponent_username || contest.opponent_id || '-';
    
    row.innerHTML = `
      <td><input type="checkbox" class="contest-checkbox" data-id="${contest.contest_id}"></td>
      <td>${contest.contest_id}</td>
      <td>${ownerDisplay}</td>
      <td>${opponentDisplay}</td>
      <td>${statusText}</td>
      <td>${createdDate}</td>
      <td>${updatedDate}</td>
      <td>
        <button class="btn btn-primary btn-small" onclick="forceCloseSelectedContests([${contest.contest_id}])">Chiudi</button>
        <button class="btn btn-info btn-small" onclick="viewContestDetails(${contest.contest_id})">Dettagli</button>
      </td>
    `;
    
    sfideList.appendChild(row);
  }
}

// Il resto delle funzioni (updatePagination, showStatusMessage, viewContestDetails, exportContestsToCSV, event listeners) rimangono identiche a gestione-sfide.js

document.addEventListener('DOMContentLoaded', function() {
  loadContests();
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      currentStatus = this.dataset.status;
      currentPage = 1;
      filterAndSortContests();
      displayContests();
      updatePagination();
    });
  });
  document.getElementById('sortDirection').addEventListener('click', function() {
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    document.getElementById('sortDirectionText').textContent = sortDirection.toUpperCase();
    document.getElementById('sortDirectionIcon').textContent = sortDirection === 'asc' ? '↑' : '↓';
    filterAndSortContests();
    displayContests();
  });
  document.getElementById('prevPage').addEventListener('click', function() {
    if (currentPage > 1) { currentPage--; displayContests(); updatePagination(); }
  });
  document.getElementById('nextPage').addEventListener('click', function() {
    const totalPages = Math.ceil(filteredContests.length / itemsPerPage);
    if (currentPage < totalPages) { currentPage++; displayContests(); updatePagination(); }
  });
  document.getElementById('selectAll').addEventListener('change', function() {
    const isChecked = this.checked;
    document.querySelectorAll('.contest-checkbox').forEach(cb => cb.checked = isChecked);
  });
  document.getElementById('selectAllBtn').addEventListener('click', function() {
    document.getElementById('selectAll').checked = true;
    document.querySelectorAll('.contest-checkbox').forEach(cb => cb.checked = true);
  });
  document.getElementById('deleteSelectedBtn').addEventListener('click', deleteSelectedContests);
  document.getElementById('exportCsvBtn').addEventListener('click', exportContestsToCSV);
});

function forceCloseSelectedContests(contestIds = null) {
  if (!contestIds) {
    const checkboxes = document.querySelectorAll('.contest-checkbox:checked');
    contestIds = Array.from(checkboxes).map(cb => cb.getAttribute('data-id'));
  }

  if (contestIds.length === 0) {
    showStatusMessage('Nessuna league selezionata', 'error');
    return;
  }

  if (!confirm(`Sei sicuro di voler chiudere forzatamente ${contestIds.length} league?`)) return;

  fetch('/admin-api/expired-leagues/force-close', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contestIds })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      showStatusMessage(`Chiuse forzatamente ${data.closed} league`, 'success');
      loadContests();
    } else {
      showStatusMessage(`Errore: ${data.error}`, 'error');
    }
  })
  .catch(err => showStatusMessage('Errore nella chiusura forzata', 'error'));
}
