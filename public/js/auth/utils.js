// public/js/auth/utils.js

/** Genera un colore esadecimale casuale, senza il “#” */
export function generateRandomColor() {
    return Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, '0');
  }
  
  /** Se il nickname è già preso, aggiunge 3 cifre random */
  export async function generateUniqueUsername(username) {
    try {
      const res = await fetch(
        `/check-username?username=${encodeURIComponent(username)}`
      );
      if (res.status === 404) return username;  // non esiste: ok
    } catch (_) {
      // in caso di errore di rete -> appendo comunque un numero
    }
    const randomNum = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return username + randomNum;
  }
  