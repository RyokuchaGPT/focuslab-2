/**
 * Google Focus Lab - Main Application Entry Point
 * Initializes all modules and registers the service worker
 */

(function() {
  'use strict';

  /**
   * Register the service worker for PWA functionality
   */
  async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('sw.js');
        console.log('Service Worker registered:', registration.scope);

        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              console.log('New version available');
            }
          });
        });
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  /**
   * Request notification permission if needed
   */
  function requestNotificationPermission() {
    if ('Notification' in window) {
      const settings = DataModel.getSettings();
      if (settings.notificationsEnabled && Notification.permission === 'default') {
        // Will request on first interaction
        document.addEventListener('click', function requestOnce() {
          Notification.requestPermission();
          document.removeEventListener('click', requestOnce);
        }, { once: true });
      }
    }
  }

  /**
   * Handle visibility change to manage audio
   */
  function setupVisibilityHandling() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Page is hidden - audio continues but we note the state
        console.log('Page hidden, audio continues in background');
      } else {
        // Page is visible again
        console.log('Page visible');
      }
    });
  }

  /**
   * Prevent sleep on mobile devices during playback
   */
  function setupWakeLock() {
    if ('wakeLock' in navigator) {
      let wakeLock = null;

      const requestWakeLock = async () => {
        try {
          wakeLock = await navigator.wakeLock.request('screen');
          console.log('Wake Lock acquired');

          wakeLock.addEventListener('release', () => {
            console.log('Wake Lock released');
          });
        } catch (err) {
          console.log('Wake Lock request failed:', err.message);
        }
      };

      // Request wake lock when audio plays
      window.addEventListener('sessionComplete', () => {
        if (wakeLock) {
          wakeLock.release();
          wakeLock = null;
        }
      });

      // Re-acquire wake lock when page becomes visible
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && AudioEngine.getIsPlaying()) {
          requestWakeLock();
        }
      });

      // Store for later use
      window.requestWakeLock = requestWakeLock;
    }
  }

  /**
   * Setup touch handling for mobile
   */
  function setupTouchHandling() {
    // Prevent double-tap zoom on controls
    document.addEventListener('touchend', (e) => {
      if (e.target.closest('button, .slider, .chip, .switch')) {
        e.preventDefault();
      }
    }, { passive: false });

    // Initialize audio context on first touch
    document.addEventListener('touchstart', async function initAudio() {
      await AudioEngine.init();
      document.removeEventListener('touchstart', initAudio);
    }, { once: true, passive: true });
  }

  /**
   * Handle app install prompt
   */
  function setupInstallPrompt() {
    let deferredPrompt = null;

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      
      // Could show an install button here if desired
      console.log('Install prompt available');
    });

    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      console.log('App installed successfully');
    });

    // Store for potential UI integration
    window.showInstallPrompt = () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
          deferredPrompt = null;
          console.log('User install choice:', choiceResult.outcome);
        });
      }
    };
  }

  /**
   * Main initialization
   */
  async function init() {
    // Register service worker
    await registerServiceWorker();

    // Setup various handlers
    requestNotificationPermission();
    setupVisibilityHandling();
    setupWakeLock();
    setupTouchHandling();
    setupInstallPrompt();

    // Initialize UI
    UIController.init();

    // Initialize audio on first click
    document.addEventListener('click', async function initAudio() {
      await AudioEngine.init();
      document.removeEventListener('click', initAudio);
    }, { once: true });

    console.log('Google Focus Lab initialized');
  }

  // Start the application when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
