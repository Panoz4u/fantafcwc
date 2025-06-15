// public/js/user/contestCreation/events.js

import { renderPlayerList, updateBudgetUI, showMultiplyOverlay } from './ui.js';
import { loadChosenPlayers, saveChosenPlayers, getTotalCost }      from './utils.js';
import { postConfirmLeague, postConfirmSquad }                     from './api.js';

/**
 * Inizializza tutti gli event listener per la pagina di creazione contest
 * @param {number|string} contestId - ID del contest
 * @param {number|string} userId    - ID dell'utente corrente
 */
export function setupEventListeners(contestId, userId) {
  // ← Freccia “Back” in alto a sinistra
  const backEl = document.getElementById('backArrow');
  if (backEl) {
    backEl.addEventListener('click', () => window.history.back());
  }
    // — Recupero subito i dati del contest (in particolare contestType)
    const contestData = JSON.parse(localStorage.getItem('contestData') || '{}');
  
  
  // ← Bottone “Add Players”
  const addBtn = document.getElementById('addPlayerBtn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      localStorage.setItem('addPlayerData', JSON.stringify({
        owner:     userId,
        opponent:  null,
        contest:   contestId,
        user:      userId,
        timestamp: Date.now()
      }));
      window.location.href = '/add-members.html';
    });
  }

  // ← Bottone “Reset Team”
  const resetBtn = document.getElementById('resetTeamBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Sei sicuro di resettare la squadra?')) {
        localStorage.removeItem('chosenPlayers');
        renderPlayerList();
        updateBudgetUI();
      }
    });
  }

  // ← Bottone “PLAY” / “Confirm” nella modale del multiply
  const confirmBtn = document.getElementById('confirmFooterBtn');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      // 1) Prendo i dati del contest da localStorage
      const contestData = JSON.parse(localStorage.getItem('contestData') || '{}');
      // se status > 0, blocco al multiply già definito
      const lockedMul = contestData.status > 0 ? contestData.multiply : null;

      // 2) Apro la modale per scegliere (o confermare) il multiplier
      showMultiplyOverlay(getTotalCost, async (multiplier) => {
        // 3) Costruisco il payload per il backend
        const playerPayload = loadChosenPlayers().map(p => ({
          athleteId:       Number(p.athlete_id),
          event_unit_cost: Number(p.event_unit_cost),
          aep_id:          p.aep_id || null
        }));

        try {
          // 4) Decido quale API chiamare in base al tipo di contest
          if (contestData.contestType === 2) {
            // Contest di tipo lega
            const payload = {
              contestId:     contestId,
              currentUserId: userId,
              fantasyTeamId: contestData.fantasyTeamId,
              players:       playerPayload,
              multiplier:    multiplier
            };
           
            await postConfirmLeague(payload);
          } else {
            // Contest head-to-head
            const payload = {
              contestId:   contestId,
              players:     playerPayload,
              multiplier:  multiplier,
              totalCost:   getTotalCost()
            };
            
            await postConfirmSquad(payload);
          }

          // 5) Pulisco e torno alla landing
          localStorage.removeItem('chosenPlayers');
          window.location.href = '/user-landing.html';

        } catch (err) {
                console.error('❌ Errore conferma contest:', err);
                // --- Apri la modale con il messaggio di errore ---
                const modal   = document.getElementById('insufficientBalanceModal');
                const msgEl   = document.getElementById('insufficientBalanceMessage');
                // se il server restituisce { error: '...' }
                msgEl.textContent = err.error || err.message || 'Errore durante la conferma.';
                modal.classList.add('open');
        }
      }, lockedMul);
    });
  }


  // — Chiusura modale “Saldo insufficiente” —
  const insufficientModal = document.getElementById('insufficientBalanceModal');
  if (insufficientModal) {
    // clic sulla “×”
    insufficientModal
      .querySelector('.close')
      .addEventListener('click', () =>
        insufficientModal.classList.remove('open')
      );
    // clic su OK
    document
      .getElementById('insufficientBalanceClose')
      .addEventListener('click', () =>
        insufficientModal.classList.remove('open')
      );
  }

  // ← Evento per rimozione dinamica di un giocatore dalla lista
  document.addEventListener('removePlayer', e => {
    const idx = e.detail;
    const players = loadChosenPlayers();
    players.splice(idx, 1);
    saveChosenPlayers(players);
    renderPlayerList();
    updateBudgetUI();
  });
}