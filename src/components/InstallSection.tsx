import React, { useState } from 'react';
import { Download, Smartphone, Monitor, Tablet, CheckCircle2, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded border border-[#8b1a1a] bg-[#13080a] px-3 py-2 text-xs font-medium text-[#e7e5e4] shadow-lg"
    >
      <span className="h-2 w-2 rounded-full bg-[#ca8a04]" />
      Offline Mode — Cached estate & solo missions active
    </div>
  );
};

interface PWAInstallButtonProps {
  compact?: boolean;
  onOpenInstallSection?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  compact = false,
  onOpenInstallSection,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const outcome = await install();
      if (outcome !== 'unavailable') return;
    }
    if (onOpenInstallSection) {
      onOpenInstallSection();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={
          compact
            ? 'inline-flex items-center gap-2 rounded border border-[#ca8a04]/50 bg-[#18120e] px-3 py-2 text-xs font-semibold text-[#e7e5e4] hover:border-[#ca8a04] hover:bg-[#241a12] transition-colors whitespace-nowrap shrink-0'
            : 'inline-flex items-center gap-2 rounded border border-[#ca8a04]/60 bg-[#140d0a] px-5 py-2.5 text-sm font-semibold text-[#e7e5e4] hover:border-[#ca8a04] hover:bg-[#211510] transition-colors whitespace-nowrap shrink-0'
        }
      >
        <Download className="h-4 w-4 text-[#ca8a04]" />
        {isIOS ? 'Install on iOS' : 'Install App'}
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-md rounded-lg border border-[#3f1d1d] bg-[#0d0d10] p-6 text-[#e7e5e4] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <h3 className="font-display text-lg font-bold text-[#e7e5e4]">
                Install Habby Christmas
              </h3>
              <button
                type="button"
                aria-label="Close installation guide"
                onClick={() => setShowGuide(false)}
                className="rounded p-1.5 text-[#a8a29e] hover:bg-[#1c1917] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm text-[#d6d3d1]">
              {isIOS ? (
                <p>
                  1. Tap the <strong>Share</strong> icon in Safari&apos;s toolbar.
                  <br />
                  2. Scroll down and select <strong>Add to Home Screen</strong>.
                  <br />
                  3. Launch <strong>Habby Xmas</strong> in full-screen standalone mode.
                </p>
              ) : (
                <p>
                  Install <strong>Habby Christmas</strong> directly onto your device for offline solo missions, full-screen horror mode, and instant launch:
                  <br />
                  <br />
                  • <strong>Android / Chrome / Edge:</strong> Open the browser menu and select <strong>Install App</strong> or <strong>Add to Home Screen</strong>.
                  <br />
                  • <strong>Windows / macOS Desktop:</strong> Click the install icon in your address bar.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full rounded bg-[#8b1a1a] py-2.5 text-sm font-semibold text-white hover:bg-[#a61f1f] transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const InstallSectionView: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleInstallNow = async () => {
    if (isInstallable) {
      const outcome = await install();
      if (outcome === 'accepted') {
        setStatusMessage('Habby Christmas installed to your device.');
      } else if (outcome === 'dismissed') {
        setStatusMessage('Install prompt dismissed. You can trigger it again anytime.');
      }
      return;
    }
    setStatusMessage(
      isIOS
        ? 'Use Safari Share -> Add to Home Screen to install Habby Christmas on iOS.'
        : 'Open your browser menu (⋮) and choose "Install Habby Christmas" or "Create Shortcut / Add to Home Screen".',
    );
  };

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-[#3f1d1d] bg-[#100c0d] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#ca8a04]">
              Cross-Platform Installation
            </p>
            <h2 className="font-display text-2xl font-bold text-[#e7e5e4]">
              Install Habby Christmas App
            </h2>
            <p className="max-w-2xl text-sm text-[#a8a29e]">
              Play in full-screen standalone mode with offline solo campaign caching, cached 3D assets, and responsive controls on Android, iOS, PC, and Tablet.
            </p>
          </div>

          <div className="shrink-0">
            {isInstalled ? (
              <div className="inline-flex items-center gap-2 rounded border border-[#ca8a04]/50 bg-[#19150d] px-4 py-2.5 text-sm font-semibold text-[#ca8a04]">
                <CheckCircle2 className="h-4 w-4" />
                Installed Standalone
              </div>
            ) : (
              <button
                type="button"
                onClick={handleInstallNow}
                className="inline-flex items-center gap-2 rounded bg-[#8b1a1a] px-6 py-3 text-sm font-semibold text-[#e7e5e4] hover:bg-[#a61f1f] transition-colors whitespace-nowrap"
              >
                <Download className="h-4 w-4" />
                {isInstallable ? 'Install Now' : isIOS ? 'iOS Install Steps' : 'Install Application'}
              </button>
            )}
          </div>
        </div>

        {statusMessage && (
          <p className="mt-4 rounded border border-[#ca8a04]/40 bg-[#18120c] px-4 py-2.5 text-xs text-[#e7e5e4]">
            {statusMessage}
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-[#27272a] bg-[#0d0d10] p-5">
          <Smartphone className="h-5 w-5 text-[#ca8a04]" />
          <h3 className="mt-3 text-base font-semibold text-[#e7e5e4]">Android &amp; iOS Mobile</h3>
          <p className="mt-1.5 text-sm text-[#a8a29e]">
            On Android Chrome, tap <strong>Install Now</strong> above or browser menu &rarr; <em>Install App</em>. On iPhone/iPad Safari, tap <em>Share</em> &rarr; <em>Add to Home Screen</em>.
          </p>
        </div>

        <div className="rounded-lg border border-[#27272a] bg-[#0d0d10] p-5">
          <Monitor className="h-5 w-5 text-[#ca8a04]" />
          <h3 className="mt-3 text-base font-semibold text-[#e7e5e4]">Windows, macOS &amp; Linux PC</h3>
          <p className="mt-1.5 text-sm text-[#a8a29e]">
            Install via Chrome or Edge address bar to launch Habby Christmas as a dedicated desktop window with keyboard, mouse, and controller support.
          </p>
        </div>

        <div className="rounded-lg border border-[#27272a] bg-[#0d0d10] p-5">
          <Tablet className="h-5 w-5 text-[#ca8a04]" />
          <h3 className="mt-3 text-base font-semibold text-[#e7e5e4]">Tablets &amp; Offline Caching</h3>
          <p className="mt-1.5 text-sm text-[#a8a29e]">
            Service worker precaches core UI, 100-level progression data, and procedural 3D assets so solo exploration continues offline.
          </p>
        </div>
      </div>
    </section>
  );
};
