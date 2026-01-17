import './style.css';
import { Sandbox } from './components/sandbox';
import { Gallery } from './components/gallery';
import type { GlitchDefinition } from './glitches';

class App {
  private _sandbox!: Sandbox;
  private _gallery!: Gallery;
  private _currentView: 'gallery' | 'sandbox' = 'gallery';

  constructor() {
    this.setupApp();
    this.setupNavigation();
  }

  private setupApp(): void {
    // Initialize gallery with callback to switch to sandbox
    this._gallery = new Gallery('gallery-container', (glitch: GlitchDefinition) => {
      this.switchToSandbox(glitch);
    });

    // Initialize sandbox
    this._sandbox = new Sandbox('sandbox-container');
  }

  private setupNavigation(): void {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const view = link.getAttribute('data-view') as 'gallery' | 'sandbox';
        this.switchView(view);
      });
    });

    // Handle hash navigation
    this.handleHashChange();
    window.addEventListener('hashchange', () => this.handleHashChange());
  }

  private handleHashChange(): void {
    const hash = window.location.hash.slice(1);
    if (hash === 'sandbox') {
      this.switchView('sandbox');
    } else {
      this.switchView('gallery');
    }
  }

  private switchView(view: 'gallery' | 'sandbox'): void {
    this._currentView = view;

    // Update nav
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.getAttribute('data-view') === view);
    });

    // Update containers
    document.getElementById('gallery-container')!.style.display =
      view === 'gallery' ? 'block' : 'none';
    document.getElementById('sandbox-container')!.style.display =
      view === 'sandbox' ? 'block' : 'none';

    // Update hash without triggering hashchange
    const newHash = view === 'sandbox' ? '#sandbox' : '#gallery';
    if (window.location.hash !== newHash) {
      history.pushState(null, '', newHash);
    }
  }

  private switchToSandbox(glitch: GlitchDefinition): void {
    this.switchView('sandbox');

    // Set the glitch in the sandbox dropdown
    const select = document.getElementById('glitch-select') as HTMLSelectElement;
    if (select) {
      select.value = glitch.id;
      select.dispatchEvent(new Event('change'));
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new App();
});
