// public/js/avatarUtils.js

// Versione non-modulo delle funzioni per l'avatar
function getAvatarUrl(avatarPath) {
  if (!avatarPath) return "avatars/avatar.jpg";
  if (avatarPath.startsWith("http://") || avatarPath.startsWith("https://")) return avatarPath;
  return `avatars/${avatarPath}`;
}

// Avatar utility functions - versione unificata
function getAvatarSrc(avatar, name, color) {
  // Se non c'è avatar, genera un avatar basato sul nome o usa default
  if (!avatar || avatar.trim() === "") {
    if (name) {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${color || 'random'}&color=fff`;
    }
    return "avatars/default.png";
  }
  
  // Se l'avatar è un URL completo, usalo direttamente
  if (avatar.startsWith("http")) {
    // Per gli URL di Google, assicuriamoci che non ci siano problemi di encoding
    if (avatar.includes("googleusercontent.com")) {
      return decodeURIComponent(avatar);
    }
    return avatar;
  }
  
  // Altrimenti, considera l'avatar come un nome file nella cartella avatars
  return "avatars/" + avatar;
}

// Funzione per generare un avatar colorato con le iniziali
function generateColoredInitialsAvatar(username, color) {
  // Usa un colore predefinito se non è specificato
  const bgColor = color || "ff5500";
  
  // Ottieni le prime 3 lettere dello username (o meno se lo username è più corto)
  const initials = username ? username.substring(0, 3).toUpperCase() : "?";
  
  // Crea un canvas temporaneo
  const canvas = document.createElement("canvas");
  canvas.width = 200;
  canvas.height = 200;
  const ctx = canvas.getContext("2d");
  
  // Disegna il cerchio colorato
  ctx.fillStyle = "#" + bgColor;
  ctx.beginPath();
  ctx.arc(100, 100, 100, 0, Math.PI * 2);
  ctx.fill();
  
  // Imposta lo stile del testo
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 80px 'Barlow Condensed', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  
  // Disegna le iniziali
  ctx.fillText(initials, 100, 100);
  
  // Converti il canvas in un data URL
  return canvas.toDataURL("image/png");
}

// Esponi le funzioni globalmente
window.getAvatarUrl = getAvatarUrl;
window.getAvatarSrc = getAvatarSrc;
window.generateColoredInitialsAvatar = generateColoredInitialsAvatar;

