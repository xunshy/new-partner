<script setup lang="ts">
import { motion } from 'motion-v';
import { ArrowLeft, Coffee, Download, Gift, Heart, MessageCircle, Pencil, Trash2 } from 'lucide-vue-next';
import type { Action, Partner, PartnerEvent } from '@new-partner/shared';
import Button from './ui/button/Button.vue';
import { avatar } from '../lib/avatar';

defineProps<{ partner: Partner; events: PartnerEvent[]; busy: boolean; cooldown: number }>();
defineEmits<{ back: []; rename: []; remove: []; download: []; interact: [action: Action] }>();
const time = (value: string) => new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
</script>

<template>
  <div class="detail-toolbar">
    <Button variant="ghost" :disabled="busy" @click="$emit('back')"><ArrowLeft />返回卡包</Button>
    <div>
      <Button variant="ghost" size="icon" title="重命名" aria-label="重命名" :disabled="busy" @click="$emit('rename')"><Pencil /></Button>
      <Button variant="ghost" size="icon" title="删除对象" aria-label="删除对象" :disabled="busy" @click="$emit('remove')"><Trash2 /></Button>
    </div>
  </div>

  <div class="card detail-profile" :data-rarity="partner.rarity">
    <motion.div class="detail-portrait" :style="{ background: partner.color }" :initial="{ scale: 0.85, opacity: 0 }" :animate="{ scale: 1, opacity: 1 }" :transition="{ type: 'spring', stiffness: 280, damping: 20 }">
      <img :src="avatar(partner.id)" :alt="partner.name + '的头像'" />
      <span class="rarity-chip">{{ partner.rarity }} · {{ partner.kind }}</span>
    </motion.div>
    <h2>{{ partner.name }}</h2>
    <p>{{ partner.personality }} · {{ partner.occupation }}</p>
    <blockquote>“{{ partner.quote }}”</blockquote>
    <div class="affection"><span><Heart :size="14" />好感度</span><strong>{{ partner.affection }} / 100</strong></div>
    <div class="affection-track"><div :style="{ width: partner.affection + '%' }"></div></div>
    <Button variant="outline" class="w-full" :disabled="busy" @click="$emit('download')"><Download />导出名片</Button>
  </div>

  <div class="interaction-area">
    <div class="interaction-head">
      <span>一起积攒小事</span>
      <span class="mono">{{ cooldown ? `${cooldown}s 后再互动` : 'TODAY IS A GOOD DAY' }}</span>
    </div>
    <div class="interaction-buttons">
      <Button variant="outline" :disabled="busy || cooldown > 0" @click="$emit('interact', 'chat')"><MessageCircle />聊聊天</Button>
      <Button variant="outline" :disabled="busy || cooldown > 0" @click="$emit('interact', 'gift')"><Gift />送礼物</Button>
      <Button variant="outline" :disabled="busy || cooldown > 0" @click="$emit('interact', 'date')"><Coffee />去约会</Button>
    </div>
    <h3 class="memory-heading">心动备忘录 <span>{{ events.length }}</span></h3>
    <p v-if="busy && !events.length" class="muted">正在翻开回忆…</p>
    <div v-else-if="!events.length" class="memory-empty"><MessageCircle :size="28" /><p>故事还没开始，今天先说声你好。</p></div>
    <ol v-else class="timeline">
      <motion.li v-for="(event, i) in events" :key="event.id" :initial="{ opacity: 0, x: -10 }" :animate="{ opacity: 1, x: 0 }" :transition="{ delay: Math.min(i, 6) * 0.05, duration: 0.35 }">
        <span class="timeline-dot"></span>
        <time>{{ time(event.createdAt) }}</time>
        <p>{{ event.message }}</p>
        <span class="event-delta">好感度 +{{ event.delta }}</span>
      </motion.li>
    </ol>
  </div>
</template>
