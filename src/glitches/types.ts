export interface GlitchParams {
  [key: string]: number | boolean | string;
}

export interface ParamDefinition {
  name: string;
  type: 'range' | 'boolean' | 'select';
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  default: number | boolean | string;
  description: string;
}

export type GlitchCategory = 'pixel-format' | 'memory-layout' | 'coordinates';

export interface GlitchDefinition {
  id: string;
  name: string;
  category: GlitchCategory;
  description: string;
  technicalDetails: string;
  bugCode: string;
  fixCode: string;
  params: ParamDefinition[];
  apply: (imageData: ImageData, params: GlitchParams) => ImageData;
}

export type GlitchFn = (imageData: ImageData, params: GlitchParams) => ImageData;
