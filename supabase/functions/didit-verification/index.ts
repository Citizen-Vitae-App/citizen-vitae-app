import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DIDIT_API_KEY = Deno.env.get('DIDIT_API_KEY');
const DIDIT_SECRET_KEY = Deno.env.get('DIDIT_SECRET_KEY');
const DIDIT_WORKFLOW_ID = Deno.env.get('DIDIT_WORKFLOW_ID');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Generate a secure QR token
function generateQrToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const body = await req.json();
    
    console.log('[didit-verification] Request received:', JSON.stringify({ ...body, live_selfie_base64: body.live_selfie_base64 ? '[BASE64_REDACTED]' : undefined }, null, 2));

    // Check if this is a webhook callback from Didit
    if (body.webhook_type === 'status.updated' || (body.session_id && !body.action)) {
      console.log('[didit-verification] Processing webhook callback');
      
      const sessionId = body.session_id;
      const status = body.status || body.decision?.status;
      const vendorData = body.vendor_data; // This contains our user_id
      
      console.log('[didit-verification] Session:', sessionId, 'Status:', status, 'User:', vendorData);
      
      // If verification is approved, update user profile and store reference selfie
      if (status === 'Approved' && vendorData) {
        console.log('[didit-verification] Updating user id_verified to true for:', vendorData);
        
        // Fetch the session decision to get the selfie image
        try {
          const decisionResponse = await fetch(`https://verification.didit.me/v2/session/${sessionId}/decision/`, {
            method: 'GET',
            headers: {
              'x-api-key': DIDIT_API_KEY!,
            },
          });
          
          if (decisionResponse.ok) {
            const decisionData = await decisionResponse.json();
            console.log('[didit-verification] Decision data received');
            
            // Store the reference selfie if available
            if (decisionData.selfie?.url || decisionData.source_image) {
              const selfieUrl = decisionData.selfie?.url || decisionData.source_image;
              
              // Download the selfie image
              const selfieResponse = await fetch(selfieUrl);
              if (selfieResponse.ok) {
                const selfieBlob = await selfieResponse.blob();
                const selfieBuffer = await selfieBlob.arrayBuffer();
                
                // Upload to Supabase Storage
                const fileName = `${vendorData}/reference.jpg`;
                const { error: uploadError } = await supabase.storage
                  .from('verification-selfies')
                  .upload(fileName, selfieBuffer, {
                    contentType: 'image/jpeg',
                    upsert: true,
                  });
                
                if (uploadError) {
                  console.error('[didit-verification] Error uploading selfie:', uploadError);
                } else {
                  // Get the URL and update profile
                  const { data: { publicUrl } } = supabase.storage
                    .from('verification-selfies')
                    .getPublicUrl(fileName);
                  
                  // Store signed URL instead for private bucket
                  const { data: signedUrlData } = await supabase.storage
                    .from('verification-selfies')
                    .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year
                  
                  await supabase
                    .from('profiles')
                    .update({ reference_selfie_url: signedUrlData?.signedUrl || publicUrl })
                    .eq('id', vendorData);
                  
                  console.log('[didit-verification] Reference selfie stored for user:', vendorData);
                }
              }
            }
          }
        } catch (selfieError) {
          console.error('[didit-verification] Error fetching/storing selfie:', selfieError);
          // Continue even if selfie storage fails
        }
        
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ id_verified: true })
          .eq('id', vendorData);
        
        if (updateError) {
          console.error('[didit-verification] Error updating profile:', updateError);
          return new Response(
            JSON.stringify({ success: false, error: updateError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        console.log('[didit-verification] User verified successfully');
        return new Response(
          JSON.stringify({ success: true, message: 'User verified successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Handle other statuses
      return new Response(
        JSON.stringify({ success: true, message: `Webhook processed, status: ${status}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle Face Match verification
    if (body.action === 'face-match') {
      const { user_id, event_id, registration_id, live_selfie_base64 } = body;
      
      if (!user_id || !event_id || !registration_id || !live_selfie_base64) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing required parameters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('[didit-verification] Starting Face Match for user:', user_id);
      
      // Fetch the reference selfie URL from profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('reference_selfie_url')
        .eq('id', user_id)
        .single();
      
      if (profileError || !profile?.reference_selfie_url) {
        console.error('[didit-verification] No reference selfie found:', profileError);
        return new Response(
          JSON.stringify({ success: false, error: 'Aucune photo de référence trouvée. Veuillez compléter la vérification d\'identité.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Download reference selfie from storage
      const refSelfieResponse = await fetch(profile.reference_selfie_url);
      if (!refSelfieResponse.ok) {
        console.error('[didit-verification] Failed to download reference selfie');
        return new Response(
          JSON.stringify({ success: false, error: 'Impossible de récupérer la photo de référence.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const refSelfieBlob = await refSelfieResponse.blob();
      
      // Convert base64 live selfie to blob
      const base64Data = live_selfie_base64.replace(/^data:image\/\w+;base64,/, '');
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const liveSelfieBlob = new Blob([bytes], { type: 'image/jpeg' });
      
      // Call Didit Face Match API
      const formData = new FormData();
      formData.append('user_image', liveSelfieBlob, 'live_selfie.jpg');
      formData.append('ref_image', refSelfieBlob, 'reference.jpg');
      
      console.log('[didit-verification] Calling Didit Face Match API...');
      
      const faceMatchResponse = await fetch('https://verification.didit.me/v2/face-match/', {
        method: 'POST',
        headers: {
          'x-api-key': DIDIT_API_KEY!,
        },
        body: formData,
      });
      
      if (!faceMatchResponse.ok) {
        const errorText = await faceMatchResponse.text();
        console.error('[didit-verification] Face Match API error:', faceMatchResponse.status, errorText);
        return new Response(
          JSON.stringify({ success: false, error: 'Erreur lors de la vérification faciale.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const faceMatchResult = await faceMatchResponse.json();
      console.log('[didit-verification] Face Match result:', faceMatchResult);
      
      const score = faceMatchResult.score || faceMatchResult.similarity || 0;
      const passed = score >= 0.75;
      
      if (passed) {
        // Generate QR token
        const qrToken = generateQrToken();
        
        // Update registration with face match results
        const { error: updateError } = await supabase
          .from('event_registrations')
          .update({
            face_match_passed: true,
            face_match_at: new Date().toISOString(),
            qr_token: qrToken,
          })
          .eq('id', registration_id)
          .eq('user_id', user_id);
        
        if (updateError) {
          console.error('[didit-verification] Error updating registration:', updateError);
          return new Response(
            JSON.stringify({ success: false, error: 'Erreur lors de la mise à jour.' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        console.log('[didit-verification] Face Match passed, QR token generated');
        
        return new Response(
          JSON.stringify({ success: true, passed: true, score, qr_token: qrToken }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        console.log('[didit-verification] Face Match failed, score:', score);
        return new Response(
          JSON.stringify({ success: true, passed: false, score }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Handle QR code verification (for admin scan - two-scan system)
    if (body.action === 'verify-qr-code') {
      const { qr_token } = body;
      
      if (!qr_token) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing QR token' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('[didit-verification] Verifying QR code:', qr_token.substring(0, 8) + '...');
      
      // Fetch registration by QR token with user profile and event info
      const { data: registration, error: regError } = await supabase
        .from('event_registrations')
        .select(`
          *,
          events(id, name, start_date, end_date),
          profiles:user_id(first_name, last_name, email, avatar_url)
        `)
        .eq('qr_token', qr_token)
        .single();
      
      if (regError || !registration) {
        console.error('[didit-verification] Invalid QR code:', regError);
        return new Response(
          JSON.stringify({ success: false, error: 'QR code invalide ou expiré.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (!registration.face_match_passed) {
        return new Response(
          JSON.stringify({ success: false, error: 'Face Match non validé.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const profile = registration.profiles as any;
      const event = registration.events as any;
      const userName = profile?.first_name && profile?.last_name 
        ? `${profile.first_name} ${profile.last_name}` 
        : profile?.email || 'Participant';
      
      // Two-scan logic
      if (!registration.certification_start_at) {
        // FIRST SCAN - Arrival
        const { error: updateError } = await supabase
          .from('event_registrations')
          .update({ 
            certification_start_at: new Date().toISOString(),
          })
          .eq('id', registration.id);
        
        if (updateError) {
          console.error('[didit-verification] Error recording arrival:', updateError);
          return new Response(
            JSON.stringify({ success: false, error: 'Erreur lors de l\'enregistrement.' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        console.log('[didit-verification] Arrival recorded for:', userName);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            scan_type: 'arrival',
            user_name: userName,
            user_avatar: profile?.avatar_url,
            event_name: event?.name,
            arrival_time: new Date().toISOString(),
            message: `Arrivée enregistrée pour ${userName}`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } 
      else if (!registration.certification_end_at) {
        // SECOND SCAN - Departure
        const departureTime = new Date();
        const arrivalTime = new Date(registration.certification_start_at);
        const durationMs = departureTime.getTime() - arrivalTime.getTime();
        const durationMinutes = Math.round(durationMs / 60000);
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;
        const durationFormatted = hours > 0 ? `${hours}h${minutes.toString().padStart(2, '0')}` : `${minutes}min`;
        
        const { error: updateError } = await supabase
          .from('event_registrations')
          .update({ 
            certification_end_at: departureTime.toISOString(),
            attended_at: departureTime.toISOString(), // Mark as officially attended
          })
          .eq('id', registration.id);
        
        if (updateError) {
          console.error('[didit-verification] Error recording departure:', updateError);
          return new Response(
            JSON.stringify({ success: false, error: 'Erreur lors de l\'enregistrement.' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        console.log('[didit-verification] Certification complete for:', userName, 'Duration:', durationFormatted);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            scan_type: 'departure',
            certified: true,
            user_name: userName,
            user_avatar: profile?.avatar_url,
            event_name: event?.name,
            arrival_time: registration.certification_start_at,
            departure_time: departureTime.toISOString(),
            duration: durationFormatted,
            message: `Certification complète pour ${userName}`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      else {
        // Already fully certified
        const arrivalTime = new Date(registration.certification_start_at);
        const departureTime = new Date(registration.certification_end_at);
        const durationMs = departureTime.getTime() - arrivalTime.getTime();
        const durationMinutes = Math.round(durationMs / 60000);
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;
        const durationFormatted = hours > 0 ? `${hours}h${minutes.toString().padStart(2, '0')}` : `${minutes}min`;
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Participant déjà certifié.',
            scan_type: 'already_certified',
            user_name: userName,
            user_avatar: profile?.avatar_url,
            event_name: event?.name,
            arrival_time: registration.certification_start_at,
            departure_time: registration.certification_end_at,
            duration: durationFormatted,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Handle session creation request from frontend
    if (body.action === 'create-session') {
      const { user_id, callback_url, workflow_id } = body;
      
      if (!user_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'user_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('[didit-verification] Creating Didit session for user:', user_id);
      
      // Create a verification session with Didit
      const diditResponse = await fetch('https://verification.didit.me/v2/session/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': DIDIT_API_KEY!,
        },
        body: JSON.stringify({
          workflow_id: workflow_id || DIDIT_WORKFLOW_ID, // Use workflow_id from request or env secret
          vendor_data: user_id, // Store user_id to identify user in webhook
          callback: callback_url || `${req.headers.get('origin')}/settings`,
        }),
      });
      
      if (!diditResponse.ok) {
        const errorText = await diditResponse.text();
        console.error('[didit-verification] Didit API error:', errorText);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create verification session', details: errorText }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const sessionData = await diditResponse.json();
      console.log('[didit-verification] Session created:', sessionData);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          session_id: sessionData.session_id,
          verification_url: sessionData.url 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle manual verification check
    if (body.action === 'check-status') {
      const { session_id } = body;
      
      if (!session_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'session_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('[didit-verification] Checking session status:', session_id);
      
      const statusResponse = await fetch(`https://verification.didit.me/v2/session/${session_id}/decision/`, {
        method: 'GET',
        headers: {
          'x-api-key': DIDIT_API_KEY!,
        },
      });
      
      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        console.error('[didit-verification] Status check error:', errorText);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to check session status' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const statusData = await statusResponse.json();
      console.log('[didit-verification] Session status:', statusData);
      
      return new Response(
        JSON.stringify({ success: true, status: statusData.status, data: statusData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: unknown) {
    console.error('[didit-verification] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
