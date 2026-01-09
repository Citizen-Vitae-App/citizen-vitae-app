import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  isProcessing?: boolean;
  autoStart?: boolean;
}

// Cooldown duration in ms to prevent multi-scans
const SCAN_COOLDOWN_MS = 2000;

export function QRScanner({ onScan, isProcessing, autoStart = false }: QRScannerProps) {
  const [isStarted, setIsStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isMountedRef = useRef(true);
  const scannerContainerId = useRef(`qr-reader-${Date.now()}`);
  const hasAutoStarted = useRef(false);
  
  // Anti-duplicate scan tracking
  const lastScannedTokenRef = useRef<string | null>(null);
  const lastScanTimeRef = useRef<number>(0);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    if (scanner) {
      try {
        const state = scanner.getState();
        // Only stop if scanner is actually running (state 2 = SCANNING)
        if (state === 2) {
          await scanner.stop();
        }
        // Clear the scanner
        scanner.clear();
      } catch (err) {
        // Ignore errors during cleanup
        console.log('Scanner cleanup:', err);
      } finally {
        scannerRef.current = null;
        if (isMountedRef.current) {
          setIsStarted(false);
        }
      }
    }
  }, []);

  const startScanner = async () => {
    // Stop any existing scanner first
    await stopScanner();
    
    // Reset scan tracking when starting fresh
    lastScannedTokenRef.current = null;
    lastScanTimeRef.current = 0;
    
    const containerId = scannerContainerId.current;
    const container = document.getElementById(containerId);
    if (!container) return;
    
    try {
      setError(null);
      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;
      
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10, // Reduced from 15 to prevent rapid scans
          qrbox: { width: 200, height: 200 },
          aspectRatio: 1,
          disableFlip: false,
        },
        (decodedText) => {
          const now = Date.now();
          
          // Check cooldown - ignore if within cooldown period
          if (now - lastScanTimeRef.current < SCAN_COOLDOWN_MS) {
            console.log('[QR-SCANNER] Ignoring scan - cooldown active');
            return;
          }
          
          // Check for duplicate token
          if (decodedText === lastScannedTokenRef.current) {
            console.log('[QR-SCANNER] Ignoring duplicate token');
            return;
          }
          
          // Check if already processing
          if (isProcessing) {
            console.log('[QR-SCANNER] Ignoring scan - still processing');
            return;
          }
          
          // Valid new scan - update tracking
          lastScannedTokenRef.current = decodedText;
          lastScanTimeRef.current = now;
          
          console.log('[QR-SCANNER] New scan accepted:', decodedText.substring(0, 30) + '...');
          
          if (isMountedRef.current) {
            onScan(decodedText);
          }
        },
        () => {
          // Ignore errors during scanning (no QR found is normal)
        }
      );
      
      if (isMountedRef.current) {
        setIsStarted(true);
      }
    } catch (err) {
      console.error('Error starting scanner:', err);
      if (isMountedRef.current) {
        setError('Impossible d\'accéder à la caméra. Veuillez autoriser l\'accès.');
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    
    // Auto-start scanner if prop is set
    if (autoStart && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          startScanner();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
    
    return () => {
      isMountedRef.current = false;
      // Synchronous cleanup to prevent React DOM conflicts
      const scanner = scannerRef.current;
      if (scanner) {
        try {
          const state = scanner.getState();
          if (state === 2) {
            scanner.stop().catch(() => {});
          }
          scanner.clear();
        } catch {
          // Ignore errors during unmount
        }
        scannerRef.current = null;
      }
    };
  }, [autoStart]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 w-full h-full px-2 sm:px-0">
      <div className="w-full h-full md:max-w-[320px] md:aspect-square md:h-auto bg-foreground md:bg-muted md:rounded-lg overflow-hidden relative">
        <div 
          id={scannerContainerId.current}
          className="w-full h-full [&_video]:!object-cover [&_video]:!w-full [&_video]:!h-full"
        />

        {/* Visual scan frame */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="w-[70%] max-w-[320px] aspect-square border-2 border-background/70 rounded-xl" />
        </div>

        {/* Auto-start: show loading state instead of a start CTA */}
        {!isStarted && !error && autoStart && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-4 bg-foreground/70">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-background" />
          </div>
        )}

        {/* Manual start (desktop or when autoStart=false) */}
        {!isStarted && !error && !autoStart && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-4 bg-muted">
            <Camera className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground" />
            <Button onClick={startScanner} size="sm" className="text-sm">
              <Camera className="mr-2 h-4 w-4" />
              Démarrer le scanner
            </Button>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-4 text-center bg-foreground/80 md:bg-muted">
            <p className="text-xs sm:text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={startScanner} size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Réessayer
            </Button>
          </div>
        )}

        {isProcessing && isStarted && (
          <div className="absolute inset-0 bg-foreground/70 md:bg-background/80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
      </div>

      {isStarted && (
        <p className="text-xs sm:text-sm text-background md:text-muted-foreground text-center px-4 absolute bottom-24 md:relative md:bottom-auto">
          Placez le QR code du participant dans le cadre
        </p>
      )}
    </div>
  );
}
