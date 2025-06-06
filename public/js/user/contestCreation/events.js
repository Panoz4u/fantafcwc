// public/js/user/contestCreation/events.js

import { renderPlayerList, updateBudgetUI, showMultiplyOverlay } from './ui.js';
import { loadChosenPlayers, saveChosenPlayers, getTotalCost }      from './utils.js';
import { postConfirmLeague }                                      from './api.js';

export function setupEventListeners(contestId, userId) {
  // ← Freccia “Back” in alto a sinistra
  const backEl = document.getElementById('backArrow');
  if (backEl) {
    backEl.addEventListener('click', () => {
      window.history.back();
    });
  }

  // ← Bottone “Add Players”
  const addBtn = document.getElementById('addPlayerBtn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      localStorage.setItem('addPlayerData',
        JSON.stringify({
          owner:    userId,
          opponent: null,
          contest:  contestId,
          user:     userId,
          timestamp: Date.now()
        })
      );
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
      // se status>0, blocco al multiply già definito
      const lockedMul = contestData.status > 0
                        ? contestData.multiply
                        : null;

      // 2) Apro la modale per scegliere (o confermare) il multiplier
      showMultiplyOverlay(getTotalCost, async (multiplier) => {
        // 3) Costruisco il payload per il backend
        const squadData = {
          contestId:      contestId,
          currentUserId:  userId,
          fantasyTeamId:  contestData.fantasyTeamId,
          players:        loadChosenPlayers().map(p => ({
                              athleteId:       Number(p.athlete_id),
                              event_unit_cost: Number(p.event_unit_cost),
                              aep_id:          p.aep_id || null
                          })),
          multiplier:     multiplier
        };

        console.log('🚀 [DEBUG] postConfirmLeague payload:', squadData);

        // 4) Chiamo l’API di conferma league
        try {
          await postConfirmLeague(squadData);
          // 5) Pulisco e torno alla landing
          localStorage.removeItem('chosenPlayers');
          window.location.href = '/user-landing.html';
        } catch (err) {
          console.error('❌ Errore postConfirmLeague:', err);
          alert('Errore nella conferma league: ' + (err.message || err));
        }
      }, lockedMul);
    });
  }

  // ← Evento per rimozione dinamica di un giocatore dalla lista
  document.addEventListener('removePlayer', e => {
    const idx = e.detail;
    const pl  = loadChosenPlayers();
    pl.splice(idx, 1);
    saveChosenPlayers(pl);
    renderPlayerList();
    updateBudgetUI();
  });
}
