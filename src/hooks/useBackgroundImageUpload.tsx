import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseBackgroundImageUploadOptions {
  bucket: string;
  organizationId: string | null;
}

interface UseBackgroundImageUploadReturn {
  previewUrl: string | null;
  uploadedUrl: string | null;
  isUploading: boolean;
  uploadError: string | null;
  handleFileSelect: (file: File) => void;
  reset: () => void;
  waitForUpload: () => Promise<string | null>;
}

export function useBackgroundImageUpload({
  bucket,
  organizationId,
}: UseBackgroundImageUploadOptions): UseBackgroundImageUploadReturn {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const uploadPromiseRef = useRef<Promise<string | null> | null>(null);
  const currentFileRef = useRef<File | null>(null);

  const uploadToStorage = useCallback(async (file: File, orgId: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${orgId}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);
    
    return publicUrl;
  }, [bucket]);

  const handleFileSelect = useCallback((file: File) => {
    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Format non supporté. Veuillez utiliser un fichier PNG ou JPEG.');
      return;
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB in bytes
    if (file.size > maxSize) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      toast.error(`L'image est trop volumineuse (${fileSizeMB} Mo). La taille maximale autorisée est de 2 Mo. Veuillez compresser ou choisir une autre image.`);
      return;
    }

    // Reset previous state
    setUploadError(null);
    setUploadedUrl(null);
    currentFileRef.current = file;

    // Create immediate preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Start background upload if organizationId is available
    if (organizationId) {
      setIsUploading(true);
      
      const uploadPromise = uploadToStorage(file, organizationId)
        .then((url) => {
          // Only update if this is still the current file
          if (currentFileRef.current === file) {
            setUploadedUrl(url);
            setIsUploading(false);
          }
          return url;
        })
        .catch((error) => {
          if (currentFileRef.current === file) {
            // Check if error is related to file size
            if (error.message?.toLowerCase().includes('size') || 
                error.message?.toLowerCase().includes('too large') ||
                error.statusCode === '413') {
              const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
              setUploadError(`L'image est trop volumineuse (${fileSizeMB} Mo). La taille maximale autorisée est de 2 Mo.`);
              toast.error(`L'image est trop volumineuse (${fileSizeMB} Mo). La taille maximale autorisée est de 2 Mo. Veuillez compresser ou choisir une autre image.`);
            } else {
              setUploadError("Erreur lors de l'upload de l'image");
              toast.error("Erreur lors de l'upload de l'image. Veuillez réessayer.");
            }
            setIsUploading(false);
          }
          console.error('Background upload failed:', error);
          return null;
        });
      
      uploadPromiseRef.current = uploadPromise;
    }
  }, [organizationId, uploadToStorage]);

  // When organizationId becomes available and we have a pending file, start upload
  useEffect(() => {
    if (organizationId && currentFileRef.current && !uploadedUrl && !isUploading && previewUrl) {
      const file = currentFileRef.current;
      setIsUploading(true);
      
      const uploadPromise = uploadToStorage(file, organizationId)
        .then((url) => {
          if (currentFileRef.current === file) {
            setUploadedUrl(url);
            setIsUploading(false);
          }
          return url;
        })
        .catch((error) => {
          if (currentFileRef.current === file) {
            // Check if error is related to file size
            if (error.message?.toLowerCase().includes('size') || 
                error.message?.toLowerCase().includes('too large') ||
                error.statusCode === '413') {
              const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
              setUploadError(`L'image est trop volumineuse (${fileSizeMB} Mo). La taille maximale autorisée est de 2 Mo.`);
              toast.error(`L'image est trop volumineuse (${fileSizeMB} Mo). La taille maximale autorisée est de 2 Mo. Veuillez compresser ou choisir une autre image.`);
            } else {
              setUploadError("Erreur lors de l'upload de l'image");
              toast.error("Erreur lors de l'upload de l'image. Veuillez réessayer.");
            }
            setIsUploading(false);
          }
          console.error('Background upload failed:', error);
          return null;
        });
      
      uploadPromiseRef.current = uploadPromise;
    }
  }, [organizationId, uploadedUrl, isUploading, previewUrl, uploadToStorage]);

  const waitForUpload = useCallback(async (): Promise<string | null> => {
    if (uploadedUrl) {
      return uploadedUrl;
    }
    if (uploadPromiseRef.current) {
      return uploadPromiseRef.current;
    }
    return null;
  }, [uploadedUrl]);

  const reset = useCallback(() => {
    setPreviewUrl(null);
    setUploadedUrl(null);
    setIsUploading(false);
    setUploadError(null);
    currentFileRef.current = null;
    uploadPromiseRef.current = null;
  }, []);

  return {
    previewUrl,
    uploadedUrl,
    isUploading,
    uploadError,
    handleFileSelect,
    reset,
    waitForUpload,
  };
}
