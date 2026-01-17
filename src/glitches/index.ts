import type { GlitchDefinition } from './types';

// Pixel format glitches
import { rgbaAsRgb } from './pixel-format/rgba-as-rgb';
import { rgbAsRgba } from './pixel-format/rgb-as-rgba';
import { bgrSwap } from './pixel-format/bgr-swap';
import { argbOrder } from './pixel-format/argb-order';
import { endianness } from './pixel-format/endianness';
import { channelShift } from './pixel-format/channel-shift';
import { bitDepth } from './pixel-format/bit-depth';
import { gamma } from './pixel-format/gamma';
import { premultipliedAlpha } from './pixel-format/premultiplied-alpha';
import { signedUnsigned } from './pixel-format/signed-unsigned';

// Memory layout glitches
import { wrongStride } from './memory-layout/wrong-stride';
import { wrongPitch } from './memory-layout/wrong-pitch';
import { rowPadding } from './memory-layout/row-padding';
import { alignment } from './memory-layout/alignment';

// Coordinate glitches
import { offByOne } from './coordinates/off-by-one';
import { flippedAxis } from './coordinates/flipped-axis';
import { uvWrapping } from './coordinates/uv-wrapping';
import { aspectRatio } from './coordinates/aspect-ratio';
import { sampling } from './coordinates/sampling';
import { halfPixel } from './coordinates/half-pixel';

export const glitches: GlitchDefinition[] = [
  // Pixel format
  rgbaAsRgb,
  rgbAsRgba,
  bgrSwap,
  argbOrder,
  endianness,
  channelShift,
  bitDepth,
  gamma,
  premultipliedAlpha,
  signedUnsigned,
  // Memory layout
  wrongStride,
  wrongPitch,
  rowPadding,
  alignment,
  // Coordinates
  offByOne,
  flippedAxis,
  uvWrapping,
  aspectRatio,
  sampling,
  halfPixel,
];

export const glitchById = new Map<string, GlitchDefinition>(
  glitches.map(g => [g.id, g])
);

export const glitchesByCategory = {
  'pixel-format': glitches.filter(g => g.category === 'pixel-format'),
  'memory-layout': glitches.filter(g => g.category === 'memory-layout'),
  'coordinates': glitches.filter(g => g.category === 'coordinates'),
};

export * from './types';
