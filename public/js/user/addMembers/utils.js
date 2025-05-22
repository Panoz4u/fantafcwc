// public/js/user/addMembers/utils.js
export function loadChosenPlayers() {
    const c = localStorage.getItem("chosenPlayers");
    try { return c ? JSON.parse(c) : []; }
    catch { return []; }
  }
  export function saveChosenPlayers(list) {
    localStorage.setItem("chosenPlayers", JSON.stringify(list));
  }
  export function getTotalCost() {
    return loadChosenPlayers()
      .reduce((sum,p) => sum + parseFloat(p.event_unit_cost||0), 0);
  }
  export function getAvailableBudget() {
    return Math.max(0, 10 - getTotalCost());
  }
  