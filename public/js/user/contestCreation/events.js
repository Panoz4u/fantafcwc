// public/js/user/contestCreation/events.js
import { fetchUsers, fetchUserLandingInfo, fetchContestDetails, confirmSquad } from './api.js';
import { renderContestHeader, renderPlayerList, updateBudgetUI, showMultiplyOverlay, hideOverlay } from './ui.js';
import { loadChosenPlayers, saveChosenPlayers, getTotalCost } from './utils.js';

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
    showMultiplyOverlay(getTotalCost, async (multiplier) => {
      // callback invocata al confirm del moltiplicatore
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
    });
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

export function bindUI() {
    document.getElementById("backArrow").onclick = () => window.history.back();
    document.getElementById("addPlayerBtn").onclick = () => {
      // salva addPlayerData e fai location.href = "/add-members.html";
    };
    document.getElementById("resetTeamBtn").onclick = () => {
      localStorage.removeItem("chosenPlayers");
      renderPlayerList();
    };
    document.getElementById("confirmFooterBtn").onclick = () => {
      showMultiplyOverlay(getTotalCost);
    };
    document.getElementById("cancelMultiply").onclick = hideOverlay;
    document.getElementById("confirmMultiply").onclick = async () => {
      const payload = buildPayload();      // ricostruisci i dati
      const token   = localStorage.getItem("authToken");
      await confirmSquadApi(payload, token);
      window.location.href = "/user-landing.html";
    };
  }