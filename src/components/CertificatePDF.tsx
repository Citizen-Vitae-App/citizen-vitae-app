import { Document, Page, Text, View, StyleSheet, Image, Font, pdf, Svg, Path, G, Rect, Circle, Polygon } from '@react-pdf/renderer';
import { CertificateData } from '@/types/certificate';

// Register fonts
Font.register({
  family: 'Questrial',
  src: 'https://fonts.gstatic.com/s/questrial/v18/QdVUSTchPBm7nuUeVf7EuStkm20oJA.ttf',
});

Font.register({
  family: 'EBGaramond',
  fonts: [
    { 
      src: 'https://fonts.gstatic.com/s/ebgaramond/v27/SlGDmQSNjdsmc35JDF1K5E55YMjF_7DPuGi-6_RUA4V-e6yHgQ.ttf', 
      fontWeight: 400 
    },
    { 
      src: 'https://fonts.gstatic.com/s/ebgaramond/v27/SlGDmQSNjdsmc35JDF1K5E55YMjF_7DPuGi-2fRUA4V-e6yHgQ.ttf', 
      fontWeight: 500 
    },
    { 
      src: 'https://fonts.gstatic.com/s/ebgaramond/v27/SlGDmQSNjdsmc35JDF1K5E55YMjF_7DPuGi-NfNUA4V-e6yHgQ.ttf', 
      fontWeight: 600 
    },
    { 
      src: 'https://fonts.gstatic.com/s/ebgaramond/v27/SlGDmQSNjdsmc35JDF1K5E55YMjF_7DPuGi-AfNUA4V-e6yHgQ.ttf', 
      fontWeight: 700 
    },
  ],
});

Font.register({
  family: 'Inter',
  fonts: [
    { 
      src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff', 
      fontWeight: 400 
    },
    { 
      src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fAZ9hjp-Ek-_EeA.woff', 
      fontWeight: 600 
    },
  ],
});

// Page dimensions for A4 landscape
const PAGE_WIDTH = 842; // A4 landscape width in points
const PAGE_HEIGHT = 595; // A4 landscape height in points
const CERTIFICATE_ASPECT = 890 / 501;
const CERT_WIDTH = PAGE_WIDTH - 20;
const CERT_HEIGHT = CERT_WIDTH / CERTIFICATE_ASPECT;
const CERT_TOP = (PAGE_HEIGHT - CERT_HEIGHT) / 2;
const CERT_LEFT = 10;

// Scale factor to convert from original design (890px width) to PDF
const SCALE = CERT_WIDTH / 890;

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  certificate: {
    position: 'absolute',
    top: CERT_TOP,
    left: CERT_LEFT,
    width: CERT_WIDTH,
    height: CERT_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#3c2c00',
    borderStyle: 'solid',
  },
  innerBorder: {
    position: 'absolute',
    top: 7 * SCALE,
    left: 7 * SCALE,
    right: 7 * SCALE,
    bottom: 7 * SCALE,
    borderWidth: 2,
    borderColor: '#D79806',
    borderStyle: 'solid',
    borderRadius: 3,
  },
  footerBackground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: CERT_HEIGHT * 0.245,
    backgroundColor: '#FAF7EF',
  },
  logo: {
    position: 'absolute',
    top: CERT_HEIGHT * 0.068,
    left: '50%',
    transform: `translateX(-${70 * SCALE}px)`,
    width: 140 * SCALE,
    height: 39 * SCALE,
    objectFit: 'contain',
  },
  title: {
    position: 'absolute',
    top: CERT_HEIGHT * 0.196,
    width: '100%',
    textAlign: 'center',
    color: '#012573',
    fontFamily: 'Questrial',
    fontWeight: 500,
    fontSize: 30 * SCALE,
  },
  attributedTo: {
    position: 'absolute',
    top: CERT_HEIGHT * 0.303,
    width: '100%',
    textAlign: 'center',
    color: '#012573',
    fontFamily: 'Questrial',
    fontWeight: 500,
    fontSize: 15 * SCALE,
  },
  recipientName: {
    position: 'absolute',
    top: CERT_HEIGHT * 0.35,
    width: '100%',
    textAlign: 'center',
    color: '#012573',
    fontFamily: 'EBGaramond',
    fontWeight: 700,
    fontSize: 40 * SCALE,
  },
  horizontalLine: {
    position: 'absolute',
    top: CERT_HEIGHT * 0.465,
    left: '23.6%',
    width: '52.8%',
    height: 2 * SCALE,
    backgroundColor: '#D79806',
  },
  bodyText: {
    position: 'absolute',
    top: CERT_HEIGHT * 0.513,
    left: '24.5%',
    width: '51%',
    textAlign: 'center',
    color: '#012573',
    fontFamily: 'Questrial',
    fontWeight: 500,
    fontSize: 12 * SCALE,
    lineHeight: 1.6,
  },
  dateColumn: {
    position: 'absolute',
    top: CERT_HEIGHT * 0.772,
    left: '14.6%',
  },
  dateLabel: {
    color: '#012573',
    fontFamily: 'Questrial',
    fontWeight: 500,
    fontSize: 12 * SCALE,
  },
  dateValue: {
    color: '#012573',
    fontFamily: 'Questrial',
    fontWeight: 500,
    fontSize: 12 * SCALE,
    marginTop: 4 * SCALE,
  },
  orgLogoContainer: {
    position: 'absolute',
    top: CERT_HEIGHT * 0.67,
    left: '50%',
    transform: `translateX(-${59 * SCALE}px)`,
    width: 118 * SCALE,
    height: 118 * SCALE,
    borderRadius: 59 * SCALE,
    overflow: 'hidden',
  },
  orgLogo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  orgLogoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#012573',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 59 * SCALE,
  },
  orgLogoText: {
    color: 'white',
    fontFamily: 'Questrial',
    fontSize: 24 * SCALE,
    fontWeight: 'bold',
  },
  validatorColumn: {
    position: 'absolute',
    top: CERT_HEIGHT * 0.772,
    right: '10.7%',
  },
  validatorLabel: {
    color: '#012573',
    fontFamily: 'Questrial',
    fontWeight: 500,
    fontSize: 12 * SCALE,
  },
  validatorName: {
    color: '#012573',
    fontFamily: 'Inter',
    fontWeight: 600,
    fontSize: 12 * SCALE,
    marginTop: 4 * SCALE,
  },
  validatorRole: {
    color: '#012573',
    fontFamily: 'Inter',
    fontWeight: 600,
    fontSize: 11 * SCALE,
  },
  watermark: {
    position: 'absolute',
    top: CERT_HEIGHT * 0.926,
    width: '100%',
    textAlign: 'center',
    color: '#1c56d3',
    fontFamily: 'Inter',
    fontSize: 8 * SCALE,
  },
  watermarkBold: {
    fontWeight: 600,
  },
  laurelContainer: {
    position: 'absolute',
    top: '3%',
    left: '24%',
    width: '51%',
    height: '94%',
    opacity: 1,
  },
  cocardeContainer: {
    position: 'absolute',
    top: '34%',
    right: '10%',
    width: 75 * SCALE,
    height: 118 * SCALE,
  },
});

// Re-export CertificateData for backward compatibility
export type { CertificateData } from '@/types/certificate';

interface CertificatePDFDocumentProps {
  data: CertificateData;
}

// Laurel SVG as PDF component
const LaurelSvg = () => (
  <Svg viewBox="0 0 469 461" style={{ width: '100%', height: '100%' }}>
    <G fill="#fce8bb">
      {/* Left branch */}
      <Path d="M164.42 340.76c-17.42-8.3-13.62-52.38-13.62-52.38s38.78 24.51 56.2 32.81c17.43 8.3 13.63 52.38 13.63 52.38s-38.78-24.51-56.21-32.81" />
      <Path d="M140.63 288.19c-11.73-14.4 4.47-54.08 4.47-54.08s27.17 37.65 38.9 52.05c11.72 14.4-4.48 54.08-4.48 54.08s-27.17-37.65-38.89-52.05" />
      <Path d="M125.22 225.87c-4.97-17.97 21.99-49.05 21.99-49.05s13.19 45.16 18.16 63.13c4.97 17.96-22 49.05-22 49.05s-13.19-45.17-18.15-63.13" />
      <Path d="M120.71 159.5c2.15-18.52 38.5-38.81 38.5-38.81s-1.67 46.95-3.81 65.48c-2.14 18.52-38.49 38.81-38.49 38.81s1.66-46.96 3.8-65.48" />
      <Path d="M128.17 94.47c9.03-16.27 49.72-24.09 49.72-24.09s-16.45 43.93-25.48 60.2c-9.02 16.28-49.71 24.1-49.71 24.1s16.44-43.94 25.47-60.21" />
      <Path d="M148.22 36.86c14.97-11.58 55.68-6.66 55.68-6.66s-29.47 36.56-44.44 48.15C144.49 89.93 103.78 85 103.78 85s29.48-36.56 44.44-48.14" />
      {/* Right branch */}
      <Path d="M304.58 340.76c17.42-8.3 13.62-52.38 13.62-52.38s-38.78 24.51-56.2 32.81c-17.43 8.3-13.63 52.38-13.63 52.38s38.78-24.51 56.21-32.81" />
      <Path d="M328.37 288.19c11.73-14.4-4.47-54.08-4.47-54.08s-27.17 37.65-38.9 52.05c-11.72 14.4 4.48 54.08 4.48 54.08s27.17-37.65 38.89-52.05" />
      <Path d="M343.78 225.87c4.97-17.97-21.99-49.05-21.99-49.05s-13.19 45.16-18.16 63.13c-4.97 17.96 22 49.05 22 49.05s13.19-45.17 18.15-63.13" />
      <Path d="M348.29 159.5c-2.15-18.52-38.5-38.81-38.5-38.81s1.67 46.95 3.81 65.48c2.14 18.52 38.49 38.81 38.49 38.81s-1.66-46.96-3.8-65.48" />
      <Path d="M340.83 94.47c-9.03-16.27-49.72-24.09-49.72-24.09s16.45 43.93 25.48 60.2c9.02 16.28 49.71 24.1 49.71 24.1s-16.44-43.94-25.47-60.21" />
      <Path d="M320.78 36.86c-14.97-11.58-55.68-6.66-55.68-6.66s29.47 36.56 44.44 48.15C324.51 89.93 365.22 85 365.22 85s-29.48-36.56-44.44-48.14" />
      {/* Medal at bottom */}
      <Circle cx="234.5" cy="420" r="35" fill="#D79806" />
      <Path d="M234.5 375 L220 395 L249 395 Z" fill="#D79806" />
    </G>
  </Svg>
);

// Cocarde SVG as PDF component
const CocardeSvg = () => (
  <Svg viewBox="0 0 75 118" style={{ width: '100%', height: '100%' }}>
    <G>
      {/* Ribbon */}
      <Rect x="0" y="0" width="25" height="50" fill="#012573" />
      <Rect x="25" y="0" width="25" height="50" fill="#FFFFFF" />
      <Rect x="50" y="0" width="25" height="50" fill="#DC2626" />
      {/* Medal */}
      <Circle cx="37.5" cy="83" r="30" fill="#D79806" />
      <Circle cx="37.5" cy="83" r="22" fill="#F59E0B" />
      {/* Checkmark */}
      <Path d="M28 83 L35 90 L48 75" stroke="#FFFFFF" strokeWidth="4" fill="none" />
    </G>
  </Svg>
);

// Logo component
const LogoSvg = () => (
  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ fontSize: 24 * SCALE, fontFamily: 'Questrial', color: '#012573' }}>
      <Text style={{ color: '#DC2626' }}>C</Text>itizen<Text style={{ color: '#DC2626' }}>V</Text>itae
    </Text>
  </View>
);

export const CertificatePDFDocument = ({ data }: CertificatePDFDocumentProps) => (
  <Document>
    <Page size="A4" orientation="landscape" style={styles.page}>
      <View style={styles.certificate}>
        {/* Inner golden border */}
        <View style={styles.innerBorder} />
        
        {/* Footer background */}
        <View style={styles.footerBackground} />
        
        {/* Laurel watermark - centered */}
        <View style={styles.laurelContainer}>
          <LaurelSvg />
        </View>
        
        {/* Cocarde - top right */}
        <View style={styles.cocardeContainer}>
          <CocardeSvg />
        </View>
        
        {/* Logo */}
        <View style={styles.logo}>
          <LogoSvg />
        </View>
        
        {/* Title */}
        <Text style={styles.title}>Certificat d'action citoyenne</Text>
        
        {/* Attribué à */}
        <Text style={styles.attributedTo}>Attribué à</Text>
        
        {/* Recipient name */}
        <Text style={styles.recipientName}>{data.firstName} {data.lastName}</Text>
        
        {/* Horizontal line */}
        <View style={styles.horizontalLine} />
        
        {/* Body text */}
        <Text style={styles.bodyText}>
          Né(e) le {data.dateOfBirth}, en reconnaissance de sa participation à l'évènement{'\n'}
          "{data.eventName}" organisé par {data.organizationName} le {data.eventDate} de{'\n'}
          {data.eventStartTime} à {data.eventEndTime} au {data.eventLocation}.
        </Text>
        
        {/* Date column */}
        <View style={styles.dateColumn}>
          <Text style={styles.dateLabel}>Date</Text>
          <Text style={styles.dateValue}>{data.eventDate}</Text>
        </View>
        
        {/* Organization logo */}
        <View style={styles.orgLogoContainer}>
          {data.organizationLogoUrl ? (
            <Image src={data.organizationLogoUrl} style={styles.orgLogo} />
          ) : (
            <View style={styles.orgLogoPlaceholder}>
              <Text style={styles.orgLogoText}>
                {data.organizationName.charAt(0)}
              </Text>
            </View>
          )}
        </View>
        
        {/* Validator column */}
        <View style={styles.validatorColumn}>
          <Text style={styles.validatorLabel}>Signataire</Text>
          <Text style={styles.validatorName}>{data.validatorName}</Text>
          {data.validatorRole && (
            <Text style={styles.validatorRole}>{data.validatorRole}</Text>
          )}
        </View>
        
        {/* Watermark */}
        <Text style={styles.watermark}>
          <Text style={styles.watermarkBold}>Sécurisé par Citizen Vitae</Text>
          <Text>, l'authenticité de l'engagement, vérifiée</Text>
        </Text>
      </View>
    </Page>
  </Document>
);

export const generateCertificatePDF = async (data: CertificateData): Promise<Blob> => {
  const blob = await pdf(<CertificatePDFDocument data={data} />).toBlob();
  return blob;
};

export const downloadCertificatePDF = async (data: CertificateData, filename?: string) => {
  const blob = await generateCertificatePDF(data);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `certificat-${data.eventName.replace(/\s+/g, '-').toLowerCase()}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
