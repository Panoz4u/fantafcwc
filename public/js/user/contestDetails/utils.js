// utils.js
export function getAvatarSrc(avatar, username, userColor) {
    if (avatar && avatar.trim() !== "") {
      if (avatar.startsWith("http")) {
        return avatar.includes("googleusercontent.com")
          ? decodeURIComponent(avatar)
          : avatar;
      }
      return `/avatars/${avatar}`;
    }
    // fallback: avatar generato su canvas
    return generateColoredInitialsAvatar(username, userColor);
  }
  
  export function generateColoredInitialsAvatar(username, color) {
    const bgColor  = color || "ff5500";
    const initials = username ? username.substring(0,3).toUpperCase() : "?";
    const canvas   = document.createElement("canvas");
    canvas.width   = canvas.height = 200;
    const ctx      = canvas.getContext("2d");
    ctx.fillStyle  = "#" + bgColor;
    ctx.beginPath();
    ctx.arc(100,100,100,0,Math.PI*2);
    ctx.fill();
    ctx.fillStyle  = "#fff";
    ctx.font       = "bold 80px Barlow Condensed, sans-serif";
    ctx.textAlign  = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials,100,100);
    return canvas.toDataURL("image/png");
  }