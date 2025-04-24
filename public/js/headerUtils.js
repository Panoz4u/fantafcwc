// public/js/headerUtils.js
import { getAvatarSrc } from './avatarUtils.js';
import { getTotalCost } from './teamUtils.js';

export function renderContestHeader(contestData) {
  const container = document.getElementById("contestHeaderContainer");
  container.innerHTML = "";  // svuota

  const params = new URLSearchParams(window.location.search);
  const currentUserId = params.get("user");
  const iAmOwner = +currentUserId === +contestData.owner_id;
  const totalTeamCost = getTotalCost().toFixed(1);

  // scegli dati A e B in base a chi è owner
  let myName, myAvatar, myCost, oppName, oppAvatar, oppCost;
  if (iAmOwner) {
    myName   = contestData.owner_name;
    myAvatar = contestData.owner_avatar;
    myCost   = totalTeamCost;
    oppName  = contestData.opponent_name;
    oppAvatar= contestData.opponent_avatar;
    oppCost  = contestData.opponent_cost != null
                ? parseFloat(contestData.opponent_cost).toFixed(1)
                : "-";
  } else {
    myName   = contestData.opponent_name;
    myAvatar = contestData.opponent_avatar;
    myCost   = totalTeamCost;
    oppName  = contestData.owner_name;
    oppAvatar= contestData.owner_avatar;
    oppCost  = contestData.owner_cost != null
                ? parseFloat(contestData.owner_cost).toFixed(1)
                : "-";
  }

  // ricostruisci la card completa
  const statusBadges = {
    0: "CREATED",
    1: iAmOwner ? "PENDING" : "INVITED",
    2: "READY",
    4: "LIVE",
    5: "COMPLETED"
  };
  const statusText = statusBadges[contestData.status] || contestData.status_name;

  const card = document.createElement("div");
  card.classList.add("contest-container", "cc-header");
  card.innerHTML = `
    <div class="contest-bar">
      <img src="${getAvatarSrc(myAvatar)}" alt="${myName}" class="player-avatar-contest left-avatar">
      <div class="triletter_contest left-name">${myName.substring(0, 3)}</div>
      <div class="result_bold">VS</div>
      <div class="triletter_contest right-name">${oppName.substring(0, 3)}</div>
      <img src="${getAvatarSrc(oppAvatar)}" alt="${oppName}" class="player-avatar-contest right-avatar">
      <div class="teex_spent left-teex" id="currentUserScore">${myCost}</div>
      <div class="teex_spent right-teex">${oppCost}</div>
    </div>
    <div class="status-badge-base status-badge">${statusText}</div>
  `;

  container.appendChild(card);
}
