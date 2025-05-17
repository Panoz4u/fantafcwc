/**
 * Utility per gestire le informazioni dell'utente
 */

/**
 * Ottiene l'ID dell'utente corrente
 * @returns {string} L'ID dell'utente corrente
 */
export function getCurrentUserId() {
  return localStorage.getItem('userId');
}

/**
 * Verifica se l'utente corrente è il proprietario del contest
 * @param {Object} contest - L'oggetto contest
 * @param {string} [userId] - ID utente opzionale, se non fornito usa getCurrentUserId()
 * @returns {boolean} True se l'utente corrente è il proprietario, altrimenti false
 */
export function isCurrentUserOwner(contest, userId) {
  // Usa l'userId passato come parametro o recuperalo dal localStorage
  const currentUserId = userId || getCurrentUserId();
  
  if (!currentUserId || !contest || !contest.owner_id) {
    console.warn('isCurrentUserOwner: dati mancanti', { currentUserId, contest });
    return false;
  }
  return String(contest.owner_id) === String(currentUserId);
}