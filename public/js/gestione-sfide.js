// Variabili globali
let currentPage = 1;
const itemsPerPage = 20; // 20 sfide per pagina come richiesto
let allContests = [];
let filteredContests = [];
let currentStatus = "1"; // Default: Pending
let sortDirection = "asc"; // Default: Ascendente (più vecchie prima)

// Funzione per caricare le sfide dal server
async function loadContests() {
    try {
      const response = await fetch('/admin-api/contests');
      const contests = await response.json();
      allContests = contests;
      filterAndSortContests();
      displayContests();
      updatePagination();
      showStatusMessage('Lista sfide caricata con successo', 'success');
    } catch (error) {
      console.error('Errore:', error);
      showStatusMessage('Errore nel caricamento delle sfide: ' + error.message, 'error');
    }
  }
  

// Cancella una singola sfida
async function deleteContest(contestId) {
    if (confirm(`Sei sicuro di voler cancellare la sfida #${contestId}?`)) {
      try {
        const res = await fetch(`/admin-api/contests/${contestId}`, { method: 'DELETE' });
        const result = await res.json();
        if (res.ok) {
          allContests = allContests.filter(c => c.contest_id !== contestId);
          filterAndSortContests();
          displayContests();
          updatePagination();
          showStatusMessage(result.message || 'Sfida cancellata', 'success');
        } else {
          showStatusMessage(result.error || 'Errore nella cancellazione', 'error');
        }
      } catch (err) {
        console.error('Errore:', err);
        showStatusMessage('Errore nella cancellazione', 'error');
      }
    }
  }
  

// Cancella le sfide selezionate
// Funzione per cancellare le sfide selezionate
function deleteSelectedContests() {
  const checkboxes = document.querySelectorAll('.sfida-checkbox:checked, .contest-checkbox:checked');
  const contestIds = Array.from(checkboxes).map(cb => cb.getAttribute('data-id'));
  
  if (contestIds.length === 0) {
    showStatusMessage('Nessuna sfida selezionata', 'error');
    return;
  }
  
  if (!confirm(`Sei sicuro di voler cancellare ${contestIds.length} sfide?`)) {
    return;
  }
  
  // Assicurati di inviare i dati come JSON con il Content-Type corretto
  fetch('/admin-api/contests/bulk-delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ contestIds })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      showStatusMessage(`Cancellate ${data.deleted} sfide con successo`, 'success');
      loadContests(); // Ricarica le sfide
    } else {
      showStatusMessage(`Errore: ${data.error}`, 'error');
    }
  })
  .catch(error => {
    console.error('Errore:', error);
    showStatusMessage('Errore nella cancellazione delle sfide', 'error');
  });
}


// Filtra e ordina le sfide
function filterAndSortContests() {
    // Filtra per status **e** solo contest_type = 1
  filteredContests = allContests.filter(contest => 
    contest.status.toString() === currentStatus 
    && contest.contest_type === 1
  );
  // Ordina per data di creazione
  filteredContests.sort((a, b) => {
    const dateA = new Date(a.created_at);
    const dateB = new Date(b.created_at);
    
    if (sortDirection === 'asc') {
      return dateA - dateB;
    } else {
      return dateB - dateA;
    }
  });
}

// Visualizza le sfide nella tabella
function displayContests() {
  const sfideList = document.getElementById('sfideList');
  sfideList.innerHTML = '';
  
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredContests.length);
  
  if (filteredContests.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = `<td colspan="8" style="text-align: center;">Nessuna sfida trovata con status ${currentStatus === "1" ? "Pending" : "Created"}</td>`;
    sfideList.appendChild(emptyRow);
    return;
  }
  
  for (let i = startIndex; i < endIndex; i++) {
    const contest = filteredContests[i];
    const row = document.createElement('tr');
    
    // Formatta le date
    const createdDate = new Date(contest.created_at).toLocaleString('it-IT');
    const updatedDate = new Date(contest.updated_at).toLocaleString('it-IT');
    
    // Mappa lo status a testo
    const statusText = {
      '0': 'Created',
      '1': 'Pending',
      '2': 'Ready',
      '4': 'Live',
      '5': 'Completed'
    }[contest.status] || contest.status;
    
    // Utilizza owner_username e opponent_username se disponibili
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
        <button class="btn btn-primary btn-small" onclick="deleteContest(${contest.contest_id})">Cancella</button>
        <button class="btn btn-info btn-small" onclick="viewContestDetails(${contest.contest_id})">Dettagli</button>
      </td>
    `;
    
    sfideList.appendChild(row);
  }
}

// Aggiorna la paginazione
function updatePagination() {
  const totalPages = Math.ceil(filteredContests.length / itemsPerPage);
  document.getElementById('pageInfo').textContent = `Pagina ${currentPage} di ${totalPages || 1}`;
  
  // Abilita/disabilita i pulsanti di navigazione
  document.getElementById('prevPage').disabled = currentPage <= 1;
  document.getElementById('nextPage').disabled = currentPage >= totalPages;
}

// Mostra un messaggio di stato
function showStatusMessage(message, type) {
  const statusMessage = document.getElementById('statusMessage');
  statusMessage.textContent = message;
  statusMessage.className = `status-message status-${type}`;
  statusMessage.style.display = 'block';
  
  setTimeout(() => {
    statusMessage.style.display = 'none';
  }, 3000);
}

// Visualizza i dettagli di una sfida
function viewContestDetails(contestId) {
  try {
    // Trova la sfida nell'array
    const contest = allContests.find(c => c.contest_id === contestId);
    if (!contest) {
      throw new Error('Sfida non trovata');
    }
    
    // Crea una finestra modale per visualizzare i dettagli
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <span class="close">&times;</span>
        <h2>Dettagli Sfida #${contestId}</h2>
        <div class="contest-details">
          <p><strong>ID:</strong> ${contest.contest_id}</p>
          <p><strong>Owner:</strong> ${contest.owner_username || contest.owner_id}</p>
          <p><strong>Opponent:</strong> ${contest.opponent_username || contest.opponent_id || 'Non assegnato'}</p>
          <p><strong>Tipo:</strong> ${contest.contest_type || 'Standard'}</p>
          <p><strong>Status:</strong> ${contest.status}</p>
          <p><strong>Stake:</strong> ${contest.stake || 0} Teex</p>
          <p><strong>Data Creazione:</strong> ${new Date(contest.created_at).toLocaleString('it-IT')}</p>
          <p><strong>Ultimo Aggiornamento:</strong> ${new Date(contest.updated_at).toLocaleString('it-IT')}</p>
          <p><strong>Event Unit ID:</strong> ${contest.event_unit_id || 'N/A'}</p>
          <p><strong>Multiply:</strong> ${contest.multiply || 'N/A'}</p>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Gestisci la chiusura della finestra modale
    const closeBtn = modal.querySelector('.close');
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    // Chiudi la finestra modale cliccando all'esterno
    window.addEventListener('click', (event) => {
      if (event.target === modal) {
        document.body.removeChild(modal);
      }
    });
  } catch (error) {
    console.error('Errore:', error);
    showStatusMessage('Errore nel caricamento dei dettagli: ' + error.message, 'error');
  }
}

// Esporta le sfide in formato CSV
function exportContestsToCSV() {
  try {
    // Prepara l'intestazione del CSV
    let csvContent = "ID,Owner,Opponent,Tipo,Status,Stake,Data Creazione,Ultimo Aggiornamento\n";
    
    // Aggiungi i dati delle sfide filtrate
    filteredContests.forEach(contest => {
      const statusText = {
        '0': 'Created',
        '1': 'Pending',
        '2': 'Ready',
        '4': 'Live',
        '5': 'Completed'
      }[contest.status] || contest.status;
      
      const row = [
        contest.contest_id,
        contest.owner_username || contest.owner_id,
        contest.opponent_username || contest.opponent_id || '',
        contest.contest_type || 'Standard',
        statusText,
        contest.stake || 0,
        new Date(contest.created_at).toLocaleString('it-IT'),
        new Date(contest.updated_at).toLocaleString('it-IT')
      ].join(',');
      
      csvContent += row + "\n";
    });
    
    // Crea un blob e un link per il download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `sfide-${currentStatus}-${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showStatusMessage('Esportazione completata con successo', 'success');
  } catch (error) {
    console.error('Errore:', error);
    showStatusMessage('Errore nell\'esportazione: ' + error.message, 'error');
  }
}

// Gestione degli eventi
document.addEventListener('DOMContentLoaded', function() {
  // Carica le sfide all'avvio
  loadContests();
  
  // Gestione dei tab
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function() {
      // Aggiorna lo stato attivo dei tab
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      
      // Aggiorna lo status corrente
      currentStatus = this.dataset.status;
      currentPage = 1;
      
      // Aggiorna la visualizzazione
      filterAndSortContests();
      displayContests();
      updatePagination();
    });
  });
  
  // Gestione dell'ordinamento
  document.getElementById('sortDirection').addEventListener('click', function() {
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    document.getElementById('sortDirectionText').textContent = sortDirection.toUpperCase();
    document.getElementById('sortDirectionIcon').textContent = sortDirection === 'asc' ? '↑' : '↓';
    
    filterAndSortContests();
    displayContests();
  });
  
  // Gestione della paginazione
  document.getElementById('prevPage').addEventListener('click', function() {
    if (currentPage > 1) {
      currentPage--;
      displayContests();
      updatePagination();
    }
  });
  
  document.getElementById('nextPage').addEventListener('click', function() {
    const totalPages = Math.ceil(filteredContests.length / itemsPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      displayContests();
      updatePagination();
    }
  });
  
  // Gestione del checkbox "Seleziona tutti"
  document.getElementById('selectAll').addEventListener('change', function() {
    const isChecked = this.checked;
    document.querySelectorAll('.contest-checkbox').forEach(checkbox => {
      checkbox.checked = isChecked;
    });
  });
  
  // Pulsante "Seleziona Tutte"
  document.getElementById('selectAllBtn').addEventListener('click', function() {
    const selectAllCheckbox = document.getElementById('selectAll');
    selectAllCheckbox.checked = true;
    document.querySelectorAll('.contest-checkbox').forEach(checkbox => {
      checkbox.checked = true;
    });
  });
  
  // Pulsante "Cancella Selezionate"
  document.getElementById('deleteSelectedBtn').addEventListener('click', deleteSelectedContests);
  
  // Pulsante "Esporta CSV"
  document.getElementById('exportCsvBtn').addEventListener('click', exportContestsToCSV);
});


// Funzione per renderizzare le sfide nella tabella
function renderSfide(sfide) {
  const sfideList = document.getElementById('sfideList');
  sfideList.innerHTML = '';
  
  sfide.forEach(sfida => {
    const row = document.createElement('tr');
    
    // Formatta le date
    const createdDate = new Date(sfida.created_at).toLocaleString('it-IT');
    const updatedDate = new Date(sfida.updated_at).toLocaleString('it-IT');
    
    // Determina il testo dello status
    const statusText = {
      '0': 'Created',
      '1': 'Pending',
      '2': 'Ready',
      '4': 'Live',
      '5': 'Completed'
    }[sfida.status] || sfida.status;
    
    row.innerHTML = `
      <td><input type="checkbox" class="sfida-checkbox" data-id="${sfida.contest_id}"></td>
      <td>${sfida.contest_id}</td>
      <td>${sfida.owner_username || sfida.owner_id}</td>
      <td>${sfida.opponent_username || sfida.opponent_id || 'Non assegnato'}</td>
      <td>${statusText}</td>
      <td>${createdDate}</td>
      <td>${updatedDate}</td>
      <td>
        <button class="btn btn-secondary btn-small details-btn" data-id="${sfida.contest_id}">Dettagli</button>
        <button class="btn btn-primary btn-small delete-btn" data-id="${sfida.contest_id}">Cancella</button>
      </td>
    `;
    
    sfideList.appendChild(row);
  });
  
  // Aggiungi event listener ai pulsanti di dettaglio
  document.querySelectorAll('.details-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const contestId = this.getAttribute('data-id');
      window.showDetailsModal(contestId);
    });
  });
  
  // Aggiungi event listener ai pulsanti di cancellazione
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const contestId = this.getAttribute('data-id');
      deleteSfida(contestId);
    });
  });
}