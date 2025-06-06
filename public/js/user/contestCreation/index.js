// public/js/user/contestCreation/index.js
import { getContestDetails, getUserInfo } from "./api.js";
import { setupEventListeners } from "./events.js";
import { renderContestHeader, renderPlayerList, updateBudgetUI } from "./ui.js";

async function init() {
  const token = localStorage.getItem("authToken");

  // 1) Leggi i dati da localStorage
  //    Se non c’è nulla in localStorage, prendo "{}" di default
  const contestData = JSON.parse(localStorage.getItem("contestData") || "{}");
  console.log("🔎 [DEBUG] localStorage.contestData completa:", contestData);
  // Destrutturiamo con un "fallback" esplicito su opponentId: se non esiste, lo mettiamo a 0
  const {
    contestId    = 0,
    userId       = 0,
    ownerId      = 0,
    opponentId   = 0,
    eventUnitId  = 0,
    fantasyTeams = [],
    multiply     = 1,
    stake        = 0
  } = contestData;
  
// Per ora riprendiamo i valori così come sono
const opponentIdClean = Number(opponentId) || 0;
const eventUnitIdClean = Number(eventUnitId) || 0;

console.log("⚙️ [DEBUG] contestData: ", contestData);
console.log("⚙️ [DEBUG] contestId =", contestId,
            "ownerId =", ownerId,
            "opponentIdClean =", opponentIdClean,
            "eventUnitIdClean =", eventUnitIdClean);

  // 2) Gestione chosenPlayers
  const existing = JSON.parse(localStorage.getItem("chosenPlayers") || "[]");
  if (Array.isArray(existing) && existing.length > 0) {
    console.log('Keeping existing chosenPlayers:', existing);
  } else if (userId === ownerId && Array.isArray(fantasyTeams) && fantasyTeams.length) {
    localStorage.setItem("chosenPlayers", JSON.stringify(fantasyTeams));
  } else {
    localStorage.removeItem("chosenPlayers");
  }

  // 3) Carica header utente (saldo teex)
  const userInfo = await getUserInfo(token);
  document.getElementById("teexBalance").textContent =
    parseFloat(userInfo.teexBalance).toFixed(1);

  // 4) Chiamata a getContestDetails → ora passiamo sempre un opponentId numerico
  //    (0 significa “nessun avversario” per la Private League)
  const { contest, ownerTeam, opponentTeam } = await getContestDetails(
    contestId,
    ownerId,
    opponentIdClean,
    eventUnitIdClean,
    token
  );

  // 5) Se il server ha restituito ownerTeam/opponentTeam, li usiamo per popolare chosenPlayers
  if (userId === ownerId && Array.isArray(ownerTeam) && ownerTeam.length) {
    localStorage.setItem("chosenPlayers", JSON.stringify(ownerTeam));
  } else if (userId === opponentId && Array.isArray(opponentTeam) && opponentTeam.length) {
    localStorage.setItem("chosenPlayers", JSON.stringify(opponentTeam));
  }

  // 6) Renderizzo header e lista giocatori (vuota o pre‐popolata)
  renderContestHeader(contest, userId);
  setupEventListeners(contestId, userId);
  await renderPlayerList();
  updateBudgetUI();
}

document.addEventListener("DOMContentLoaded", init);