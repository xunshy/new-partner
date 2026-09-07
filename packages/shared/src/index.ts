import { z } from 'zod';

export const personalities = ['随机惊喜', '温柔治愈', '傲娇嘴硬', '搞笑担当', '冷静理性'] as const;
export const kinds = ['不限', '男朋友', '女朋友', '好搭子'] as const;
export const actions = ['chat', 'gift', 'date'] as const;
export const rarityRates = [
  { rarity: 'SSR', probability: 8, label: '命定心动' },
  { rarity: 'SR', probability: 27, label: '特别频率' },
  { rarity: 'R', probability: 65, label: '日常浪漫' },
] as const;
export type GlobalStats = { total: number; rarities: { rarity: 'SSR' | 'SR' | 'R'; probability: number; label: string; count: number }[]; updatedAt: string };
export const createPartnerSchema = z.object({
  nickname: z.string().trim().max(12).default(''),
  personality: z.enum(personalities).default('随机惊喜'),
  kind: z.enum(kinds).default('不限'),
});
export const renameSchema = z.object({ name: z.string().trim().min(1).max(12) });
export const interactSchema = z.object({ action: z.enum(actions) });
export type CreatePartnerInput = z.infer<typeof createPartnerSchema>;
export type Action = typeof actions[number];
export type Partner = {
  id: string;
  name: string;
  kind: typeof kinds[number];
  personality: typeof personalities[number];
  rarity: 'SSR' | 'SR' | 'R';
  occupation: string;
  quote: string;
  tags: string[];
  stats: { label: string; value: number }[];
  color: string;
  affection: number;
  saved: boolean;
  createdAt: string;
};
export type PartnerEvent = { id: string; partnerId: string; action: Action; message: string; delta: number; createdAt: string };
export type InteractionResult = { partner: Partner; event: PartnerEvent; nextAllowedAt: string };
export const COOLDOWN_MS = 10_000;
