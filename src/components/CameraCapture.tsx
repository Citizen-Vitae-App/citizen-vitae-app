import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CameraCaptureProps {
  onCapture: (imageBase64: string) => void;
  onCancel: () => void;
}

export const CameraCapture = ({ onCapture, onCancel }: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsReady(true);
        };
      }
    } catch (err) {
      console.error('Camera error:', err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Accès à la caméra refusé. Veuillez autoriser l\'accès dans les paramètres de votre navigateur.');
        } else if (err.name === 'NotFoundError') {
          setError('Aucune caméra détectée sur cet appareil.');
        } else {
          setError('Impossible d\'accéder à la caméra.');
        }
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsReady(false);
  }, [stream]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current || !isReady) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Mirror the image (since front camera is mirrored)
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64 (JPEG for smaller size)
    const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);

    // Stop camera before calling onCapture
    stopCamera();
    onCapture(imageBase64);
  };

  const handleCancel = () => {
    stopCamera();
    onCancel();
  };

  const handleRetry = () => {
    stopCamera();
    startCamera();
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Header with close button */}
      <div className="w-full flex justify-between items-center">
        <h3 className="text-lg font-semibold text-foreground">Prenez un selfie</h3>
        <Button variant="ghost" size="icon" onClick={handleCancel}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Instructions */}
      <p className="text-sm text-muted-foreground text-center">
        Positionnez votre visage dans le cadre et regardez la caméra
      </p>

      {/* Camera view */}
      <div className="relative w-full max-w-sm aspect-[3/4] bg-black rounded-lg overflow-hidden">
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
            <Camera className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-destructive text-sm mb-4">{error}</p>
            <Button variant="outline" size="sm" onClick={handleRetry}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            
            {/* Face guide overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-64 border-2 border-white/50 rounded-full" />
            </div>

            {/* Loading indicator */}
            {!isReady && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent" />
              </div>
            )}
          </>
        )}
      </div>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Capture button */}
      {!error && (
        <Button
          onClick={handleCapture}
          disabled={!isReady}
          className="w-full max-w-sm"
          style={{ backgroundColor: '#012573' }}
        >
          <Camera className="h-4 w-4 mr-2" />
          Capturer
        </Button>
      )}
    </div>
  );
};
