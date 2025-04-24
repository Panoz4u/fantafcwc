// public/js/avatarUtils.js

export function getAvatarUrl(avatarPath) {
  if (!avatarPath) return "avatars/avatar.jpg";
  if (avatarPath.startsWith("http://") || avatarPath.startsWith("https://")) return avatarPath;
  return `avatars/${avatarPath}`;
}

export function getAvatarSrc(avatar) {
  if (!avatar) return "avatars/avatar.jpg";
  if (avatar.startsWith("http")) {
    return avatar.includes("googleusercontent.com")
      ? decodeURIComponent(avatar)
      : avatar;
  }
  return `avatars/${avatar}`;
}
