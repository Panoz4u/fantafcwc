/**
 * public/js/user/utils/avatar.js
 *
 * Questo modulo esporta la funzione per risolvere il percorso
 * corretto dell'avatar dell'utente in base a URL o filename.
 */

/**
 * Restituisce il percorso corretto dell'immagine avatar
 * - Se è un URL (http...), lo restituisce decodificato
 * - Altrimenti assume un file locale in `avatars/`
 * - Se vuoto, restituisce immagine di default
 *
 * @param {string} avatar    URL o nome file avatar
 * @param {string} username  (opzionale) per alt text
 * @param {string} userColor (opzionale) colore associato
 * @returns {string}
 */
export function getAvatarSrc(avatar, username, userColor) {
    if (avatar && avatar.trim() !== '') {
      if (avatar.startsWith('http')) {
        if (avatar.includes('googleusercontent.com')) {
          return decodeURIComponent(avatar);
        }
        return avatar;
      }
      return `avatars/${avatar}`;
    }
    return 'images/silouette.jpg';
  }
  