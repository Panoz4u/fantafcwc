// eventUnit.js
// Tiny standalone module: handles fetching the current event unit from the backend.
// Any other module can import this without pulling in the whole big bundle.
// Example:
//   import { fetchCurrentEventUnit } from './eventUnit.js';
//   const eventUnitId = await fetchCurrentEventUnit();

export async function fetchCurrentEventUnit() {
  try {
    const resp = await fetch("/current-event-unit");
    if (!resp.ok) throw new Error("Errore nel recupero dell'unità evento");
    const unitData = await resp.json();
    return unitData.event_unit_id;
  } catch (error) {
    // Log the error so we can see it in the console during development
    console.error("fetchCurrentEventUnit:", error);
    return "";
  }
}
