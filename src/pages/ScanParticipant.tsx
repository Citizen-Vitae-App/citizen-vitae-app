import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, UserCheck, AlertCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { QRScanner } from '@/components/QRScanner';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ScanResult {
  success: boolean;
  scan_type?: 'arrival' | 'departure' | 'already_certified';
  certified?: boolean;
  user_name?: string;
  user_avatar?: string;
  event_name?: string;
  arrival_time?: string;
  departure_time?: string;
  duration?: string;
  error?: string;
  message?: string;
}

export default function ScanParticipant() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);

  const handleScan = useCallback(async (qrContent: string) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    setLastResult(null);
    
    console.log('[QR-SCAN] Raw content:', qrContent);
    
    try {
      let qrToken: string;
      
      // Check if it's a URL (from CertificationQRCode component)
      if (qrContent.includes('/verify/') && qrContent.includes('token=')) {
        try {
          const url = new URL(qrContent);
          qrToken = url.searchParams.get('token') || '';
          console.log('[QR-SCAN] Extracted token from URL:', qrToken);
        } catch {
          qrToken = qrContent;
        }
      } else {
        // Try parsing as JSON
        try {
          const parsed = JSON.parse(qrContent);
          qrToken = parsed.qr_token || parsed.token || qrContent;
          console.log('[QR-SCAN] Parsed from JSON:', qrToken);
        } catch {
          // Assume it's the raw token
          qrToken = qrContent;
          console.log('[QR-SCAN] Using raw content as token');
        }
      }
      
      if (!qrToken) {
        throw new Error('QR code invalide - token manquant');
      }
      
      const { data, error } = await supabase.functions.invoke('didit-verification', {
        body: {
          action: 'verify-qr-code',
          qr_token: qrToken,
        },
      });
      
      if (error) throw error;
      
      setLastResult(data as ScanResult);
      
      if (data.success) {
        if (data.scan_type === 'arrival') {
          toast.success(`Arrivée enregistrée pour ${data.user_name}`);
        } else if (data.scan_type === 'departure') {
          toast.success(`Certification complète pour ${data.user_name}`);
        }
      } else {
        toast.error(data.error || 'Erreur lors du scan');
      }
    } catch (err: any) {
      console.error('Scan error:', err);
      setLastResult({
        success: false,
        error: err.message || 'Erreur lors de la vérification du QR code',
      });
      toast.error('Erreur lors du scan');
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing]);

  const resetScan = () => {
    setLastResult(null);
  };

  const formatTime = (isoString: string) => {
    return format(new Date(isoString), 'HH:mm', { locale: fr });
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      
      <main className="container mx-auto px-4 py-6 max-w-lg">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Scanner QR Code</h1>
        </div>

        {lastResult ? (
          <Card className="border-0 shadow-none bg-muted/30">
            <CardContent className="pt-6">
              {lastResult.success ? (
                <div className="flex flex-col items-center text-center gap-4">
                  {lastResult.scan_type === 'arrival' ? (
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                      <UserCheck className="h-8 w-8 text-blue-600" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle2 className="h-8 w-8 text-green-600" />
                    </div>
                  )}
                  
                  <div>
                    <h2 className="text-xl font-semibold">
                      {lastResult.scan_type === 'arrival' ? 'Arrivée enregistrée' : 'Certification complète'}
                    </h2>
                    <p className="text-muted-foreground">{lastResult.event_name}</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={lastResult.user_avatar || undefined} />
                      <AvatarFallback>
                        {lastResult.user_name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-lg font-medium">{lastResult.user_name}</span>
                  </div>
                  
                  <div className="w-full space-y-2 text-sm">
                    {lastResult.arrival_time && (
                      <div className="flex items-center justify-between px-4 py-2 bg-background rounded-lg">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Arrivée
                        </span>
                        <span className="font-medium">{formatTime(lastResult.arrival_time)}</span>
                      </div>
                    )}
                    {lastResult.departure_time && (
                      <div className="flex items-center justify-between px-4 py-2 bg-background rounded-lg">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Départ
                        </span>
                        <span className="font-medium">{formatTime(lastResult.departure_time)}</span>
                      </div>
                    )}
                    {lastResult.duration && (
                      <div className="flex items-center justify-between px-4 py-2 bg-primary/10 rounded-lg">
                        <span className="text-muted-foreground">Durée</span>
                        <span className="font-semibold text-primary">{lastResult.duration}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : lastResult.scan_type === 'already_certified' ? (
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
                    <AlertCircle className="h-8 w-8 text-yellow-600" />
                  </div>
                  
                  <div>
                    <h2 className="text-xl font-semibold">Déjà certifié</h2>
                    <p className="text-muted-foreground">{lastResult.event_name}</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={lastResult.user_avatar || undefined} />
                      <AvatarFallback>
                        {lastResult.user_name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-lg font-medium">{lastResult.user_name}</span>
                  </div>
                  
                  <div className="w-full space-y-2 text-sm">
                    {lastResult.arrival_time && (
                      <div className="flex items-center justify-between px-4 py-2 bg-background rounded-lg">
                        <span className="text-muted-foreground">Arrivée</span>
                        <span className="font-medium">{formatTime(lastResult.arrival_time)}</span>
                      </div>
                    )}
                    {lastResult.departure_time && (
                      <div className="flex items-center justify-between px-4 py-2 bg-background rounded-lg">
                        <span className="text-muted-foreground">Départ</span>
                        <span className="font-medium">{formatTime(lastResult.departure_time)}</span>
                      </div>
                    )}
                    {lastResult.duration && (
                      <div className="flex items-center justify-between px-4 py-2 bg-primary/10 rounded-lg">
                        <span className="text-muted-foreground">Durée</span>
                        <span className="font-semibold text-primary">{lastResult.duration}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                    <XCircle className="h-8 w-8 text-red-600" />
                  </div>
                  
                  <div>
                    <h2 className="text-xl font-semibold text-destructive">Erreur</h2>
                    <p className="text-muted-foreground">{lastResult.error}</p>
                  </div>
                </div>
              )}
              
              <Button 
                onClick={resetScan} 
                className="w-full mt-6"
                variant={lastResult.success ? "default" : "outline"}
              >
                Scanner un autre participant
              </Button>
            </CardContent>
          </Card>
        ) : (
          <QRScanner onScan={handleScan} isProcessing={isProcessing} />
        )}
      </main>
      
      <MobileBottomNav />
    </div>
  );
}
