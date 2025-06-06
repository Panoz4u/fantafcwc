// public/js/user/leagueRecap/index.js

import { fetchLeagueRecap }    from './api.js';
import { initLeagueRecap }     from './ui.js';
import { bindRecapEvents,
         bindBackArrowEvent }  from './events.js';

document.addEventListener('DOMContentLoaded', async () => {
  console.log('📢 RAW recapContestData:', localStorage.getItem('recapContestData'));

  // 1) Leggo e valido recapContestData
  const rawRecap = localStorage.getItem('recapContestData');
  if (!rawRecap) {
    alert('Nessun recapContestData trovato in LocalStorage');
    return;
  }

  let recap;
  try {
    recap = JSON.parse(rawRecap);
  } catch (err) {
    console.error('❌ Errore parsing recapContestData:', err);
    alert('Formato recapContestData non valido');
    return;
  }
  console.log('✅ Parsed recapContestData:', recap);

  const {
    contestId,
    contestName,
    ownerId,
    opponentId,
    eventUnitId,
    fantasyTeams,
    currentUser
  } = recap;

  const userId = Number(currentUser?.id);
  if (!contestId || !userId) {
    console.error('❌ Dati contestId o currentUser.id mancanti:', { contestId, userId });
    alert('Dati contest o utente mancanti per la Recap');
    return;
  }

  // 2) Attacco subito il listener della freccia “back”
  bindBackArrowEvent();

  // 3) Preparo token e chiamo il backend
  const token = localStorage.getItem('authToken');
  if (!token) {
    console.error('❌ Auth token mancante');
    alert('Sessione scaduta, effettua il login.');
    return;
  }

  let data;
  try {
    console.log(`⏳ Chiamata fetchLeagueRecap per contestId=${contestId}`);
    data = await fetchLeagueRecap(contestId, token);
    console.log('✅ fetchLeagueRecap restituito:', data);
  } catch (err) {
    console.error('❌ Errore caricamento League Recap:', err);
    alert('Non è stato possibile caricare la recap della League.');
    return;
  }

  // 4) Inizializzo la UI: tutte le card (avatar + username)
  initLeagueRecap({
    contestName,
    fantasyTeams: data.fantasyTeams,
    currentUserId: userId
  });
  console.log('✅ initLeagueRecap eseguito');

  // 5) Estraggo il fantasy-team corrente per preparare contestData
  const currentFT = data.fantasyTeams.find(ft => Number(ft.user_id) === userId) || {};
  const fantasyTeamId = currentFT.id 
                        ?? currentFT.fantasy_team_id 
                        ?? currentFT.ft_id 
                        ?? null;

  const contestData = {
    // preservo tutto ciò che c’era in recap
    ...recap,
    // sovrascrivo o aggiungo
    contestId,
    currentUserId:        userId,
    fantasyTeamId,
    currentUserAvatar:    currentFT.avatar      || '',
    currentUserName:      currentFT.username    || '',
    currentUserInitialCost: currentFT.total_cost != null
                             ? parseFloat(currentFT.total_cost).toFixed(1)
                             : '0.0'
  };

  console.log('💾 [DEBUG] contestData salvato in localStorage:', contestData);
  localStorage.setItem('contestData', JSON.stringify(contestData));

  // 6) Associo gli eventi ai pulsanti (“Accept”, “Back”, ecc.)
  console.log('💡 bindRecapEvents with', { contestId, userId, ownerId, opponentId, eventUnitId });
  bindRecapEvents(contestId, userId, ownerId, opponentId, eventUnitId);
  console.log('🎉 leagueRecap/index.js init completato');
});
