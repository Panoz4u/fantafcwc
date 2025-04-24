export async function fetchCurrentEventUnit() {
  try {
    const resp = await fetch('/current-event-unit');
    if (!resp.ok) throw new Error('Errore nel recupero dell\'unità evento');
    const unitData = await resp.json();
    return unitData.event_unit_id;
  } catch {
    return '';
  }
}
