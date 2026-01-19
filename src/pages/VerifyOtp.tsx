import { KeyRound, ArrowLeft } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { getSafeRedirect } from "@/lib/redirectValidation";

const VerifyOtp = () => {
  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const { verifyOtp, signInWithOtp, user, getDefaultRoute, needsOnboarding, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  const redirect = searchParams.get('redirect');
  const hasAutoSubmittedRef = useRef(false); // Pour éviter les soumissions multiples

 useEffect(() => {
    if (!email) {
      navigate('/auth');
      return;
    }
  }, [email, navigate]); 

  useEffect(() => {
    if (user && !authLoading) {
      // Validate redirect to prevent open redirect attacks
      const safeRedirect = getSafeRedirect(redirect);
      if (safeRedirect !== '/') {
        console.log('Redirecting to validated URL:', safeRedirect);
        navigate(safeRedirect);
      } else if (needsOnboarding) {
        navigate('/onboarding');
      } else {
        navigate(getDefaultRoute());
      }
    }
  }, [user, authLoading, needsOnboarding, navigate, getDefaultRoute, redirect]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleVerify = useCallback(async () => {
    if (otp.length !== 6) {
      toast.error('Veuillez entrer le code à 6 chiffres');
      return;
    }

    setIsSubmitting(true);
    console.log('Attempting to verify OTP for email:', email);
    const { error } = await verifyOtp(email!, otp);
    
    if (error) {
      console.error('OTP verification failed:', error);
      toast.error(`Code invalide: ${error.message}`);
      setOtp(''); // Clear OTP on error
      setIsSubmitting(false);
    } else {
      console.log('OTP verification succeeded');
      // La redirection sera gérée par le useEffect ci-dessus
      hasAutoSubmittedRef.current = false; // Reset pour permettre une nouvelle tentative si nécessaire
    }
  }, [otp, email, verifyOtp]);

  // Auto-submit when 6 digits are entered
  // TEMPORAIREMENT DÉSACTIVÉ pour déboguer le problème de token invalide
  // Le problème pourrait venir d'un déclenchement trop rapide ou multiple
  // VERSION AMÉLIORÉE (à activer après test) :
  // useEffect(() => {
  //   if (otp.length === 6 && !isSubmitting && !hasAutoSubmittedRef.current) {
  //     hasAutoSubmittedRef.current = true; // Marquer comme soumis pour éviter les doublons
  //     // Petit délai pour s'assurer que le state est stable
  //     const timeoutId = setTimeout(() => {
  //       handleVerify();
  //     }, 100);
  //     return () => clearTimeout(timeoutId);
  //   } else if (otp.length < 6) {
  //     // Reset si l'utilisateur efface des caractères
  //     hasAutoSubmittedRef.current = false;
  //   }
  // }, [otp, isSubmitting, handleVerify]);

  const handleResend = async () => {
    if (!canResend) return;

    setIsSubmitting(true);
    const { error } = await signInWithOtp(email!);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Nouveau code envoyé');
      setCountdown(60);
      setCanResend(false);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen relative">
      {/* Gradient Background - Circular Orb */}
      <div 
        className="absolute top-0 left-0 right-0 bottom-0 -z-10 bg-background"
      >
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] opacity-50 blur-3xl"
          style={{
            background: `radial-gradient(circle, 
              hsl(350, 100%, 88%) 0%,
              hsl(25, 100%, 90%) 35%,
              hsl(35, 80%, 92%) 60%,
              transparent 80%
            )`
          }}
        />
      </div>

      {/* Centered Card */}
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-background rounded-2xl shadow-lg p-8">
          {/* Icon - Left Aligned */}
          <div className="mb-6">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <KeyRound className="w-6 h-6 text-muted-foreground" />
            </div>
          </div>

          {/* Title - Left Aligned */}
          <h1 className="text-2xl font-bold mb-2">
            Vérifiez votre email
          </h1>
          <p className="text-muted-foreground mb-8">
            Nous avons envoyé un code de vérification à<br />
            <span className="font-medium text-foreground">{email}</span>
          </p>

          {/* OTP Input */}
          <div className="space-y-4 mb-6">
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={setOtp}
              disabled={isSubmitting}
              containerClassName="w-full"
            >
              <InputOTPGroup className="flex-1 gap-2">
                <InputOTPSlot index={0} className="flex-1 h-14 text-lg" />
                <InputOTPSlot index={1} className="flex-1 h-14 text-lg" />
                <InputOTPSlot index={2} className="flex-1 h-14 text-lg" />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup className="flex-1 gap-2">
                <InputOTPSlot index={3} className="flex-1 h-14 text-lg" />
                <InputOTPSlot index={4} className="flex-1 h-14 text-lg" />
                <InputOTPSlot index={5} className="flex-1 h-14 text-lg" />
              </InputOTPGroup>
            </InputOTP>

            <Button 
              className="w-full" 
              size="lg"
              onClick={handleVerify}
              disabled={isSubmitting || otp.length !== 6}
            >
              {isSubmitting ? 'Vérification...' : 'Vérifier'}
            </Button>
          </div>

          {/* Resend Code */}
          <div className="text-center mb-4">
            <Button
              variant="ghost"
              onClick={handleResend}
              disabled={!canResend || isSubmitting}
              className="text-muted-foreground hover:text-foreground"
            >
              {canResend ? 'Renvoyer le code' : `Renvoyer le code (${countdown}s)`}
            </Button>
          </div>

          {/* Change Email */}
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => navigate('/auth')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Utiliser un autre email
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyOtp;