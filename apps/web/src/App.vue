<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { motion } from 'motion-v';
import { ArrowUpRight, ArrowRight, ArrowLeft, Sparkles, Heart, Dices, Plus, Download, Check, LoaderCircle, MessageCircle, Gift, Coffee, Trash2, Pencil, X, Code2, Search, SlidersHorizontal } from 'lucide-vue-next';
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle, DialogDescription } from 'reka-ui';
import { personalities, kinds, rarityRates, type GlobalStats, type Partner, type PartnerEvent, type CreatePartnerInput, type Action, type InteractionResult } from '@new-partner/shared';
import Button from './components/ui/button/Button.vue';
import { api, ApiError } from './lib/api';
import { avatar } from './lib/avatar';
import { exportPartner } from './lib/export';

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
const drawMessages = ['搜索心动频率', '正在匹配灵魂', '命定信号已捕获'];
const drawAvatars = Array.from({ length: 12 }, (_, i) => avatar('cyber-draw-' + i));
const displayedRates = computed(() => statistics.value?.rarities || rarityRates.map(rate => ({ ...rate, count: null })));
const number = (value: number) => value.toLocaleString('zh-CN');
let statsTimer: ReturnType<typeof setInterval>;
async function loadStats() {
  if (statsLoading.value) return;
  statsLoading.value = true;
  try { statistics.value = await api<GlobalStats>('/stats'); statsError.value = false; }
  catch { statsError.value = true; }
  finally { statsLoading.value = false; }
}
const examples = [{ seed: 'orbit', name: '小序', label: '温柔治愈', color: '#dcebbd' }, { seed: 'pip', name: '阿零', label: '搞笑担当', color: '#f3d5e6' }, { seed: 'neo', name: '星野', label: '冷静理性', color: '#c5e9e5' }];
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
  <div class="site-shell">
    <header class="topbar">
      <button class="brand" aria-label="赛博心动首页" @click="navigate('create')"><span class="brand-symbol"><Heart :size="24" /></span><span>赛博心动<span class="brand-caption">CYBER CRUSH CLUB</span></span></button>
      <nav aria-label="主导航"><button :class="{ chosen: view === 'create' }" :disabled="busy || loading" @click="navigate('create')"><Sparkles :size="16" />创造心动</button><button :class="{ chosen: view === 'collection' }" :disabled="busy || loading" @click="navigate('collection')"><Heart :size="16" />我的对象<span class="nav-count">{{ collection.length }}</span></button></nav>
      <span class="edition"><span class="status-dot"></span> HEART LINK / ONLINE</span>
    </header>

    <main>
      <template v-if="view === 'create'">
        <section class="intro"><div><p class="eyebrow"><span class="status-dot"></span> YOUR NEXT CRUSH IS CONNECTING</p><h1>赛博男友<span class="heading-dot"> / </span>女友生成器</h1><p class="intro-copy">爱意随机掉落。今天，谁会成为你的专属例外？</p></div><div class="intro-note"><Heart :size="34" /><p>恋爱脑已上线<br />等待一次双向奔赴</p></div></section>
        <section class="global-stats" aria-label="全站生成统计">
          <div class="total-count"><span class="eyebrow">全站累计心动</span><strong>{{ statistics ? number(statistics.total) : '—' }}</strong><span>次相遇</span></div>
          <div v-for="rate in displayedRates" :key="rate.rarity" class="rarity-count" :data-rarity="rate.rarity"><div><b>{{ rate.rarity }}</b><span>{{ rate.label }}</span><strong>{{ rate.probability }}%</strong></div><p><strong>{{ rate.count === null ? '—' : number(rate.count) }}</strong> 位已生成</p><div class="rate-track"><span :style="{ width: rate.probability + '%' }"></span></div></div>
          <div class="stats-status"><span>{{ statsError ? '统计连接中断' : statistics ? '全站累计 · 30 秒更新' : '正在连接全站统计' }}</span><button type="button" :disabled="statsLoading" @click="loadStats" title="刷新全站统计" aria-label="刷新全站统计"><LoaderCircle :size="14" :class="{ spin: statsLoading }" /></button><span>独立抽取 · 无保底</span></div>
        </section>
        <section class="workbench" aria-label="对象生成器">
          <form class="controls" @submit.prevent="generate">
            <div class="section-label"><span>01 / 设定心动参数</span><SlidersHorizontal :size="16" /></div>
            <fieldset :disabled="loading || busy"><legend>想遇见谁 <span>TYPE</span></legend><div class="segmented"><button v-for="kind in kinds" :key="kind" type="button" :aria-pressed="form.kind === kind" :class="{ active: form.kind === kind }" @click="form.kind = kind">{{ kind }}</button></div></fieldset>
            <fieldset :disabled="loading || busy"><legend>性格偏好 <span>PERSONALITY</span></legend><div class="personality-grid"><button v-for="(personality, i) in personalities" :key="personality" type="button" :class="{ active: form.personality === personality, random: i === 0 }" :aria-pressed="form.personality === personality" @click="form.personality = personality"><Dices v-if="i === 0" :size="16" /><span v-else class="option-dot" :class="'dot-' + i"></span>{{ personality }}<Check v-if="form.personality === personality" class="option-check" :size="14" /></button></div></fieldset>
            <div class="name-field"><label for="nickname">给 TA 一个名字 <span>可选</span></label><div class="input-wrap"><input id="nickname" v-model="form.nickname" :disabled="loading || busy" maxlength="12" placeholder="名字也交给缘分吧" autocomplete="off" /><span>{{ form.nickname.length }}/12</span></div></div>
            <Button type="submit" class="generate-button" :disabled="loading || busy"><LoaderCircle v-if="loading" class="spin" /><Dices v-else />{{ loading ? '心动信号连接中…' : current ? '再抽一次心动' : '抽取我的心动对象' }}<ArrowRight v-if="!loading" class="ml-auto" /></Button>
            <div class="draw-options"><span>免费相遇 · 无限心动</span><label><input v-model="fastDraw" type="checkbox" :disabled="loading" />快速揭晓</label></div>
          </form>

          <div class="result-stage" :class="{ 'has-result': current, drawing: loading }" :data-rarity="current?.rarity" :aria-busy="loading">
            <div class="stage-top"><span class="mono">{{ current ? 'INSTANCE / ' + current.id.slice(0, 8).toUpperCase() : 'AWAITING YOUR NEXT CRUSH' }}</span><span class="live-badge"><span class="status-dot"></span>{{ loading ? '生成中' : current ? '已相遇' : '等待相遇' }}</span></div>
            <div v-if="loading" class="loading-scene" role="status"><div class="draw-window" aria-hidden="true"><div class="draw-reel"><div v-for="(source, i) in drawAvatars" :key="i" class="draw-frame"><img :src="source" alt="" /></div></div><span class="scan-line"></span></div><span class="draw-code">LINKING / 0{{ drawStep + 1 }}</span><h2>{{ drawMessages[drawStep] }}…</h2><div class="draw-progress"><span v-for="step in 3" :key="step" :class="{ complete: drawStep >= step - 1 }"></span></div></div>
            <motion.div v-else-if="current" :key="current.id" class="result-content" :initial="{ opacity: 0, y: 15 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45 }">
              <div class="reveal-label"><Sparkles :size="15" />{{ rarityRates.find(rate => rate.rarity === current?.rarity)?.label }} · 心动已降临</div><div class="result-identity"><div class="result-avatar" :style="{ background: current.color }"><img :src="avatar(current.id)" :alt="current.name + '的头像'" /></div><div class="identity-copy"><span class="rarity" :data-rarity="current.rarity">{{ current.rarity }} · {{ current.kind }}</span><h2>{{ current.name }}</h2><p>{{ current.occupation }}</p><span class="personality-label">{{ current.personality }}</span></div></div>
              <blockquote>“{{ current.quote }}”</blockquote>
              <div class="stats-grid"><div v-for="(stat, i) in current.stats" :key="stat.label" class="stat"><div><span>{{ stat.label }}</span><strong>{{ stat.value }}<small>/100</small></strong></div><div class="stat-track"><motion.div :initial="{ width: '0%' }" :animate="{ width: stat.value + '%' }" :transition="{ delay: i * 0.1, duration: 0.6 }" :style="{ background: ['#81a34d', '#dca2c2', '#70aaa1', '#d2a45f'][i] }" /></div></div></div>
              <div class="tags"><span v-for="tag in current.tags" :key="tag"># {{ tag }}</span></div>
              <div class="result-actions"><Button :disabled="current.saved || busy" @click="save"><Check v-if="current.saved" /><Heart v-else />{{ current.saved ? '已收藏' : '就 TA 了，收藏' }}</Button><Button variant="outline" :disabled="busy" @click="download"><Download />导出名片</Button></div>
            </motion.div>
            <div v-else class="empty-scene"><div class="specimen"><motion.img :src="avatar('orbit')" alt="等待与你相遇的机器人角色" :animate="{ y: [0, -9, 0] }" :transition="{ duration: 4, repeat: Infinity }" /><span class="specimen-label">UNKNOWN PARTNER</span><span class="specimen-plus">+</span></div><h2>你的下一位特别关注</h2><p>还在平行宇宙里，等你点击生成。</p><span class="empty-code">const 心动 = new Partner()</span></div>
            <div class="stage-bottom"><span>100% 虚拟 · 心动不限量</span><Code2 :size="17" /></div>
          </div>
        </section>
        <section class="possibilities"><div class="possibilities-heading"><h2>宇宙很大，什么对象都有。</h2><span>下一位，或许是你的理想型 <ArrowUpRight :size="16" /></span></div><div class="example-grid"><div v-for="(example, i) in examples" :key="example.seed" class="example"><img :src="avatar(example.seed)" :alt="example.name + '角色示例'" :style="{ background: example.color }" /><div><span class="mono">ARCHETYPE / 0{{ i + 1 }}</span><h3>{{ example.label }}</h3><p>{{ ['接住你所有的小情绪。', '日子可以普通，笑点不行。', '你是所有规则里的例外。'][i] }}</p></div><ArrowUpRight :size="19" /></div></div></section>
      </template>

      <template v-else>
        <section class="collection-heading"><div><p class="eyebrow"><span class="status-dot"></span> MY LITTLE UNIVERSE</p><h1>我的对象<span class="heading-dot">.</span></h1><p class="intro-copy">把偶然的心动，存成日常。</p></div><Button :disabled="busy" @click="navigate('create')"><Plus />继续创造</Button></section>
        <template v-if="selected"><div class="detail-toolbar"><Button variant="ghost" :disabled="busy" @click="selected = null"><ArrowLeft />返回收藏</Button><div><Button variant="ghost" size="icon" title="重命名" aria-label="重命名" :disabled="busy" @click="newName = selected.name; dialog = 'rename'"><Pencil /></Button><Button variant="ghost" size="icon" title="删除对象" aria-label="删除对象" :disabled="busy" @click="dialog = 'delete'"><Trash2 /></Button></div></div>
          <section class="detail-layout"><div class="detail-profile"><div class="detail-portrait" :style="{ background: selected.color }"><img :src="avatar(selected.id)" :alt="selected.name + '的头像'" /><span class="rarity">{{ selected.rarity }}</span></div><h2>{{ selected.name }}</h2><p>{{ selected.personality }} · {{ selected.occupation }}</p><blockquote>“{{ selected.quote }}”</blockquote><div class="affection"><span><Heart :size="16" />好感度</span><strong>{{ selected.affection }} / 100</strong></div><div class="stat-track"><div :style="{ width: selected.affection + '%', background: '#d297b6' }"></div></div><Button variant="outline" :disabled="busy" class="w-full mt-6" @click="download"><Download />导出名片</Button></div><div class="interaction-area"><div class="section-label"><span>一起积攒小事</span><span>{{ cooldown ? `${cooldown}s 后再互动` : 'TODAY IS A GOOD DAY' }}</span></div><div class="interaction-buttons"><Button variant="outline" :disabled="busy || cooldown > 0" @click="interact('chat')"><MessageCircle />聊聊天</Button><Button variant="outline" :disabled="busy || cooldown > 0" @click="interact('gift')"><Gift />送礼物</Button><Button variant="outline" :disabled="busy || cooldown > 0" @click="interact('date')"><Coffee />去约会</Button></div><h3 class="memory-heading">心动备忘录 <span>{{ events.length }}</span></h3><p v-if="busy && !events.length" class="muted">正在翻开回忆…</p><div v-else-if="!events.length" class="memory-empty"><MessageCircle :size="32" /><p>故事还没开始，今天先说声你好。</p></div><ol v-else class="timeline"><li v-for="event in events" :key="event.id"><span class="timeline-dot"></span><time>{{ new Date(event.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) }}</time><p>{{ event.message }}</p><span class="event-delta">好感度 +{{ event.delta }}</span></li></ol></div></section>
        </template>
        <template v-else><div class="collection-tools"><span>{{ collection.length }} 位特别关注</span><label class="search-field"><Search :size="17" /><input v-model="search" placeholder="搜索名字或性格" aria-label="搜索收藏" /></label></div><div v-if="collecting" class="collection-empty"><LoaderCircle class="spin" /><p>正在打开你的宇宙…</p></div><div v-else-if="loadError" class="collection-empty"><p>{{ loadError }}</p><Button variant="outline" @click="loadCollection">重新加载</Button></div><div v-else-if="!filtered.length" class="collection-empty"><Heart :size="36" /><h2>{{ search ? '还没找到这个 TA' : '这里还没有特别关注' }}</h2><p>{{ search ? '换一个名字或性格试试。' : '从一次随机相遇开始吧。' }}</p><Button v-if="!search" @click="navigate('create')"><Plus />new 一个对象</Button></div><div v-else class="collection-grid"><button v-for="partner in filtered" :key="partner.id" class="partner-card" @click="openPartner(partner)"><div class="card-portrait" :style="{ background: partner.color }"><img :src="avatar(partner.id)" :alt="partner.name + '的头像'" /><span class="rarity">{{ partner.rarity }}</span></div><div class="card-body"><h2>{{ partner.name }}<ArrowUpRight :size="18" /></h2><p>{{ partner.personality }} · {{ partner.kind }}</p><div><span>{{ partner.occupation }}</span><span><Heart :size="13" />{{ partner.affection }}</span></div></div></button></div></template>
      </template>
    </main>
    <footer><span><Heart :size="16" />赛博心动</span><span>虚拟对象，真实快乐。</span><span class="mono">LOVE IS A HAPPY GLITCH.</span></footer>
    <Transition name="toast"><div v-if="notice" class="toast-message" role="status">{{ notice }}<button aria-label="关闭提示" @click="notice = ''"><X :size="16" /></button></div></Transition>
    <DialogRoot :open="dialog !== null" @update:open="value => { if (!value && !busy) dialog = null }"><DialogPortal><DialogOverlay class="dialog-overlay" /><DialogContent class="dialog-content" @escape-key-down="event => { if (busy) event.preventDefault() }" @interact-outside="event => { if (busy) event.preventDefault() }"><DialogTitle class="dialog-title">{{ dialog === 'rename' ? '换个专属称呼' : '要和 TA 告别吗？' }}</DialogTitle><DialogDescription class="dialog-description">{{ dialog === 'rename' ? '给这个特别的对象，一个特别的名字。' : '收藏和互动记录会一起删除，无法恢复。' }}</DialogDescription><form @submit.prevent="confirmDialog"><input v-if="dialog === 'rename'" v-model="newName" class="dialog-input" aria-label="新的名字" maxlength="12" required :disabled="busy" /><div class="dialog-actions"><Button type="button" variant="outline" :disabled="busy" @click="dialog = null">取消</Button><Button type="submit" :disabled="busy || (dialog === 'rename' && !newName.trim())"><LoaderCircle v-if="busy" class="spin" />{{ dialog === 'rename' ? '保存名字' : '确认删除' }}</Button></div></form></DialogContent></DialogPortal></DialogRoot>
  </div>
</template>
