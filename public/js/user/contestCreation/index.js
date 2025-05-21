// public/js/user/contestCreation/index.js
import { getContestDetails, getUserInfo } from "./api.js";
import { bindUI, setupEventListeners } from "./events.js";
import { renderContestHeader, renderPlayerList, updateBudgetUI } from "./ui.js";

async function init() {
  const token = localStorage.getItem("authToken");
  const contestData = JSON.parse(localStorage.getItem("contestData")||"{}");
  const { contestId, userId } = contestData;
  // 1) carica header user
  const userInfo = await getUserInfo(token);
  document.getElementById("teexBalance").textContent = parseFloat(userInfo.teexBalance).toFixed(1);
  // 2) carica contest details
  const { contest } = await getContestDetails(contestId, userId, token);
  renderContestHeader(contest);
  // 3) bind events e render lista
  setupEventListeners(contestId, userId);
  await renderPlayerList();
  updateBudgetUI();
}

document.addEventListener("DOMContentLoaded", init);
