import { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, Smartphone } from 'lucide-react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    setIsStandalone(isStandaloneMode);

    if (isStandaloneMode) {
      return; // Already installed
    }

    // Check if user dismissed previously
    const hasDismissed = localStorage.getItem('pwa_prompt_dismissed');
    if (hasDismissed === 'true') {
      return;
    }

    // Detect iOS
    const ua = window.navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    setIsIOS(isIOSDevice);

    if (isIOSDevice) {
      // Show prompt for iOS after a small delay
      setTimeout(() => setShowPrompt(true), 2000);
    }

    // Listen for beforeinstallprompt on Android/Desktop
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      // iOS doesn't support programmatic install, user must follow instructions
      return;
    }

    if (deferredPrompt) {
      // Show the install prompt
      deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
        setShowPrompt(false);
      } else {
        console.log('User dismissed the install prompt');
      }
      // We've used the prompt, and can't use it again, throw it away
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-4 z-[100] animate-in slide-in-from-bottom-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-shrink-0 bg-blue-500/20 p-2 rounded-lg text-blue-400">
          <Smartphone size={24} />
        </div>
        <div className="flex-1">
          <h3 className="text-white font-semibold mb-1">Instalar App</h3>
          <p className="text-slate-300 text-sm mb-3">
            Adicione nosso app à sua tela inicial para acesso rápido e fácil.
          </p>
          
          {isIOS ? (
            <div className="bg-slate-900 rounded-lg p-3 text-sm text-slate-300 border border-slate-700">
              <p className="mb-2">Para instalar no iOS:</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Toque em <Share size={14} className="inline mx-1" /> Compartilhar</li>
                <li>Role para baixo e toque em <PlusSquare size={14} className="inline mx-1" /> "Adicionar à Tela de Início"</li>
              </ol>
            </div>
          ) : (
            <button
              onClick={handleInstallClick}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors text-sm"
            >
              <Download size={16} />
              Instalar Agora
            </button>
          )}
        </div>
        <button 
          onClick={handleDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-700 transition-colors flex-shrink-0"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
