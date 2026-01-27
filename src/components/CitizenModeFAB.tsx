import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface CitizenModeFABProps {
  className?: string;
}

export const CitizenModeFAB = ({ className }: CitizenModeFABProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <button
      onClick={() => navigate('/')}
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-black text-white px-5 py-3 rounded-full shadow-lg transition-all duration-300 ease-out hover:scale-105 active:scale-95 ${className || ''}`}
    >
      <ArrowLeftRight className="h-4 w-4" />
      <span className="text-sm font-medium whitespace-nowrap">Passer au mode citoyen</span>
    </button>
  );
};
