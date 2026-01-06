import { Document, Page, Text, View, StyleSheet, Image, Font, pdf } from '@react-pdf/renderer';
import { CertificateData } from '@/types/certificate';

// Register fonts - using Google Fonts URLs for EB Garamond and a clean sans-serif
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
  ],
});

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#FDF8F0',
    padding: 25,
    position: 'relative',
    fontFamily: 'Questrial',
  },
  container: {
    border: '2pt solid #012573',
    borderRadius: 8,
    backgroundColor: '#FFFBF5',
    flex: 1,
    position: 'relative',
    paddingVertical: 30,
    paddingHorizontal: 50,
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 20,
    right: 25,
    backgroundColor: '#012573',
    color: 'white',
    fontSize: 7,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgeSelfCertified: {
    backgroundColor: '#059669',
  },
  logo: {
    width: 140,
    height: 40,
    objectFit: 'contain',
    marginBottom: 15,
  },
  title: {
    fontSize: 22,
    color: '#012573',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 11,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 15,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
    gap: 15,
  },
  laurel: {
    width: 55,
    height: 70,
    objectFit: 'contain',
  },
  laurelLeft: {
    transform: 'scaleX(-1)',
  },
  recipientName: {
    fontSize: 36,
    color: '#012573',
    textAlign: 'center',
    fontFamily: 'EBGaramond',
    fontWeight: 500,
  },
  cocarde: {
    width: 45,
    height: 55,
    objectFit: 'contain',
    marginLeft: 10,
  },
  bodyText: {
    fontSize: 11,
    color: '#333333',
    textAlign: 'center',
    lineHeight: 1.7,
    maxWidth: 480,
    marginBottom: 30,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    width: '100%',
    marginTop: 'auto',
    paddingHorizontal: 30,
  },
  footerColumn: {
    alignItems: 'center',
    minWidth: 100,
  },
  footerLabel: {
    fontSize: 8,
    color: '#666666',
    marginBottom: 4,
  },
  footerValue: {
    fontSize: 10,
    color: '#333333',
    fontWeight: 600,
  },
  footerRole: {
    fontSize: 8,
    color: '#666666',
    marginTop: 2,
  },
  orgLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    objectFit: 'contain',
  },
  orgLogoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#012573',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orgLogoText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  watermark: {
    fontSize: 7,
    color: '#999999',
    textAlign: 'center',
    marginTop: 20,
  },
  watermarkBrand: {
    color: '#012573',
    fontWeight: 600,
    fontStyle: 'normal',
  },
});

// Re-export CertificateData for backward compatibility
export type { CertificateData } from '@/types/certificate';

interface CertificatePDFDocumentProps {
  data: CertificateData;
}

// Using base64 encoded simple PNG versions for PDF compatibility
// These are placeholder colors that match the design
const LOGO_URL = 'https://storage.googleapis.com/gpt-engineer-file-uploads/JMOhiwkBCEWeBlXWgl70IRx2IAD2/uploads/1755792313282-citizenvitae-logo.png';
const LAUREL_URL = 'https://storage.googleapis.com/gpt-engineer-file-uploads/JMOhiwkBCEWeBlXWgl70IRx2IAD2/uploads/1755792313282-laurel.png';
const COCARDE_URL = 'https://storage.googleapis.com/gpt-engineer-file-uploads/JMOhiwkBCEWeBlXWgl70IRx2IAD2/uploads/1755792313282-cocarde.png';

export const CertificatePDFDocument = ({ data }: CertificatePDFDocumentProps) => (
  <Document>
    <Page size="A4" orientation="landscape" style={styles.page}>
      <View style={styles.container}>
        {/* Badge */}
        <View style={[styles.badge, data.isSelfCertified && styles.badgeSelfCertified]}>
          <Text>✓ {data.isSelfCertified ? 'AUTO-CERTIFIÉ' : 'CERTIFIÉ'}</Text>
        </View>

        {/* Logo - using text fallback for now */}
        <View style={{ marginBottom: 15 }}>
          <Text style={{ fontSize: 24, color: '#012573', fontWeight: 'bold' }}>
            <Text style={{ color: '#DC2626' }}>C</Text>itizen
            <Text style={{ color: '#DC2626' }}>V</Text>itae
          </Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>Certificat d'action citoyenne</Text>
        
        {/* Subtitle */}
        <Text style={styles.subtitle}>Attribué à</Text>

        {/* Name with decorations */}
        <View style={styles.nameContainer}>
          {/* Simplified medal/laurel representation */}
          <View style={{ width: 40, height: 50, backgroundColor: '#F59E0B', borderRadius: 25, marginRight: 15 }} />
          
          <Text style={styles.recipientName}>{data.firstName} {data.lastName}</Text>
          
          {/* Simplified cocarde */}
          <View style={{ marginLeft: 15, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row' }}>
              <View style={{ width: 10, height: 15, backgroundColor: '#012573' }} />
              <View style={{ width: 10, height: 15, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DDD' }} />
              <View style={{ width: 10, height: 15, backgroundColor: '#DC2626' }} />
            </View>
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#F59E0B', marginTop: -5, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: 'white', fontSize: 14 }}>✓</Text>
            </View>
          </View>
        </View>

        {/* Body */}
        <Text style={styles.bodyText}>
          Né(e) le {data.dateOfBirth}, en reconnaissance de sa participation à l'événement{'\n'}
          "{data.eventName}" organisé par {data.organizationName} le {data.eventDate}{'\n'}
          de {data.eventStartTime} à {data.eventEndTime} au {data.eventLocation}.
        </Text>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerColumn}>
            <Text style={styles.footerLabel}>Date</Text>
            <Text style={styles.footerValue}>{data.eventDate}</Text>
          </View>
          
          <View style={styles.footerColumn}>
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
          
          <View style={styles.footerColumn}>
            <Text style={styles.footerLabel}>Signataire</Text>
            <Text style={styles.footerValue}>{data.validatorName}</Text>
            {data.validatorRole && (
              <Text style={styles.footerRole}>{data.validatorRole}</Text>
            )}
          </View>
        </View>

        {/* Watermark */}
        <Text style={styles.watermark}>
          Sécurisé par <Text style={styles.watermarkBrand}>Citizen Vitae®</Text>, l'authenticité de l'engagement, vérifiée.
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
