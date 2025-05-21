/**
 * contests_commented.js
 * Versione commentata di public/js/user/contests.js
 * Questo file contiene le funzioni per:
 *  - caricare i dati utente e le sfide (loadUserLanding)
 *  - disegnare la lista delle sfide (renderContestList)
 *  - gestire aperture/chiusure di modali e tab
 */

import { renderWelcome, renderNoCompleted } from './welcomeNoContests.js';
import { createContestCard } from './contestCard.js';

// --------------------------
// 3) Caricamento della pagina utente e delle sfide
// --------------------------
export async function loadUserLanding() {
  const userId = localStorage.getItem('userId');
  console.log('[loadUserLanding] userId from localStorage:', userId);

  const debugUserIdEl = document.getElementById('debugUserId');
  if (debugUserIdEl) {
    debugUserIdEl.textContent = `User ID: ${userId || 'Non Trovato in localStorage'}`;
  }

  const authToken = localStorage.getItem('authToken');
  if (!userId || !authToken) {
    window.location.href = 'signin.html';
    return;
  }

  try {
    const resp = await fetch('/api/user-contests', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (!resp.ok) {
      const errorText = await resp.text();
      console.error('Errore backend:', resp.status, errorText);
      alert('Errore nel caricamento utente.');
      return;
    }

    const { contests } = await resp.json();

    // Se non ci sono sfide né active né completed, mostro welcome
    if (
      Array.isArray(contests.active) && contests.active.length === 0 &&
      Array.isArray(contests.completed) && contests.completed.length === 0
    ) {
      const activeContainer = document.getElementById('activeContainer');
      const completedContainer = document.getElementById('completedContainer');
      
       if (activeContainer) {
         activeContainer.innerHTML = '';
         activeContainer.appendChild(renderWelcome());
      }

       if (completedContainer) {
         completedContainer.innerHTML = '';
         completedContainer.appendChild(renderNoCompleted());
       }

       // Imposto di default il tab ACTIVE visibile
       showActive();
      return;
    }

    // Render delle due liste
    renderContestList(contests.active,   document.getElementById('activeContainer'),   userId);
    renderContestList(contests.completed, document.getElementById('completedContainer'), userId);

  } catch (err) {
    console.error('Errore in loadUserLanding:', err);
  }
}

// --------------------------
// 4) Render delle liste di sfide
// --------------------------
export function renderContestList(list, container, userId) {
  console.log('[renderContestList] Received userId parameter:', userId);
  if (!Array.isArray(list)) {
    console.error('renderContestList: list non è un array', list);
    return;
  }

  container.innerHTML = '';

  if (list.length === 0) {
    container.innerHTML = '';
    container.appendChild(renderNoCompleted());
    return;
  }

  list.forEach(contest => {
    const userIdToPass = userId || localStorage.getItem('userId');
    console.log(
      '[renderContestList] For contest_id:', contest.contest_id,
      'Passing userIdToPass to createContestCard:', userIdToPass
    );
    const contestCard = createContestCard(contest, userIdToPass);
    if (contestCard) container.appendChild(contestCard);
  });
}

// --------------------------
// Funzioni di UI per i tab
// --------------------------
export function showActive() {
  const tabA = document.getElementById("tabActive");
  const tabC = document.getElementById("tabCompleted");
  if (tabA) tabA.innerHTML = '<span class="tab_on">ACTIVE</span>';
  if (tabC) tabC.innerHTML = '<span class="tab_off">COMPLETED</span>';
  const activeCont = document.getElementById("activeContainer");
  const compCont   = document.getElementById("completedContainer");
  if (activeCont) activeCont.style.display = "block";
  if (compCont)   compCont.style.display = "none";
}

export function showCompleted() {
  const tabA = document.getElementById("tabActive");
  const tabC = document.getElementById("tabCompleted");
  if (tabA) tabA.innerHTML = '<span class="tab_off">ACTIVE</span>';
  if (tabC) tabC.innerHTML = '<span class="tab_on">COMPLETED</span>';
  const activeCont = document.getElementById("activeContainer");
  const compCont   = document.getElementById("completedContainer");
  if (activeCont) activeCont.style.display = "none";
  if (compCont)   compCont.style.display = "block";
}

// --------------------------
// 5) Event listener protetti
// --------------------------
document.addEventListener("DOMContentLoaded", function() {
  loadUserLanding();

  // 1) Play Button
  const playBtn = document.getElementById("playButton");
  if (playBtn) {
    playBtn.addEventListener("click", function() {
      window.location.href = "scegli-opponent.html";
    });
  }

  // 2) Tab Active
  const tabA = document.getElementById("tabActive");
  if (tabA) {
    tabA.addEventListener("click", function() {
      showActive();
    });
  }

  // 3) Tab Completed
  const tabC = document.getElementById("tabCompleted");
  if (tabC) {
    tabC.addEventListener("click", function() {
      showCompleted();
    });
  }

  // 4) Sign Out
  const signOutBtn = document.getElementById("signOutBtn");
  if (signOutBtn) {
    signOutBtn.addEventListener("click", function() {
      localStorage.removeItem('userId');
      localStorage.removeItem('authToken');
      window.location.href = "/signin.html";
    });
  }
});
