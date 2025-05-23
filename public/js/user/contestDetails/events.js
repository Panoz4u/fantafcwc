// public/js/user/contestDetails/events.js

import { fetchContestDetails, fetchTeexBalance } from './api.js';
import {
  renderContestHeader,
  renderTeamLists,
  renderTeexBalance,
  showError
} from './ui.js';

export async function initContestDetails() {
  const contestId    = localStorage.getItem("contestId");
  const ownerId      = localStorage.getItem("ownerId");
  const opponentId   = localStorage.getItem("opponentId");
  const eventUnitId  = localStorage.getItem("eventUnitId");
  const authToken    = localStorage.getItem("authToken");
  const currentUserId= localStorage.getItem("userId");

  try {
    console.log('request params:', { contestId, ownerId, opponentId, eventUnitId });
    const [data, balance] = await Promise.all([
      fetchContestDetails(contestId, ownerId, opponentId, eventUnitId, authToken),
      fetchTeexBalance(authToken)
    ]);

    renderTeexBalance(balance);
    renderContestHeader(data.contest, currentUserId);
    renderTeamLists(data.ownerTeam, data.opponentTeam, data.contest, currentUserId);

  } catch (error) {
    console.error('Errore caricamento contest details:', error);
    showError(error.message || 'Errore caricamento contest details');
  }

  document.getElementById("backArrow")
    .addEventListener("click", () => window.location.href = "/user-landing.html");
}
