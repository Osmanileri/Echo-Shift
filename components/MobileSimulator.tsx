import React, { useState, useEffect, useRef } from 'react';
import { Smartphone, RefreshCw, Keyboard, QrCode, Cpu, Settings, ExternalLink, Shield } from 'lucide-react';

interface DeviceConfig {
  id: string;
  name: string;
  width: number;
  height: number;
}

const DEVICES: DeviceConfig[] = [
  { id: 'iphone15', name: 'iPhone 15 Pro Max (430 × 932)', width: 430, height: 932 },
  { id: 'pixel8', name: 'Google Pixel 8 Pro (412 × 892)', width: 412, height: 892 },
  { id: 'iphonese', name: 'iPhone SE / Compact (375 × 667)', width: 375, height: 667 },
];

export const MobileSimulator: React.FC = () => {
  const [deviceId, setDeviceId] = useState<string>('iphone15');
  const [isMobileControls, setIsMobileControls] = useState<boolean>(false);
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [scale, setScale] = useState<number>(0.8);
  const [gameStats, setGameStats] = useState<{ score: number; multiplier: number; phase: string } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const selectedDevice = DEVICES.find(d => d.id === deviceId) || DEVICES[0];
  const gameUrl = `${window.location.origin}/?embed=true${isMobileControls ? '&isMobile=true' : ''}`;

  // Dynamically calculate scale to prevent overflowing the viewport vertically
  useEffect(() => {
    const handleResize = () => {
      const parentHeight = window.innerHeight;
      const targetHeight = selectedDevice.height + 150; // Bezel + margins
      if (parentHeight < targetHeight) {
        setScale(Math.max(0.4, (parentHeight / targetHeight) * 0.95));
      } else {
        setScale(0.85);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [deviceId, selectedDevice.height]);

  // Restart the simulator game
  const handleReload = () => {
    setIframeKey(prev => prev + 1);
  };

  // Generate QR Code for physical mobile device testing
  const desktopUrl = window.location.href.replace(/[\?&]embed=true/, '').replace(/[\?&]isMobile=true/, '');
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&color=00f0ff&bgcolor=111111&data=${encodeURIComponent(desktopUrl)}`;

  // Same-origin communication: Poll active game state from the iframe for console diagnostics
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const iframe = document.getElementById('simulator-iframe') as HTMLIFrameElement;
        const iframeWindow = iframe?.contentWindow;
        if (iframeWindow) {
          // Attempt to extract reactive variables or DOM elements if available
          const scoreEl = iframeWindow.document.querySelector('[data-testid="hud-score"]');
          const multEl = iframeWindow.document.querySelector('[data-testid="hud-multiplier"]');
          const isPlaying = iframeWindow.document.body.innerText.includes('BÖLÜM') || iframeWindow.document.body.innerText.includes('Mesafe');
          
          if (scoreEl || multEl) {
            setGameStats({
              score: parseInt(scoreEl?.textContent || '0', 10),
              multiplier: parseInt(multEl?.textContent?.replace('x', '') || '1', 10),
              phase: isPlaying ? 'PLAYING' : 'MENU'
            });
          }
        }
      } catch (e) {
        // Suppress same-origin security errors or missing DOM element issues during load
      }
    }, 500);

    return () => clearInterval(interval);
  }, [iframeKey]);

  return (
    <div className="w-full h-full min-h-screen bg-[#07070d] text-white flex flex-col lg:flex-row items-center justify-center p-4 lg:p-8 overflow-y-auto select-none font-sans relative">
      {/* Background Neon Grid Visual Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f0f23_1px,transparent_1px),linear-gradient(to_bottom,#0f0f23_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* LEFT PANEL: Mobile Phone Simulator */}
      <div 
        ref={containerRef}
        className="flex items-center justify-center flex-1 relative transition-all duration-300 ease-out"
        style={{ height: `${selectedDevice.height * scale + 60}px` }}
      >
        <div 
          className="relative transition-transform duration-300 ease-out"
          style={{ 
            width: `${selectedDevice.width}px`, 
            height: `${selectedDevice.height}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'center center'
          }}
        >
          {/* Phone Bezel/Shell wrapper */}
          <div className="absolute inset-0 rounded-[50px] border-4 border-[#252836] bg-[#0c0d14] p-3.5 shadow-[0_0_60px_rgba(0,240,255,0.15)] ring-1 ring-white/10 flex flex-col relative z-20">
            {/* Dynamic Island / Speaker notch simulation */}
            <div className="absolute top-5 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-full z-30 flex items-center justify-center border border-white/5">
              <div className="w-3.5 h-3.5 bg-[#0f111a] rounded-full mr-2 border border-blue-900/40 relative">
                <div className="absolute inset-1 bg-blue-500/20 rounded-full blur-[1px]" />
              </div>
              <div className="w-1.5 h-1.5 bg-[#0c0e14] rounded-full" />
            </div>

            {/* Simulated Phone Buttons (Left side: Volume, Right side: Power) */}
            <div className="absolute -left-[6px] top-28 w-[2px] h-12 bg-[#33364b] rounded-l" />
            <div className="absolute -left-[6px] top-44 w-[2px] h-14 bg-[#33364b] rounded-l" />
            <div className="absolute -left-[6px] top-60 w-[2px] h-14 bg-[#33364b] rounded-l" />
            <div className="absolute -right-[6px] top-36 w-[2px] h-20 bg-[#33364b] rounded-r" />

            {/* Screen Inner Glass Area */}
            <div className="w-full h-full rounded-[38px] overflow-hidden bg-[#111118] relative z-10 border border-black/40 shadow-inner">
              <iframe
                id="simulator-iframe"
                key={iframeKey}
                src={gameUrl}
                title="Echo Shift Game View"
                className="w-full h-full border-none select-none"
                style={{ WebkitTapHighlightColor: 'transparent' }}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            </div>
          </div>
          
          {/* Ambient Glow matching theme */}
          <div className="absolute inset-4 rounded-[45px] bg-gradient-to-tr from-purple-500/20 to-cyan-500/20 filter blur-2xl opacity-70 pointer-events-none -z-10 animate-pulse duration-[4000ms]" />
        </div>
      </div>

      {/* RIGHT PANEL: Console controls & specifications */}
      <div className="w-full lg:w-[480px] bg-gradient-to-b from-[#111224]/85 to-[#0b0c16]/95 border border-cyan-500/20 backdrop-blur-xl rounded-3xl p-6 lg:p-8 flex flex-col gap-6 shadow-[0_15px_35px_rgba(0,0,0,0.5)] z-30 lg:ml-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 absolute" />
              <h1 className="text-xl font-black tracking-widest text-cyan-400">ECHO SHIFT</h1>
            </div>
            <p className="text-[10px] tracking-[0.2em] text-white/50 font-bold uppercase mt-1">DEVELOPER TEST CONSOLE</p>
          </div>
          <button
            onClick={handleReload}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-cyan-400/50 active:scale-95 transition-all text-white/80 hover:text-cyan-400"
            title="Restart Simulation"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Device Settings Section */}
        <div className="flex flex-col gap-3">
          <label className="text-xs font-black tracking-wider text-cyan-400/80 uppercase flex items-center gap-1.5">
            <Smartphone className="w-4 h-4" /> Cihaz Simülasyonu
          </label>
          <div className="grid grid-cols-1 gap-2">
            {DEVICES.map(device => (
              <button
                key={device.id}
                onClick={() => setDeviceId(device.id)}
                className={`py-3 px-4 rounded-xl border text-left text-sm font-semibold tracking-wide transition-all ${
                  deviceId === device.id
                    ? 'bg-cyan-500/10 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.1)]'
                    : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10 text-white/70'
                }`}
              >
                {device.name}
              </button>
            ))}
          </div>
        </div>

        {/* Control scheme selector */}
        <div className="flex flex-col gap-3">
          <label className="text-xs font-black tracking-wider text-cyan-400/80 uppercase flex items-center gap-1.5">
            <Cpu className="w-4 h-4" /> Kontrol Şeması
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setIsMobileControls(false)}
              className={`py-3 px-2 text-center rounded-xl border text-xs font-bold tracking-wider transition-all ${
                !isMobileControls
                  ? 'bg-cyan-500/10 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.1)]'
                  : 'bg-white/5 border-white/5 hover:bg-white/10 text-white/60'
              }`}
            >
              Masaüstü (Fare)
            </button>
            <button
              onClick={() => setIsMobileControls(true)}
              className={`py-3 px-2 text-center rounded-xl border text-xs font-bold tracking-wider transition-all ${
                isMobileControls
                  ? 'bg-cyan-500/10 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.1)]'
                  : 'bg-white/5 border-white/5 hover:bg-white/10 text-white/60'
              }`}
            >
              Mobil (Joystick)
            </button>
          </div>
        </div>

        {/* Gameplay telemetry display if tracking */}
        {gameStats && (
          <div className="p-4 bg-black/40 rounded-2xl border border-white/5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/50 tracking-wider font-bold uppercase">TELEMETRY</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30">
                {gameStats.phase}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-1">
              <div>
                <p className="text-[9px] text-white/40 font-bold tracking-wider">AKTİF MULTIPLIER</p>
                <p className="text-xl font-black text-cyan-400">{gameStats.multiplier}x</p>
              </div>
              <div>
                <p className="text-[9px] text-white/40 font-bold tracking-wider">CANLI SKOR</p>
                <p className="text-xl font-black text-purple-400">{gameStats.score}</p>
              </div>
            </div>
          </div>
        )}

        {/* Keyboard / Input instruction guide */}
        <div className="flex flex-col gap-3">
          <label className="text-xs font-black tracking-wider text-cyan-400/80 uppercase flex items-center gap-1.5">
            <Keyboard className="w-4 h-4" /> Nasıl Oynanır?
          </label>
          <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex flex-col gap-2.5 text-xs text-white/70">
            {!isMobileControls ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 rounded font-mono text-[10px] font-bold">FARE HAREKETİ</span>
                  <span>Şeritler arasında geçiş yap (Yukarı/Aşağı)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 rounded font-mono text-[10px] font-bold">SOL TIKLAMA</span>
                  <span>Kutupları değiştir (Beyaz / Siyah swap)</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 rounded font-mono text-[10px] font-bold">SANAL ANALOG</span>
                  <span>Sol alttaki joystick'i sürükleyerek yönlendir</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 rounded font-mono text-[10px] font-bold">SWAP BUTONU</span>
                  <span>Sağ alttaki butona tıklayarak kutup değiştir</span>
                </div>
              </>
            )}
            <div className="border-t border-white/5 pt-2.5 mt-0.5 flex items-center gap-2 text-white/50 text-[11px]">
              <Shield className="w-3.5 h-3.5 text-cyan-400/60" />
              <span>Gelişmiş yetenekler (Blink, Titan, Dash) oyun içi tetiklenir.</span>
            </div>
          </div>
        </div>

        {/* Real Mobile Device QR Code */}
        <div className="flex flex-col gap-3 border-t border-white/10 pt-5">
          <label className="text-xs font-black tracking-wider text-cyan-400/80 uppercase flex items-center gap-1.5">
            <QrCode className="w-4 h-4" /> Gerçek Cihazda Test Et
          </label>
          <div className="flex items-center gap-4 bg-black/30 p-4 rounded-2xl border border-white/5">
            <div className="w-24 h-24 bg-white/5 border border-white/10 rounded-xl overflow-hidden p-1 flex items-center justify-center">
              <img
                src={qrCodeUrl}
                alt="QR Code to scan"
                className="w-full h-full object-contain filter brightness-110"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <p className="text-xs text-white/60 font-semibold leading-relaxed">
                Bu QR kodunu mobil cihazınızın kamerasıyla taratarak oyunu direkt telefonunuzda test edebilirsiniz.
              </p>
              <a
                href={desktopUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors uppercase tracking-wider mt-1"
              >
                Yeni Sekmede Aç <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
