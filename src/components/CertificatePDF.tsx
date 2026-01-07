// 1. IMPORT ET POLYFILL DU BUFFER (CRUCIAL POUR LES FONTS)
import { Buffer } from 'buffer';

// react-pdf s'attend à Buffer (Node). Sous Vite navigateur, on le polyfill via globalThis.
if (typeof globalThis !== 'undefined') {
  (globalThis as any).Buffer = (globalThis as any).Buffer || Buffer;
}

// 2. Imports normaux
import { Document, Page, Text, View, StyleSheet, Image, Font, pdf } from '@react-pdf/renderer';
import { CertificateData } from '@/types/certificate';

// Register fonts (servies localement depuis /public/fonts pour éviter les soucis CORS/format)
Font.register({
  family: 'Questrial',
  src: '/fonts/questrial-regular.ttf',
});

Font.register({
  family: 'EBGaramond',
  fonts: [
    {
      src: '/fonts/eb-garamond-400.ttf',
      fontWeight: 400,
    },
    {
      src: '/fonts/eb-garamond-600.ttf',
      fontWeight: 600,
    },
  ],
});

// NOTE: @react-pdf/renderer ne supporte pas les polices web (woff/woff2).
// On évite donc d'enregistrer Inter en .woff (cause typique de "Unknown font format").
// Les styles qui utilisaient Inter basculent sur Questrial plus bas.

// Page dimensions for A4 landscape in points (1pt = 1/72 inch)
const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;

// Certificate dimensions - maintain original aspect ratio (890/501)
const CERTIFICATE_ASPECT = 890 / 501;
const MARGIN = 10;
const CERT_WIDTH = PAGE_WIDTH - (2 * MARGIN);
const CERT_HEIGHT = CERT_WIDTH / CERTIFICATE_ASPECT;
const CERT_TOP = (PAGE_HEIGHT - CERT_HEIGHT) / 2;

// Border dimensions
const OUTER_BORDER = 3;
const INNER_BORDER = 2;
const BORDER_INSET = 7;

// Footer height ratio
const FOOTER_HEIGHT_RATIO = 0.245;

// Asset URLs - using public folder for consistent access
const LAUREL_URL = '/images/certificate-laurel.png';
const COCARDE_URL = '/images/certificate-cocarde.png';
const LOGO_URL = '/images/certificate-logo.png';

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  certificate: {
    position: 'absolute',
    top: CERT_TOP,
    left: MARGIN,
    width: CERT_WIDTH,
    height: CERT_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderWidth: OUTER_BORDER,
    borderColor: '#3c2c00',
    borderStyle: 'solid',
  },
  innerBorder: {
    position: 'absolute',
    top: BORDER_INSET,
    left: BORDER_INSET,
    right: BORDER_INSET,
    bottom: BORDER_INSET,
    borderWidth: INNER_BORDER,
    borderColor: '#D79806',
    borderStyle: 'solid',
    borderRadius: 3,
  },
  footerBackground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: CERT_HEIGHT * FOOTER_HEIGHT_RATIO,
    backgroundColor: '#FAF7EF',
  },
  // Laurel wreath in background - centered
  laurelImage: {
    position: 'absolute',
    top: '3%',
    left: '24.5%',
    width: '51%',
    opacity: 0.3,
  },
  // Cocarde - top right area
  cocardeImage: {
    position: 'absolute',
    top: '28%',
    right: '10%',
    width: 65,
    height: 102,
  },
  // Logo CitizenVitae - top center
  logoImage: {
    position: 'absolute',
    top: '6.8%',
    left: '50%',
    marginLeft: -70,
    width: 140,
    height: 35,
    objectFit: 'contain',
  },
  // Title "Certificat d'action citoyenne"
  title: {
    position: 'absolute',
    top: '19.6%',
    width: '100%',
    textAlign: 'center',
    color: '#012573',
    fontFamily: 'Questrial',
    fontWeight: 500,
    fontSize: 28,
  },
  // "Attribué à"
  attributedTo: {
    position: 'absolute',
    top: '30.3%',
    width: '100%',
    textAlign: 'center',
    color: '#012573',
    fontFamily: 'Questrial',
    fontWeight: 500,
    fontSize: 14,
  },
  // Recipient name (EB Garamond)
  recipientName: {
    position: 'absolute',
    top: '35%',
    width: '100%',
    textAlign: 'center',
    color: '#012573',
    fontFamily: 'EBGaramond',
    fontWeight: 600,
    fontSize: 36,
  },
  // Horizontal golden line
  horizontalLine: {
    position: 'absolute',
    top: '46.5%',
    left: '23.6%',
    width: '52.8%',
    height: 2,
    backgroundColor: '#D79806',
  },
  // Body text description
  bodyText: {
    position: 'absolute',
    top: '51.3%',
    left: '24.5%',
    width: '51%',
    textAlign: 'center',
    color: '#012573',
    fontFamily: 'Questrial',
    fontWeight: 500,
    fontSize: 11,
    lineHeight: 1.6,
  },
  // Footer row container - uses flexbox
  footerRow: {
    position: 'absolute',
    bottom: '8%',
    left: '12%',
    right: '12%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  // Date column (left)
  dateColumn: {
    alignItems: 'flex-start',
  },
  dateLabel: {
    color: '#012573',
    fontFamily: 'Questrial',
    fontWeight: 500,
    fontSize: 11,
  },
  dateValue: {
    color: '#012573',
    fontFamily: 'Questrial',
    fontWeight: 500,
    fontSize: 11,
    marginTop: 4,
  },
  // Organization logo container (center)
  orgLogoContainer: {
    position: 'absolute',
    top: '67%',
    left: '50%',
    marginLeft: -50,
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
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
    borderRadius: 50,
  },
  orgLogoText: {
    color: '#FFFFFF',
    fontFamily: 'Questrial',
    fontSize: 32,
    fontWeight: 'bold',
  },
  // Validator column (right)
  validatorColumn: {
    alignItems: 'flex-end',
  },
  validatorLabel: {
    color: '#012573',
    fontFamily: 'Questrial',
    fontWeight: 500,
    fontSize: 11,
    textAlign: 'right',
  },
  validatorName: {
    color: '#012573',
    fontFamily: 'Questrial',
    fontWeight: 600,
    fontSize: 11,
    marginTop: 4,
    textAlign: 'right',
  },
  validatorRole: {
    color: '#012573',
    fontFamily: 'Questrial',
    fontWeight: 600,
    fontSize: 10,
    textAlign: 'right',
  },
  // Watermark at bottom
  watermark: {
    position: 'absolute',
    bottom: '2%',
    width: '100%',
    textAlign: 'center',
    color: '#1c56d3',
    fontFamily: 'Questrial',
    fontSize: 7,
  },
  watermarkBold: {
    fontWeight: 600,
  },
});

// Re-export CertificateData for backward compatibility
export type { CertificateData } from '@/types/certificate';

interface CertificatePDFDocumentProps {
  data: CertificateData;
}

export const CertificatePDFDocument = ({ data }: CertificatePDFDocumentProps) => (
  <Document>
    <Page size="A4" orientation="landscape" style={styles.page}>
      <View style={styles.certificate}>
        {/* Footer background - must be rendered first to appear behind content */}
        <View style={styles.footerBackground} />
        
        {/* Inner golden border */}
        <View style={styles.innerBorder} />
        
        {/* Laurel wreath watermark - centered, semi-transparent */}
        <Image src={LAUREL_URL} style={styles.laurelImage} />
        
        {/* Cocarde - top right */}
        <Image src={COCARDE_URL} style={styles.cocardeImage} />
        
        {/* Logo CitizenVitae - top center */}
        <Image src={LOGO_URL} style={styles.logoImage} />
        
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
        
        {/* Organization logo - center */}
        <View style={styles.orgLogoContainer}>
          {data.organizationLogoUrl && /\.(png|jpe?g)(\?.*)?$/i.test(data.organizationLogoUrl) ? (
            <Image src={data.organizationLogoUrl} style={styles.orgLogo} />
          ) : (
            <View style={styles.orgLogoPlaceholder}>
              <Text style={styles.orgLogoText}>
                {data.organizationName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        
        {/* Footer row with Date and Validator */}
        <View style={styles.footerRow}>
          {/* Date column - left */}
          <View style={styles.dateColumn}>
            <Text style={styles.dateLabel}>Date</Text>
            <Text style={styles.dateValue}>{data.eventDate}</Text>
          </View>
          
          {/* Validator column - right */}
          <View style={styles.validatorColumn}>
            <Text style={styles.validatorLabel}>Signataire</Text>
            <Text style={styles.validatorName}>{data.validatorName}</Text>
            {!!data.validatorRole ? (
              <Text style={styles.validatorRole}>{data.validatorRole}</Text>
            ) : null}
          </View>
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
