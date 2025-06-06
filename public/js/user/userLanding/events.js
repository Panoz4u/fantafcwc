// public/js/user/userLanding/events.js
import { fetchUserInfo, fetchUserContests } from './api.js';
import {
  renderUserHeader,
  renderContestLists,
  showActive,
  showCompleted
} from './ui.js';
import { initGameTypeModal, showGameTypeModal } from './gameTypeModal.js';

document.addEventListener('DOMContentLoaded', async () => {
  const token  = localStorage.getItem('authToken');
  const userId = localStorage.getItem('userId');
  if (!token || !userId) return window.location.href = 'signin.html';

  try {
    const [{ user }, { contests }] = await Promise.all([
      fetchUserInfo(token),
      fetchUserContests(token)
    ]);
    renderUserHeader(user);
    // Salvo il mio avatar e il mio nome in localStorage, così PrivateLeagueCard lo troverà sempre
    localStorage.setItem('currentUserAvatar', user.avatar);
    localStorage.setItem('currentUserName',   user.username);
    renderContestLists(contests, userId);
  } catch (e) {
    console.error(e);
    alert('Errore caricamento pagina');
  }

  initGameTypeModal();
  document.getElementById('playButton')
    .addEventListener('click', showGameTypeModal);

  document.getElementById('tabActive')
    .addEventListener('click',  showActive);
  document.getElementById('tabCompleted')
    .addEventListener('click', showCompleted);

  document.getElementById('signOutBtn')
    .addEventListener('click', () => {
      localStorage.clear();
      window.location.href = '/signin.html';
    });
});
