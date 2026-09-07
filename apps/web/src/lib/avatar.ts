import { createAvatar } from '@dicebear/core';
import * as botttsNeutral from '@dicebear/bottts-neutral';
const avatars = new Map<string, string>();
export function avatar(seed: string) {
  if (!avatars.has(seed)) avatars.set(seed, createAvatar(botttsNeutral, { seed, backgroundColor: ['transparent'], size: 240 }).toDataUri());
  return avatars.get(seed)!;
}
