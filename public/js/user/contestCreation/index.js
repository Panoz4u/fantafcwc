// public/js/user/contestCreation/index.js

import { getContestDetails, getUserInfo } from "./api.js";
import { setupEventListeners }            from "./events.js";
import { renderContestHeader, renderPlayerList, updateBudgetUI } from "./ui.js";

async function init() {
  // ────────────────────────────────────────────────
  // 1) DEBUG: cosa c'è in localStorage.contestData?
  console.log('🔍 RAW contestData:', localStorage.getItem('contestData'));

  // definisco raw prima di usarlo
  const raw = localStorage.getItem("contestData") || "{}";

  let contestData;
  try {
    contestData = JSON.parse(raw);
  } catch (err) {
    console.error("❌ Errore parsing contestData:", err);
    contestData = {};
  }
  console.log("✅ Parsed contestData:", contestData);

  // estraggo tutti i campi, compreso fantasyTeamId
  const {
    contestId               = 0,
    userId                  = 0,
    ownerId                 = 0,
    opponentId              = 0,
    eventUnitId             = 0,
    currentUserAvatar       = "",
    currentUserName         = "",
    currentUserInitialCost  = "0.0",
    fantasyTeamId           = null
  } = contestData;

  console.log("📋 Breakdown →", {
    contestId,
    userId,
    ownerId,
    opponentId,
    eventUnitId,
    fantasyTeamId,
    currentUserAvatar,
    currentUserName,
    currentUserInitialCost
  });
  // ────────────────────────────────────────────────

  // proseguo con il flow originale…
  const token = localStorage.getItem("authToken");
  if (!token) {
    console.error("Auth token mancante – impossibile proseguire");
    return;
  }

  // pre-popolo chosenPlayers se presente
  const chosenKey = "chosenPlayers";
  const existing = JSON.parse(localStorage.getItem(chosenKey) || "[]");
  if (Array.isArray(existing) && existing.length > 0) {
    console.log("Keeping existing chosenPlayers:", existing);
  } else {
    localStorage.removeItem(chosenKey);
  }

  // carico saldo utente
  try {
    const userInfo = await getUserInfo(token);
    document.getElementById("teexBalance").textContent =
      parseFloat(userInfo.teexBalance).toFixed(1);
  } catch (err) {
    console.error("Errore recupero user-info:", err);
  }

  // carico dettagli contest
  let contest, ownerTeam, opponentTeam;
  try {
    ({ contest, ownerTeam, opponentTeam } = await getContestDetails(
      contestId,
      ownerId,
      opponentId,
      eventUnitId,
      token
    ));
  } catch (err) {
    console.error("Errore getContestDetails:", err);
    const errDiv = document.getElementById("errorMessage");
    if (errDiv) {
      errDiv.textContent = "Impossibile caricare i dettagli del contest.";
      errDiv.style.display = "block";
    }
    return;
  }

   // ➡️ rendiamo espliciti i ruoli nel contest object
    contest.owner_user_id   = ownerId;
    contest.opponent_user_id = opponentId;
    contest.current_user_id = userId;
   // ──────────── aggiorno contestData con status e multiply ────────────
   try {
    const stored = JSON.parse(localStorage.getItem("contestData")|| "{}");
    console.log("🔍 [DEBUG] stored.fantasyTeamId prima del merge =", stored.fantasyTeamId);
    const merged = {
    ...stored,
    status: contest.status,
    multiply: contest.multiply,
    // NON tocchiamo fantasyTeamId, lo lasciamo com’è in 'stored'
    contestType: contest.contest_type
    };
    console.log("🔄 [DEBUG] contestData dopo il merge:", merged);
    localStorage.setItem("contestData", JSON.stringify(merged));
    } catch(e) {
    console.error("❌ Errore merge contestData:", e);
    }
   // ────────────────────────────────────────────────────────────────

  // sovrascrivo chosenPlayers con i team restituiti dal server
  if (userId === ownerId && ownerTeam?.length) {
    localStorage.setItem(chosenKey, JSON.stringify(ownerTeam));
  } else if (userId === opponentId && opponentTeam?.length) {
    localStorage.setItem(chosenKey, JSON.stringify(opponentTeam));
  }

  // render header passando il profilo corrente
  renderContestHeader(contest, userId, {
    avatar:      currentUserAvatar,
    username:    currentUserName,
    initialCost: currentUserInitialCost
  });

  // eventi e lista giocatori
  setupEventListeners(contestId, userId);
  await renderPlayerList();
  updateBudgetUI();
}

document.addEventListener("DOMContentLoaded", init);
