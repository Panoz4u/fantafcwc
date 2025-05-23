import { renderWelcome, renderNoCompleted } from './components/welcomeNoContests.js';
import { createContestCard }               from './components/contestCard.js';
import { getCurrentUserId }                from '../utils/user.js';
import { getAvatarSrc }                    from '../utils/avatar.js';         // se ti serve altrove
// // --------------------------
// 3) Caricamento della pagina utente e delle sfide
// --------------------------
export async function initUserLanding() {

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

    // ———————————— HEADER ————————————
    try {
      const headerResp = await fetch('/user-landing-info', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (headerResp.ok) {
        const { user } = await headerResp.json();
        renderUserHeader(user);
      } else {
        console.warn('Impossibile caricare header utente');
      }
    } catch (e) {
      console.error('Errore caricamento header:', e);
    }
    // ————————— fine HEADER ——————————
  


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
    const activeContainer    = document.getElementById('activeContainer');
    const completedContainer = document.getElementById('completedContainer');
    
    activeContainer.innerHTML = '';
      contests.active.forEach(c => {
        const card = createContestCard(c, userId);
        if (card) {
          activeContainer.appendChild(card);
        }
      });
      
      completedContainer.innerHTML = '';
      contests.completed.forEach(c => {
        const card = createContestCard(c, userId);
        if (card) {
          completedContainer.appendChild(card);
        }
      });

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



export function renderUserHeader(user) {
  document.getElementById('userAvatar').src = user.avatar.startsWith('http')
    ? decodeURIComponent(user.avatar)
    : `/avatars/${user.avatar}`;
  document.getElementById('userName').textContent = user.username.toUpperCase();
  document.getElementById('teexBalance').textContent = parseFloat(user.teex_balance).toFixed(1);
}

export function renderContestLists(contests, userId) {
  const { active, completed } = contests;
  const activeEl    = document.getElementById('activeContainer');
  const completedEl = document.getElementById('completedContainer');

  if (active.length===0 && completed.length===0) {
    activeEl.innerHTML = '';
    activeEl.appendChild(renderWelcome());
    completedEl.innerHTML = '';
    completedEl.appendChild(renderNoCompleted());
    return;
  }

  activeEl.innerHTML = '';
  active.forEach(c => activeEl.appendChild(createContestCard(c, userId)));

  completedEl.innerHTML = '';
  completed.forEach(c => completedEl.appendChild(createContestCard(c, userId)));
}

