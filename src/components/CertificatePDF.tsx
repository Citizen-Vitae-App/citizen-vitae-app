import { Document, Page, Text, View, StyleSheet, Image, Font, pdf } from '@react-pdf/renderer';

// Register fonts (using system fonts as fallback)
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/opensans/v18/mem8YaGs126MiZpBA-UFVZ0e.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/opensans/v18/mem5YaGs126MiZpBA-UN7rgOUuhs.ttf', fontWeight: 700 },
  ],
});

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#FDF8F0',
    padding: 40,
    position: 'relative',
  },
  container: {
    border: '2px solid #012573',
    borderRadius: 8,
    padding: 30,
    backgroundColor: '#FFFBF5',
    height: '100%',
    position: 'relative',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    fontSize: 28,
    color: '#012573',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  logoAccent: {
    color: '#DC2626',
  },
  title: {
    fontSize: 24,
    color: '#012573',
    textAlign: 'center',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  recipientName: {
    fontSize: 32,
    color: '#012573',
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  bodyText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    lineHeight: 1.6,
    marginBottom: 30,
    paddingHorizontal: 30,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 'auto',
    paddingTop: 20,
  },
  footerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  footerLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 5,
  },
  footerValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: 'bold',
  },
  footerRole: {
    fontSize: 10,
    color: '#666',
    fontStyle: 'italic',
  },
  orgLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    objectFit: 'contain',
  },
  watermark: {
    fontSize: 9,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
  watermarkBrand: {
    color: '#012573',
    fontWeight: 'bold',
  },
  badge: {
    position: 'absolute',
    top: 30,
    right: 30,
    backgroundColor: '#059669',
    color: 'white',
    fontSize: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
    textTransform: 'uppercase',
  },
  badgeManual: {
    backgroundColor: '#012573',
  },
  medal: {
    position: 'absolute',
    top: 100,
    right: 40,
    width: 50,
    height: 70,
  },
  medalRibbon: {
    width: 40,
    height: 20,
    flexDirection: 'row',
    marginLeft: 5,
  },
  ribbonBlue: {
    width: 13,
    height: 20,
    backgroundColor: '#012573',
  },
  ribbonWhite: {
    width: 14,
    height: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  ribbonRed: {
    width: 13,
    height: 20,
    backgroundColor: '#DC2626',
  },
  medalCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F59E0B',
    borderWidth: 3,
    borderColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 5,
    marginTop: -5,
  },
  medalCheck: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
  },
});

export interface CertificateData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  eventName: string;
  organizationName: string;
  organizationLogoUrl: string | null;
  eventDate: string;
  eventStartTime: string;
  eventEndTime: string;
  eventLocation: string;
  validatorName: string;
  validatorRole: string;
  isSelfCertified: boolean;
}

interface CertificatePDFDocumentProps {
  data: CertificateData;
}

export const CertificatePDFDocument = ({ data }: CertificatePDFDocumentProps) => (
  <Document>
    <Page size="A4" orientation="landscape" style={styles.page}>
      <View style={styles.container}>
        {/* Badge */}
        <View style={[styles.badge, !data.isSelfCertified && styles.badgeManual]}>
          <Text>{data.isSelfCertified ? '✓ AUTO-CERTIFIÉ' : '✓ CERTIFIÉ'}</Text>
        </View>

        {/* Medal */}
        <View style={styles.medal}>
          <View style={styles.medalRibbon}>
            <View style={styles.ribbonBlue} />
            <View style={styles.ribbonWhite} />
            <View style={styles.ribbonRed} />
          </View>
          <View style={styles.medalCircle}>
            <Text style={styles.medalCheck}>✓</Text>
          </View>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>
            <Text style={styles.logoAccent}>C</Text>itizen<Text style={styles.logoAccent}>V</Text>itae
          </Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>Certificat d'action citoyenne</Text>
        
        {/* Subtitle */}
        <Text style={styles.subtitle}>Attribué à</Text>
        
        {/* Recipient Name */}
        <Text style={styles.recipientName}>{data.firstName} {data.lastName}</Text>

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
            {data.organizationLogoUrl && (
              <Image src={data.organizationLogoUrl} style={styles.orgLogo} />
            )}
            {!data.organizationLogoUrl && (
              <View style={[styles.orgLogo, { backgroundColor: '#012573', alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>
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
