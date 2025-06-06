// public/js/user/leagueDetails/helpers.js

/**
 * Crea una riga “league-player-row” identica a createPlayerRow
 * (manteniamo le stesse classi di Contest Details per ora).
 *
 * @param {Object} player    – Oggetto:
 *     { athlete_id, athlete_shortname, picture,
 *       home_team_code, away_team_code, cost, athlete_unit_points, is_ended }
 * @param {string} side      – “left” (per allineamento; usiamo sempre left in League)
 * @returns {HTMLElement}    – <div> wrapper con classe “player-row”
 */
export function createLeaguePlayerRow(player, side) {
    // ─── creiamo il wrapper e la row ───
    const wrapper = document.createElement("div");
    const row = document.createElement("div");
    row.classList.add("player-row", "league"); // stessa classe di contest-details
  
    // ─── Avatar block ───
    const avatarBlock = document.createElement("div");
    avatarBlock.classList.add("avatar-block");
    avatarBlock.style.position = "relative";
  
    const avatarContainer = document.createElement("div");
    avatarContainer.classList.add("atheleteAvatar");
    const iconImg = document.createElement("img");
    iconImg.src = player.picture
      ? `pictures/${player.picture}`
      : `pictures/player_placeholder.png`;
    iconImg.onerror = () => (iconImg.src = "pictures/player_placeholder.png");
    avatarContainer.appendChild(iconImg);
    avatarBlock.appendChild(avatarContainer);
  
    // ─── Info block ───
    const infoBlock = document.createElement("div");
    infoBlock.classList.add("player-info");
  
    const nameSpan = document.createElement("div");
    nameSpan.classList.add("athlete_shortname");
    nameSpan.textContent = player.athlete_shortname || "";
  
    // ─── Match block ───
    const playerCode = (player.player_team_code || "").toUpperCase();
    const homeCode   = (player.home_team_code   || "").toUpperCase();
    const awayCode   = (player.away_team_code   || "").toUpperCase();
  
    const homeClass = playerCode === homeCode
      ? "match_3letter-team-bold"
      : "player-match";
    const awayClass = playerCode === awayCode
      ? "match_3letter-team-bold"
      : "player-match";
  
    const matchContainer = document.createElement("div");
    matchContainer.classList.add("player-match");
  
    const homeSpanElement = document.createElement("span");
    homeSpanElement.classList.add(homeClass);
    homeSpanElement.textContent = player.home_team_code || "";
  
    const separator = document.createTextNode("-");
    const awaySpanElement = document.createElement("span");
    awaySpanElement.classList.add(awayClass);
    awaySpanElement.textContent = player.away_team_code || "";
  
    matchContainer.append(homeSpanElement, separator, awaySpanElement);
    infoBlock.append(nameSpan, matchContainer);
  
    // ─── Points & cost block ───
    const pointsCostBlock = document.createElement("div");
    pointsCostBlock.classList.add("points-cost-block");
  
    const pointsContainer = document.createElement("div");
    pointsContainer.classList.add("points-container");
    // Chiamiamo updateLeaguePointsDisplay, che gestisce i NaN
    updateLeaguePointsDisplay(player.athlete_unit_points, player.is_ended === 1, pointsContainer);
  
    const costSpan = document.createElement("div");
    costSpan.classList.add("athlete_cost");
    costSpan.textContent = parseFloat(player.cost || 0).toFixed(1);
  
    pointsCostBlock.append(pointsContainer, costSpan);
  
    // ─── Assemblaggio ───
    if (side === "left") {
      row.append(avatarBlock, infoBlock, pointsCostBlock);
    } else {
      row.append(pointsCostBlock, infoBlock, avatarBlock);
    }
  
    wrapper.append(row);
    const sep = document.createElement("div");
    sep.classList.add("player-separator");
    wrapper.appendChild(sep);
  
    return wrapper;
  }
  
  /**
   * Aggiorna la visualizzazione dei punti, ma se "points" è null/undefined mette 0.0
   *
   * @param {number|null} points    – punti del giocatore (può essere null)
   * @param {boolean} isEnded       – se is_ended === 1
   * @param {HTMLElement} container – elemento che riceverà gli <span>
   */
  export function updateLeaguePointsDisplay(points, isEnded, container) {
    container.innerHTML = "";
  
    // Se points è null/undefined, parseFloat → NaN,
    // quindi usiamo (parseFloat(points) || 0) per default 0
    const ptsNumber = parseFloat(points) || 0;
    const ptsStr = ptsNumber.toFixed(1); // es. "0.0"
    const [ptsInt, ptsDec] = ptsStr.split(".");
  
    const intSpan = document.createElement("span");
    intSpan.classList.add("athlete_points_integer", isEnded ? "is_ended" : "not_ended");
    intSpan.textContent = ptsInt;
  
    const decSpan = document.createElement("span");
    decSpan.classList.add("athlete_points_decimal", isEnded ? "is_ended" : "not_ended");
    decSpan.textContent = `.${ptsDec}`;
  
    container.appendChild(intSpan);
    container.appendChild(decSpan);
  }
  