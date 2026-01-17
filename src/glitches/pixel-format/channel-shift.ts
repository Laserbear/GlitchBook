import type { GlitchDefinition, GlitchParams } from '../types';

export const channelShift: GlitchDefinition = {
  id: 'channel-shift',
  name: 'Channel Shift',
  category: 'pixel-format',
  description: 'Off-by-N error in channel indexing, causing color channels to shift spatially.',
  technicalDetails: `This bug occurs when channel data is read from the wrong memory offset. Each color channel appears shifted relative to the others,
creating a chromatic aberration-like effect. This often happens when calculating buffer offsets manually or when planar and interleaved formats are confused.`,
  bugCode: `// Bug: Off-by-one in channel indexing
void readChannels(uint8_t* data, int width, int height) {
    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            int idx = (y * width + x) * 4;
            // Bug: Reading channels from wrong offsets
            red[y][x]   = data[idx + 1];  // Off by 1
            green[y][x] = data[idx + 2];
            blue[y][x]  = data[idx + 3];
        }
    }
}`,
  fixCode: `// Fix: Correct channel indexing
void readChannels(uint8_t* data, int width, int height) {
    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            int idx = (y * width + x) * 4;
            red[y][x]   = data[idx + 0];  // R at offset 0
            green[y][x] = data[idx + 1];  // G at offset 1
            blue[y][x]  = data[idx + 2];  // B at offset 2
        }
    }
}`,
  params: [
    {
      name: 'redShift',
      type: 'range',
      min: -20,
      max: 20,
      step: 1,
      default: 5,
      description: 'Pixel shift for red channel'
    },
    {
      name: 'greenShift',
      type: 'range',
      min: -20,
      max: 20,
      step: 1,
      default: 0,
      description: 'Pixel shift for green channel'
    },
    {
      name: 'blueShift',
      type: 'range',
      min: -20,
      max: 20,
      step: 1,
      default: -5,
      description: 'Pixel shift for blue channel'
    }
  ],
  apply: (imageData: ImageData, params: GlitchParams): ImageData => {
    const { width, height, data } = imageData;
    const redShift = (params.redShift as number) || 0;
    const greenShift = (params.greenShift as number) || 0;
    const blueShift = (params.blueShift as number) || 0;
    const output = new ImageData(width, height);
    const outData = output.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;

        // Get shifted positions for each channel
        const redX = Math.max(0, Math.min(width - 1, x + redShift));
        const greenX = Math.max(0, Math.min(width - 1, x + greenShift));
        const blueX = Math.max(0, Math.min(width - 1, x + blueShift));

        const redIdx = (y * width + redX) * 4;
        const greenIdx = (y * width + greenX) * 4;
        const blueIdx = (y * width + blueX) * 4;

        outData[idx] = data[redIdx];
        outData[idx + 1] = data[greenIdx + 1];
        outData[idx + 2] = data[blueIdx + 2];
        outData[idx + 3] = data[idx + 3];
      }
    }

    return output;
  }
};
