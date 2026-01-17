import type { GlitchDefinition, GlitchParams } from '../glitches';
import { imageDataToCanvas } from '../utils/canvas';

export class GlitchCard {
  private glitch: GlitchDefinition;
  private element: HTMLElement;
  private onSelect: (glitch: GlitchDefinition) => void;
  private imageData: ImageData | null;

  constructor(
    glitch: GlitchDefinition,
    onSelect: (glitch: GlitchDefinition) => void,
    imageData: ImageData | null = null
  ) {
    this.glitch = glitch;
    this.onSelect = onSelect;
    this.imageData = imageData;
    this.element = this.createElement();
  }

  private createElement(): HTMLElement {
    const card = document.createElement('article');
    card.className = 'glitch-card';
    if (this.imageData) {
      card.classList.add('has-preview');
    }
    card.dataset.category = this.glitch.category;
    card.dataset.glitchId = this.glitch.id;

    const categoryLabel = this.getCategoryLabel(this.glitch.category);
    const previewHtml = this.imageData ? this.createPreviewHtml() : '';

    card.innerHTML = `
      ${previewHtml}
      <div class="glitch-card-header">
        <span class="glitch-category-badge ${this.glitch.category}">${categoryLabel}</span>
        <h3 class="glitch-card-title">${this.glitch.name}</h3>
      </div>
      <p class="glitch-card-desc">${this.glitch.description}</p>
      <div class="glitch-card-footer">
        <button class="btn btn-small btn-primary try-btn">Try It</button>
        <button class="btn btn-small btn-secondary details-btn">Details</button>
      </div>
      <div class="glitch-card-details" style="display: none;">
        <div class="details-content">
          <h4>Technical Details</h4>
          <p>${this.glitch.technicalDetails}</p>
          <h4>Bug Example</h4>
          <pre><code>${this.escapeHtml(this.glitch.bugCode)}</code></pre>
          <h4>Fix Example</h4>
          <pre><code>${this.escapeHtml(this.glitch.fixCode)}</code></pre>
        </div>
      </div>
    `;

    // Render preview if we have image data
    if (this.imageData) {
      this.renderPreview(card);
    }

    // Event listeners
    card.querySelector('.try-btn')!.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onSelect(this.glitch);
    });

    card.querySelector('.details-btn')!.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDetails();
    });

    return card;
  }

  private createPreviewHtml(): string {
    return `
      <div class="glitch-card-preview">
        <div class="preview-compare">
          <div class="preview-original">
            <span class="preview-label">Original</span>
            <canvas class="preview-canvas original-canvas"></canvas>
          </div>
          <div class="preview-glitched">
            <span class="preview-label">Glitched</span>
            <canvas class="preview-canvas glitched-canvas"></canvas>
          </div>
        </div>
      </div>
    `;
  }

  private renderPreview(card: HTMLElement): void {
    if (!this.imageData) return;

    const originalCanvas = card.querySelector('.original-canvas') as HTMLCanvasElement;
    const glitchedCanvas = card.querySelector('.glitched-canvas') as HTMLCanvasElement;

    // Draw original
    originalCanvas.width = this.imageData.width;
    originalCanvas.height = this.imageData.height;
    originalCanvas.getContext('2d')!.putImageData(this.imageData, 0, 0);

    // Apply glitch with default params
    const defaultParams: GlitchParams = {};
    for (const param of this.glitch.params) {
      defaultParams[param.name] = param.default;
    }

    try {
      const glitchedData = this.glitch.apply(this.imageData, defaultParams);
      const glitchedSource = imageDataToCanvas(glitchedData);

      glitchedCanvas.width = glitchedData.width;
      glitchedCanvas.height = glitchedData.height;
      glitchedCanvas.getContext('2d')!.drawImage(glitchedSource, 0, 0);
    } catch (error) {
      console.error(`Failed to apply glitch ${this.glitch.id}:`, error);
      // Show error state
      glitchedCanvas.width = this.imageData.width;
      glitchedCanvas.height = this.imageData.height;
      const ctx = glitchedCanvas.getContext('2d')!;
      ctx.fillStyle = '#ff6b9d';
      ctx.fillRect(0, 0, glitchedCanvas.width, glitchedCanvas.height);
    }
  }

  private getCategoryLabel(category: string): string {
    switch (category) {
      case 'pixel-format':
        return 'Pixel Format';
      case 'memory-layout':
        return 'Memory Layout';
      case 'coordinates':
        return 'Coordinates';
      default:
        return category;
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private toggleDetails(): void {
    const details = this.element.querySelector('.glitch-card-details') as HTMLElement;
    const btn = this.element.querySelector('.details-btn') as HTMLButtonElement;

    if (details.style.display === 'none') {
      details.style.display = 'block';
      btn.textContent = 'Hide';
      this.element.classList.add('expanded');
    } else {
      details.style.display = 'none';
      btn.textContent = 'Details';
      this.element.classList.remove('expanded');
    }
  }

  public getElement(): HTMLElement {
    return this.element;
  }
}
