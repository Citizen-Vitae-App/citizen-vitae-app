/** Aligné sur `src/types/certificate.ts` (web). */
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

export interface CertificateDataFromDB {
  user: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
  };
  event: {
    id: string;
    name: string;
    date: string;
    startTime: string;
    endTime: string;
    location: string;
  };
  organization: {
    id: string;
    name: string;
    logoUrl: string | null;
  };
  validator: {
    name: string;
    role: string;
  };
  certifiedAt: string;
  isSelfCertified: boolean;
}

export function mapDbCertificateToViewModel(db: CertificateDataFromDB): CertificateData {
  return {
    firstName: db.user.firstName,
    lastName: db.user.lastName,
    dateOfBirth: db.user.dateOfBirth,
    eventName: db.event.name,
    organizationName: db.organization.name,
    organizationLogoUrl: db.organization.logoUrl,
    eventDate: db.event.date,
    eventStartTime: db.event.startTime,
    eventEndTime: db.event.endTime,
    eventLocation: db.event.location,
    validatorName: db.validator.name,
    validatorRole: db.validator.role,
    isSelfCertified: db.isSelfCertified,
  };
}
