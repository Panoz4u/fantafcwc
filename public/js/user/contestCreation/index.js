// public/js/user/contestCreation/index.js
 import { getContestDetails, getUserInfo } from "./api.js";
 import { setupEventListeners } from "./events.js";
import { renderContestHeader, renderPlayerList, updateBudgetUI } from "./ui.js";

async function init() {
  const token = localStorage.getItem("authToken");
 
  // 1) Leggi i dati da localStorage
  const contestData = JSON.parse(localStorage.getItem("contestData") || "{}");
  const {
    contestId,
    userId,
    ownerId,
    opponentId,
    fantasyTeams = [],  // squadre create in precedenza (solo per l’owner)
    multiply = 1,
    stake = 0
  } = contestData;

// 2) Se ho già dei chosenPlayers (arrivati da add-members), li rispetto e NON li tocco.
//    Altrimenti, se sono owner con squadra esistente, li popolo; altrimenti svuoto.
const existing = JSON.parse(localStorage.getItem("chosenPlayers") || "[]");
if (Array.isArray(existing) && existing.length > 0) {
  // ho già una selezione, la tengo così com’è
  console.log('Keeping existing chosenPlayers:', existing);
} else if (userId === ownerId && Array.isArray(fantasyTeams) && fantasyTeams.length) {
  // sono owner e ho una squadra preesistente
  localStorage.setItem("chosenPlayers", JSON.stringify(fantasyTeams));
} else {
  // nessuna selezione, svuoto per partire da zero
  localStorage.removeItem("chosenPlayers");
}
 
  // 3) Carica header utente
  const userInfo = await getUserInfo(token);
  document.getElementById("teexBalance").textContent = parseFloat(userInfo.teexBalance).toFixed(1);
   // 4) Prendi i dettagli completi del contest (inclusi ownerTeam/opponentTeam se li mandi)
  const { contest } = await getContestDetails(contestId, userId, token);

 // 5) Se l’API ti ha restituito ownerTeam/opponentTeam, sovrascrivi
 if (userId === ownerId && ownerTeam?.length) {
   localStorage.setItem("chosenPlayers", JSON.stringify(ownerTeam));
 } else if (userId === opponentId && opponentTeam?.length) {
   localStorage.setItem("chosenPlayers", JSON.stringify(opponentTeam));
 }

 renderContestHeader(contest, userId);
  // 3) bind events e render lista
  setupEventListeners(contestId, userId);
  await renderPlayerList();
  updateBudgetUI();
}

document.addEventListener("DOMContentLoaded", init);
