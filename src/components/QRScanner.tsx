import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  isProcessing?: boolean;
}

export function QRScanner({ onScan, isProcessing }: QRScannerProps) {
  const [isStarted, setIsStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isMountedRef = useRef(true);
  const scannerContainerId = useRef(`qr-reader-${Date.now()}`);

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
          fps: 15,
          qrbox: { width: 200, height: 200 },
          aspectRatio: 1,
          disableFlip: false,
        },
        (decodedText) => {
          console.log('[QR-SCANNER] Decoded:', decodedText);
          if (!isProcessing && isMountedRef.current) {
            onScan(decodedText);
          }
        },
        () => {
          // Ignore errors during scanning
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
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 w-full px-2 sm:px-0">
      {/* Use a wrapper div that React controls, with a child div for html5-qrcode */}
      <div className="w-full max-w-[280px] sm:max-w-[320px] aspect-square bg-muted rounded-lg overflow-hidden relative">
        <div 
          id={scannerContainerId.current}
          className="w-full h-full [&_video]:!object-cover [&_video]:!w-full [&_video]:!h-full"
          style={{ aspectRatio: '1 / 1' }}
        />
        {!isStarted && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-4 bg-muted">
            <Camera className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground" />
            <Button onClick={startScanner} size="sm" className="text-sm">
              <Camera className="mr-2 h-4 w-4" />
              Démarrer le scanner
            </Button>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-4 text-center bg-muted">
            <p className="text-xs sm:text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={startScanner} size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Réessayer
            </Button>
          </div>
        )}
        {isProcessing && isStarted && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
      </div>
      
      {isStarted && (
        <p className="text-xs sm:text-sm text-muted-foreground text-center px-4">
          Placez le QR code du participant dans le cadre
        </p>
      )}
    </div>
  );
}
