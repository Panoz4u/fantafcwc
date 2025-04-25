// public/js/avatarUtils.js

// Esporta le funzioni per l'utilizzo come modulo
export function getAvatarUrl(avatarPath) {
  if (!avatarPath) return "avatars/avatar.jpg";
  if (avatarPath.startsWith("http://") || avatarPath.startsWith("https://")) return avatarPath;
  return `avatars/${avatarPath}`;
}

// Avatar utility functions - versione unificata
export function getAvatarSrc(avatar, name, color) {
  if (!avatar) {
    // Se non c'è avatar, genera un avatar basato sul nome o usa default
    if (name) {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${color || 'random'}&color=fff`;
    }
    return "avatars/default.png";
  }
  
  // Se l'avatar è un URL completo, usalo direttamente
  if (avatar.startsWith("http")) {
    // Gestisci il caso specifico di Google
    return avatar.includes("googleusercontent.com")
      ? decodeURIComponent(avatar)
      : avatar;
  }
  
  // Altrimenti, considera l'avatar come un nome file nella cartella avatars
  return `avatars/${avatar}`;
}

// Aggiungi anche le funzioni come proprietà globali per l'uso in script non-modulo
if (typeof window !== 'undefined') {
  window.getAvatarUrl = getAvatarUrl;
  window.getAvatarSrc = getAvatarSrc;
}

