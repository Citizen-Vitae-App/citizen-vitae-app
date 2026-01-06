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
