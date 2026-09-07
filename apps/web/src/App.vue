<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { ArrowRight, Sparkles, Heart, Dices, Plus, LoaderCircle, X, SlidersHorizontal, Check } from 'lucide-vue-next';
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle, DialogDescription } from 'reka-ui';
import { personalities, kinds, rarityRates, type GlobalStats, type Partner, type PartnerEvent, type CreatePartnerInput, type Action, type InteractionResult } from '@new-partner/shared';
import Button from './components/ui/button/Button.vue';
import GachaStage from './components/GachaStage.vue';
import CollectionGrid from './components/CollectionGrid.vue';
import PartnerDetail from './components/PartnerDetail.vue';
import { api, ApiError } from './lib/api';
import { exportPartner } from './lib/export';
import { celebrate, flash } from './lib/confetti';

const view = ref<'create' | 'collection'>('create');
const form = reactive<CreatePartnerInput>({ nickname: '', personality: '随机惊喜', kind: '不限' });
const current = ref<Partner | null>(null);
const collection = ref<Partner[]>([]);
const selected = ref<Partner | null>(null);
const events = ref<PartnerEvent[]>([]);
const loading = ref(false); const busy = ref(false); const collecting = ref(true);
const notice = ref(''); const loadError = ref(''); const search = ref('');
const dialog = ref<'rename' | 'delete' | null>(null); const newName = ref('');
const now = ref(Date.now()); const nextAllowedAt = ref(0);
let noticeTimer: ReturnType<typeof setTimeout>; let clock: ReturnType<typeof setInterval>;
const filtered = computed(() => collection.value.filter(p => `${p.name}${p.personality}${p.occupation}`.includes(search.value)));
const cooldown = computed(() => Math.max(0, Math.ceil((nextAllowedAt.value - now.value) / 1000)));
const active = computed(() => selected.value || current.value);
const statistics = ref<GlobalStats | null>(null);
const statsError = ref(false);
const statsLoading = ref(false);
const fastDraw = ref(false);
const drawStarted = ref(0);
const drawStep = computed(() => Math.min(2, Math.floor((now.value - drawStarted.value) / 800)));
const displayedRates = computed(() => statistics.value?.rarities || rarityRates.map(rate => ({ ...rate, count: null })));
const number = (value: number) => value.toLocaleString('zh-CN');
const animatedTotal = ref(0);
let statsTimer: ReturnType<typeof setInterval>;
// 出货反馈按稀有度分级：SSR 撒花 + 闪屏，SR 小撒花，R 只有弹入动画。
const celebrations: Record<Partner['rarity'], string[]> = { SSR: ['#fbbf24', '#fde68a', '#ec4899', '#8b5cf6', '#ffffff'], SR: ['#c084fc', '#8b5cf6', '#ec4899'], R: [] };

function tweenTotal(target: number) {
  const from = animatedTotal.value;
  if (from === target) return;
  const started = performance.now();
  const step = (time: number) => {
    const progress = Math.min(1, (time - started) / 700);
    animatedTotal.value = Math.round(from + (target - from) * (1 - (1 - progress) ** 3));
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
watch(() => statistics.value?.total, value => { if (typeof value === 'number') tweenTotal(value); });

async function loadStats() {
  if (statsLoading.value) return;
  statsLoading.value = true;
  try { statistics.value = await api<GlobalStats>('/stats'); statsError.value = false; }
  catch { statsError.value = true; }
  finally { statsLoading.value = false; }
}
function toast(message: string) { notice.value = message; clearTimeout(noticeTimer); noticeTimer = setTimeout(() => notice.value = '', 4500); }
function fail(error: unknown) { toast(error instanceof Error ? error.message : '连接失败，请稍后再试'); }
function sync(partner: Partner) {
  if (current.value?.id === partner.id) current.value = partner;
  if (selected.value?.id === partner.id) selected.value = partner;
  const index = collection.value.findIndex(p => p.id === partner.id);
  if (index >= 0) collection.value[index] = partner;
  else if (partner.saved) collection.value.unshift(partner);
}
async function loadCollection() {
  collecting.value = true; loadError.value = '';
  try { collection.value = (await api<{ partners: Partner[] }>('/partners')).partners; }
  catch { loadError.value = '收藏暂时加载失败'; }
  finally { collecting.value = false; }
}
async function generate() {
  if (loading.value || busy.value) return;
  loading.value = true; selected.value = null; drawStarted.value = Date.now(); now.value = Date.now();
  const duration = fastDraw.value || window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 2600;
  try {
    const [result] = await Promise.all([api<{ partner: Partner }>('/partners', { method: 'POST', body: JSON.stringify(form) }), new Promise(resolve => setTimeout(resolve, duration))]);
    current.value = result.partner;
    const colors = celebrations[result.partner.rarity];
    if (colors.length) celebrate(colors, result.partner.rarity === 'SSR' ? 120 : 70);
    if (result.partner.rarity === 'SSR') flash('SSR');
    void loadStats();
  } catch (error) { fail(error); } finally { loading.value = false; }
}
async function save() {
  if (!current.value || busy.value) return;
  busy.value = true;
  try { sync((await api<{ partner: Partner }>(`/partners/${current.value.id}/save`, { method: 'POST' })).partner); toast('收藏成功，心动已存档'); }
  catch (error) { fail(error); } finally { busy.value = false; }
}
let selectionVersion = 0;
async function openPartner(partner: Partner) {
  const version = ++selectionVersion;
  selected.value = partner; events.value = []; nextAllowedAt.value = 0; busy.value = true;
  try {
    const data = await api<{ events: PartnerEvent[]; nextAllowedAt: string | null }>(`/partners/${partner.id}/events`);
    if (version === selectionVersion) { events.value = data.events; nextAllowedAt.value = data.nextAllowedAt ? Date.parse(data.nextAllowedAt) : 0; }
  } catch (error) { fail(error); } finally { if (version === selectionVersion) busy.value = false; }
}
function navigate(next: 'create' | 'collection') { if (busy.value || loading.value) return; view.value = next; selected.value = null; selectionVersion++; }
async function interact(action: Action) {
  if (!selected.value || busy.value || cooldown.value) return;
  busy.value = true;
  try {
    const data = await api<InteractionResult>(`/partners/${selected.value.id}/interactions`, { method: 'POST', body: JSON.stringify({ action }) });
    sync(data.partner); events.value.unshift(data.event); nextAllowedAt.value = Date.parse(data.nextAllowedAt);
    toast(data.event.delta ? `好感度 +${data.event.delta}` : '好感度已满，新的回忆已存档');
  } catch (error) { if (error instanceof ApiError && error.nextAllowedAt) nextAllowedAt.value = Date.parse(error.nextAllowedAt); fail(error); }
  finally { busy.value = false; }
}
async function confirmDialog() {
  if (!selected.value || busy.value) return;
  busy.value = true;
  try {
    const id = selected.value.id;
    if (dialog.value === 'rename') { sync((await api<{ partner: Partner }>(`/partners/${id}`, { method: 'PATCH', body: JSON.stringify({ name: newName.value }) })).partner); toast('名字已更新'); }
    else { await api(`/partners/${id}`, { method: 'DELETE' }); collection.value = collection.value.filter(p => p.id !== id); selected.value = null; if (current.value?.id === id) current.value = null; toast('已告别这个对象'); }
    dialog.value = null;
  } catch (error) { fail(error); } finally { busy.value = false; }
}
async function download() { if (!active.value || busy.value) return; busy.value = true; try { await exportPartner(active.value); toast('名片已导出'); } catch (error) { fail(error); } finally { busy.value = false; } }
onMounted(() => { void loadCollection(); void loadStats(); clock = setInterval(() => now.value = Date.now(), 200); statsTimer = setInterval(() => { if (!document.hidden) void loadStats(); }, 30000); });
onUnmounted(() => { clearInterval(clock); clearInterval(statsTimer); clearTimeout(noticeTimer); });
</script>

<template>
  <div class="app">
    <div class="aurora" aria-hidden="true"></div>
    <div class="shell">
      <header class="hero">
        <h1>赛博男友 / 女友生成器</h1>
        <p class="hero-sub mono">new Partner() —— 用一行代码换一次心动</p>
        <nav class="seg" aria-label="主导航">
          <span class="seg-thumb" aria-hidden="true" :style="{ transform: view === 'collection' ? 'translateX(calc(100% + 4px))' : 'none' }"></span>
          <button :class="{ chosen: view === 'create' }" :disabled="busy || loading" @click="navigate('create')"><Sparkles :size="15" />创造心动</button>
          <button :class="{ chosen: view === 'collection' }" :disabled="busy || loading" @click="navigate('collection')"><Heart :size="15" />我的卡包<span class="nav-count">{{ collection.length }}</span></button>
        </nav>
      </header>

      <template v-if="view === 'create'">
        <section class="stat-banner" aria-label="全站生成统计">
          <p class="stat-line"><Sparkles :size="15" />全网已生成</p>
          <p class="stat-total">{{ statistics ? number(animatedTotal) : '—' }}</p>
          <p class="stat-line">次心动相遇</p>
          <div class="rate-grid">
            <div v-for="rate in displayedRates" :key="rate.rarity" class="rate" :data-rarity="rate.rarity">
              <b>{{ rate.rarity }}</b><small>{{ rate.label }}</small>
              <strong>{{ rate.probability }}%</strong>
              <div class="rate-track"><span :style="{ width: rate.probability + '%' }"></span></div>
              <p>{{ rate.count === null ? '—' : number(rate.count) }} 位已出</p>
            </div>
          </div>
          <div class="stats-status">
            <span>{{ statsError ? '统计连接中断' : statistics ? '30 秒更新一次' : '正在连接全站统计' }}</span>
            <button type="button" :disabled="statsLoading" title="刷新全站统计" aria-label="刷新全站统计" @click="loadStats"><LoaderCircle :size="13" :class="{ spin: statsLoading }" /></button>
            <span>独立抽取 · 无保底</span>
          </div>
        </section>

        <GachaStage :loading="loading" :partner="current" :step="drawStep" :busy="busy" @save="save" @download="download" />

        <form class="card params" @submit.prevent="generate">
          <div class="params-head"><span>设定心动参数</span><SlidersHorizontal :size="15" /></div>
          <fieldset :disabled="loading || busy">
            <legend>想遇见谁 <span>TYPE</span></legend>
            <div class="segmented"><button v-for="kind in kinds" :key="kind" type="button" :aria-pressed="form.kind === kind" :class="{ active: form.kind === kind }" @click="form.kind = kind">{{ kind }}</button></div>
          </fieldset>
          <fieldset :disabled="loading || busy">
            <legend>性格偏好 <span>PERSONALITY</span></legend>
            <div class="personality-grid">
              <button v-for="(personality, i) in personalities" :key="personality" type="button" :class="{ active: form.personality === personality, random: i === 0 }" :aria-pressed="form.personality === personality" @click="form.personality = personality">
                <Dices v-if="i === 0" :size="15" /><span v-else class="option-dot" :class="'dot-' + i"></span>{{ personality }}<Check v-if="form.personality === personality" class="option-check" :size="14" />
              </button>
            </div>
          </fieldset>
          <div class="name-field">
            <label for="nickname">给 TA 一个名字 <span>可选</span></label>
            <div class="input-wrap"><input id="nickname" v-model="form.nickname" :disabled="loading || busy" maxlength="12" placeholder="名字也交给缘分吧" autocomplete="off" /><span>{{ form.nickname.length }}/12</span></div>
          </div>
        </form>

        <Button size="xl" class="cta" :class="{ 'is-loading': loading }" :disabled="loading || busy" @click="generate">
          <LoaderCircle v-if="loading" class="spin" /><Dices v-else />
          {{ loading ? '心动信号连接中…' : current ? '再抽一次心动' : '一键生成我的对象' }}
          <ArrowRight v-if="!loading" />
        </Button>
        <div class="draw-options">
          <span>免费相遇 · 无限心动</span>
          <label><input v-model="fastDraw" type="checkbox" :disabled="loading" />跳过抽卡动画</label>
        </div>
        <p class="disclaimer">* 本产品仅供娱乐，生成的对象不具备法律效力。<br />* 虚拟对象，真实快乐。请理性心动。</p>
      </template>

      <template v-else>
        <PartnerDetail v-if="selected" :partner="selected" :events="events" :busy="busy" :cooldown="cooldown" @back="selected = null" @rename="newName = selected!.name; dialog = 'rename'" @remove="dialog = 'delete'" @download="download" @interact="interact" />
        <CollectionGrid v-else :partners="filtered" :total="collection.length" :loading="collecting" :error="loadError" :search="search" @update:search="value => search = value" @open="openPartner" @retry="loadCollection" @create="navigate('create')" />
      </template>
    </div>

    <footer>
      <span><Heart :size="14" />赛博心动 CYBER CRUSH CLUB</span>
      <span class="mono">LOVE IS A HAPPY GLITCH.</span>
    </footer>

    <Transition name="toast"><div v-if="notice" class="toast-message" role="status">{{ notice }}<button aria-label="关闭提示" @click="notice = ''"><X :size="15" /></button></div></Transition>

    <DialogRoot :open="dialog !== null" @update:open="value => { if (!value && !busy) dialog = null }">
      <DialogPortal>
        <DialogOverlay class="dialog-overlay" />
        <DialogContent class="dialog-content" @escape-key-down="event => { if (busy) event.preventDefault() }" @interact-outside="event => { if (busy) event.preventDefault() }">
          <DialogTitle class="dialog-title">{{ dialog === 'rename' ? '换个专属称呼' : '要和 TA 告别吗？' }}</DialogTitle>
          <DialogDescription class="dialog-description">{{ dialog === 'rename' ? '给这个特别的对象，一个特别的名字。' : '收藏和互动记录会一起删除，无法恢复。' }}</DialogDescription>
          <form @submit.prevent="confirmDialog">
            <input v-if="dialog === 'rename'" v-model="newName" class="dialog-input" aria-label="新的名字" maxlength="12" required :disabled="busy" />
            <div class="dialog-actions">
              <Button type="button" variant="outline" :disabled="busy" @click="dialog = null">取消</Button>
              <Button type="submit" :disabled="busy || (dialog === 'rename' && !newName.trim())"><LoaderCircle v-if="busy" class="spin" />{{ dialog === 'rename' ? '保存名字' : '确认删除' }}</Button>
            </div>
          </form>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  </div>
</template>
