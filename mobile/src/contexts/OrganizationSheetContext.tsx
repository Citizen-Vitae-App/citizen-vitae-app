import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { OrganizationProfileBottomSheet } from '@/components/organization/OrganizationProfileBottomSheet';

type Ctx = {
  openOrganization: (organizationId: string) => void;
  closeOrganization: () => void;
};

const OrganizationSheetContext = createContext<Ctx | null>(null);

export function OrganizationSheetProvider({ children }: { children: ReactNode }) {
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  const openOrganization = useCallback((id: string) => {
    setOrganizationId(id);
  }, []);

  const closeOrganization = useCallback(() => {
    setOrganizationId(null);
  }, []);

  const value = useMemo(
    () => ({ openOrganization, closeOrganization }),
    [openOrganization, closeOrganization]
  );

  return (
    <OrganizationSheetContext.Provider value={value}>
      {children}
      <OrganizationProfileBottomSheet
        visible={organizationId != null}
        organizationId={organizationId}
        onClose={closeOrganization}
        onOpenOrganizationId={openOrganization}
      />
    </OrganizationSheetContext.Provider>
  );
}

export function useOrganizationSheet(): Ctx {
  const ctx = useContext(OrganizationSheetContext);
  if (!ctx) {
    throw new Error('useOrganizationSheet must be used within OrganizationSheetProvider');
  }
  return ctx;
}
