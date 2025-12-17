import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2 } from 'lucide-react';
import logo from '@/assets/logo.png';

interface CertificationQRCodeProps {
  qrToken: string;
  registrationId: string;
  eventName: string;
  eventDate: string;
}

export const CertificationQRCode = ({
  qrToken,
  registrationId,
  eventName,
  eventDate,
}: CertificationQRCodeProps) => {
  // Create verification URL that admin will scan
  const verificationUrl = `${window.location.origin}/verify/${registrationId}?token=${qrToken}`;

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Success indicator */}
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle2 className="h-5 w-5" />
        <span className="font-medium">Face Match validé</span>
      </div>

      {/* QR Code with logo */}
      <div className="bg-white p-4 rounded-lg">
        <QRCodeSVG
          value={verificationUrl}
          size={200}
          level="H" // High error correction for logo overlay
          includeMargin={true}
          imageSettings={{
            src: logo,
            x: undefined,
            y: undefined,
            height: 40,
            width: 40,
            excavate: true,
          }}
        />
      </div>

      {/* Instructions */}
      <div className="text-center space-y-2">
        <p className="text-sm font-medium text-foreground">
          Présentez ce QR code à l'organisateur
        </p>
        <p className="text-xs text-muted-foreground">
          Un membre de l'organisation scannera ce code pour valider votre présence
        </p>
      </div>

      {/* Event info */}
      <div className="w-full bg-muted/30 rounded-lg p-3 text-center">
        <p className="font-medium text-foreground text-sm">{eventName}</p>
        <p className="text-xs text-muted-foreground mt-1">{eventDate}</p>
      </div>
    </div>
  );
};
