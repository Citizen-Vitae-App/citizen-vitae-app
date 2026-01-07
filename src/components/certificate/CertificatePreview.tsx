import { forwardRef } from 'react';
import { CertificateData } from '@/types/certificate';
import { useIsMobile } from '@/hooks/use-mobile';
import logo from '@/assets/logo.png';
import laurelSvg from '@/assets/certificate-laurel.svg';
import cocardeSvg from '@/assets/certificate-cocarde.svg';

interface CertificatePreviewProps {
  data: CertificateData;
}

export const CertificatePreview = forwardRef<HTMLDivElement, CertificatePreviewProps>(
  ({ data }, ref) => {
    const isMobile = useIsMobile();
    
    // Centralized sizing - percentages relative to container width (890px base)
    // These are fixed values that won't change based on viewport, ensuring
    // consistent rendering between screen display and PDF capture
    const sizing = isMobile ? {
      // Borders
      outerBorder: 2,
      innerInset: 4,
      innerBorder: 1,
      // Logo & fonts (in px, calculated from container)
      logoHeight: 22,
      titleFontSize: 16,
      attributeFontSize: 8,
      nameFontSize: 20,
      bodyFontSize: 7,
      footerFontSize: 7,
      watermarkFontSize: 5,
      validatorRoleFontSize: 6,
      // Organization logo
      orgLogoSize: 45,
      orgLogoTop: '70%',
      orgLogoFontSize: 12,
      // Decorative line
      lineTop: '48%',
      lineWidth: '48%',
      lineHeight: 1.5,
    } : {
      // Borders
      outerBorder: 3,
      innerInset: 7,
      innerBorder: 2,
      // Logo & fonts
      logoHeight: 39,
      titleFontSize: 30,
      attributeFontSize: 15,
      nameFontSize: 40,
      bodyFontSize: 12,
      footerFontSize: 12,
      watermarkFontSize: 8,
      validatorRoleFontSize: 11,
      // Organization logo
      orgLogoSize: 118,
      orgLogoTop: '67%',
      orgLogoFontSize: 24,
      // Decorative line
      lineTop: '46.5%',
      lineWidth: '52.8%',
      lineHeight: 2,
    };
    
    return (
      <article 
        ref={ref}
        className="relative bg-white overflow-hidden w-full border-solid border-[#3c2c00]"
        style={{ 
          aspectRatio: '890/501',
          fontFamily: 'Questrial, sans-serif',
          borderWidth: sizing.outerBorder
        }}
      >
        {/* Inner golden border */}
        <div 
          className="absolute rounded-[3px] border-solid border-[#D79806] pointer-events-none z-10"
          style={{
            top: sizing.innerInset,
            left: sizing.innerInset,
            right: sizing.innerInset,
            bottom: sizing.innerInset,
            borderWidth: sizing.innerBorder
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
          className="absolute top-[34%] right-[10%] w-[8.4%] h-auto z-20"
          alt="Cocarde française"
          src={cocardeSvg}
          style={{ aspectRatio: '75/118' }}
        />

        {/* Logo Citizen Vitae - centered top */}
        <div className="absolute top-[6.8%] left-1/2 -translate-x-1/2 z-20">
          <img 
            src={logo} 
            alt="Citizen Vitae" 
            className="h-auto w-auto object-contain"
            style={{ height: sizing.logoHeight }}
          />
        </div>

        {/* Title */}
        <h1 
          className="absolute top-[19.6%] left-1/2 -translate-x-1/2 text-[#012573] text-center whitespace-nowrap z-20"
          style={{ 
            fontFamily: 'Questrial, sans-serif',
            WebkitTextStroke: '0.5px #000000',
            fontWeight: 500,
            fontSize: sizing.titleFontSize
          }}
        >
          Certificat d'action citoyenne
        </h1>

        {/* "Attribué à" */}
        <p 
          className="absolute top-[30.3%] left-1/2 -translate-x-1/2 text-[#012573] text-center whitespace-nowrap z-20"
          style={{ 
            fontFamily: 'Questrial, sans-serif', 
            fontWeight: 500,
            fontSize: sizing.attributeFontSize
          }}
        >
          Attribué à
        </p>

        {/* Recipient name */}
        <h2 
          className="absolute top-[35%] left-1/2 -translate-x-1/2 text-[#012573] text-center whitespace-nowrap z-20"
          style={{ 
            fontFamily: '"EB Garamond", "Times New Roman", serif', 
            fontWeight: 700,
            fontSize: sizing.nameFontSize
          }}
        >
          {data.firstName} {data.lastName}
        </h2>

        {/* Horizontal line under name */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 bg-[#D79806] z-20"
          style={{
            top: sizing.lineTop,
            width: sizing.lineWidth,
            height: sizing.lineHeight
          }}
        />

        {/* Body text */}
        <p 
          className="absolute top-[51.3%] left-1/2 -translate-x-1/2 w-[51%] text-[#012573] text-center leading-relaxed z-20"
          style={{ 
            fontFamily: 'Questrial, sans-serif', 
            fontWeight: 500,
            fontSize: sizing.bodyFontSize
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
              fontSize: sizing.footerFontSize
            }}
          >
            Date
          </span>
          <span 
            className="text-[#012573] mt-1 whitespace-nowrap"
            style={{ 
              fontFamily: 'Questrial, sans-serif', 
              fontWeight: 500,
              fontSize: sizing.footerFontSize
            }}
          >
            {data.eventDate}
          </span>
        </div>

        {/* Organization logo - center */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 z-20"
          style={{ 
            top: sizing.orgLogoTop,
            width: sizing.orgLogoSize, 
            height: sizing.orgLogoSize 
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
                fontSize: sizing.orgLogoFontSize
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
              fontSize: sizing.footerFontSize
            }}
          >
            Signataire
          </span>
          <span 
            className="text-[#012573] font-semibold mt-1"
            style={{ 
              fontFamily: 'Inter, sans-serif',
              fontSize: sizing.footerFontSize
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
                fontSize: sizing.validatorRoleFontSize
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
            fontSize: sizing.watermarkFontSize
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
