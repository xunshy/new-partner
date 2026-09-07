import type { Partner } from '@new-partner/shared';
import { avatar } from './avatar';
const rarityColors: Record<Partner['rarity'], string> = { SSR: '#fbbf24', SR: '#c084fc', R: '#5eead4' };
export async function exportPartner(partner: Partner) {
  const canvas = document.createElement('canvas'); canvas.width = 900; canvas.height = 1200;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('当前浏览器暂不支持图片导出');
  const accent = rarityColors[partner.rarity];
  ctx.fillStyle = '#16161c'; ctx.fillRect(0, 0, 900, 1200);
  const banner = ctx.createLinearGradient(0, 0, 900, 0); banner.addColorStop(0, '#ec4899'); banner.addColorStop(1, '#8b5cf6');
  ctx.fillStyle = banner; ctx.fillRect(0, 0, 900, 10);
  ctx.fillStyle = '#f2eef7'; ctx.font = 'bold 30px sans-serif'; ctx.fillText('赛博心动 / CYBER CRUSH CLUB', 70, 95);
  ctx.fillStyle = partner.color; ctx.fillRect(70, 140, 760, 450);
  ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.strokeRect(70, 140, 760, 450);
  const image = new Image(); image.src = avatar(partner.id); await image.decode(); ctx.drawImage(image, 260, 170, 380, 380);
  ctx.fillStyle = '#f2eef7'; let nameSize = 54; ctx.font = `bold ${nameSize}px sans-serif`;
  while (ctx.measureText(partner.name).width > 600 && nameSize > 24) ctx.font = `bold ${--nameSize}px sans-serif`;
  ctx.fillText(partner.name, 70, 680);
  ctx.fillStyle = accent; ctx.font = 'bold 28px sans-serif'; ctx.fillText(partner.rarity, 744, 676);
  ctx.fillStyle = '#9b93aa'; ctx.font = '26px sans-serif'; ctx.fillText(`${partner.personality} · ${partner.occupation}`, 70, 732);
  ctx.fillStyle = '#ded6e7'; ctx.font = '25px sans-serif'; let line = ''; let y = 810;
  for (const char of partner.quote) { if (ctx.measureText(line + char).width > 760) { ctx.fillText(line, 70, y); line = ''; y += 40; } line += char; }
  ctx.fillText(line, 70, y);
  partner.stats.forEach((stat, i) => {
    const x = 70 + (i % 2) * 400; const top = 950 + Math.floor(i / 2) * 76;
    ctx.fillStyle = '#9b93aa'; ctx.font = '24px sans-serif'; ctx.fillText(stat.label, x, top);
    ctx.fillStyle = '#f2eef7'; ctx.font = 'bold 28px sans-serif'; ctx.fillText(String(stat.value), x + 245, top);
    ctx.fillStyle = '#ffffff1f'; ctx.fillRect(x, top + 14, 330, 6);
    ctx.fillStyle = accent; ctx.fillRect(x, top + 14, 330 * (stat.value / 100), 6);
  });
  ctx.fillStyle = '#6f6880'; ctx.font = '22px sans-serif'; ctx.fillText('今天的心动，编译成功。', 70, 1140);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('图片导出失败')), 'image/png'));
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `new-partner-${partner.id.slice(0, 8)}.png`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
