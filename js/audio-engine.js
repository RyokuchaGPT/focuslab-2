/**
 * Google Focus Lab - Audio Engine Module
 * Implements the Web Audio API sound generation
 * 
 * Audio Graph:
 * OscillatorNode → BiquadFilterNode (Texture) → GainNode (Density) 
 * → StereoPannerNode → GainNode (Silence Gate) → GainNode (Master) → Destination
 */

const AudioEngine = (function() {
  'use strict';

  // Audio context and nodes
  let audioContext = null;
  let oscillator = null;
  let filter = null;
  let densityGain = null;
  let panner = null;
  let silenceGate = null;
  let masterGain = null;

  // State
  let isPlaying = false;
  let currentProfile = null;
  let sessionStartTime = 0;
  let sessionDuration = 0;
  let animationFrameId = null;

  // Pro mode state
  let proModeEnabled = false;
  let interactionCount = 0;
  let proModeAdjustments = {
    frequencyOffset: 0,
    textureOffset: 0,
    modulationOffset: 0
  };

  // Frequency mapping (perceptual to Hz)
  // 0.0 = Low (around 80Hz), 1.0 = High (around 400Hz)
  // These are kept internal - UI shows only perceptual labels
  const FREQ_MIN = 80;
  const FREQ_MAX = 400;

  // Filter mapping for texture
  // 0.0 = Smooth (low Q, high frequency), 1.0 = Rough (high Q, low frequency)
  const FILTER_FREQ_MIN = 200;
  const FILTER_FREQ_MAX = 2000;
  const FILTER_Q_MIN = 0.5;
  const FILTER_Q_MAX = 8;

  // Modulation parameters
  const MODULATION_TYPES = {
    stable: { lfoFreq: 0, lfoDepth: 0 },
    gentle: { lfoFreq: 0.1, lfoDepth: 0.02 },
    irregular: { lfoFreq: 0.3, lfoDepth: 0.05 }
  };

  /**
   * Initialize the audio context
   * Must be called after user interaction
   */
  function init() {
    if (audioContext) return Promise.resolve();

    return new Promise((resolve, reject) => {
      try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create nodes
        createAudioGraph();
        
        // Resume context if suspended
        if (audioContext.state === 'suspended') {
          audioContext.resume().then(resolve).catch(reject);
        } else {
          resolve();
        }
      } catch (e) {
        console.error('Failed to initialize audio context:', e);
        reject(e);
      }
    });
  }

  /**
   * Create the audio processing graph
   */
  function createAudioGraph() {
    // Master gain (volume control)
    masterGain = audioContext.createGain();
    masterGain.gain.value = 0.7;
    masterGain.connect(audioContext.destination);

    // Silence gate (for silence blocks)
    silenceGate = audioContext.createGain();
    silenceGate.gain.value = 1;
    silenceGate.connect(masterGain);

    // Stereo panner (subtle movement)
    panner = audioContext.createStereoPanner();
    panner.pan.value = 0;
    panner.connect(silenceGate);

    // Density gain (texture intensity)
    densityGain = audioContext.createGain();
    densityGain.gain.value = 1;
    densityGain.connect(panner);

    // Biquad filter (texture/roughness)
    filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;
    filter.Q.value = 1;
    filter.connect(densityGain);
  }

  /**
   * Start the oscillator
   */
  function startOscillator() {
    if (oscillator) {
      oscillator.stop();
      oscillator.disconnect();
    }

    oscillator = audioContext.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = mapToFrequency(0.5);
    oscillator.connect(filter);
    oscillator.start();
  }

  /**
   * Map perceptual value (0-1) to frequency (Hz)
   * @param {number} value - Perceptual value (0-1)
   * @returns {number} Frequency in Hz
   */
  function mapToFrequency(value) {
    // Exponential mapping for perceptually linear response
    const normalizedValue = Math.max(0, Math.min(1, value));
    return FREQ_MIN * Math.pow(FREQ_MAX / FREQ_MIN, normalizedValue);
  }

  /**
   * Map texture value (0-1) to filter parameters
   * @param {number} value - Texture value (0 = smooth, 1 = rough)
   */
  function applyTexture(value) {
    if (!filter) return;

    const normalizedValue = Math.max(0, Math.min(1, value));
    
    // Inverse relationship - higher texture value = lower filter frequency
    const filterFreq = FILTER_FREQ_MAX - (normalizedValue * (FILTER_FREQ_MAX - FILTER_FREQ_MIN));
    const filterQ = FILTER_Q_MIN + (normalizedValue * (FILTER_Q_MAX - FILTER_Q_MIN));

    filter.frequency.setTargetAtTime(filterFreq, audioContext.currentTime, 0.1);
    filter.Q.setTargetAtTime(filterQ, audioContext.currentTime, 0.1);

    // Adjust density gain based on texture
    const density = 0.7 + (normalizedValue * 0.3);
    densityGain.gain.setTargetAtTime(density, audioContext.currentTime, 0.1);
  }

  /**
   * Set master volume
   * @param {number} volume - Volume (0-1)
   */
  function setMasterVolume(volume) {
    if (!masterGain) return;
    masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1, volume)), audioContext.currentTime, 0.1);
  }

  /**
   * Load a profile and prepare for playback
   * @param {Object} profile - Sound profile
   */
  function loadProfile(profile) {
    currentProfile = profile;
    sessionDuration = profile.duration;

    // Reset pro mode adjustments
    proModeAdjustments = {
      frequencyOffset: 0,
      textureOffset: 0,
      modulationOffset: 0
    };
    interactionCount = 0;
  }

  /**
   * Start playback
   * @returns {Promise}
   */
  async function play() {
    if (isPlaying) return;
    if (!currentProfile) {
      console.warn('No profile loaded');
      return;
    }

    await init();
    startOscillator();

    isPlaying = true;
    sessionStartTime = audioContext.currentTime;

    // Start the update loop
    updateAudioParameters();
  }

  /**
   * Pause playback
   */
  function pause() {
    if (!isPlaying) return;

    isPlaying = false;

    if (oscillator) {
      oscillator.stop();
      oscillator.disconnect();
      oscillator = null;
    }

    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  /**
   * Stop playback completely
   */
  function stop() {
    pause();
    sessionStartTime = 0;
  }

  /**
   * Get current playback progress
   * @returns {Object} Progress info
   */
  function getProgress() {
    if (!isPlaying || !audioContext) {
      return { elapsed: 0, remaining: sessionDuration, progress: 0 };
    }

    const elapsed = audioContext.currentTime - sessionStartTime;
    const remaining = Math.max(0, sessionDuration - elapsed);
    const progress = Math.min(1, elapsed / sessionDuration);

    return { elapsed, remaining, progress };
  }

  /**
   * Update audio parameters based on current time and profile
   */
  function updateAudioParameters() {
    if (!isPlaying || !currentProfile) return;

    const { progress, remaining } = getProgress();

    // Check if session is complete
    if (remaining <= 0) {
      onSessionComplete();
      return;
    }

    // Apply base frequency curve
    const baseFreqValue = interpolateCurve(currentProfile.layers.baseFrequency.curve, progress);
    const adjustedFreq = baseFreqValue + proModeAdjustments.frequencyOffset;
    if (oscillator) {
      const targetFreq = mapToFrequency(adjustedFreq);
      oscillator.frequency.setTargetAtTime(targetFreq, audioContext.currentTime, 0.1);
    }

    // Apply texture
    const textureValue = interpolateCurve(currentProfile.layers.texture.densityMap, progress);
    applyTexture(textureValue + proModeAdjustments.textureOffset);

    // Apply modulation
    applyModulation(progress);

    // Apply silence blocks
    applySilenceBlocks(progress);

    // Apply subtle panning for spatial interest
    applySubtlePanning(progress);

    // Continue update loop
    animationFrameId = requestAnimationFrame(updateAudioParameters);
  }

  /**
   * Interpolate a value from a curve at a given progress point
   * @param {Array} curve - Array of {time, value} points
   * @param {number} progress - Progress (0-1)
   * @returns {number} Interpolated value
   */
  function interpolateCurve(curve, progress) {
    if (!curve || curve.length === 0) return 0.5;
    if (curve.length === 1) return curve[0].value;

    // Find surrounding points
    let lower = curve[0];
    let upper = curve[curve.length - 1];

    for (let i = 0; i < curve.length - 1; i++) {
      if (curve[i].time <= progress && curve[i + 1].time >= progress) {
        lower = curve[i];
        upper = curve[i + 1];
        break;
      }
    }

    // Linear interpolation
    const range = upper.time - lower.time;
    if (range === 0) return lower.value;

    const t = (progress - lower.time) / range;
    return lower.value + (upper.value - lower.value) * t;
  }

  /**
   * Apply modulation effects
   * @param {number} progress - Session progress (0-1)
   */
  function applyModulation(progress) {
    if (!currentProfile || !oscillator) return;

    const modulation = currentProfile.layers.modulation;
    const params = MODULATION_TYPES[modulation.type] || MODULATION_TYPES.stable;
    const intensity = modulation.intensity + proModeAdjustments.modulationOffset;

    if (params.lfoFreq > 0) {
      // Apply subtle frequency modulation using time
      const time = audioContext.currentTime;
      const lfoValue = Math.sin(time * params.lfoFreq * 2 * Math.PI);
      const modAmount = lfoValue * params.lfoDepth * intensity * 20; // 20Hz max deviation

      const baseFreqValue = interpolateCurve(currentProfile.layers.baseFrequency.curve, progress);
      const baseFreq = mapToFrequency(baseFreqValue);
      oscillator.frequency.setTargetAtTime(baseFreq + modAmount, audioContext.currentTime, 0.05);
    }
  }

  /**
   * Apply silence blocks
   * @param {number} progress - Session progress (0-1)
   */
  function applySilenceBlocks(progress) {
    if (!currentProfile || !silenceGate) return;

    const silenceBlocks = currentProfile.layers.silence.blocks;
    const currentTimeSeconds = progress * sessionDuration;
    let isSilent = false;

    for (const block of silenceBlocks) {
      if (currentTimeSeconds >= block.start && currentTimeSeconds < block.start + block.duration) {
        isSilent = true;
        break;
      }
    }

    const targetGain = isSilent ? 0 : 1;
    silenceGate.gain.setTargetAtTime(targetGain, audioContext.currentTime, 0.05);
  }

  /**
   * Apply subtle stereo panning for spatial interest
   * @param {number} progress - Session progress (0-1)
   */
  function applySubtlePanning(progress) {
    if (!panner) return;

    // Very subtle, slow panning movement
    const time = audioContext.currentTime;
    const panValue = Math.sin(time * 0.05) * 0.1; // ±10% pan over ~20 seconds
    panner.pan.setTargetAtTime(panValue, audioContext.currentTime, 0.1);
  }

  /**
   * Handle session completion
   */
  function onSessionComplete() {
    stop();

    // Dispatch completion event
    const event = new CustomEvent('sessionComplete', {
      detail: {
        profileId: currentProfile?.id,
        profileName: currentProfile?.name,
        duration: sessionDuration,
        proModeEnabled: proModeEnabled,
        wasAdapted: proModeEnabled && (
          proModeAdjustments.frequencyOffset !== 0 ||
          proModeAdjustments.textureOffset !== 0 ||
          proModeAdjustments.modulationOffset !== 0
        )
      }
    });
    window.dispatchEvent(event);
  }

  /**
   * Enable or disable Pro Mode (Adaptive Focus)
   * @param {boolean} enabled - Enable state
   */
  function setProMode(enabled) {
    proModeEnabled = enabled;
    
    if (!enabled) {
      // Reset adjustments
      proModeAdjustments = {
        frequencyOffset: 0,
        textureOffset: 0,
        modulationOffset: 0
      };
    }
  }

  /**
   * Record user interaction for Pro Mode adaptation
   * Called when user interacts with the app during a session
   */
  function recordInteraction() {
    if (!proModeEnabled || !isPlaying) return;

    interactionCount++;

    // Pro Mode logic: adjust based on interaction patterns
    // More interactions = user may be distracted = lower frequency, smoother texture
    const { elapsed } = getProgress();
    const interactionsPerMinute = interactionCount / (elapsed / 60);

    if (interactionsPerMinute > 2) {
      // High interaction rate - make sound more calming
      proModeAdjustments.frequencyOffset = Math.max(-0.1, proModeAdjustments.frequencyOffset - 0.01);
      proModeAdjustments.textureOffset = Math.max(-0.1, proModeAdjustments.textureOffset - 0.01);
    } else if (elapsed > 300 && interactionsPerMinute < 0.5) {
      // Low interaction for 5+ minutes - user is focused, subtle enhancement
      proModeAdjustments.modulationOffset = Math.min(0.1, proModeAdjustments.modulationOffset + 0.005);
    }
  }

  /**
   * Get playback state
   * @returns {boolean} Is playing
   */
  function getIsPlaying() {
    return isPlaying;
  }

  /**
   * Get current loaded profile
   * @returns {Object|null} Current profile
   */
  function getCurrentProfile() {
    return currentProfile;
  }

  /**
   * Preview a specific layer configuration
   * Used by the editor for real-time feedback
   * @param {string} layer - Layer name
   * @param {*} value - Layer value
   */
  async function previewLayer(layer, value) {
    await init();

    // Start preview oscillator if not playing
    if (!isPlaying) {
      startOscillator();
    }

    switch (layer) {
      case 'baseFrequency':
        if (oscillator) {
          const freq = mapToFrequency(value);
          oscillator.frequency.setTargetAtTime(freq, audioContext.currentTime, 0.05);
        }
        break;

      case 'texture':
        applyTexture(value);
        break;

      case 'modulation':
        // Brief preview doesn't apply modulation
        break;
    }

    // Auto-stop preview after 500ms if not in session
    if (!currentProfile || !isPlaying) {
      setTimeout(() => {
        if (!isPlaying && oscillator) {
          oscillator.stop();
          oscillator.disconnect();
          oscillator = null;
        }
      }, 500);
    }
  }

  /**
   * Dispose audio context and clean up
   */
  function dispose() {
    stop();

    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }

    oscillator = null;
    filter = null;
    densityGain = null;
    panner = null;
    silenceGate = null;
    masterGain = null;
  }

  // Public API
  return {
    init,
    loadProfile,
    play,
    pause,
    stop,
    getProgress,
    getIsPlaying,
    getCurrentProfile,
    setMasterVolume,
    setProMode,
    recordInteraction,
    previewLayer,
    dispose
  };
})();
