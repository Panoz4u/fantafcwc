// Variabili globali
let currentPage = 1;
const itemsPerPage = 50;
let allContests = [];
let filteredContests = [];
let currentStatus = "0"; // Default: Created
let currentSort = "created_at"; // Default: Data creazione
let sortDirection = "asc"; // Default: Ascendente (più vecchie prima)

// Funzione per caricare le sfide dal server
async function loadContests() {
  try {
    // Chiamata all'API che si connette al database MySQL
    const response = await fetch('/api/contests/list');
    if (!response.ok) {
      throw new Error('Errore nel caricamento delle sfide');
    }
    
    allContests = await response.json();
    filterAndSortContests();
    displayContests();
    updatePagination();
    
    showStatusMessage('Lista sfide caricata con successo', 'success');
  } catch (error) {
    console.error('Errore:', error);
    showStatusMessage('Errore nel caricamento delle sfide: ' + error.message, 'error');
  }
}

// Filtra e ordina le sfide
function filterAndSortContests() {
  // Filtra per status
  filteredContests = currentStatus === 'all' 
    ? [...allContests] 
    : allContests.filter(contest => contest.status.toString() === currentStatus);
  
  // Ordina
  filteredContests.sort((a, b) => {
    let valueA = a[currentSort];
    let valueB = b[currentSort];
    
    // Gestione speciale per le date
    if (currentSort === 'created_at' || currentSort === 'updated_at') {
      valueA = new Date(valueA);
      valueB = new Date(valueB);
    }
    
    if (sortDirection === 'asc') {
      return valueA > valueB ? 1 : -1;
    } else {
      return valueA < valueB ? 1 : -1;
    }
  });
}

// Visualizza le sfide nella tabella
function displayContests() {
  const sfideList = document.getElementById('sfideList');
  sfideList.innerHTML = '';
  
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredContests.length);
  
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
    
    row.innerHTML = `
      <td><input type="checkbox" class="contest-checkbox" data-id="${contest.contest_id}"></td>
      <td>${contest.contest_id}</td>
      <td>${contest.owner_id}</td>
      <td>${contest.opponent_id || '-'}</td>
      <td>${statusText}</td>
      <td>${createdDate}</td>
      <td>${updatedDate}</td>
      <td>
        <button class="btn btn-dark btn-small" onclick="viewContest(${contest.contest_id})">Dettagli</button>
        <button class="btn btn-primary btn-small" onclick="deleteContest(${contest.contest_id})">Cancella</button>
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
function viewContest(contestId) {
  // Reindirizza alla pagina dei dettagli della sfida
  window.location.href = `/contest-details.html?id=${contestId}`;
}

// Cancella una singola sfida
async function deleteContest(contestId) {
  if (confirm(`Sei sicuro di voler cancellare la sfida #${contestId}?`)) {
    try {
      const response = await fetch(`/api/contests/${contestId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Errore nella cancellazione della sfida');
      }
      
      // Rimuovi la sfida dall'array
      allContests = allContests.filter(contest => contest.contest_id !== contestId);
      filterAndSortContests();
      displayContests();
      updatePagination();
      
      showStatusMessage(`Sfida #${contestId} cancellata con successo`, 'success');
    } catch (error) {
      console.error('Errore:', error);
      showStatusMessage('Errore nella cancellazione: ' + error.message, 'error');
    }
  }
}

// Cancella le sfide selezionate
async function deleteSelectedContests() {
  const selectedCheckboxes = document.querySelectorAll('.contest-checkbox:checked');
  const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.dataset.id);
  
  if (selectedIds.length === 0) {
    showStatusMessage('Nessuna sfida selezionata', 'error');
    return;
  }
  
  if (confirm(`Sei sicuro di voler cancellare ${selectedIds.length} sfide selezionate?`)) {
    try {
      // Chiamata all'API per cancellare più sfide
      const response = await fetch('/api/contests/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ contestIds: selectedIds })
      });
      
      if (!response.ok) {
        throw new Error('Errore nella cancellazione delle sfide');
      }
      
      // Rimuovi le sfide dall'array
      allContests = allContests.filter(contest => !selectedIds.includes(contest.contest_id.toString()));
      filterAndSortContests();
      displayContests();
      updatePagination();
      
      showStatusMessage(`${selectedIds.length} sfide cancellate con successo`, 'success');
    } catch (error) {
      console.error('Errore:', error);
      showStatusMessage('Errore nella cancellazione: ' + error.message, 'error');
    }
  }
}

// Conta e mostra le sfide scadute
async function countExpiredContests() {
  try {
    // Chiamata all'API per contare le sfide scadute
    const response = await fetch('/api/contests/count-expired');
    if (!response.ok) {
      throw new Error('Errore nel conteggio delle sfide scadute');
    }
    
    const data = await response.json();
    return data.count;
  } catch (error) {
    console.error('Errore:', error);
    showStatusMessage('Errore nel conteggio delle sfide scadute: ' + error.message, 'error');
    return 0;
  }
}

// Cancella tutte le sfide scadute
async function deleteExpiredContests() {
  try {
    const expiredCount = await countExpiredContests();
    
    if (expiredCount === 0) {
      showStatusMessage('Non ci sono sfide scadute da cancellare', 'error');
      return;
    }
    
    // Mostra il modal di conferma
    const modal = document.getElementById('deleteModal');
    const expiredCountElement = document.getElementById('expiredCount');
    expiredCountElement.textContent = `Ci sono ${expiredCount} sfide in status 0 o 1 più vecchie di 1 giorno.`;
    modal.style.display = 'block';
    
    // Gestisci la conferma
    document.getElementById('confirmDelete').onclick = async function() {
      try {
        const response = await fetch('/api/contests/delete-expired', {
          method: 'POST'
        });
        
        if (!response.ok) {
          throw new Error('Errore nella cancellazione delle sfide scadute');
        }
        
        // Ricarica le sfide
        await loadContests();
        
        showStatusMessage(`${expiredCount} sfide scadute cancellate con successo`, 'success');
        modal.style.display = 'none';
      } catch (error) {
        console.error('Errore:', error);
        showStatusMessage('Errore nella cancellazione: ' + error.message, 'error');
        modal.style.display = 'none';
      }
    };
    
    // Gestisci l'annullamento
    document.getElementById('cancelDelete').onclick = function() {
      modal.style.display = 'none';
    };
    
    // Chiudi il modal cliccando sulla X
    document.querySelector('.close').onclick = function() {
      modal.style.display = 'none';
    };
    
    // Chiudi il modal cliccando fuori
    window.onclick = function(event) {
      if (event.target === modal) {
        modal.style.display = 'none';
      }
    };
  } catch (error) {
    console.error('Errore:', error);
    showStatusMessage('Errore nel conteggio delle sfide scadute: ' + error.message, 'error');
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
  // Carica le sfide all'avvio
  loadContests();
  
  // Gestisci il filtro per status
  document.getElementById('statusFilter').addEventListener('change', function() {
    currentStatus = this.value;
    currentPage = 1;
    filterAndSortContests();
    displayContests();
    updatePagination();
  });
  
  // Gestisci l'ordinamento
  document.getElementById('sortBy').addEventListener('change', function() {
    currentSort = this.value;
    filterAndSortContests();
    displayContests();
    updatePagination();
  });
  
  // Gestisci il click sulle intestazioni della tabella per ordinare
  document.querySelectorAll('.sfide-table th').forEach(th => {
    if (th.cellIndex > 0) { // Ignora la colonna dei checkbox
      th.addEventListener('click', function() {
        const field = this.dataset.field;
        if (field) {
          if (currentSort === field) {
            // Inverti la direzione se è già ordinato per questo campo
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
          } else {
            currentSort = field;
            sortDirection = 'asc';
          }
          filterAndSortContests();
          displayContests();
        }
      });
    }
  });
  
  // Gestisci la paginazione
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
  
  // Gestisci il checkbox "Seleziona tutti"
  document.getElementById('selectAll').addEventListener('change', function() {
    const isChecked = this.checked;
    document.querySelectorAll('.contest-checkbox').forEach(cb => {
      cb.checked = isChecked;
    });
  });
  
  // Gestisci il pulsante "Aggiorna Lista"
  document.getElementById('refreshButton').addEventListener('click', loadContests);
  
  // Gestisci il pulsante "Cancella Selezionate"
  document.getElementById('deleteSelectedButton').addEventListener('click', deleteSelectedContests);
  
  // Gestisci il pulsante "Cancella Sfide Scadute"
  document.getElementById('deleteExpiredButton').addEventListener('click', deleteExpiredContests);
});