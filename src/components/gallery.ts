import { glitches, glitchesByCategory } from '../glitches';
import type { GlitchDefinition, GlitchCategory } from '../glitches';
import { GlitchCard } from './glitch-card';
import { loadImageDataFromFile, loadImageDataFromURL, setupDropZone, createFileInput } from '../utils/image-loader';
import { resizeImageData } from '../utils/canvas';

const PREVIEW_SIZE = 200;
const DEFAULT_IMAGE = './costarica.jpg';

export class Gallery {
  private container: HTMLElement;
  private onGlitchSelect: (glitch: GlitchDefinition) => void;
  private currentFilter: GlitchCategory | 'all' = 'all';
  private imageData: ImageData | null = null;
  private cards: GlitchCard[] = [];
  private fileInput!: HTMLInputElement;

  constructor(containerId: string, onGlitchSelect: (glitch: GlitchDefinition) => void) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container ${containerId} not found`);
    }
    this.container = container;
    this.onGlitchSelect = onGlitchSelect;
    this.render();
    this.loadDefaultImage();
  }

  private async loadDefaultImage(): Promise<void> {
    try {
      let imageData = await loadImageDataFromURL(DEFAULT_IMAGE);
      imageData = resizeImageData(imageData, PREVIEW_SIZE, PREVIEW_SIZE);
      this.imageData = imageData;

      const preview = document.getElementById('gallery-preview')!;
      const content = document.querySelector('.gallery-upload-content') as HTMLElement;
      const canvas = document.getElementById('gallery-preview-canvas') as HTMLCanvasElement;

      canvas.width = imageData.width;
      canvas.height = imageData.height;
      canvas.getContext('2d')!.putImageData(imageData, 0, 0);

      preview.style.display = 'flex';
      content.style.display = 'none';

      this.renderCards();
    } catch (error) {
      console.log('Default image not loaded, user can upload their own');
    }
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="gallery">
        <div class="gallery-header">
          <h2>Graphics Glitch Encyclopedia</h2>
          <p>Learn about common graphics programming bugs and their visual artifacts</p>
        </div>

        <div class="gallery-upload" id="gallery-drop-zone">
          <div class="gallery-upload-content">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <p>Drop an image to preview all glitches, or <button class="upload-btn" id="gallery-upload-btn">browse</button></p>
          </div>
          <div class="gallery-upload-preview" id="gallery-preview" style="display: none;">
            <canvas id="gallery-preview-canvas"></canvas>
            <button class="btn btn-small btn-secondary" id="gallery-clear-btn">Clear</button>
          </div>
        </div>

        <div class="gallery-filters">
          <button class="filter-btn active" data-filter="all">All</button>
          <button class="filter-btn" data-filter="pixel-format">Pixel Format</button>
          <button class="filter-btn" data-filter="memory-layout">Memory Layout</button>
          <button class="filter-btn" data-filter="coordinates">Coordinates</button>
        </div>

        <div class="gallery-stats">
          <span class="stat"><strong>${glitches.length}</strong> glitches documented</span>
          <span class="stat"><strong>${glitchesByCategory['pixel-format'].length}</strong> pixel format bugs</span>
          <span class="stat"><strong>${glitchesByCategory['memory-layout'].length}</strong> memory layout bugs</span>
          <span class="stat"><strong>${glitchesByCategory['coordinates'].length}</strong> coordinate bugs</span>
        </div>

        <div class="gallery-grid" id="gallery-grid"></div>
      </div>
    `;

    this.renderCards();
    this.setupFilters();
    this.setupUpload();
  }

  private renderCards(): void {
    const grid = document.getElementById('gallery-grid')!;
    grid.innerHTML = '';
    this.cards = [];

    const filteredGlitches = this.currentFilter === 'all'
      ? glitches
      : glitchesByCategory[this.currentFilter];

    for (const glitch of filteredGlitches) {
      const card = new GlitchCard(glitch, this.onGlitchSelect, this.imageData);
      this.cards.push(card);
      grid.appendChild(card.getElement());
    }
  }

  private setupFilters(): void {
    const buttons = this.container.querySelectorAll('.filter-btn');

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentFilter = btn.getAttribute('data-filter') as GlitchCategory | 'all';
        this.renderCards();
      });
    });
  }

  private setupUpload(): void {
    const dropZone = document.getElementById('gallery-drop-zone')!;

    this.fileInput = createFileInput(this.handleFile.bind(this));
    this.container.appendChild(this.fileInput);

    setupDropZone(dropZone, this.handleFile.bind(this));

    document.getElementById('gallery-upload-btn')!.addEventListener('click', () => {
      this.fileInput.click();
    });

    document.getElementById('gallery-clear-btn')!.addEventListener('click', () => {
      this.clearImage();
    });
  }

  private async handleFile(file: File): Promise<void> {
    try {
      let imageData = await loadImageDataFromFile(file);
      imageData = resizeImageData(imageData, PREVIEW_SIZE, PREVIEW_SIZE);
      this.imageData = imageData;

      // Show preview
      const preview = document.getElementById('gallery-preview')!;
      const content = document.querySelector('.gallery-upload-content') as HTMLElement;
      const canvas = document.getElementById('gallery-preview-canvas') as HTMLCanvasElement;

      canvas.width = imageData.width;
      canvas.height = imageData.height;
      canvas.getContext('2d')!.putImageData(imageData, 0, 0);

      preview.style.display = 'flex';
      content.style.display = 'none';

      // Update all cards with the image
      this.renderCards();
    } catch (error) {
      console.error('Failed to load image:', error);
    }
  }

  private clearImage(): void {
    this.imageData = null;

    const preview = document.getElementById('gallery-preview')!;
    const content = document.querySelector('.gallery-upload-content') as HTMLElement;

    preview.style.display = 'none';
    content.style.display = 'flex';

    this.renderCards();
  }
}
