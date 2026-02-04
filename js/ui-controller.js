/**
 * Google Focus Lab - UI Controller Module
 * Handles all UI interactions, rendering, and state management
 */

const UIController = (function() {
  'use strict';

  // DOM element references
  const elements = {};

  // State
  let workingProfile = null;
  let timerIntervalId = null;
  let activeAccordion = null;

  // Canvas contexts
  const canvasContexts = {};

  /**
   * Initialize UI controller
   */
  function init() {
    cacheElements();
    bindEvents();
    initializeCanvases();
    loadInitialState();
    renderProfiles();
  }

  /**
   * Cache DOM element references
   */
  function cacheElements() {
    // App bar
    elements.menuBtn = document.getElementById('menuBtn');
    elements.settingsBtn = document.getElementById('settingsBtn');

    // Session card
    elements.currentProfileName = document.getElementById('currentProfileName');
    elements.timerDisplay = document.getElementById('timerDisplay');
    elements.statusIndicator = document.getElementById('statusIndicator');
    elements.statusText = document.getElementById('statusText');

    // Timeline
    elements.timelineContainer = document.getElementById('timelineContainer');
    elements.timelineTrack = document.getElementById('timelineTrack');
    elements.timelinePlayhead = document.getElementById('timelinePlayhead');
    elements.timelineDuration = document.getElementById('timelineDuration');
    elements.timelineRuler = document.getElementById('timelineRuler');

    // Timeline canvases
    elements.baseFrequencyCanvas = document.getElementById('baseFrequencyCanvas');
    elements.textureCanvas = document.getElementById('textureCanvas');
    elements.modulationCanvas = document.getElementById('modulationCanvas');
    elements.silenceCanvas = document.getElementById('silenceCanvas');

    // Layer editors
    elements.baseFrequencyEditor = document.getElementById('baseFrequencyEditor');
    elements.textureEditor = document.getElementById('textureEditor');
    elements.textureSlider = document.getElementById('textureSlider');
    elements.silenceBlocks = document.getElementById('silenceBlocks');
    elements.addSilenceBtn = document.getElementById('addSilenceBtn');

    // Pro mode
    elements.proModeToggle = document.getElementById('proModeToggle');

    // Bottom action bar
    elements.profilesBtn = document.getElementById('profilesBtn');
    elements.playPauseBtn = document.getElementById('playPauseBtn');
    elements.playIcon = document.getElementById('playIcon');
    elements.pauseIcon = document.getElementById('pauseIcon');
    elements.saveBtn = document.getElementById('saveBtn');

    // Navigation drawer
    elements.navDrawer = document.getElementById('navDrawer');
    elements.navDrawerScrim = document.getElementById('navDrawerScrim');

    // Modals
    elements.profilesModal = document.getElementById('profilesModal');
    elements.profilesModalScrim = document.getElementById('profilesModalScrim');
    elements.closeProfilesModal = document.getElementById('closeProfilesModal');
    elements.profileList = document.getElementById('profileList');
    elements.newProfileBtn = document.getElementById('newProfileBtn');

    elements.saveModal = document.getElementById('saveModal');
    elements.saveModalScrim = document.getElementById('saveModalScrim');
    elements.closeSaveModal = document.getElementById('closeSaveModal');
    elements.profileNameInput = document.getElementById('profileNameInput');
    elements.durationSelect = document.getElementById('durationSelect');
    elements.cancelSaveBtn = document.getElementById('cancelSaveBtn');
    elements.confirmSaveBtn = document.getElementById('confirmSaveBtn');

    elements.settingsModal = document.getElementById('settingsModal');
    elements.settingsModalScrim = document.getElementById('settingsModalScrim');
    elements.closeSettingsModal = document.getElementById('closeSettingsModal');
    elements.masterVolumeSlider = document.getElementById('masterVolumeSlider');
    elements.notificationToggle = document.getElementById('notificationToggle');
    elements.clearDataBtn = document.getElementById('clearDataBtn');

    // Snackbar
    elements.snackbar = document.getElementById('sessionCompleteSnackbar');
    elements.snackbarText = elements.snackbar?.querySelector('.snackbar__text');
    elements.snackbarDismiss = document.getElementById('snackbarDismiss');

    // Accordion headers
    elements.accordionHeaders = document.querySelectorAll('.layer-accordion__header');
  }

  /**
   * Bind event listeners
   */
  function bindEvents() {
    // Navigation
    elements.menuBtn?.addEventListener('click', openNavDrawer);
    elements.navDrawerScrim?.addEventListener('click', closeNavDrawer);
    elements.navDrawer?.querySelectorAll('.nav-drawer__item').forEach(item => {
      item.addEventListener('click', handleNavItemClick);
    });

    // Settings
    elements.settingsBtn?.addEventListener('click', openSettingsModal);
    elements.closeSettingsModal?.addEventListener('click', closeSettingsModal);
    elements.settingsModalScrim?.addEventListener('click', closeSettingsModal);
    elements.masterVolumeSlider?.addEventListener('input', handleVolumeChange);
    elements.notificationToggle?.addEventListener('change', handleNotificationToggle);
    elements.clearDataBtn?.addEventListener('click', handleClearData);

    // Profiles modal
    elements.profilesBtn?.addEventListener('click', openProfilesModal);
    elements.closeProfilesModal?.addEventListener('click', closeProfilesModal);
    elements.profilesModalScrim?.addEventListener('click', closeProfilesModal);
    elements.newProfileBtn?.addEventListener('click', handleNewProfile);

    // Save modal
    elements.saveBtn?.addEventListener('click', openSaveModal);
    elements.closeSaveModal?.addEventListener('click', closeSaveModal);
    elements.saveModalScrim?.addEventListener('click', closeSaveModal);
    elements.cancelSaveBtn?.addEventListener('click', closeSaveModal);
    elements.confirmSaveBtn?.addEventListener('click', handleSaveProfile);

    // Playback
    elements.playPauseBtn?.addEventListener('click', handlePlayPause);

    // Pro mode
    elements.proModeToggle?.addEventListener('change', handleProModeToggle);

    // Layer accordions
    elements.accordionHeaders?.forEach(header => {
      header.addEventListener('click', handleAccordionClick);
    });

    // Layer controls
    bindLayerControls();

    // Silence blocks
    elements.addSilenceBtn?.addEventListener('click', handleAddSilence);

    // Snackbar
    elements.snackbarDismiss?.addEventListener('click', hideSnackbar);

    // Session complete event
    window.addEventListener('sessionComplete', handleSessionComplete);

    // Record interactions for Pro Mode
    document.addEventListener('click', () => {
      if (AudioEngine.getIsPlaying()) {
        AudioEngine.recordInteraction();
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeydown);
  }

  /**
   * Bind layer control events
   */
  function bindLayerControls() {
    // Base frequency segmented buttons
    document.querySelectorAll('[data-layer="baseFrequency"] .segmented-button').forEach(btn => {
      btn.addEventListener('click', handleBaseFrequencyPreset);
    });

    // Texture slider
    elements.textureSlider?.addEventListener('input', handleTextureChange);

    // Modulation chips
    document.querySelectorAll('[data-layer="modulation"] .chip').forEach(chip => {
      chip.addEventListener('click', handleModulationTypeChange);
    });

    // Intensity dots
    const intensityDots = document.querySelector('.intensity-dots');
    intensityDots?.addEventListener('click', handleIntensityChange);

    // Canvas interactions
    elements.baseFrequencyEditor?.addEventListener('pointerdown', handleCurveEditorStart);
    elements.textureEditor?.addEventListener('pointerdown', handleDensityEditorStart);
  }

  /**
   * Initialize canvas elements
   */
  function initializeCanvases() {
    // Timeline canvases
    const timelineCanvases = [
      'baseFrequencyCanvas',
      'textureCanvas',
      'modulationCanvas',
      'silenceCanvas'
    ];

    timelineCanvases.forEach(id => {
      const canvas = elements[id];
      if (canvas) {
        resizeCanvas(canvas);
        canvasContexts[id] = canvas.getContext('2d');
      }
    });

    // Editor canvases
    const editorCanvases = ['baseFrequencyEditor', 'textureEditor'];
    editorCanvases.forEach(id => {
      const canvas = elements[id];
      if (canvas) {
        resizeCanvas(canvas);
        canvasContexts[id] = canvas.getContext('2d');
      }
    });

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      Object.keys(canvasContexts).forEach(id => {
        const canvas = elements[id];
        if (canvas) {
          resizeCanvas(canvas);
          renderAllCanvases();
        }
      });
    });

    Object.keys(canvasContexts).forEach(id => {
      if (elements[id]) {
        resizeObserver.observe(elements[id].parentElement || elements[id]);
      }
    });
  }

  /**
   * Resize canvas to match display size
   */
  function resizeCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
  }

  /**
   * Load initial application state
   */
  function loadInitialState() {
    // Load settings
    const settings = DataModel.getSettings();
    elements.masterVolumeSlider.value = settings.masterVolume * 100;
    elements.notificationToggle.checked = settings.notificationsEnabled;
    elements.proModeToggle.checked = settings.proModeEnabled;
    AudioEngine.setMasterVolume(settings.masterVolume);
    AudioEngine.setProMode(settings.proModeEnabled);

    // Load current profile or create default
    let currentProfile = DataModel.getCurrentProfile();
    if (!currentProfile) {
      // Default to first preset
      currentProfile = DataModel.PRESET_PROFILES[0];
      DataModel.setCurrentProfileId(currentProfile.id);
    }

    loadProfile(currentProfile);
  }

  /**
   * Load a profile into the editor
   */
  function loadProfile(profile) {
    workingProfile = DataModel.createWorkingCopy(profile);
    AudioEngine.loadProfile(workingProfile);

    // Update UI
    elements.currentProfileName.textContent = workingProfile.name;
    elements.timelineDuration.textContent = DataModel.formatDuration(workingProfile.duration);
    elements.timerDisplay.textContent = DataModel.formatTime(workingProfile.duration);

    // Render timeline
    renderTimelineRuler();
    renderAllCanvases();
    renderSilenceBlocks();

    // Update layer controls
    updateLayerControls();
  }

  /**
   * Update layer controls to match working profile
   */
  function updateLayerControls() {
    if (!workingProfile) return;

    // Update texture slider
    const textureDensity = workingProfile.layers.texture.densityMap[0]?.value || 0.3;
    elements.textureSlider.value = textureDensity * 100;

    // Update modulation type
    const modType = workingProfile.layers.modulation.type;
    document.querySelectorAll('[data-layer="modulation"] .chip').forEach(chip => {
      const isSelected = chip.dataset.value === modType;
      chip.classList.toggle('chip--selected', isSelected);
      chip.setAttribute('aria-checked', isSelected);
    });

    // Update intensity dots
    const intensity = workingProfile.layers.modulation.intensity;
    const dotCount = Math.round(intensity * 10); // 0-5 dots
    document.querySelectorAll('.intensity-dot').forEach((dot, index) => {
      dot.classList.toggle('active', index < dotCount);
    });
    const intensityDots = document.querySelector('.intensity-dots');
    if (intensityDots) {
      intensityDots.setAttribute('aria-valuenow', dotCount);
    }

    // Update base frequency buttons
    const avgFreq = getAverageValue(workingProfile.layers.baseFrequency.curve);
    let preset = 'normal';
    if (avgFreq < 0.4) preset = 'low';
    else if (avgFreq > 0.6) preset = 'high';

    document.querySelectorAll('[data-layer="baseFrequency"] .segmented-button').forEach(btn => {
      const isSelected = btn.dataset.value === preset;
      btn.setAttribute('aria-checked', isSelected);
    });
  }

  /**
   * Get average value from a curve
   */
  function getAverageValue(curve) {
    if (!curve || curve.length === 0) return 0.5;
    return curve.reduce((sum, p) => sum + p.value, 0) / curve.length;
  }

  /**
   * Render all canvases
   */
  function renderAllCanvases() {
    renderTimelineLayer('baseFrequencyCanvas', 'baseFrequency');
    renderTimelineLayer('textureCanvas', 'texture');
    renderTimelineLayer('modulationCanvas', 'modulation');
    renderTimelineLayer('silenceCanvas', 'silence');
    renderCurveEditor();
    renderDensityEditor();
  }

  /**
   * Render a timeline layer
   */
  function renderTimelineLayer(canvasId, layerType) {
    const ctx = canvasContexts[canvasId];
    const canvas = elements[canvasId];
    if (!ctx || !canvas || !workingProfile) return;

    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    const layerColors = {
      baseFrequency: '#6750A4',
      texture: '#7D5260',
      modulation: '#625B71',
      silence: '#79747E'
    };
    const color = layerColors[layerType] || '#6750A4';

    switch (layerType) {
      case 'baseFrequency':
        renderCurveOnTimeline(ctx, width, height, workingProfile.layers.baseFrequency.curve, color);
        break;
      case 'texture':
        renderDensityOnTimeline(ctx, width, height, workingProfile.layers.texture.densityMap, color);
        break;
      case 'modulation':
        renderModulationOnTimeline(ctx, width, height, workingProfile.layers.modulation, color);
        break;
      case 'silence':
        renderSilenceOnTimeline(ctx, width, height, workingProfile.layers.silence.blocks, color);
        break;
    }
  }

  /**
   * Render curve on timeline
   */
  function renderCurveOnTimeline(ctx, width, height, curve, color) {
    if (!curve || curve.length === 0) return;

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    curve.forEach((point, index) => {
      const x = point.time * width;
      const y = height - (point.value * height);
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    // Extend to end
    if (curve.length > 0) {
      const lastPoint = curve[curve.length - 1];
      ctx.lineTo(width, height - (lastPoint.value * height));
    }

    ctx.stroke();

    // Fill area under curve
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = color + '30';
    ctx.fill();
  }

  /**
   * Render density on timeline
   */
  function renderDensityOnTimeline(ctx, width, height, densityMap, color) {
    if (!densityMap || densityMap.length === 0) return;

    const density = densityMap[0].value;
    ctx.fillStyle = color + Math.round(density * 80 + 20).toString(16).padStart(2, '0');
    ctx.fillRect(0, 0, width, height);
  }

  /**
   * Render modulation on timeline
   */
  function renderModulationOnTimeline(ctx, width, height, modulation, color) {
    const { type, intensity } = modulation;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    const midY = height / 2;
    const amplitude = (height / 3) * intensity;

    for (let x = 0; x < width; x++) {
      let y = midY;
      const t = x / width;

      switch (type) {
        case 'gentle':
          y = midY + Math.sin(t * Math.PI * 4) * amplitude;
          break;
        case 'irregular':
          y = midY + (Math.sin(t * Math.PI * 6) + Math.sin(t * Math.PI * 11) * 0.5) * amplitude * 0.7;
          break;
        default: // stable
          y = midY;
      }

      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();
  }

  /**
   * Render silence blocks on timeline
   */
  function renderSilenceOnTimeline(ctx, width, height, blocks, color) {
    if (!blocks || !workingProfile) return;

    const duration = workingProfile.duration;

    blocks.forEach(block => {
      const x = (block.start / duration) * width;
      const w = (block.duration / duration) * width;

      ctx.fillStyle = color + '80';
      ctx.fillRect(x, 0, Math.max(w, 2), height);
    });
  }

  /**
   * Render the curve editor canvas
   */
  function renderCurveEditor() {
    const ctx = canvasContexts.baseFrequencyEditor;
    const canvas = elements.baseFrequencyEditor;
    if (!ctx || !canvas || !workingProfile) return;

    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#E7E0EC40';
    ctx.lineWidth = 1;
    
    // Horizontal lines
    for (let i = 1; i < 4; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw curve
    const curve = workingProfile.layers.baseFrequency.curve;
    if (curve && curve.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = '#6750A4';
      ctx.lineWidth = 3;

      curve.forEach((point, index) => {
        const x = point.time * width;
        const y = height - (point.value * height);
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

      // Draw points
      curve.forEach(point => {
        const x = point.time * width;
        const y = height - (point.value * height);

        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#6750A4';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }
  }

  /**
   * Render the density editor canvas
   */
  function renderDensityEditor() {
    const ctx = canvasContexts.textureEditor;
    const canvas = elements.textureEditor;
    if (!ctx || !canvas || !workingProfile) return;

    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    const density = workingProfile.layers.texture.densityMap[0]?.value || 0.3;

    // Draw density visualization
    ctx.fillStyle = '#7D5260' + Math.round(density * 150 + 50).toString(16).padStart(2, '0');
    ctx.fillRect(0, 0, width, height);

    // Draw noise pattern based on density
    const dotCount = Math.floor(density * 200);
    ctx.fillStyle = '#7D526080';

    for (let i = 0; i < dotCount; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 3 + 1;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Render timeline ruler
   */
  function renderTimelineRuler() {
    if (!elements.timelineRuler || !workingProfile) return;

    elements.timelineRuler.innerHTML = '';
    const duration = workingProfile.duration;
    const marks = Math.min(6, Math.floor(duration / 300) + 1); // Max 6 marks

    for (let i = 0; i <= marks; i++) {
      const time = (duration / marks) * i;
      const percent = (i / marks) * 100;

      const mark = document.createElement('span');
      mark.className = 'timeline-ruler__mark';
      mark.textContent = DataModel.formatTime(time);
      mark.style.left = `${percent}%`;
      mark.style.transform = 'translateX(-50%)';
      elements.timelineRuler.appendChild(mark);
    }
  }

  /**
   * Render silence blocks
   */
  function renderSilenceBlocks() {
    if (!elements.silenceBlocks || !workingProfile) return;

    const blocks = workingProfile.layers.silence.blocks;
    elements.silenceBlocks.innerHTML = '';

    if (blocks.length === 0) {
      const emptyText = document.createElement('span');
      emptyText.className = 'empty-state__text';
      emptyText.textContent = '無音区間なし';
      emptyText.style.opacity = '0.6';
      emptyText.style.fontSize = '14px';
      elements.silenceBlocks.appendChild(emptyText);
      return;
    }

    blocks.forEach((block, index) => {
      const blockEl = document.createElement('div');
      blockEl.className = 'silence-block';
      blockEl.innerHTML = `
        <span>${DataModel.formatTime(block.start)} - ${DataModel.formatTime(block.start + block.duration)}</span>
        <button class="silence-block__remove" data-index="${index}" aria-label="削除">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      `;

      blockEl.querySelector('.silence-block__remove').addEventListener('click', (e) => {
        handleRemoveSilence(index);
        e.stopPropagation();
      });

      elements.silenceBlocks.appendChild(blockEl);
    });
  }

  /**
   * Render profiles list
   */
  function renderProfiles() {
    if (!elements.profileList) return;

    const profiles = DataModel.getAllProfiles();
    const currentId = DataModel.getCurrentProfileId();

    elements.profileList.innerHTML = '';

    profiles.forEach(profile => {
      const li = document.createElement('li');
      li.className = `profile-item${profile.id === currentId ? ' profile-item--active' : ''}`;
      li.innerHTML = `
        <div class="profile-item__info">
          <span class="profile-item__name">${profile.name}</span>
          <span class="profile-item__duration">${DataModel.formatDuration(profile.duration)}</span>
        </div>
        ${!profile.isPreset ? `
          <button class="profile-item__delete" data-id="${profile.id}" aria-label="削除">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
          </button>
        ` : ''}
      `;

      li.addEventListener('click', (e) => {
        if (!e.target.closest('.profile-item__delete')) {
          selectProfile(profile.id);
        }
      });

      const deleteBtn = li.querySelector('.profile-item__delete');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          handleDeleteProfile(profile.id);
        });
      }

      elements.profileList.appendChild(li);
    });
  }

  /**
   * Select a profile
   */
  function selectProfile(id) {
    const profile = DataModel.getProfile(id);
    if (!profile) return;

    DataModel.setCurrentProfileId(id);
    loadProfile(profile);
    closeProfilesModal();
    renderProfiles();
  }

  // ========================================
  // Event Handlers
  // ========================================

  function handlePlayPause() {
    if (AudioEngine.getIsPlaying()) {
      AudioEngine.pause();
      setPlaybackState(false);
    } else {
      AudioEngine.play();
      setPlaybackState(true);
    }
  }

  function setPlaybackState(isPlaying) {
    elements.playIcon.style.display = isPlaying ? 'none' : 'block';
    elements.pauseIcon.style.display = isPlaying ? 'block' : 'none';
    elements.statusIndicator.classList.toggle('playing', isPlaying);
    elements.statusText.textContent = isPlaying ? '再生中' : '一時停止';

    if (isPlaying) {
      startTimerUpdate();
    } else {
      stopTimerUpdate();
    }
  }

  function startTimerUpdate() {
    stopTimerUpdate();
    timerIntervalId = setInterval(() => {
      const { remaining, progress } = AudioEngine.getProgress();
      elements.timerDisplay.textContent = DataModel.formatTime(remaining);
      
      // Update playhead position
      if (elements.timelinePlayhead) {
        elements.timelinePlayhead.style.left = `${progress * 100}%`;
      }
    }, 100);
  }

  function stopTimerUpdate() {
    if (timerIntervalId) {
      clearInterval(timerIntervalId);
      timerIntervalId = null;
    }
  }

  function handleSessionComplete(event) {
    setPlaybackState(false);
    stopTimerUpdate();

    const { profileName, wasAdapted } = event.detail;

    // Add to history
    DataModel.addToHistory({
      profileId: event.detail.profileId,
      profileName,
      duration: event.detail.duration,
      completed: true
    });

    // Show completion message
    let message = 'セッションが完了しました';
    if (wasAdapted) {
      message = 'このセッションでは音が自動調整されました';
    }
    showSnackbar(message);

    // Reset timer display
    elements.timerDisplay.textContent = DataModel.formatTime(workingProfile?.duration || 0);
    elements.timelinePlayhead.style.left = '0';

    // Show notification if enabled
    const settings = DataModel.getSettings();
    if (settings.notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('Focus Lab', {
        body: `${profileName}セッションが完了しました`,
        icon: 'icons/icon-192.svg'
      });
    }
  }

  function handleAccordionClick(e) {
    const header = e.currentTarget;
    const accordion = header.closest('.layer-accordion');
    const isExpanded = header.getAttribute('aria-expanded') === 'true';

    // Close all accordions
    elements.accordionHeaders.forEach(h => {
      h.setAttribute('aria-expanded', 'false');
    });

    // Open clicked one if it wasn't already open
    if (!isExpanded) {
      header.setAttribute('aria-expanded', 'true');
      activeAccordion = accordion.dataset.layer;

      // Re-render the editor canvas for this layer
      setTimeout(() => {
        if (activeAccordion === 'baseFrequency') {
          resizeCanvas(elements.baseFrequencyEditor);
          renderCurveEditor();
        } else if (activeAccordion === 'texture') {
          resizeCanvas(elements.textureEditor);
          renderDensityEditor();
        }
      }, 200);
    } else {
      activeAccordion = null;
    }
  }

  function handleBaseFrequencyPreset(e) {
    const btn = e.currentTarget;
    const value = btn.dataset.value;

    // Update UI
    document.querySelectorAll('[data-layer="baseFrequency"] .segmented-button').forEach(b => {
      b.setAttribute('aria-checked', b === btn);
    });

    // Update profile
    let targetValue = 0.5;
    if (value === 'low') targetValue = 0.35;
    else if (value === 'high') targetValue = 0.65;

    workingProfile.layers.baseFrequency.curve = [
      { time: 0, value: targetValue },
      { time: 0.5, value: targetValue },
      { time: 1, value: targetValue }
    ];

    renderAllCanvases();
    AudioEngine.previewLayer('baseFrequency', targetValue);
  }

  function handleTextureChange(e) {
    const value = e.target.value / 100;
    workingProfile.layers.texture.densityMap = [{ time: 0, value }];
    renderAllCanvases();
    AudioEngine.previewLayer('texture', value);
  }

  function handleModulationTypeChange(e) {
    const chip = e.currentTarget;
    const type = chip.dataset.value;

    // Update UI
    document.querySelectorAll('[data-layer="modulation"] .chip').forEach(c => {
      const isSelected = c === chip;
      c.classList.toggle('chip--selected', isSelected);
      c.setAttribute('aria-checked', isSelected);
    });

    // Update profile
    workingProfile.layers.modulation.type = type;
    renderAllCanvases();
  }

  function handleIntensityChange(e) {
    const dot = e.target.closest('.intensity-dot');
    if (!dot) return;

    const value = parseInt(dot.dataset.value);
    const intensity = value / 5;

    // Update UI
    document.querySelectorAll('.intensity-dot').forEach((d, index) => {
      d.classList.toggle('active', index < value);
    });
    document.querySelector('.intensity-dots')?.setAttribute('aria-valuenow', value);

    // Update profile
    workingProfile.layers.modulation.intensity = intensity;
    renderAllCanvases();
  }

  function handleCurveEditorStart(e) {
    const canvas = elements.baseFrequencyEditor;
    const rect = canvas.getBoundingClientRect();

    const updateCurve = (clientX, clientY) => {
      const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));

      // Find or create point at this time
      const curve = workingProfile.layers.baseFrequency.curve;
      let pointIndex = curve.findIndex(p => Math.abs(p.time - x) < 0.05);

      if (pointIndex === -1) {
        // Add new point
        curve.push({ time: x, value: y });
        curve.sort((a, b) => a.time - b.time);
      } else {
        // Update existing point
        curve[pointIndex].value = y;
      }

      renderCurveEditor();
      renderTimelineLayer('baseFrequencyCanvas', 'baseFrequency');
      AudioEngine.previewLayer('baseFrequency', y);
    };

    const handleMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      updateCurve(clientX, clientY);
    };

    const handleEnd = () => {
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleEnd);
    };

    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleEnd);

    // Initial update
    handleMove(e);
  }

  function handleDensityEditorStart(e) {
    const canvas = elements.textureEditor;
    const rect = canvas.getBoundingClientRect();

    const updateDensity = (clientY) => {
      const y = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
      workingProfile.layers.texture.densityMap = [{ time: 0, value: y }];
      elements.textureSlider.value = y * 100;
      renderDensityEditor();
      renderTimelineLayer('textureCanvas', 'texture');
      AudioEngine.previewLayer('texture', y);
    };

    const handleMove = (e) => {
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      updateDensity(clientY);
    };

    const handleEnd = () => {
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleEnd);
    };

    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleEnd);

    // Initial update
    handleMove(e);
  }

  function handleAddSilence() {
    if (!workingProfile) return;

    const duration = workingProfile.duration;
    const blocks = workingProfile.layers.silence.blocks;

    // Find a gap for new silence
    let start = 60; // Default to 1 minute
    if (blocks.length > 0) {
      const lastBlock = blocks[blocks.length - 1];
      start = lastBlock.start + lastBlock.duration + 120;
    }

    if (start + 10 < duration) {
      blocks.push({ start, duration: 10 });
      renderSilenceBlocks();
      renderTimelineLayer('silenceCanvas', 'silence');
    }
  }

  function handleRemoveSilence(index) {
    if (!workingProfile) return;
    workingProfile.layers.silence.blocks.splice(index, 1);
    renderSilenceBlocks();
    renderTimelineLayer('silenceCanvas', 'silence');
  }

  function handleProModeToggle(e) {
    const enabled = e.target.checked;
    AudioEngine.setProMode(enabled);
    DataModel.updateSetting('proModeEnabled', enabled);
  }

  function handleVolumeChange(e) {
    const volume = e.target.value / 100;
    AudioEngine.setMasterVolume(volume);
    DataModel.updateSetting('masterVolume', volume);
  }

  function handleNotificationToggle(e) {
    const enabled = e.target.checked;
    DataModel.updateSetting('notificationsEnabled', enabled);

    if (enabled && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  function handleClearData() {
    if (confirm('すべてのデータを削除しますか？この操作は取り消せません。')) {
      DataModel.clearAllData();
      location.reload();
    }
  }

  function handleNewProfile() {
    const newProfile = DataModel.createProfile({
      name: '新規プロファイル',
      duration: 1500
    });
    selectProfile(newProfile.id);
  }

  function handleDeleteProfile(id) {
    if (confirm('このプロファイルを削除しますか？')) {
      DataModel.deleteProfile(id);
      
      // If deleted current profile, switch to first preset
      if (DataModel.getCurrentProfileId() === null) {
        selectProfile(DataModel.PRESET_PROFILES[0].id);
      }
      
      renderProfiles();
    }
  }

  function handleSaveProfile() {
    const name = elements.profileNameInput.value.trim() || '無題のプロファイル';
    const duration = parseInt(elements.durationSelect.value);

    workingProfile.name = name;
    workingProfile.duration = duration;

    if (workingProfile.id && !workingProfile.isPreset) {
      // Update existing
      DataModel.updateProfile(workingProfile.id, workingProfile);
    } else {
      // Create new from preset or unsaved
      const saved = DataModel.createProfile({
        ...workingProfile,
        isPreset: false
      });
      DataModel.setCurrentProfileId(saved.id);
      workingProfile = DataModel.createWorkingCopy(saved);
    }

    elements.currentProfileName.textContent = name;
    elements.timelineDuration.textContent = DataModel.formatDuration(duration);
    renderProfiles();
    closeSaveModal();
    showSnackbar('保存しました');
  }

  function handleNavItemClick(e) {
    const item = e.currentTarget;
    const view = item.dataset.view;
    const action = item.dataset.action;

    if (action === 'settings') {
      closeNavDrawer();
      openSettingsModal();
      return;
    }

    // Update active state
    document.querySelectorAll('.nav-drawer__item').forEach(i => {
      i.classList.toggle('nav-drawer__item--active', i === item);
    });

    closeNavDrawer();

    // Handle view switching (profiles, history views could be added)
    if (view === 'profiles') {
      openProfilesModal();
    }
  }

  function handleKeydown(e) {
    // Space to play/pause
    if (e.code === 'Space' && !e.target.matches('input, button, textarea')) {
      e.preventDefault();
      handlePlayPause();
    }

    // Escape to close modals
    if (e.code === 'Escape') {
      closeNavDrawer();
      closeProfilesModal();
      closeSaveModal();
      closeSettingsModal();
    }
  }

  // ========================================
  // Modal & Drawer Functions
  // ========================================

  function openNavDrawer() {
    elements.navDrawer?.classList.add('active');
    elements.navDrawerScrim?.classList.add('active');
  }

  function closeNavDrawer() {
    elements.navDrawer?.classList.remove('active');
    elements.navDrawerScrim?.classList.remove('active');
  }

  function openProfilesModal() {
    renderProfiles();
    elements.profilesModal?.classList.add('active');
    elements.profilesModalScrim?.classList.add('active');
  }

  function closeProfilesModal() {
    elements.profilesModal?.classList.remove('active');
    elements.profilesModalScrim?.classList.remove('active');
  }

  function openSaveModal() {
    elements.profileNameInput.value = workingProfile?.name || '';
    elements.durationSelect.value = workingProfile?.duration || 1500;
    elements.saveModal?.classList.add('active');
    elements.saveModalScrim?.classList.add('active');
    elements.profileNameInput?.focus();
  }

  function closeSaveModal() {
    elements.saveModal?.classList.remove('active');
    elements.saveModalScrim?.classList.remove('active');
  }

  function openSettingsModal() {
    elements.settingsModal?.classList.add('active');
    elements.settingsModalScrim?.classList.add('active');
  }

  function closeSettingsModal() {
    elements.settingsModal?.classList.remove('active');
    elements.settingsModalScrim?.classList.remove('active');
  }

  function showSnackbar(message) {
    if (elements.snackbarText) {
      elements.snackbarText.textContent = message;
    }
    elements.snackbar?.classList.add('active');

    setTimeout(() => {
      hideSnackbar();
    }, 4000);
  }

  function hideSnackbar() {
    elements.snackbar?.classList.remove('active');
  }

  // Public API
  return {
    init,
    loadProfile,
    showSnackbar
  };
})();
