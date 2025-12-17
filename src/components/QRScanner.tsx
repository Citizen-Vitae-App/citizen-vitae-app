import { useEffect, useRef, useState } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);

  const startScanner = async () => {
    if (!containerRef.current) return;
    
    try {
      setError(null);
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;
      
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          if (!isProcessing) {
            onScan(decodedText);
          }
        },
        () => {
          // Ignore errors during scanning
        }
      );
      
      setIsStarted(true);
    } catch (err) {
      console.error('Error starting scanner:', err);
      setError('Impossible d\'accéder à la caméra. Veuillez autoriser l\'accès.');
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isStarted) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
        setIsStarted(false);
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <div 
        ref={containerRef}
        id="qr-reader" 
        className="w-full max-w-sm aspect-square bg-muted rounded-lg overflow-hidden relative"
      >
        {!isStarted && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <Camera className="h-16 w-16 text-muted-foreground" />
            <Button onClick={startScanner}>
              <Camera className="mr-2 h-4 w-4" />
              Démarrer le scanner
            </Button>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-4 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={startScanner}>
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
        <p className="text-sm text-muted-foreground text-center">
          Placez le QR code du participant dans le cadre
        </p>
      )}
    </div>
  );
}
