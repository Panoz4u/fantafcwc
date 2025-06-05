function getAvatarUrl(avatarPath) {
    if (!avatarPath) return 'avatars/avatar.jpg';
    if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) return avatarPath;
    return `avatars/${avatarPath}`;
  }
  
  function getAvatarSrc(avatar, name, color) {
    if (!avatar) {
      if (name) {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${color || 'random'}&color=fff`;
      }
      return 'avatars/default.png';
    }
  
    if (avatar.startsWith('http')) {
      return avatar.includes('googleusercontent.com') ? decodeURIComponent(avatar) : avatar;
    }
  
    return `avatars/${avatar}`;
  }
  
  module.exports = { getAvatarUrl, getAvatarSrc };