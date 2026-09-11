import React, { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Download, WifiOff, RefreshCw, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWABanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [dismissedInstall, setDismissedInstall] = useState(false);

  // Register Service Worker with virtual:pwa-register
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r);
    },
    onRegisterError(error) {
      console.error('SW Registration error:', error);
    },
  });

  // Handle Online/Offline Status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handle PWA Install Prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!dismissedInstall) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [dismissedInstall]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    setShowInstallBanner(false);
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA Install prompt outcome: ${outcome}`);
    setDeferredPrompt(null);
  };

  const closeOfflineBanner = () => {
    setOfflineReady(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0">
      {/* 1. Offline Network Status Notification */}
      {isOffline && (
        <div className="flex items-center justify-between gap-3 bg-amber-600 text-white p-3.5 rounded-xl shadow-lg border border-amber-500 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2.5">
            <WifiOff className="w-5 h-5 flex-shrink-0 animate-pulse" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-200">Offline Mode</p>
              <p className="text-xs text-amber-100">Operating offline. Saved app pages remain accessible.</p>
            </div>
          </div>
        </div>
      )}

      {/* 2. SW Offline Ready Notification */}
      {offlineReady && !isOffline && (
        <div className="flex items-center justify-between gap-3 bg-emerald-700 text-white p-3.5 rounded-xl shadow-lg border border-emerald-600">
          <p className="text-xs font-medium">KisaanSetu is ready to work offline!</p>
          <button
            onClick={closeOfflineBanner}
            className="p-1 hover:bg-emerald-600 rounded-lg transition-colors"
            aria-label="Close message"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. New Content Update Notification */}
      {needRefresh && (
        <div className="flex items-center justify-between gap-3 bg-slate-900 text-white p-3.5 rounded-xl shadow-xl border border-slate-700">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin" />
            <div>
              <p className="text-xs font-semibold">New Update Available</p>
              <p className="text-xs text-slate-300">Click to reload and apply latest features.</p>
            </div>
          </div>
          <button
            onClick={() => updateServiceWorker(true)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow transition-colors flex-shrink-0"
          >
            Reload
          </button>
        </div>
      )}

      {/* 4. Install App Prompt Banner */}
      {showInstallBanner && deferredPrompt && (
        <div className="flex items-center justify-between gap-3 bg-white text-slate-900 p-4 rounded-xl shadow-2xl border border-slate-200">
          <div className="flex items-center gap-3">
            <img src="/pwa-192x192.png" alt="KisaanSetu Icon" className="w-10 h-10 rounded-lg shadow-sm" />
            <div>
              <h4 className="text-xs font-bold text-slate-900">Install KisaanSetu</h4>
              <p className="text-xs text-slate-500">Add to home screen for fast offline access</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Install
            </button>
            <button
              onClick={() => {
                setShowInstallBanner(false);
                setDismissedInstall(true);
              }}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
