import { CertificateData } from '@/components/CertificatePDF';
import logo from '@/assets/logo.png';
import laurelSvg from '@/assets/certificate-laurel.svg';
import cocardeSvg from '@/assets/certificate-cocarde.svg';

interface CertificatePreviewProps {
  data: CertificateData;
}

export const CertificatePreview = ({ data }: CertificatePreviewProps) => {
  return (
    <article 
      className="relative bg-white overflow-hidden w-full min-w-[890px] border-[3px] border-solid border-[#3c2c00]"
      style={{ 
        aspectRatio: '890/501',
        fontFamily: 'Questrial, sans-serif'
      }}
    >
      {/* Inner golden border */}
      <div className="absolute top-[7px] left-[7px] right-[7px] bottom-[7px] rounded-[3px] border-2 border-solid border-[#D79806] pointer-events-none z-10" />

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
          className="h-[7.8%] w-auto object-contain"
          style={{ height: '39px' }}
        />
      </div>

      {/* Title */}
      <h1 
        className="absolute top-[19.6%] left-1/2 -translate-x-1/2 text-[#012573] text-[30px] text-center whitespace-nowrap z-20"
        style={{ 
          fontFamily: 'Questrial, sans-serif',
          WebkitTextStroke: '0.5px #000000',
          fontWeight: 500
        }}
      >
        Certificat d'action citoyenne
      </h1>

      {/* "Attribué à" */}
      <p 
        className="absolute top-[30.3%] left-1/2 -translate-x-1/2 text-[#012573] text-[15px] text-center whitespace-nowrap z-20"
        style={{ fontFamily: 'Questrial, sans-serif', fontWeight: 500 }}
      >
        Attribué à
      </p>

      {/* Recipient name */}
      <h2 
        className="absolute top-[35%] left-1/2 -translate-x-1/2 text-[#012573] text-[40px] text-center whitespace-nowrap z-20"
        style={{ fontFamily: '"EB Garamond", "Times New Roman", serif', fontWeight: 700 }}
      >
        {data.firstName} {data.lastName}
      </h2>

      {/* Horizontal line under name */}
      <div className="absolute top-[46.5%] left-1/2 -translate-x-1/2 w-[52.8%] h-[2px] bg-[#D79806] z-20" />

      {/* Body text */}
      <p 
        className="absolute top-[51.3%] left-1/2 -translate-x-1/2 w-[51%] text-[#012573] text-[12px] text-center leading-relaxed z-20"
        style={{ fontFamily: 'Questrial, sans-serif', fontWeight: 500 }}
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
          className="text-[#012573] text-[12px] whitespace-nowrap"
          style={{ fontFamily: 'Questrial, sans-serif', fontWeight: 500 }}
        >
          Date
        </span>
        <span 
          className="text-[#012573] text-[12px] mt-1 whitespace-nowrap"
          style={{ fontFamily: 'Questrial, sans-serif', fontWeight: 500 }}
        >
          {data.eventDate}
        </span>
      </div>

      {/* Organization logo - center */}
      <div className="absolute top-[67%] left-1/2 -translate-x-1/2 w-[118px] h-[118px] z-20">
        {data.organizationLogoUrl ? (
          <img 
            src={data.organizationLogoUrl} 
            alt={data.organizationName}
            className="w-full h-full rounded-full object-cover border border-gray-200"
          />
        ) : (
          <div 
            className="w-full h-full rounded-full bg-[#012573] flex items-center justify-center text-white text-[24px] font-bold"
            style={{ fontFamily: 'Questrial, sans-serif' }}
          >
            {data.organizationName.charAt(0)}
          </div>
        )}
      </div>

      {/* Validator column - right */}
      <div className="absolute top-[77.2%] right-[10.7%] flex flex-col items-start z-20">
        <span 
          className="text-[#012573] text-[12px] whitespace-nowrap"
          style={{ fontFamily: 'Questrial, sans-serif', fontWeight: 500 }}
        >
          Signataire
        </span>
        <span 
          className="text-[#012573] text-[12px] font-semibold mt-1"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          {data.validatorName}
        </span>
        {data.validatorRole && (
          <span 
            className="text-[#012573] text-[11px] italic"
            style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}
          >
            {data.validatorRole}
          </span>
        )}
      </div>

      {/* Watermark */}
      <p 
        className="absolute top-[92.6%] left-1/2 -translate-x-1/2 text-[#1c56d3] text-[8px] whitespace-nowrap z-20"
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        <span className="font-semibold">Sécurisé par Citizen Vitae</span>
        <span className="font-normal">, l'authenticité de l'engagement, vérifiée</span>
      </p>
    </article>
  );
};
