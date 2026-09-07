<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import { Primitive, type PrimitiveProps } from 'reka-ui';
import { cva } from 'class-variance-authority';
import { cn } from '../../../lib/utils';
const props = withDefaults(defineProps<PrimitiveProps & { variant?: 'default' | 'outline' | 'ghost'; size?: 'default' | 'icon'; class?: HTMLAttributes['class'] }>(), { as: 'button', variant: 'default', size: 'default' });
const variants = cva('inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#476c32] disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4', { variants: { variant: { default: 'bg-[#252b25] text-white hover:bg-[#414a40]', outline: 'border border-[#d9ddd3] bg-transparent text-[#252b25] hover:bg-[#e9ede3]', ghost: 'text-[#555f50] hover:bg-[#e9ede3]' }, size: { default: 'h-11 px-4', icon: 'size-10 p-0' } } });
</script>
<template><Primitive :as="props.as" :as-child="props.asChild" :class="cn(variants({ variant, size }), props.class)"><slot /></Primitive></template>
