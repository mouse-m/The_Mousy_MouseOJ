export function formatTime(dateStr) {
  return new Date(dateStr).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
}

export function getAvatarUrl(username, avatar) {
  if (avatar) return avatar;
  const char = (username || '?')[0].toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="#334155" rx="32"/><text x="32" y="32" text-anchor="middle" dominant-baseline="central" font-size="24" fill="#94a3b8" font-family="sans-serif" font-weight="bold">${char}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function usernameColor(role) {
  return role === 'admin' ? '#38bdf8' : '#94a3b8';
}

export function renderContent(text) {
  return text.replace(/@(\S+)/g, '<span class="mention">@$1</span>');
}
