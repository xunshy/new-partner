<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import { Primitive, type PrimitiveProps } from 'reka-ui';
import { cva } from 'class-variance-authority';
import { cn } from '../../../lib/utils';
const props = withDefaults(defineProps<PrimitiveProps & { variant?: 'default' | 'outline' | 'ghost'; size?: 'default' | 'icon' | 'xl'; class?: HTMLAttributes['class'] }>(), { as: 'button', variant: 'default', size: 'default' });
const variants = cva('inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-[transform,background-color,box-shadow,border-color] duration-200 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#ec4899] disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4', {
  variants: {
    variant: {
      default: 'text-white bg-linear-to-r from-[#ec4899] to-[#8b5cf6] shadow-[0_8px_24px_-12px_#ec4899] hover:scale-[1.02] hover:shadow-[0_10px_30px_-10px_#ec4899] active:scale-[0.97]',
      outline: 'border border-white/12 bg-white/5 text-[#f2eef7] backdrop-blur-sm hover:bg-white/10 hover:border-white/20 active:scale-[0.97]',
      ghost: 'text-[#9b93aa] hover:bg-white/8 hover:text-[#f2eef7] active:scale-[0.97]',
    },
    size: { default: 'h-11 px-4 text-sm', icon: 'size-10 p-0 rounded-full', xl: 'h-14 w-full px-5 text-base font-bold rounded-2xl [&_svg]:size-5' },
  },
});
</script>
<template><Primitive :as="props.as" :as-child="props.asChild" :class="cn(variants({ variant, size }), props.class)"><slot /></Primitive></template>
