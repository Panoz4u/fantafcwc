// public/js/user/contestCreation/events.js
import { getContestDetails } from './api.js';
import { renderContestHeader, renderPlayerList, updateBudgetUI, showMultiplyOverlay, hideOverlay } from './ui.js';
import { loadChosenPlayers, saveChosenPlayers, getTotalCost } from './utils.js';
import { confirmSquad } from './api.js';

export function setupEventListeners(contestId, userId) {
  // Back
  document.getElementById('backArrow').addEventListener('click', () => window.history.back());

  // Add Artists
  document.getElementById('addPlayerBtn').addEventListener('click', () => {
    localStorage.setItem('addPlayerData',
      JSON.stringify({ owner: userId, opponent: null, contest: contestId, user: userId, timestamp: Date.now() })
    );
    window.location.href = '/add-members.html';
  });

  // Reset Team
  document.getElementById('resetTeamBtn').addEventListener('click', () => {
    if (confirm('Sei sicuro di resettare la squadra?')) {
      localStorage.removeItem('chosenPlayers');
      renderPlayerList();
      updateBudgetUI();
    }
  });

  // PLAY → moltiplicatore
  document.getElementById('confirmFooterBtn').addEventListener('click', () => {
  // 1) Prendi i dati della sfida
  const contestData = JSON.parse(localStorage.getItem('contestData') || '{}');
  const isNewContest = contestData.status === 0;           // status=0 è “CREATED”
  const isInvited    = contestData.status === 1            // status=1 è “PENDING”
                      && contestData.userId !== contestData.ownerId;
  const lockedMul    = isInvited ? contestData.multiply : null;

    showMultiplyOverlay(getTotalCost, async (multiplier) => {     // callback invocata al confirm del moltiplicatore
      const squadData = {
        contestId,
        userId,
        owner_id: userId,
        opponent_id: null,   // lo ricavi da localStorage o window.contestData
        players: loadChosenPlayers().map(p => ({
          athleteId: parseInt(p.athlete_id),
          eventUnitId: parseInt(p.event_unit_id),
          event_unit_cost: parseFloat(p.event_unit_cost),
          aep_id: p.aep_id || null
        })),
        multiplier,
        totalCost: getTotalCost()
      };
      try {
        await confirmSquad(squadData);
        localStorage.removeItem('chosenPlayers');
        window.location.href = '/user-landing.html';
      } catch (err) {
        alert('Errore nella conferma: ' + (err.error||err));
      }
    }, lockedMul);
  });

  // Rimozione giocatore (delegata da ui.js)
  document.addEventListener('removePlayer', e => {
    const idx = e.detail;
    const pl = loadChosenPlayers();
    pl.splice(idx,1);
    saveChosenPlayers(pl);
    renderPlayerList();
    updateBudgetUI();
  });
}

