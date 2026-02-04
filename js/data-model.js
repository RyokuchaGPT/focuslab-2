/**
 * Google Focus Lab - Data Model Module
 * Handles all data operations for Sound Profiles
 * Uses localStorage for offline persistence
 */

const DataModel = (function() {
  'use strict';

  // Storage keys
  const STORAGE_KEYS = {
    PROFILES: 'focuslab_profiles',
    CURRENT_PROFILE: 'focuslab_current_profile',
    SETTINGS: 'focuslab_settings',
    HISTORY: 'focuslab_history'
  };

  // Default settings
  const DEFAULT_SETTINGS = {
    masterVolume: 0.7,
    notificationsEnabled: true,
    proModeEnabled: false
  };

  // Default profile template
  const DEFAULT_PROFILE = {
    id: null,
    name: '新規プロファイル',
    duration: 1500, // 25 minutes in seconds
    createdAt: null,
    updatedAt: null,
    layers: {
      baseFrequency: {
        curve: [
          { time: 0, value: 0.5 }
        ]
      },
      texture: {
        densityMap: [
          { time: 0, value: 0.3 }
        ]
      },
      modulation: {
        type: 'stable', // 'stable', 'gentle', 'irregular'
        intensity: 0.2
      },
      silence: {
        blocks: []
      }
    }
  };

  // Preset profiles
  const PRESET_PROFILES = [
    {
      id: 'preset-focus',
      name: '集中モード',
      duration: 1500,
      isPreset: true,
      layers: {
        baseFrequency: {
          curve: [
            { time: 0, value: 0.45 },
            { time: 0.5, value: 0.5 },
            { time: 1, value: 0.45 }
          ]
        },
        texture: {
          densityMap: [
            { time: 0, value: 0.25 }
          ]
        },
        modulation: {
          type: 'gentle',
          intensity: 0.2
        },
        silence: {
          blocks: []
        }
      }
    },
    {
      id: 'preset-deep',
      name: '深い集中',
      duration: 2700,
      isPreset: true,
      layers: {
        baseFrequency: {
          curve: [
            { time: 0, value: 0.35 },
            { time: 0.3, value: 0.4 },
            { time: 0.7, value: 0.4 },
            { time: 1, value: 0.35 }
          ]
        },
        texture: {
          densityMap: [
            { time: 0, value: 0.15 }
          ]
        },
        modulation: {
          type: 'stable',
          intensity: 0.1
        },
        silence: {
          blocks: []
        }
      }
    },
    {
      id: 'preset-creative',
      name: 'クリエイティブ',
      duration: 1800,
      isPreset: true,
      layers: {
        baseFrequency: {
          curve: [
            { time: 0, value: 0.55 },
            { time: 0.25, value: 0.6 },
            { time: 0.5, value: 0.55 },
            { time: 0.75, value: 0.6 },
            { time: 1, value: 0.55 }
          ]
        },
        texture: {
          densityMap: [
            { time: 0, value: 0.4 },
            { time: 0.5, value: 0.35 },
            { time: 1, value: 0.4 }
          ]
        },
        modulation: {
          type: 'gentle',
          intensity: 0.35
        },
        silence: {
          blocks: []
        }
      }
    }
  ];

  /**
   * Generate a unique ID
   * @returns {string} Unique identifier
   */
  function generateId() {
    return 'profile-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Deep clone an object
   * @param {Object} obj - Object to clone
   * @returns {Object} Cloned object
   */
  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Get all profiles (presets + user profiles)
   * @returns {Array} Array of profile objects
   */
  function getAllProfiles() {
    const userProfiles = getUserProfiles();
    return [...PRESET_PROFILES, ...userProfiles];
  }

  /**
   * Get user-created profiles only
   * @returns {Array} Array of user profile objects
   */
  function getUserProfiles() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PROFILES);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Error reading profiles:', e);
      return [];
    }
  }

  /**
   * Get a profile by ID
   * @param {string} id - Profile ID
   * @returns {Object|null} Profile object or null
   */
  function getProfile(id) {
    const allProfiles = getAllProfiles();
    return allProfiles.find(p => p.id === id) || null;
  }

  /**
   * Create a new profile
   * @param {Object} profileData - Profile data
   * @returns {Object} Created profile
   */
  function createProfile(profileData = {}) {
    const now = Date.now();
    const profile = {
      ...deepClone(DEFAULT_PROFILE),
      ...profileData,
      id: generateId(),
      createdAt: now,
      updatedAt: now
    };

    const profiles = getUserProfiles();
    profiles.push(profile);
    saveUserProfiles(profiles);

    return profile;
  }

  /**
   * Update an existing profile
   * @param {string} id - Profile ID
   * @param {Object} updates - Fields to update
   * @returns {Object|null} Updated profile or null
   */
  function updateProfile(id, updates) {
    const profiles = getUserProfiles();
    const index = profiles.findIndex(p => p.id === id);

    if (index === -1) {
      // Can't update preset profiles
      if (PRESET_PROFILES.some(p => p.id === id)) {
        console.warn('Cannot update preset profiles');
        return null;
      }
      return null;
    }

    profiles[index] = {
      ...profiles[index],
      ...updates,
      id: profiles[index].id, // Preserve ID
      createdAt: profiles[index].createdAt, // Preserve creation time
      updatedAt: Date.now()
    };

    saveUserProfiles(profiles);
    return profiles[index];
  }

  /**
   * Delete a profile
   * @param {string} id - Profile ID
   * @returns {boolean} Success status
   */
  function deleteProfile(id) {
    // Can't delete preset profiles
    if (PRESET_PROFILES.some(p => p.id === id)) {
      console.warn('Cannot delete preset profiles');
      return false;
    }

    const profiles = getUserProfiles();
    const filtered = profiles.filter(p => p.id !== id);

    if (filtered.length === profiles.length) {
      return false; // Profile not found
    }

    saveUserProfiles(filtered);

    // Clear current profile if deleted
    if (getCurrentProfileId() === id) {
      setCurrentProfileId(null);
    }

    return true;
  }

  /**
   * Save user profiles to localStorage
   * @param {Array} profiles - Array of profiles
   */
  function saveUserProfiles(profiles) {
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
    } catch (e) {
      console.error('Error saving profiles:', e);
    }
  }

  /**
   * Get the current active profile ID
   * @returns {string|null} Current profile ID
   */
  function getCurrentProfileId() {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_PROFILE);
  }

  /**
   * Set the current active profile ID
   * @param {string|null} id - Profile ID
   */
  function setCurrentProfileId(id) {
    if (id) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_PROFILE, id);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_PROFILE);
    }
  }

  /**
   * Get the current active profile
   * @returns {Object|null} Current profile or null
   */
  function getCurrentProfile() {
    const id = getCurrentProfileId();
    return id ? getProfile(id) : null;
  }

  /**
   * Get settings
   * @returns {Object} Settings object
   */
  function getSettings() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : { ...DEFAULT_SETTINGS };
    } catch (e) {
      console.error('Error reading settings:', e);
      return { ...DEFAULT_SETTINGS };
    }
  }

  /**
   * Save settings
   * @param {Object} settings - Settings to save
   */
  function saveSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Error saving settings:', e);
    }
  }

  /**
   * Update specific setting
   * @param {string} key - Setting key
   * @param {*} value - Setting value
   */
  function updateSetting(key, value) {
    const settings = getSettings();
    settings[key] = value;
    saveSettings(settings);
  }

  /**
   * Add a session to history
   * @param {Object} session - Session data
   */
  function addToHistory(session) {
    try {
      const history = getHistory();
      history.unshift({
        ...session,
        timestamp: Date.now()
      });

      // Keep only last 50 sessions
      if (history.length > 50) {
        history.length = 50;
      }

      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    } catch (e) {
      console.error('Error saving history:', e);
    }
  }

  /**
   * Get session history
   * @returns {Array} Array of session records
   */
  function getHistory() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Error reading history:', e);
      return [];
    }
  }

  /**
   * Clear all data
   */
  function clearAllData() {
    try {
      localStorage.removeItem(STORAGE_KEYS.PROFILES);
      localStorage.removeItem(STORAGE_KEYS.CURRENT_PROFILE);
      localStorage.removeItem(STORAGE_KEYS.SETTINGS);
      localStorage.removeItem(STORAGE_KEYS.HISTORY);
    } catch (e) {
      console.error('Error clearing data:', e);
    }
  }

  /**
   * Export all data as JSON
   * @returns {string} JSON string
   */
  function exportData() {
    return JSON.stringify({
      profiles: getUserProfiles(),
      currentProfile: getCurrentProfileId(),
      settings: getSettings(),
      history: getHistory(),
      exportedAt: Date.now()
    });
  }

  /**
   * Import data from JSON
   * @param {string} jsonString - JSON data
   * @returns {boolean} Success status
   */
  function importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);

      if (data.profiles) {
        saveUserProfiles(data.profiles);
      }
      if (data.currentProfile) {
        setCurrentProfileId(data.currentProfile);
      }
      if (data.settings) {
        saveSettings(data.settings);
      }
      if (data.history) {
        localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(data.history));
      }

      return true;
    } catch (e) {
      console.error('Error importing data:', e);
      return false;
    }
  }

  /**
   * Create a working copy of a profile for editing
   * @param {Object} profile - Profile to copy
   * @returns {Object} Working copy
   */
  function createWorkingCopy(profile) {
    return deepClone(profile);
  }

  /**
   * Get duration label in Japanese
   * @param {number} seconds - Duration in seconds
   * @returns {string} Duration label
   */
  function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes}分`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}時間${remainingMinutes}分` : `${hours}時間`;
  }

  /**
   * Format time as MM:SS
   * @param {number} seconds - Time in seconds
   * @returns {string} Formatted time
   */
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // Public API
  return {
    // Profiles
    getAllProfiles,
    getUserProfiles,
    getProfile,
    createProfile,
    updateProfile,
    deleteProfile,
    getCurrentProfileId,
    setCurrentProfileId,
    getCurrentProfile,
    createWorkingCopy,

    // Settings
    getSettings,
    saveSettings,
    updateSetting,

    // History
    addToHistory,
    getHistory,

    // Data management
    clearAllData,
    exportData,
    importData,

    // Utilities
    formatDuration,
    formatTime,

    // Constants
    DEFAULT_PROFILE,
    PRESET_PROFILES
  };
})();
