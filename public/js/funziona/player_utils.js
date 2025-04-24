export function loadChosenPlayers() {
  const c = localStorage.getItem("chosenPlayers");
  if (!c) return [];
  try {
    return JSON.parse(c);
  } catch {
    return [];
  }
}

export function saveChosenPlayers(players) {
  localStorage.setItem("chosenPlayers", JSON.stringify(players));
}

export function getTotalCost() {
  const pl = loadChosenPlayers();
  return pl.reduce((acc, p) => acc + parseFloat(p.event_unit_cost || 0), 0);
}

export function getAvailableBudget() {
  return Math.max(0, 10 - getTotalCost());
}

export async function enrichPlayerData(players) {
  try {
    for (let i = 0; i < players.length; i++) {
      if (!players[i].picture || !players[i].event_unit_id) {
        const resp = await fetch(`/athlete-details?id=${players[i].athlete_id}`);
        if (resp.ok) {
          const athleteData = await resp.json();
          players[i].picture = athleteData.picture || players[i].picture;
          players[i].athlete_shortname = athleteData.athlete_shortname || players[i].athlete_shortname;
          players[i].event_unit_id = athleteData.event_unit_id || players[i].event_unit_id;
        }
      }
    }
    saveChosenPlayers(players);
    return players;
  } catch (error) {
    return players;
  }
}

export function getAvatarUrl(avatarPath) {
  if (!avatarPath) {
    return "avatars/avatar.jpg"; // default avatar
  }
  if (avatarPath.startsWith("http://") || avatarPath.startsWith("https://")) {
    return avatarPath;
  }
  return `avatars/${avatarPath}`;
}

export function getAvatarSrc(avatar) {
  if (avatar) {
    if (avatar.startsWith("http")) {
      if (avatar.includes("googleusercontent.com")) {
        return decodeURIComponent(avatar);
      }
      return avatar;
    } else {
      return `avatars/${avatar}`;
    }
  }
  return "avatars/avatar.jpg";
}
