export function formatTime(dateStr) {
  return new Date(dateStr).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
}

export function getAvatarUrl(username, avatar) {
  if (avatar) return avatar;
  const char = (username || '?')[0].toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="#334155" rx="32"/><text x="32" y="32" text-anchor="middle" dominant-baseline="central" font-size="24" fill="#94a3b8" font-family="sans-serif" font-weight="bold">${char}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const ratingColors = [
  { max: 200, color: '#94a3b8' },    // 灰
  { max: 450, color: '#60a5fa' },    // 蓝
  { max: 800, color: '#4ade80' },    // 绿
  { max: 1000, color: '#fbbf24' },   // 黄
  { max: 1150, color: '#fb923c' },   // 橙
  { max: 1400, color: '#f87171' },   // 红
  { max: Infinity, color: '#a78bfa' }, // 紫
]

export function usernameColor(role, rating) {
  if (role === 'admin') return '#38bdf8';
  if (rating != null) {
    for (const tier of ratingColors) {
      if (rating <= tier.max) return tier.color;
    }
  }
  return '#94a3b8';
}

export function renderContent(text) {
  return text.replace(/@(\S+)/g, '<span class="mention">@$1</span>');
}
