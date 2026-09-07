<script setup lang="ts">
import { computed } from 'vue';
import { motion } from 'motion-v';
import { Sparkles, Heart, Check, Download } from 'lucide-vue-next';
import { rarityRates, type Partner } from '@new-partner/shared';
import Button from './ui/button/Button.vue';
import { avatar } from '../lib/avatar';

const props = defineProps<{ loading: boolean; partner: Partner | null; step: number; busy: boolean }>();
defineEmits<{ save: []; download: [] }>();

const drawMessages = ['搜索心动频率', '正在匹配灵魂', '命定信号已捕获'];
const drawAvatars = Array.from({ length: 12 }, (_, i) => avatar('cyber-draw-' + i));
const statColors = ['#ec4899', '#8b5cf6', '#5eead4', '#fbbf24'];
const label = computed(() => rarityRates.find(rate => rate.rarity === props.partner?.rarity)?.label);
const state = computed(() => (props.loading ? '正在连接' : props.partner ? '已相遇' : '等待相遇'));
</script>

<template>
  <div class="stage" :class="{ drawing: loading, revealed: !loading && partner }" :data-rarity="partner?.rarity" :aria-busy="loading">
    <div class="stage-tag">
      <span>{{ partner && !loading ? 'INSTANCE / ' + partner.id.slice(0, 8).toUpperCase() : 'AWAITING YOUR NEXT CRUSH' }}</span>
      <span class="live"><span class="status-dot"></span>{{ state }}</span>
    </div>

    <div v-if="loading" class="drawing-scene" role="status">
      <div class="draw-box" aria-hidden="true">
        <span class="draw-halo"></span>
        <div class="draw-window">
          <div class="draw-reel"><div v-for="(source, i) in drawAvatars" :key="i" class="draw-frame"><img :src="source" alt="" /></div></div>
          <span class="scan-line"></span>
        </div>
      </div>
      <div class="draw-log">
        <p v-for="(message, i) in drawMessages" :key="message" :class="{ on: step === i, done: step > i }">{{ step > i ? '✓' : '>' }} {{ message }}{{ step === i ? '…' : '' }}</p>
      </div>
      <div class="draw-progress" aria-hidden="true"><span v-for="index in 3" :key="index" :class="{ complete: step >= index - 1 }"></span></div>
    </div>

    <motion.div v-else-if="partner" :key="partner.id" class="reveal" :initial="{ opacity: 0, scale: 0.8, rotate: -5 }" :animate="{ opacity: 1, scale: 1, rotate: 0 }" :transition="{ type: 'spring', stiffness: 300, damping: 20 }">
      <span class="reveal-badge"><Sparkles :size="13" />{{ label }} · 心动已降临</span>
      <motion.div class="reveal-avatar" :style="{ background: partner.color }" :initial="{ scale: 0 }" :animate="{ scale: 1 }" :transition="{ delay: 0.2, type: 'spring', stiffness: 260, damping: 16 }">
        <img :src="avatar(partner.id)" :alt="partner.name + '的头像'" />
        <span class="rarity-chip">{{ partner.rarity }} · {{ partner.kind }}</span>
      </motion.div>
      <h2>{{ partner.name }}</h2>
      <p class="reveal-meta">{{ partner.personality }} · {{ partner.occupation }}</p>
      <blockquote>“{{ partner.quote }}”</blockquote>
      <div class="stats-grid">
        <div v-for="(stat, i) in partner.stats" :key="stat.label" class="stat">
          <div><span>{{ stat.label }}</span><strong>{{ stat.value }}<small>/100</small></strong></div>
          <div class="stat-track"><motion.div :initial="{ width: '0%' }" :animate="{ width: stat.value + '%' }" :transition="{ delay: 0.35 + i * 0.1, duration: 0.7 }" :style="{ background: statColors[i] }" /></div>
        </div>
      </div>
      <div class="tags"><motion.span v-for="(tag, i) in partner.tags" :key="tag" :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ delay: 0.5 + i * 0.08 }"># {{ tag }}</motion.span></div>
      <div class="reveal-actions">
        <Button :disabled="partner.saved || busy" @click="$emit('save')"><Check v-if="partner.saved" /><Heart v-else />{{ partner.saved ? '已收藏' : '就 TA 了' }}</Button>
        <Button variant="outline" :disabled="busy" @click="$emit('download')"><Download />导出名片</Button>
      </div>
    </motion.div>

    <div v-else class="idle">
      <div class="idle-orb">
        <span class="orb-ring" aria-hidden="true"></span>
        <span class="orb-ring late" aria-hidden="true"></span>
        <span class="orb-core"><img :src="avatar('orbit')" alt="等待与你相遇的角色剪影" /></span>
      </div>
      <div>
        <h2>虚位以待</h2>
        <p>点一下下面的按钮，从平行宇宙里捞一个 TA 出来。</p>
      </div>
      <code>const 心动 = new Partner()</code>
    </div>
  </div>
</template>
