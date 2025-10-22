/**
 * Mermaid.js integration for Claudia theme
 * Automatically detects and renders Mermaid diagrams in posts
 */

(function() {
    'use strict';

    // Check if Mermaid is enabled in theme config
    if (!window.CLAUDIA_CONFIG || !window.CLAUDIA_CONFIG.mermaid || !window.CLAUDIA_CONFIG.mermaid.enable) {
        return;
    }

    // Default Mermaid configuration
    const defaultConfig = {
        theme: window.CLAUDIA_CONFIG.mermaid.theme || 'default',
        startOnLoad: false,
        themeVariables: {
            primaryColor: '#409eff',
            primaryTextColor: '#fff',
            primaryBorderColor: '#409eff',
            lineColor: '#409eff',
            secondaryColor: '#ecf5ff',
            tertiaryColor: '#f5f7fa'
        },
        flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: 'basis'
        },
        sequence: {
            useMaxWidth: true,
            diagramMarginX: 50,
            diagramMarginY: 10,
            actorMargin: 50,
            width: 150,
            height: 65,
            boxMargin: 10,
            boxTextMargin: 5,
            noteMargin: 10,
            messageMargin: 35,
            mirrorActors: true,
            bottomMarginAdj: 1,
            useMaxWidth: true,
            rightAngles: false,
            showSequenceNumbers: false
        },
        gantt: {
            useMaxWidth: true,
            leftPadding: 75,
            rightPadding: 20,
            gridLineStartPadding: 230,
            fontSize: 11,
            fontFamily: '"Open Sans", sans-serif',
            numberSectionStyles: 4
        }
    };

    // Function to initialize Mermaid
    function initMermaid() {
        if (typeof mermaid === 'undefined') {
            console.warn('Mermaid library not loaded');
            return;
        }

        // Initialize Mermaid with configuration
        mermaid.initialize(defaultConfig);

        // Find all Mermaid code blocks
        const mermaidBlocks = document.querySelectorAll('pre code.language-mermaid, pre code.mermaid, .mermaid');
        
        if (mermaidBlocks.length === 0) {
            return;
        }

        // Process each Mermaid block
        mermaidBlocks.forEach((block, index) => {
            const isCodeBlock = block.tagName.toLowerCase() === 'code';
            const content = isCodeBlock ? block.textContent : block.innerHTML;
            
            // Create container for the diagram
            const diagramId = `mermaid-diagram-${index}`;
            const container = document.createElement('div');
            container.className = 'mermaid-container';
            
            const diagramDiv = document.createElement('div');
            diagramDiv.id = diagramId;
            diagramDiv.className = 'mermaid-diagram';
            diagramDiv.innerHTML = content;
            // Store original content for theme switching
            diagramDiv.setAttribute('data-original-content', content);
            
            container.appendChild(diagramDiv);
            
            // Replace the original block
            if (isCodeBlock) {
                const preElement = block.closest('pre');
                if (preElement) {
                    preElement.parentNode.replaceChild(container, preElement);
                }
            } else {
                block.parentNode.replaceChild(container, block);
            }
        });

        // Render all diagrams
        try {
            mermaid.init(undefined, '.mermaid-diagram');
            // Enhance with inline controls and modal viewer
            enhanceDiagrams();
        } catch (error) {
            console.error('Mermaid rendering error:', error);
        }
    }

    // Function to load Mermaid library dynamically
    function loadMermaid() {
        return new Promise((resolve, reject) => {
            if (typeof mermaid !== 'undefined') {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Initialize when DOM is ready
    function init() {
        // Check if we're on a post page or if there are mermaid blocks
        const hasMermaidContent = document.querySelector('pre code.language-mermaid, pre code.mermaid, .mermaid');
        
        if (!hasMermaidContent) {
            return;
        }

        loadMermaid()
            .then(initMermaid)
            .catch(error => {
                console.error('Failed to load Mermaid:', error);
            });
    }

    // Start initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Support for theme switching
    function handleThemeChange() {
        if (typeof mermaid !== 'undefined') {
            // Detect current theme
            const isDark = document.documentElement.classList.contains('dark') || 
                          document.body.classList.contains('dark') ||
                          window.matchMedia('(prefers-color-scheme: dark)').matches;
            
            const newTheme = isDark ? 'dark' : 'default';
            if (defaultConfig.theme !== newTheme) {
                defaultConfig.theme = newTheme;
                mermaid.initialize(defaultConfig);
                
                // Re-render existing diagrams
                const diagrams = document.querySelectorAll('.mermaid-diagram');
                diagrams.forEach(diagram => {
                    diagram.removeAttribute('data-processed');
                    diagram.innerHTML = diagram.getAttribute('data-original-content') || diagram.innerHTML;
                });
                
                try {
                    mermaid.init(undefined, '.mermaid-diagram');
                    enhanceDiagrams();
                } catch (error) {
                    console.error('Mermaid theme switch error:', error);
                }
            }
        }
    }
    
    // Listen for theme changes
    window.addEventListener('theme-changed', handleThemeChange);
    
    // Listen for system theme changes
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', handleThemeChange);
    }

    // ==============================================
    // Interactive Enhancements: Zoom and Modal Viewer
    // ==============================================
    const ZOOM = { min: 0.5, max: 4, step: 0.2 };

    function getSvg(diagramEl) {
        return diagramEl && diagramEl.querySelector('svg');
    }

    function getScale(diagramEl) {
        const current = parseFloat(diagramEl.getAttribute('data-scale') || '1');
        return Number.isFinite(current) && current > 0 ? current : 1;
    }

    function setScale(diagramEl, scale) {
        const newScale = Math.max(ZOOM.min, Math.min(ZOOM.max, scale));
        diagramEl.setAttribute('data-scale', String(newScale));
        const svg = getSvg(diagramEl);
        if (!svg) return;
        svg.style.transformOrigin = '0 0';
        svg.style.transform = `scale(${newScale})`;
        // Update any connected indicator
        const indicator = diagramEl.parentElement && diagramEl.parentElement.querySelector('.mermaid-zoom-indicator');
        if (indicator) indicator.textContent = `${Math.round(newScale * 100)}%`;
    }

    function zoomIn(diagramEl) { setScale(diagramEl, getScale(diagramEl) + ZOOM.step); }
    function zoomOut(diagramEl) { setScale(diagramEl, getScale(diagramEl) - ZOOM.step); }
    function zoomReset(diagramEl) { setScale(diagramEl, 1); }

    function fitTo(diagramEl, containerEl) {
        const svg = getSvg(diagramEl);
        if (!svg || !containerEl) return;
        const prev = getScale(diagramEl);
        // Reset to 1 to measure
        svg.style.transform = 'scale(1)';
        const rect = svg.getBoundingClientRect();
        const cw = Math.max(1, containerEl.clientWidth - 24);
        const ch = Math.max(1, containerEl.clientHeight - 24);
        const scale = Math.max(0.1, Math.min(ZOOM.max, Math.min(cw / Math.max(rect.width, 1), ch / Math.max(rect.height, 1))));
        setScale(diagramEl, scale);
        if (!Number.isFinite(scale) || scale <= 0) setScale(diagramEl, prev);
    }

    // Modal viewer helpers
    let lastActiveTrigger = null;
    function ensureModal() {
        let overlay = document.querySelector('.mermaid-modal-overlay');
        if (overlay) return overlay;
        overlay = document.createElement('div');
        overlay.className = 'mermaid-modal-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.innerHTML = `
          <div class="mermaid-modal" tabindex="-1" aria-label="Mermaid diagram viewer">
            <div class="mermaid-modal-toolbar">
              <button class="mermaid-btn mermaid-zoom-out" title="Zoom out" aria-label="Zoom out">${getMinusIcon()}</button>
              <button class="mermaid-btn mermaid-zoom-in" title="Zoom in" aria-label="Zoom in">${getPlusIcon()}</button>
              <button class="mermaid-btn mermaid-zoom-reset" title="Reset zoom" aria-label="Reset zoom">${getResetIcon()}</button>
              <button class="mermaid-btn mermaid-fit" title="Fit to window" aria-label="Fit to window">${getFitIcon()}</button>
              <span class="mermaid-zoom-indicator">100%</span>
              <span class="mermaid-toolbar-spacer"></span>
              <button class="mermaid-btn mermaid-close" title="Close (Esc)" aria-label="Close">${getCloseIcon()}</button>
            </div>
            <div class="mermaid-modal-body">
              <div class="mermaid-modal-diagram"></div>
            </div>
          </div>`;
        document.body.appendChild(overlay);

        // Close interactions
        overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) closeModal(); });
        document.addEventListener('keydown', (e) => {
            if (!overlay.classList.contains('is-active')) return;
            if (e.key === 'Escape' || e.key === 'Esc') closeModal();
        });
        overlay.querySelector('.mermaid-close').addEventListener('click', closeModal);
        return overlay;
    }

    function openModal(triggerBtn, sourceDiagramEl) {
        lastActiveTrigger = triggerBtn || null;
        const overlay = ensureModal();
        const body = overlay.querySelector('.mermaid-modal-body');
        const target = overlay.querySelector('.mermaid-modal-diagram');
        target.innerHTML = '';

        const raw = sourceDiagramEl.getAttribute('data-original-content') || sourceDiagramEl.textContent || '';
        const modalDiagram = document.createElement('div');
        modalDiagram.className = 'mermaid-diagram';
        modalDiagram.innerHTML = raw;
        target.appendChild(modalDiagram);

        try { mermaid.init(undefined, modalDiagram); } catch (e) { console.error('Mermaid modal render error:', e); }
        modalDiagram.setAttribute('data-scale', '1');
        updateIndicatorElement(overlay, 1);

        // Wire toolbar actions
        overlay.querySelector('.mermaid-zoom-in').onclick = () => { zoomIn(modalDiagram); updateIndicatorElement(overlay, getScale(modalDiagram)); };
        overlay.querySelector('.mermaid-zoom-out').onclick = () => { zoomOut(modalDiagram); updateIndicatorElement(overlay, getScale(modalDiagram)); };
        overlay.querySelector('.mermaid-zoom-reset').onclick = () => { zoomReset(modalDiagram); updateIndicatorElement(overlay, 1); };
        overlay.querySelector('.mermaid-fit').onclick = () => { fitTo(modalDiagram, body); updateIndicatorElement(overlay, getScale(modalDiagram)); };

        // Keyboard shortcuts in modal
        const keyHandler = (e) => {
            if (!overlay.classList.contains('is-active')) return;
            if (e.key === '+' || e.key === '=') { zoomIn(modalDiagram); updateIndicatorElement(overlay, getScale(modalDiagram)); }
            if (e.key === '-' || e.key === '_') { zoomOut(modalDiagram); updateIndicatorElement(overlay, getScale(modalDiagram)); }
            if (e.key === '0') { zoomReset(modalDiagram); updateIndicatorElement(overlay, 1); }
        };
        overlay._mermaidKeyHandler = keyHandler;
        document.addEventListener('keydown', keyHandler);

        overlay.classList.add('is-active');
        document.documentElement.classList.add('mermaid-modal-open');
        const modal = overlay.querySelector('.mermaid-modal');
        modal.focus();

        // Fit after paint and enable panning
        setTimeout(() => {
            fitTo(modalDiagram, body);
            updateIndicatorElement(overlay, getScale(modalDiagram));
        }, 0);

        // Pan (drag) support inside modal
        const svg = getSvg(modalDiagram);
        if (svg) {
            let isPanning = false;
            let startX = 0, startY = 0;
            let scrollLeft = 0, scrollTop = 0;

            const onDown = (e) => {
                isPanning = true;
                modalDiagram.style.cursor = 'grabbing';
                startX = e.clientX;
                startY = e.clientY;
                scrollLeft = body.scrollLeft;
                scrollTop = body.scrollTop;
                e.preventDefault();
            };
            const onMove = (e) => {
                if (!isPanning) return;
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                body.scrollLeft = scrollLeft - dx;
                body.scrollTop = scrollTop - dy;
            };
            const onUp = () => {
                isPanning = false;
                modalDiagram.style.cursor = 'grab';
            };

            svg.addEventListener('mousedown', onDown);
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);

            // Touch support
            svg.addEventListener('touchstart', (e) => onDown(e.touches[0]), { passive: false });
            svg.addEventListener('touchmove', (e) => { onMove(e.touches[0]); e.preventDefault(); }, { passive: false });
            svg.addEventListener('touchend', onUp);
        }
    }

    function closeModal() {
        const overlay = document.querySelector('.mermaid-modal-overlay');
        if (!overlay) return;
        overlay.classList.remove('is-active');
        document.documentElement.classList.remove('mermaid-modal-open');
        if (overlay._mermaidKeyHandler) {
            document.removeEventListener('keydown', overlay._mermaidKeyHandler);
            overlay._mermaidKeyHandler = null;
        }
        if (lastActiveTrigger && typeof lastActiveTrigger.focus === 'function') {
            lastActiveTrigger.focus();
        }
    }

    function updateIndicatorElement(scopeEl, scale) {
        const el = scopeEl.querySelector('.mermaid-zoom-indicator');
        if (el) el.textContent = `${Math.round((scale || 1) * 100)}%`;
    }

    function createInlineToolbar(container, diagramEl) {
        if (container.querySelector('.mermaid-toolbar')) return; // prevent duplicates
        const toolbar = document.createElement('div');
        toolbar.className = 'mermaid-toolbar';
        toolbar.innerHTML = `
          <button class="mermaid-btn mermaid-zoom-out" title="Zoom out" aria-label="Zoom out">${getMinusIcon()}</button>
          <button class="mermaid-btn mermaid-zoom-in" title="Zoom in" aria-label="Zoom in">${getPlusIcon()}</button>
          <button class="mermaid-btn mermaid-zoom-reset" title="Reset zoom" aria-label="Reset zoom">${getResetIcon()}</button>
          <span class="mermaid-zoom-indicator">100%</span>
          <button class="mermaid-btn mermaid-fullscreen" title="Open in fullscreen" aria-label="Open in fullscreen">${getFullscreenIcon()}</button>`;
        container.appendChild(toolbar);

        // Bind inline actions
        const updateInline = () => updateIndicatorElement(container, getScale(diagramEl));
        toolbar.querySelector('.mermaid-zoom-in').addEventListener('click', (e) => { e.stopPropagation(); zoomIn(diagramEl); updateInline(); });
        toolbar.querySelector('.mermaid-zoom-out').addEventListener('click', (e) => { e.stopPropagation(); zoomOut(diagramEl); updateInline(); });
        toolbar.querySelector('.mermaid-zoom-reset').addEventListener('click', (e) => { e.stopPropagation(); zoomReset(diagramEl); updateInline(); });
        toolbar.querySelector('.mermaid-fullscreen').addEventListener('click', (e) => { e.stopPropagation(); openModal(e.currentTarget, diagramEl); });
        updateInline();
    }

    function enhanceDiagrams() {
        // Inline mode: clean, centered, non-interactive; click to open modal
        document.querySelectorAll('.mermaid-container').forEach((container) => {
            const diagramEl = container.querySelector('.mermaid-diagram');
            if (!diagramEl) return;
            // Ensure no residual inline scaling
            diagramEl.removeAttribute('data-scale');
            const svg = getSvg(diagramEl);
            if (svg) {
                svg.style.transform = 'none';
            }

            // Accessibly allow click/keyboard to open modal
            container.setAttribute('role', 'button');
            container.setAttribute('tabindex', '0');
            if (!container.getAttribute('title')) {
                container.setAttribute('title', '点击查看大图');
            }
            const open = (evt) => {
                // Avoid opening when selecting text inside
                if (window.getSelection && String(window.getSelection()).length > 0) return;
                openModal(container, diagramEl);
            };
            container.onclick = open;
            container.onkeydown = (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    open(e);
                }
            };
        });
    }

    // Icon helpers (inline SVG)
    function getPlusIcon() { return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'; }
    function getMinusIcon() { return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'; }
    function getResetIcon() { return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4v6h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 20v-6h-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 10A8 8 0 1 0 10 20" stroke="currentColor" stroke-width="2" fill="none"/></svg>'; }
    function getFitIcon() { return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 9V5h4M21 9V5h-4M3 15v4h4M21 15v4h-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'; }
    function getFullscreenIcon() { return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 3H5v4M15 3h4v4M9 21H5v-4M19 21h-4v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'; }
    function getCloseIcon() { return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'; }

})();