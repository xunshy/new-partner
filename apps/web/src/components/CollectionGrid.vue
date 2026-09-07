<script setup lang="ts">
import { motion } from 'motion-v';
import { ArrowUpRight, Heart, LoaderCircle, Plus, Search } from 'lucide-vue-next';
import type { Partner } from '@new-partner/shared';
import Button from './ui/button/Button.vue';
import { avatar } from '../lib/avatar';

defineProps<{ partners: Partner[]; total: number; loading: boolean; error: string; search: string }>();
defineEmits<{ 'update:search': [value: string]; open: [partner: Partner]; retry: []; create: [] }>();
</script>

<template>
  <div class="collection-tools">
    <span>{{ total }} 位特别关注</span>
    <label class="search-field"><Search :size="16" /><input :value="search" placeholder="搜索名字或性格" aria-label="搜索收藏" @input="$emit('update:search', ($event.target as HTMLInputElement).value)" /></label>
  </div>

  <div v-if="loading" class="collection-empty"><LoaderCircle class="spin" /><p>正在打开你的宇宙…</p></div>
  <div v-else-if="error" class="collection-empty"><p>{{ error }}</p><Button variant="outline" @click="$emit('retry')">重新加载</Button></div>
  <div v-else-if="!partners.length" class="collection-empty">
    <Heart :size="34" />
    <h2>{{ search ? '还没找到这个 TA' : '这里还没有特别关注' }}</h2>
    <p>{{ search ? '换一个名字或性格试试。' : '从一次随机相遇开始吧。' }}</p>
    <Button v-if="!search" @click="$emit('create')"><Plus />new 一个对象</Button>
  </div>
  <div v-else class="collection-grid">
    <motion.button v-for="(partner, i) in partners" :key="partner.id" class="partner-card" :data-rarity="partner.rarity" :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }" :transition="{ delay: Math.min(i, 8) * 0.05, duration: 0.4 }" @click="$emit('open', partner)">
      <div class="card-portrait" :style="{ background: partner.color }">
        <img :src="avatar(partner.id)" :alt="partner.name + '的头像'" />
        <span class="rarity">{{ partner.rarity }}</span>
      </div>
      <div class="card-body">
        <h2>{{ partner.name }}<ArrowUpRight :size="16" /></h2>
        <p>{{ partner.personality }} · {{ partner.kind }}</p>
        <div><span>{{ partner.occupation }}</span><span><Heart :size="11" />{{ partner.affection }}</span></div>
      </div>
    </motion.button>
  </div>
</template>
