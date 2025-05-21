
// user/contestCreation/utils.js
import { fetchAthleteDetails } from "./api.js";

// 1) LocalStorage players
export function loadChosenPlayers() {
    const c = localStorage.getItem("chosenPlayers");
    return c ? JSON.parse(c) : [];
  }
  export function saveChosenPlayers(players) {
    localStorage.setItem("chosenPlayers", JSON.stringify(players));
  }
  
  // 2) Calcolo costi
  export function getTotalCost() {
    return loadChosenPlayers()
      .reduce((sum, p) => sum + parseFloat(p.event_unit_cost||0), 0);
  }
  export function getAvailableBudget() {
    return Math.max(0, 10 - getTotalCost());
  }
  
 export async function enrichPlayerData(players) {
    for (let p of players) {
      if (!p.picture || !p.event_unit_id) {
        const data = await fetchAthleteDetails(p.athlete_id);
        p.picture           ||= data.picture;
        p.athlete_shortname ||= data.athlete_shortname;
        p.event_unit_id     ||= data.event_unit_id;
        p.aep_id            ||= data.aep_id;
      }
    }
    saveChosenPlayers(players);
    return players;
  }

  export function getAvatarSrc(avatar, name, color) {
    if (!avatar) {
      if (name) {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${color || 'random'}&color=fff`;
      }
      return "avatars/default.png";
    }
    if (avatar.startsWith("http")) {
      return avatar.includes("googleusercontent.com")
        ? decodeURIComponent(avatar)
        : avatar;
    }
    return `avatars/${avatar}`;
  }