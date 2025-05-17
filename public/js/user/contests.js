/**
 * contests_commented.js
 * Versione commentata di public/js/user/contests.js
 * Questo file contiene le funzioni per:
 *  - caricare i dati utente e le sfide (loadUserLanding)
 *  - disegnare la lista delle sfide (renderContestList)
 *  - gestire aperture/chiusure di modali e tab
 *
 * Ogni funzione è spiegata passo-passo per facilitare la comprensione.
 */


// --------------------------
// 3) Caricamento della pagina utente e delle sfide
// --------------------------

/**
 * Carica i dati header utente e le liste delle sfide
 * - Prende userId e authToken da localStorage
 * - Chiama l'API /api/user-contests
 * - Se OK, ottiene { contests: { active, completed } }
 * - Passa le liste a renderContestList
 */
import { createContestCard } from './contestCard.js';
export async function loadUserLanding() {
    // 1) Prendo userId e authToken
    const userId = localStorage.getItem('userId');
    console.log('[loadUserLanding] userId from localStorage:', userId); // LOG AGGIUNTO

    // Visualizza userId nell'HTML per debug
    const debugUserIdEl = document.getElementById('debugUserId');
    if (debugUserIdEl) {
        debugUserIdEl.textContent = `User ID: ${userId || 'Non Trovato in localStorage'}`;
    }

    const authToken = localStorage.getItem('authToken');
  
    // 2) Se manca uno dei due, torno al login
    if (!userId || !authToken) {
      window.location.href = 'signin.html';
      return;
    }
  
    try {
      // 3) Chiamata al server
      const resp = await fetch('/api/user-contests', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (!resp.ok) {
        const errorText = await resp.text();
        console.error('Errore backend:', resp.status, errorText);
        alert('Errore nel caricamento utente.');
        return;
      }
  
      // 4) Leggo i dati JSON
      const { contests } = await resp.json();
      console.log('Risposta /api/user-contests →', contests);
      console.log('Dati ricevuti:', contests);
    // --- test nuovo endpoint /api/user-contests ---

  // ---------------------------------------------
      // 6) Render delle due liste
      renderContestList(contests.active,   document.getElementById('activeContainer'),   userId);
      renderContestList(contests.completed, document.getElementById('completedContainer'), userId);
         } catch (err) {
      console.error('Errore in loadUserLanding:', err);
    }
    }
  
// --------------------------
// 4) Render delle liste di sfide
// --------------------------

/**
 * Disegna le cards dei contest in un container
 * - Filtra status === 0 (creati) se non vogliamo mostrarli
 * - Per ogni contest, ricava i dati di owner vs opponent
 * - Costruisce dinamicamente il markup HTML
 * @param {Array} list - array di oggetti contest
 * @param {HTMLElement} container - div dove appendere le cards
 */

export function renderContestList(list, container, userId) {
  console.log('[renderContestList] Received userId parameter:', userId); // LOG AGGIUNTO
  // 1) validazione: voglio sempre un array
  if (!Array.isArray(list)) {
    console.error('renderContestList: list non è un array', list);
    return;
  }
 
  // 2) svuoto il container
  container.innerHTML = '';
  
  // 3) se la lista è vuota, mostro un messaggio
  if (list.length === 0) {
    container.innerHTML = '<div class="empty-list">Nessuna sfida disponibile</div>';
    return;
  }
  
  // 4) per ogni contest, creo una card
  list.forEach(contest => {
    // Assicurati che userId sia definito prima di passarlo
    const userIdToPass = userId || localStorage.getItem('userId'); // Questo fallback è una sicurezza
    console.log('[renderContestList] For contest_id:', contest.contest_id, 'Passing userIdToPass to createContestCard:', userIdToPass); // LOG AGGIUNTO
    const contestCard = createContestCard(contest, userIdToPass);
    if (contestCard) {
      container.appendChild(contestCard);
    }
  });
}

  export function showActive() {
    document.getElementById("tabActive").innerHTML = '<span class="tab_on">ACTIVE</span>';
    document.getElementById("tabCompleted").innerHTML = '<span class="tab_off">COMPLETED</span>';
    document.getElementById("activeContainer").style.display = "block";
    document.getElementById("completedContainer").style.display = "none";
  }
  
  export function showCompleted() {
    document.getElementById("tabActive").innerHTML = '<span class="tab_off">ACTIVE</span>';
    document.getElementById("tabCompleted").innerHTML = '<span class="tab_on">COMPLETED</span>';
    document.getElementById("activeContainer").style.display = "none";
    document.getElementById("completedContainer").style.display = "block";
  }

  // Carica i dati dell'utente quando la pagina è pronta
  document.addEventListener("DOMContentLoaded", function() {
    loadUserLanding();
    
    // Aggiungi event listener al pulsante NEW GAME
    document.getElementById("playButton").addEventListener("click", function() {
      window.location.href = "scegli-opponent.html";
    });
    
    // Aggiungi event listener ai tab
    document.getElementById("tabActive").addEventListener("click", function() {
      document.getElementById("activeContainer").style.display = "block";
      document.getElementById("completedContainer").style.display = "none";
      document.getElementById("tabActive").querySelector("span").className = "tab_on";
      document.getElementById("tabCompleted").querySelector("span").className = "tab_off";
    });
    
    document.getElementById("tabCompleted").addEventListener("click", function() {
      document.getElementById("activeContainer").style.display = "none";
      document.getElementById("completedContainer").style.display = "block";
      document.getElementById("tabActive").querySelector("span").className = "tab_off";
      document.getElementById("tabCompleted").querySelector("span").className = "tab_on";
    });
    
    // Aggiungi event listener al pulsante Sign Out
    document.getElementById("signOutBtn").addEventListener("click", function() {
      // Rimuovi i dati di autenticazione dal localStorage
      localStorage.removeItem('userId');
      localStorage.removeItem('authToken');
      // Reindirizza alla pagina di login
      window.location.href = "/signin.html";
    });
  });