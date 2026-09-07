import type { Partner } from '@new-partner/shared';
import { avatar } from './avatar';
export async function exportPartner(partner: Partner) {
  const canvas = document.createElement('canvas'); canvas.width = 900; canvas.height = 1200;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('当前浏览器暂不支持图片导出');
  ctx.fillStyle = '#f6f7f3'; ctx.fillRect(0, 0, 900, 1200);
  ctx.fillStyle = '#302135'; ctx.font = 'bold 30px sans-serif'; ctx.fillText('赛博心动 / CYBER CRUSH CLUB', 70, 85);
  ctx.fillStyle = partner.color; ctx.fillRect(70, 130, 760, 450);
  const image = new Image(); image.src = avatar(partner.id); await image.decode(); ctx.drawImage(image, 260, 160, 380, 380);
  ctx.fillStyle = '#263025'; let nameSize = 54; ctx.font = `bold ${nameSize}px sans-serif`;
  while (ctx.measureText(partner.name).width > 600 && nameSize > 24) ctx.font = `bold ${--nameSize}px sans-serif`;
  ctx.fillText(partner.name, 70, 670);
  ctx.font = 'bold 28px sans-serif'; ctx.fillText(partner.rarity, 744, 666);
  ctx.font = '26px sans-serif'; ctx.fillText(`${partner.personality} · ${partner.occupation}`, 70, 722);
  ctx.fillStyle = '#586451'; ctx.font = '25px sans-serif'; let line = ''; let y = 800;
  for (const char of partner.quote) { if (ctx.measureText(line + char).width > 760) { ctx.fillText(line, 70, y); line = ''; y += 40; } line += char; }
  ctx.fillText(line, 70, y);
  partner.stats.forEach((stat, i) => { const x = 70 + (i % 2) * 400; const y = 940 + Math.floor(i / 2) * 70; ctx.font = '24px sans-serif'; ctx.fillText(stat.label, x, y); ctx.font = 'bold 28px sans-serif'; ctx.fillText(String(stat.value), x + 245, y); });
  ctx.font = '22px sans-serif'; ctx.fillText('今天的心动，编译成功。', 70, 1130);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('图片导出失败')), 'image/png'));
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `new-partner-${partner.id.slice(0, 8)}.png`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
