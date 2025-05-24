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
  
  /** Decode base64 JWT (solo per debug in client) */
export function verifyToken(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/** Logga in localStorage e token per debug */
export function debugLogin() {
  console.log("=== DEBUG LOGIN ===");
  console.log("authToken:", localStorage.getItem('authToken'));
  console.log("userId:", localStorage.getItem('userId'));
  console.log("userEmail:", localStorage.getItem('userEmail'));
  const token = localStorage.getItem('authToken');
  if (token) console.log("decoded:", verifyToken(token));
}