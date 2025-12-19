import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2 } from 'lucide-react';
import sigle from '@/assets/icon-sigle.svg';

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
    <div className="flex flex-col items-center gap-3 sm:gap-4 w-full px-2 sm:px-0">
      {/* Success indicator */}
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle2 className="h-5 w-5" />
        <span className="font-medium text-sm sm:text-base">Face Match validé</span>
      </div>

      {/* QR Code with sigle - responsive sizing */}
      <div className="bg-white p-3 sm:p-4 rounded-lg">
        <QRCodeSVG
          value={verificationUrl}
          size={180}
          level="H"
          includeMargin={true}
          className="w-[160px] h-[160px] sm:w-[200px] sm:h-[200px]"
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

      {/* Instructions */}
      <div className="text-center space-y-1 sm:space-y-2 px-2">
        <p className="text-xs sm:text-sm font-medium text-foreground">
          Présentez ce QR code à l'organisateur
        </p>
        <p className="text-xs text-muted-foreground">
          Un membre de l'organisation scannera ce code pour valider votre présence
        </p>
      </div>

      {/* Event info */}
      <div className="w-full bg-muted/30 rounded-lg p-2 sm:p-3 text-center">
        <p className="font-medium text-foreground text-xs sm:text-sm line-clamp-2">{eventName}</p>
        <p className="text-xs text-muted-foreground mt-1">{eventDate}</p>
      </div>
    </div>
  );
};
