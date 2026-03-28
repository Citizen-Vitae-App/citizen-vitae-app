import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2 } from 'lucide-react';
import sigle from '@/assets/icon-sigle.svg';
import { cn } from '@/lib/utils';

type ScanPhase = 'waiting_first_scan' | 'first_scan_done';

interface CertificationQRCodeProps {
  qrToken: string;
  registrationId: string;
  eventName: string;
  eventDate: string;
  scanPhase?: ScanPhase;
}

export const CertificationQRCode = ({
  qrToken,
  registrationId,
  eventName,
  eventDate,
  scanPhase = 'waiting_first_scan',
}: CertificationQRCodeProps) => {
  const verificationUrl = `${window.location.origin}/verify/${registrationId}?token=${qrToken}`;
  const tokenPreview = `${qrToken.slice(0, 8)}…${qrToken.slice(-6)}`;

  return (
    <div className="flex flex-col items-center gap-3 sm:gap-4 w-full px-2 sm:px-0">
      {/* Status indicator */}
      {scanPhase === 'waiting_first_scan' && (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="h-5 w-5" />
          <span className="font-medium text-sm sm:text-base">Face Match validé</span>
        </div>
      )}

      {scanPhase === 'first_scan_done' && (
        <div className="flex items-center gap-2 text-blue-600 text-xs">
          <span>En attente du scan de départ</span>
        </div>
      )}

      {/* QR Code with responsive sizing */}
      <div className={cn(
        "bg-background border p-3 sm:p-4 rounded-lg transition-all duration-300",
        scanPhase === 'first_scan_done' ? 'border-blue-200 shadow-sm' : 'border-border'
      )}>
        <QRCodeSVG
          value={verificationUrl}
          size={180}
          level="H"
          includeMargin={true}
          className={cn(
            "w-[160px] h-[160px] sm:w-[200px] sm:h-[200px]",
            scanPhase === 'first_scan_done' && "opacity-90"
          )}
          imageSettings={{
            src: sigle,
            x: undefined,
            y: undefined,
            height: 36,
            width: 36,
            excavate: true,
          }}
        />
      </div>

      {/* Token preview */}
      <div className="text-xs text-muted-foreground">
        Token: <span className="font-mono text-foreground">{tokenPreview}</span>
      </div>

      {/* Instructions */}
      <div className="text-center space-y-1 sm:space-y-2 px-2">
        {scanPhase === 'waiting_first_scan' ? (
          <>
            <p className="text-xs sm:text-sm font-medium text-foreground">
              Présentez ce QR code à l'organisateur
            </p>
            <p className="text-xs text-muted-foreground">
              Un membre de l'organisation scannera ce code pour valider votre arrivée (1er scan)
            </p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            Présentez à nouveau ce QR code à l'organisateur lors de votre départ
          </p>
        )}
      </div>

      {/* Event info */}
      <div className="w-full bg-muted/30 rounded-lg p-2 sm:p-3 text-center">
        <p className="font-medium text-foreground text-xs sm:text-sm line-clamp-2">{eventName}</p>
        <p className="text-xs text-muted-foreground mt-1">{eventDate}</p>
      </div>
    </div>
  );
};
