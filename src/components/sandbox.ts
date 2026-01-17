import { glitches, glitchById } from '../glitches';
import type { GlitchDefinition, GlitchParams, ParamDefinition } from '../glitches';
import { loadImageDataFromFile, setupDropZone, createFileInput } from '../utils/image-loader';
import { imageDataToCanvas, downloadImageData, resizeImageData } from '../utils/canvas';

const MAX_PREVIEW_SIZE = 800;

export class Sandbox {
  private container: HTMLElement;
  private originalImageData: ImageData | null = null;
  private processedImageData: ImageData | null = null;
  private currentGlitch: GlitchDefinition | null = null;
  private currentParams: GlitchParams = {};

  private dropZone!: HTMLElement;
  private originalCanvas!: HTMLCanvasElement;
  private processedCanvas!: HTMLCanvasElement;
  private glitchSelect!: HTMLSelectElement;
  private paramsContainer!: HTMLElement;
  private downloadBtn!: HTMLButtonElement;
  private fileInput!: HTMLInputElement;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container ${containerId} not found`);
    }
    this.container = container;
    this.render();
    this.setupEventListeners();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="sandbox">
        <div class="sandbox-header">
          <h2>Glitch Sandbox</h2>
          <p>Upload an image and experiment with different graphics glitches</p>
        </div>

        <div class="sandbox-upload" id="drop-zone">
          <div class="upload-content">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <p>Drop an image here or <button class="upload-btn" id="upload-btn">browse</button></p>
            <span class="upload-hint">Supports PNG, JPG, GIF, WebP</span>
          </div>
        </div>

        <div class="sandbox-controls" id="controls" style="display: none;">
          <div class="control-group">
            <label for="glitch-select">Glitch Type</label>
            <select id="glitch-select">
              <option value="">Select a glitch...</option>
              <optgroup label="Pixel Format">
                ${glitches.filter(g => g.category === 'pixel-format').map(g =>
                  `<option value="${g.id}">${g.name}</option>`
                ).join('')}
              </optgroup>
              <optgroup label="Memory Layout">
                ${glitches.filter(g => g.category === 'memory-layout').map(g =>
                  `<option value="${g.id}">${g.name}</option>`
                ).join('')}
              </optgroup>
              <optgroup label="Coordinates">
                ${glitches.filter(g => g.category === 'coordinates').map(g =>
                  `<option value="${g.id}">${g.name}</option>`
                ).join('')}
              </optgroup>
            </select>
          </div>

          <div class="params-container" id="params-container"></div>

          <div class="control-actions">
            <button class="btn btn-secondary" id="reset-btn">Reset Image</button>
            <button class="btn btn-primary" id="download-btn" disabled>Download Result</button>
          </div>
        </div>

        <div class="sandbox-preview" id="preview" style="display: none;">
          <div class="preview-pane">
            <h3>Original</h3>
            <div class="canvas-wrapper">
              <canvas id="original-canvas"></canvas>
            </div>
          </div>
          <div class="preview-pane">
            <h3>Glitched</h3>
            <div class="canvas-wrapper">
              <canvas id="processed-canvas"></canvas>
            </div>
          </div>
        </div>

        <div class="glitch-info" id="glitch-info" style="display: none;">
          <h3 id="glitch-info-title"></h3>
          <p id="glitch-info-desc"></p>
          <details>
            <summary>Technical Details</summary>
            <p id="glitch-info-technical"></p>
          </details>
          <details>
            <summary>Bug Example</summary>
            <pre><code id="glitch-info-bug"></code></pre>
          </details>
          <details>
            <summary>Fix Example</summary>
            <pre><code id="glitch-info-fix"></code></pre>
          </details>
        </div>
      </div>
    `;

    this.dropZone = document.getElementById('drop-zone')!;
    this.originalCanvas = document.getElementById('original-canvas') as HTMLCanvasElement;
    this.processedCanvas = document.getElementById('processed-canvas') as HTMLCanvasElement;
    this.glitchSelect = document.getElementById('glitch-select') as HTMLSelectElement;
    this.paramsContainer = document.getElementById('params-container')!;
    this.downloadBtn = document.getElementById('download-btn') as HTMLButtonElement;
    this.fileInput = createFileInput(this.handleFile.bind(this));
    this.container.appendChild(this.fileInput);
  }

  private setupEventListeners(): void {
    setupDropZone(this.dropZone, this.handleFile.bind(this));

    document.getElementById('upload-btn')!.addEventListener('click', () => {
      this.fileInput.click();
    });

    this.glitchSelect.addEventListener('change', () => {
      const glitchId = this.glitchSelect.value;
      if (glitchId) {
        this.currentGlitch = glitchById.get(glitchId) || null;
        this.resetParams();
        this.renderParams();
        this.updateGlitchInfo();
        this.applyGlitch();
      } else {
        this.currentGlitch = null;
        this.paramsContainer.innerHTML = '';
        this.hideGlitchInfo();
        this.showOriginal();
      }
    });

    document.getElementById('reset-btn')!.addEventListener('click', () => {
      this.glitchSelect.value = '';
      this.currentGlitch = null;
      this.paramsContainer.innerHTML = '';
      this.hideGlitchInfo();
      this.showOriginal();
    });

    this.downloadBtn.addEventListener('click', () => {
      if (this.processedImageData) {
        const glitchName = this.currentGlitch?.id || 'glitched';
        downloadImageData(this.processedImageData, `${glitchName}-image.png`);
      }
    });
  }

  private async handleFile(file: File): Promise<void> {
    try {
      let imageData = await loadImageDataFromFile(file);

      // Resize if too large
      imageData = resizeImageData(imageData, MAX_PREVIEW_SIZE, MAX_PREVIEW_SIZE);

      this.originalImageData = imageData;
      this.showControls();
      this.showOriginal();

      if (this.currentGlitch) {
        this.applyGlitch();
      }
    } catch (error) {
      console.error('Failed to load image:', error);
      alert('Failed to load image. Please try another file.');
    }
  }

  private showControls(): void {
    document.getElementById('controls')!.style.display = 'block';
    document.getElementById('preview')!.style.display = 'grid';
    this.dropZone.classList.add('has-image');
  }

  private showOriginal(): void {
    if (!this.originalImageData) return;

    const canvas = imageDataToCanvas(this.originalImageData);
    this.originalCanvas.width = canvas.width;
    this.originalCanvas.height = canvas.height;
    this.originalCanvas.getContext('2d')!.drawImage(canvas, 0, 0);

    this.processedCanvas.width = canvas.width;
    this.processedCanvas.height = canvas.height;
    this.processedCanvas.getContext('2d')!.drawImage(canvas, 0, 0);

    this.processedImageData = null;
    this.downloadBtn.disabled = true;
  }

  private resetParams(): void {
    if (!this.currentGlitch) return;

    this.currentParams = {};
    for (const param of this.currentGlitch.params) {
      this.currentParams[param.name] = param.default;
    }
  }

  private renderParams(): void {
    if (!this.currentGlitch) {
      this.paramsContainer.innerHTML = '';
      return;
    }

    this.paramsContainer.innerHTML = this.currentGlitch.params.map(param =>
      this.renderParam(param)
    ).join('');

    // Add event listeners
    for (const param of this.currentGlitch.params) {
      const input = document.getElementById(`param-${param.name}`) as HTMLInputElement | HTMLSelectElement;
      if (input) {
        input.addEventListener('input', () => this.handleParamChange(param, input));
        input.addEventListener('change', () => this.handleParamChange(param, input));
      }
    }
  }

  private renderParam(param: ParamDefinition): string {
    const value = this.currentParams[param.name] ?? param.default;

    switch (param.type) {
      case 'range':
        return `
          <div class="param-group">
            <label for="param-${param.name}">
              ${param.name}
              <span class="param-value" id="param-${param.name}-value">${value}</span>
            </label>
            <input
              type="range"
              id="param-${param.name}"
              min="${param.min}"
              max="${param.max}"
              step="${param.step || 1}"
              value="${value}"
            />
            <span class="param-desc">${param.description}</span>
          </div>
        `;

      case 'boolean':
        return `
          <div class="param-group param-checkbox">
            <label>
              <input
                type="checkbox"
                id="param-${param.name}"
                ${value ? 'checked' : ''}
              />
              ${param.name}
            </label>
            <span class="param-desc">${param.description}</span>
          </div>
        `;

      case 'select':
        return `
          <div class="param-group">
            <label for="param-${param.name}">${param.name}</label>
            <select id="param-${param.name}">
              ${param.options?.map(opt =>
                `<option value="${opt}" ${opt === value ? 'selected' : ''}>${opt}</option>`
              ).join('')}
            </select>
            <span class="param-desc">${param.description}</span>
          </div>
        `;

      default:
        return '';
    }
  }

  private handleParamChange(param: ParamDefinition, input: HTMLInputElement | HTMLSelectElement): void {
    let value: number | boolean | string;

    switch (param.type) {
      case 'range':
        value = parseFloat(input.value);
        const valueDisplay = document.getElementById(`param-${param.name}-value`);
        if (valueDisplay) {
          valueDisplay.textContent = value.toString();
        }
        break;
      case 'boolean':
        value = (input as HTMLInputElement).checked;
        break;
      case 'select':
        value = input.value;
        break;
      default:
        value = input.value;
    }

    this.currentParams[param.name] = value;
    this.applyGlitch();
  }

  private applyGlitch(): void {
    if (!this.originalImageData || !this.currentGlitch) return;

    try {
      this.processedImageData = this.currentGlitch.apply(
        this.originalImageData,
        this.currentParams
      );

      const canvas = imageDataToCanvas(this.processedImageData);
      this.processedCanvas.width = canvas.width;
      this.processedCanvas.height = canvas.height;
      this.processedCanvas.getContext('2d')!.drawImage(canvas, 0, 0);

      this.downloadBtn.disabled = false;
    } catch (error) {
      console.error('Failed to apply glitch:', error);
    }
  }

  private updateGlitchInfo(): void {
    if (!this.currentGlitch) {
      this.hideGlitchInfo();
      return;
    }

    const infoSection = document.getElementById('glitch-info')!;
    infoSection.style.display = 'block';

    document.getElementById('glitch-info-title')!.textContent = this.currentGlitch.name;
    document.getElementById('glitch-info-desc')!.textContent = this.currentGlitch.description;
    document.getElementById('glitch-info-technical')!.textContent = this.currentGlitch.technicalDetails;
    document.getElementById('glitch-info-bug')!.textContent = this.currentGlitch.bugCode;
    document.getElementById('glitch-info-fix')!.textContent = this.currentGlitch.fixCode;
  }

  private hideGlitchInfo(): void {
    document.getElementById('glitch-info')!.style.display = 'none';
  }
}
