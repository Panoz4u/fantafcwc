// public/js/user/contestCreation/index.js

import { getContestDetails, getUserInfo } from "./api.js";
import { setupEventListeners }            from "./events.js";
import { renderContestHeader, renderPlayerList, updateBudgetUI } from "./ui.js";
import '../../session-expired-handler.js';

async function init() {
  // ────────────────────────────────────────────────
  // 1) DEBUG: cosa c'è in localStorage.contestData?
  

  // definisco raw prima di usarlo
  const raw = localStorage.getItem("contestData") || "{}";

  let contestData;
  try {
    contestData = JSON.parse(raw);
  } catch (err) {
    console.error("❌ Errore parsing contestData:", err);
    contestData = {};
  }
  

    // estraggo tutti i campi, compreso fantasyTeamId e currentUserId/UserId
   const {
      contestId               = 0,
      ownerId                 = 0,
      opponentId              = 0,
      eventUnitId             = 0,
      currentUserAvatar       = "",
      currentUserName         = "",
      currentUserInitialCost  = "0.0",
      fantasyTeamId           = null,
      // il recap flow mette currentUserId, il create flow mette userId
      currentUserId: fromRecap,
      userId:        fromCreate = 0
    } = contestData;
  
    // Se è arrivato currentUserId (da recap), lo uso, altrimenti fallback su userId
    const currentUserId = fromRecap != null ? Number(fromRecap) : Number(fromCreate);
    const userId        = currentUserId;


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
  
    const fallbackFT = (userId === ownerId)
      ? contest.owner_team_id
      : contest.opponent_team_id;
  
    const merged = {
      ...stored,
      status:        contest.status,
      multiply:      contest.multiply,
      contestType:   contest.contest_type,
      fantasyTeamId: stored.fantasyTeamId != null
                      ? stored.fantasyTeamId   // rientro da recap (invitato)
                      : fallbackFT            // creazione nuova challenge (owner)
    };
  
    
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
