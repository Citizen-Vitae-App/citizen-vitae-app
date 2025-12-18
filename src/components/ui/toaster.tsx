import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import { CheckCircle2, XCircle } from "lucide-react";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        const isInscription = title?.toString().toLowerCase().includes('inscription') && 
                              !title?.toString().toLowerCase().includes('désinscription');
        const isDesinscription = title?.toString().toLowerCase().includes('désinscription');
        
        return (
          <Toast key={id} {...props}>
            <div className="flex items-center gap-3">
              {isInscription && (
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
              )}
              {isDesinscription && (
                <XCircle className="h-5 w-5 text-red-500 shrink-0" />
              )}
              {title && <ToastTitle>{title}</ToastTitle>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
