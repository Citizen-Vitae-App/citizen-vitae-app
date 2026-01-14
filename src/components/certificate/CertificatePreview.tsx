import { forwardRef } from 'react';
import { CertificateData } from '@/types/certificate';
import { useIsMobile } from '@/hooks/use-mobile';
import logo from '@/assets/logo.svg';
import laurelSvg from '@/assets/certificate-laurel.svg';
import cocardeSvg from '@/assets/certificate-cocarde.svg';

interface CertificatePreviewProps {
  data: CertificateData;
}

export const CertificatePreview = forwardRef<HTMLDivElement, CertificatePreviewProps>(
  ({ data }, ref) => {
    const isMobile = useIsMobile();
    
    // Mobile-specific adjustments
    const outerBorderWidth = isMobile ? '2px' : '3px';
    const innerBorderInset = isMobile ? '3px' : '7px';
    const innerBorderWidth = isMobile ? '1px' : '2px';
    
    // Mobile text and element sizing
    const logoHeight = isMobile ? 'clamp(14px, 3.5vw, 30px)' : 'clamp(18px, 4.4vw, 39px)';
    const titleFontSize = isMobile ? 'clamp(11px, 2.8vw, 24px)' : 'clamp(14px, 3.4vw, 30px)';
    const titleTop = isMobile ? '17%' : '19.6%';
    const attribueTop = isMobile ? '28%' : '30.3%';
    const nameFontSize = isMobile ? 'clamp(12px, 3.4vw, 28px)' : 'clamp(18px, 4.5vw, 40px)';
    const nameTop = isMobile ? '34%' : '35%';
    const lineTop = isMobile ? '46%' : '46.5%';
    const lineHeight = isMobile ? '1px' : '2px';
    
    return (
      <article 
        ref={ref}
        className="relative bg-white overflow-hidden w-full border-solid border-[#3c2c00]"
        style={{ 
          aspectRatio: '890/501',
          fontFamily: 'Questrial, sans-serif',
          borderWidth: outerBorderWidth
        }}
      >
        {/* Inner golden border */}
        <div 
          className="absolute rounded-[3px] border-solid border-[#D79806] pointer-events-none z-10"
          style={{
            top: innerBorderInset,
            left: innerBorderInset,
            right: innerBorderInset,
            bottom: innerBorderInset,
            borderWidth: innerBorderWidth
          }}
        />

        {/* Footer background */}
        <div className="absolute bottom-0 left-0 right-0 h-[24.5%] bg-[#FAF7EF]" />

        {/* Large laurel/crown as background - centered */}
        <img
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[51%] h-auto opacity-100 pointer-events-none"
          alt=""
          src={laurelSvg}
          style={{ maxHeight: '94%' }}
        />

        {/* Cocarde - top right area */}
        <img
          className="absolute top-[34%] right-[10%] h-auto z-20"
          alt="Cocarde française"
          src={cocardeSvg}
          style={{ 
            aspectRatio: '75/118',
            width: isMobile ? '10%' : '8.4%',
            imageRendering: 'auto'
          }}
        />

        {/* Logo Citizen Vitae - centered top */}
        <div className="absolute top-[6.8%] left-1/2 -translate-x-1/2 z-20">
          <img 
            src={logo} 
            alt="Citizen Vitae" 
            className="h-auto w-auto object-contain"
            style={{ height: logoHeight }}
          />
        </div>

        {/* Title */}
        <h1 
          className="absolute left-1/2 -translate-x-1/2 text-[#012573] text-center whitespace-nowrap z-20"
          style={{ 
            top: titleTop,
            fontFamily: 'Questrial, sans-serif',
            WebkitTextStroke: '0.5px #000000',
            fontWeight: 500,
            fontSize: titleFontSize
          }}
        >
          Certificat d'action citoyenne
        </h1>

        {/* "Attribué à" */}
        <p 
          className="absolute left-1/2 -translate-x-1/2 text-[#012573] text-center whitespace-nowrap z-20"
          style={{ 
            top: attribueTop,
            fontFamily: 'Questrial, sans-serif', 
            fontWeight: 500,
            fontSize: 'clamp(7px, 1.7vw, 15px)'
          }}
        >
          Attribué à
        </p>

        {/* Recipient name */}
        <h2 
          className="absolute left-1/2 -translate-x-1/2 text-[#012573] text-center whitespace-nowrap z-20"
          style={{ 
            top: nameTop,
            fontFamily: '"EB Garamond", "Times New Roman", serif', 
            fontWeight: 700,
            fontSize: nameFontSize
          }}
        >
          {data.firstName} {data.lastName}
        </h2>

        {/* Horizontal line under name */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 bg-[#D79806] z-20"
          style={{
            top: lineTop,
            width: isMobile ? '48%' : '52.8%',
            height: lineHeight
          }}
        />

        {/* Body text */}
        <p 
          className="absolute left-1/2 -translate-x-1/2 text-[#012573] text-center leading-relaxed z-20"
          style={{ 
            top: isMobile ? '50%' : '51.3%',
            width: isMobile ? '78%' : '51%',
            fontFamily: 'Questrial, sans-serif', 
            fontWeight: 500,
            fontSize: isMobile ? 'clamp(5px, 1.15vw, 10px)' : 'clamp(6px, 1.35vw, 12px)'
          }}
        >
          Né(e) le {data.dateOfBirth}, en reconnaissance de sa participation à l'évènement
          <br />
          "{data.eventName}" organisé par {data.organizationName} le {data.eventDate} de
          <br />
          {data.eventStartTime} à {data.eventEndTime} au {data.eventLocation}.
        </p>

        {/* Footer section */}
        {/* Date column - left */}
        <div className="absolute top-[77.2%] left-[14.6%] flex flex-col items-start z-20">
          <span 
            className="text-[#012573] whitespace-nowrap"
            style={{ 
              fontFamily: 'Questrial, sans-serif', 
              fontWeight: 500,
              fontSize: 'clamp(6px, 1.35vw, 12px)'
            }}
          >
            Date
          </span>
          <span 
            className="text-[#012573] mt-1 whitespace-nowrap"
            style={{ 
              fontFamily: 'Questrial, sans-serif', 
              fontWeight: 500,
              fontSize: 'clamp(6px, 1.35vw, 12px)'
            }}
          >
            {data.eventDate}
          </span>
        </div>

        {/* Organization logo - center */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 z-20"
          style={{ 
            top: isMobile ? '70%' : '67%',
            width: isMobile ? 'clamp(35px, 10vw, 70px)' : 'clamp(50px, 13.3vw, 118px)', 
            height: isMobile ? 'clamp(35px, 10vw, 70px)' : 'clamp(50px, 13.3vw, 118px)' 
          }}
        >
          {data.organizationLogoUrl ? (
            <img 
              src={data.organizationLogoUrl} 
              alt={data.organizationName}
              className="w-full h-full rounded-full object-cover border border-gray-200"
            />
          ) : (
            <div 
              className="w-full h-full rounded-full bg-[#012573] flex items-center justify-center text-white font-bold"
              style={{ 
                fontFamily: 'Questrial, sans-serif',
                fontSize: isMobile ? 'clamp(10px, 2vw, 18px)' : 'clamp(12px, 2.7vw, 24px)'
              }}
            >
              {data.organizationName.charAt(0)}
            </div>
          )}
        </div>

        {/* Validator column - right */}
        <div className="absolute top-[77.2%] right-[10.7%] flex flex-col items-start z-20">
          <span 
            className="text-[#012573] whitespace-nowrap"
            style={{ 
              fontFamily: 'Questrial, sans-serif', 
              fontWeight: 500,
              fontSize: 'clamp(6px, 1.35vw, 12px)'
            }}
          >
            Signataire
          </span>
          <span 
            className="text-[#012573] font-semibold mt-1"
            style={{ 
              fontFamily: 'Inter, sans-serif',
              fontSize: 'clamp(6px, 1.35vw, 12px)'
            }}
          >
            {data.validatorName}
          </span>
          {data.validatorRole && (
            <span 
              className="text-[#012573]"
              style={{ 
                fontFamily: 'Inter, sans-serif', 
                fontWeight: 600,
                fontSize: 'clamp(5px, 1.2vw, 11px)'
              }}
            >
              {data.validatorRole}
            </span>
          )}
        </div>

        {/* Watermark */}
        <p 
          className="absolute top-[92.6%] left-1/2 -translate-x-1/2 text-[#1c56d3] whitespace-nowrap z-20"
          style={{ 
            fontFamily: 'Inter, sans-serif',
            fontSize: 'clamp(4px, 0.9vw, 8px)'
          }}
        >
          <span className="font-semibold">Sécurisé par Citizen Vitae</span>
          <span className="font-normal">, l'authenticité de l'engagement, vérifiée</span>
        </p>
      </article>
    );
  }
);

CertificatePreview.displayName = 'CertificatePreview';
