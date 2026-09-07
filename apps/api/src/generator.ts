import { randomInt, randomUUID } from 'node:crypto';
import { personalities, rarityRates, type CreatePartnerInput, type Partner, type Action } from '@new-partner/shared';

const pick = <T>(items: readonly T[]): T => items[randomInt(items.length)]!;
const profiles = {
  温柔治愈: { occupations: ['月亮邮递员', '情绪修理师', '云朵收藏家'], tags: ['拥抱充电', '记得你忌口', '情绪稳定'], quote: '世界偶尔会报错，但我会一直响应你。' },
  傲娇嘴硬: { occupations: ['口是心非研究员', '宇宙嘴硬冠军', '深夜便利店店长'], tags: ['嘴硬心软', '偷偷关心', '醋意检测中'], quote: '才不是特意等你。我只是刚好一直在线。' },
  搞笑担当: { occupations: ['快乐外包工程师', '废话文学教授', '地球气氛组组长'], tags: ['梗含量超标', '快乐制造', '永不冷场'], quote: '别人都在优化算法，我在优化你今天的笑点。' },
  冷静理性: { occupations: ['星际架构师', '凌晨两点调试员', '平行宇宙分析师'], tags: ['逻辑满分', '行动派', '专属例外'], quote: '分析了所有可能性，最优解还是你。' },
};

export function rarityForRoll(roll: number): Partner['rarity'] {
  if (!Number.isInteger(roll) || roll < 0 || roll >= 100) throw new RangeError('Invalid rarity roll');
  let threshold = 0;
  for (const rate of rarityRates) { threshold += rate.probability; if (roll < threshold) return rate.rarity; }
  throw new Error('Rarity probabilities must sum to 100');
}

export function generatePartner(input: CreatePartnerInput): Partner {
  const personality = input.personality === '随机惊喜' ? pick(personalities.slice(1)) : input.personality;
  const profile = profiles[personality as keyof typeof profiles];
  const roll = randomInt(100);
  return {
    id: randomUUID(), name: input.nickname || pick(['小序', '阿零', '星野', '知夏', '林初', '小满', '迟遇', '一白']),
    kind: input.kind === '不限' ? pick(['男朋友', '女朋友', '好搭子'] as const) : input.kind,
    personality, rarity: rarityForRoll(roll),
    occupation: pick(profile.occupations), quote: profile.quote, tags: profile.tags,
    stats: ['心动指数', '幽默天赋', '靠谱程度', '隐藏脑洞'].map(label => ({ label, value: randomInt(45, 100) })),
    color: pick(['#d7ef89', '#bce9e1', '#f6ceea', '#ffd295']),
    affection: 0, saved: false, createdAt: new Date().toISOString(),
  };
}

export function generateInteraction(action: Action, name: string) {
  const events = {
    chat: ['认真听完你的碎碎念，还给每一句标了重点。', '发来一条语音：今天也想做你的特别关注。', '讲了一个冷笑话。你没笑，TA 自己笑到掉线。'],
    gift: ['拆开礼物，把包装纸也仔细收进了收藏夹。', '说着“下次别破费”，手却诚实地拍了十八张照片。', '回赠了你一颗虚拟星星。有效期：永远。'],
    date: ['和你看了一场日落，忘记了整个世界的加载进度。', '约你散步，绕了三圈还是舍不得说再见。', '带你去吃夜宵，点的全是你喜欢的。'],
  };
  return { message: `${name}${pick(events[action])}`, delta: action === 'chat' ? 3 : action === 'gift' ? 5 : 8 };
}
