import { CertificateData } from '@/components/CertificatePDF';
import logo from '@/assets/logo.png';
import laurelSvg from '@/assets/certificate-laurel.svg';
import cocardeSvg from '@/assets/certificate-cocarde.svg';

interface CertificatePreviewProps {
  data: CertificateData;
}

export const CertificatePreview = ({ data }: CertificatePreviewProps) => {
  return (
    <div 
      className="relative bg-[#FDF8F0] w-full overflow-hidden"
      style={{ 
        aspectRatio: '297/210', // A4 landscape ratio
        fontFamily: 'Questrial, sans-serif'
      }}
    >
      {/* Inner container with border */}
      <div className="absolute inset-[3%] border-2 border-[#012573] rounded-lg bg-[#FFFBF5] flex flex-col">
        
        {/* Badge - top right */}
        <div 
          className={`absolute top-[4%] right-[4%] px-3 py-1.5 rounded text-[0.6rem] font-medium tracking-wide uppercase text-white ${
            data.isSelfCertified ? 'bg-emerald-600' : 'bg-[#012573]'
          }`}
        >
          ✓ {data.isSelfCertified ? 'AUTO-CERTIFIÉ' : 'CERTIFIÉ'}
        </div>

        {/* Content container */}
        <div className="flex-1 flex flex-col items-center px-[8%] py-[4%]">
          
          {/* Logo */}
          <div className="mb-[2%]">
            <img 
              src={logo} 
              alt="Citizen Vitae" 
              className="h-[3.5vw] max-h-12 object-contain"
            />
          </div>

          {/* Title */}
          <h1 
            className="text-[#012573] text-[2vw] italic mb-[1%]"
            style={{ fontFamily: 'Questrial, sans-serif' }}
          >
            Certificat d'action citoyenne
          </h1>

          {/* Subtitle */}
          <p className="text-[#666] text-[1vw] mb-[1.5%]">
            Attribué à
          </p>

          {/* Name with decorations */}
          <div className="flex items-center justify-center gap-[3%] w-full mb-[3%]">
            {/* Left laurel */}
            <img 
              src={laurelSvg} 
              alt="" 
              className="h-[6vw] max-h-20 object-contain"
              style={{ transform: 'scaleX(-1)' }}
            />
            
            {/* Name */}
            <h2 
              className="text-[#012573] text-[3.5vw] font-medium whitespace-nowrap"
              style={{ fontFamily: '"EB Garamond", serif' }}
            >
              {data.firstName} {data.lastName}
            </h2>
            
            {/* Right laurel */}
            <img 
              src={laurelSvg} 
              alt="" 
              className="h-[6vw] max-h-20 object-contain"
            />
            
            {/* Cocarde */}
            <img 
              src={cocardeSvg} 
              alt="" 
              className="h-[5vw] max-h-16 object-contain ml-[1%]"
            />
          </div>

          {/* Body text */}
          <p 
            className="text-[#333] text-[1vw] text-center leading-relaxed max-w-[85%] mb-[4%]"
            style={{ fontFamily: 'Questrial, sans-serif' }}
          >
            Né(e) le {data.dateOfBirth}, en reconnaissance de sa participation à l'événement
            <br />
            "{data.eventName}" organisé par {data.organizationName} le {data.eventDate}
            <br />
            de {data.eventStartTime} à {data.eventEndTime} au {data.eventLocation}.
          </p>

          {/* Footer section */}
          <div className="w-full flex justify-between items-end mt-auto px-[5%]">
            {/* Date column */}
            <div className="flex flex-col items-center">
              <span className="text-[#666] text-[0.7vw] mb-1">Date</span>
              <span className="text-[#333] text-[0.9vw] font-semibold">{data.eventDate}</span>
            </div>

            {/* Organization logo */}
            <div className="flex flex-col items-center">
              {data.organizationLogoUrl ? (
                <img 
                  src={data.organizationLogoUrl} 
                  alt={data.organizationName}
                  className="w-[5vw] h-[5vw] max-w-16 max-h-16 rounded-full object-contain border border-gray-200"
                />
              ) : (
                <div 
                  className="w-[5vw] h-[5vw] max-w-16 max-h-16 rounded-full bg-[#012573] flex items-center justify-center text-white text-[2vw] font-bold"
                >
                  {data.organizationName.charAt(0)}
                </div>
              )}
            </div>

            {/* Validator column */}
            <div className="flex flex-col items-center">
              <span className="text-[#666] text-[0.7vw] mb-1">Signataire</span>
              <span className="text-[#333] text-[0.9vw] font-semibold">{data.validatorName}</span>
              {data.validatorRole && (
                <span className="text-[#666] text-[0.7vw] italic">{data.validatorRole}</span>
              )}
            </div>
          </div>

          {/* Watermark */}
          <p className="text-[#999] text-[0.65vw] italic mt-[3%] text-center">
            Sécurisé par <span className="text-[#012573] font-semibold not-italic">Citizen Vitae®</span>, l'authenticité de l'engagement, vérifiée.
          </p>
        </div>
      </div>
    </div>
  );
};
