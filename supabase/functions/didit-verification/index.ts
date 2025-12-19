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

// Helper function to log with timestamps
function log(prefix: string, message: string, data?: unknown) {
  const timestamp = new Date().toISOString();
  if (data !== undefined) {
    console.log(`[${timestamp}] [${prefix}] ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`[${timestamp}] [${prefix}] ${message}`);
  }
}

function logError(prefix: string, message: string, error?: unknown) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [${prefix}] ERROR: ${message}`, error);
}

serve(async (req) => {
  const startTime = Date.now();
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const body = await req.json();
    
    log('REQUEST', 'Incoming request', { 
      action: body.action,
      webhook_type: body.webhook_type,
      session_id: body.session_id,
      user_id: body.user_id,
      has_live_selfie: !!body.live_selfie_base64
    });

    // Check if this is a webhook callback from Didit
    if (body.webhook_type === 'status.updated' || (body.session_id && !body.action)) {
      log('WEBHOOK', 'Processing webhook callback');
      
      const sessionId = body.session_id;
      const status = body.status || body.decision?.status;
      const vendorData = body.vendor_data; // This contains our user_id
      
      log('WEBHOOK', 'Webhook data', { sessionId, status, vendorData });
      
      // If verification is approved, update user profile and store reference selfie
      if (status === 'Approved' && vendorData) {
        log('WEBHOOK', `Verification approved for user: ${vendorData}`);
        
        // Fetch the session decision to get the selfie image
        try {
          log('SELFIE', 'Fetching decision data from Didit...');
          const decisionResponse = await fetch(`https://verification.didit.me/v2/session/${sessionId}/decision/`, {
            method: 'GET',
            headers: {
              'x-api-key': DIDIT_API_KEY!,
            },
          });
          
          log('SELFIE', `Decision API response status: ${decisionResponse.status}`);
          
          if (decisionResponse.ok) {
            const decisionData = await decisionResponse.json();
            
            // Log the full structure to understand the response
            log('SELFIE', 'Decision data structure', {
              root_keys: Object.keys(decisionData),
              has_face_match: !!decisionData.face_match,
              has_liveness: !!decisionData.liveness,
              has_id_verification: !!decisionData.id_verification,
              face_match_keys: decisionData.face_match ? Object.keys(decisionData.face_match) : [],
              liveness_keys: decisionData.liveness ? Object.keys(decisionData.liveness) : [],
              id_verification_keys: decisionData.id_verification ? Object.keys(decisionData.id_verification) : [],
            });
            
            // Try multiple paths to find the selfie image (Didit API v2)
            const selfieUrl = 
              decisionData.face_match?.source_image ||
              decisionData.face_match?.target_image ||
              decisionData.liveness?.image ||
              decisionData.liveness?.selfie ||
              decisionData.id_verification?.portrait_image ||
              decisionData.id_verification?.selfie ||
              decisionData.selfie?.url ||
              decisionData.source_image ||
              decisionData.image;
            
            log('SELFIE', 'Selfie URL search result', {
              found: !!selfieUrl,
              url_preview: selfieUrl ? selfieUrl.substring(0, 80) + '...' : 'not found',
              face_match_source: decisionData.face_match?.source_image?.substring(0, 50),
              liveness_image: decisionData.liveness?.image?.substring(0, 50),
              portrait_image: decisionData.id_verification?.portrait_image?.substring(0, 50),
            });
            
            // Store the reference selfie if available
            if (selfieUrl) {
              log('SELFIE', `Downloading selfie from: ${selfieUrl.substring(0, 80)}...`);
              
              // Download the selfie image
              const selfieResponse = await fetch(selfieUrl);
              log('SELFIE', `Selfie download status: ${selfieResponse.status}`);
              
              if (selfieResponse.ok) {
                const selfieBlob = await selfieResponse.blob();
                const selfieBuffer = await selfieBlob.arrayBuffer();
                log('SELFIE', `Selfie downloaded, size: ${selfieBuffer.byteLength} bytes`);
                
                // Upload to Supabase Storage
                const fileName = `${vendorData}/reference.jpg`;
                log('SELFIE', `Uploading to storage: ${fileName}`);
                
                const { error: uploadError } = await supabase.storage
                  .from('verification-selfies')
                  .upload(fileName, selfieBuffer, {
                    contentType: 'image/jpeg',
                    upsert: true,
                  });
                
                if (uploadError) {
                  logError('SELFIE', 'Upload failed', uploadError);
                } else {
                  log('SELFIE', 'Upload successful');
                  
                  // Get signed URL for private bucket
                  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                    .from('verification-selfies')
                    .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year
                  
                  if (signedUrlError) {
                    logError('SELFIE', 'Failed to create signed URL', signedUrlError);
                  } else {
                    log('SELFIE', 'Signed URL created, updating profile...');
                    
                    const { error: updateSelfieError } = await supabase
                      .from('profiles')
                      .update({ reference_selfie_url: signedUrlData?.signedUrl })
                      .eq('id', vendorData);
                    
                    if (updateSelfieError) {
                      logError('SELFIE', 'Failed to update profile with selfie URL', updateSelfieError);
                    } else {
                      log('SELFIE', `Reference selfie stored successfully for user: ${vendorData}`);
                    }
                  }
                }
              } else {
                logError('SELFIE', `Failed to download selfie, status: ${selfieResponse.status}`);
              }
            } else {
              log('SELFIE', 'No selfie URL found in any expected path of decision data');
            }
          } else {
            const errorText = await decisionResponse.text();
            logError('SELFIE', `Decision API error: ${decisionResponse.status}`, errorText);
          }
        } catch (selfieError) {
          logError('SELFIE', 'Exception during selfie processing', selfieError);
          // Continue even if selfie storage fails
        }
        
        log('WEBHOOK', 'Updating id_verified to true...');
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ id_verified: true })
          .eq('id', vendorData);
        
        if (updateError) {
          logError('WEBHOOK', 'Failed to update profile', updateError);
          return new Response(
            JSON.stringify({ success: false, error: updateError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        log('WEBHOOK', `User verified successfully in ${Date.now() - startTime}ms`);
        return new Response(
          JSON.stringify({ success: true, message: 'User verified successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Handle other statuses
      log('WEBHOOK', `Webhook processed with status: ${status}`);
      return new Response(
        JSON.stringify({ success: true, message: `Webhook processed, status: ${status}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle Face Match verification
    if (body.action === 'face-match') {
      const { user_id, event_id, registration_id, live_selfie_base64 } = body;
      
      if (!user_id || !event_id || !registration_id || !live_selfie_base64) {
        logError('FACE-MATCH', 'Missing required parameters', { user_id: !!user_id, event_id: !!event_id, registration_id: !!registration_id, has_selfie: !!live_selfie_base64 });
        return new Response(
          JSON.stringify({ success: false, error: 'Missing required parameters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      log('FACE-MATCH', `Starting face match for user: ${user_id}, event: ${event_id}`);
      
      // Fetch the reference selfie URL from profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('reference_selfie_url, id_verified')
        .eq('id', user_id)
        .single();
      
      log('FACE-MATCH', 'Profile state', { 
        id_verified: profile?.id_verified, 
        has_reference_selfie: !!profile?.reference_selfie_url 
      });
      
      if (profileError || !profile?.reference_selfie_url) {
        logError('FACE-MATCH', 'No reference selfie found', profileError);
        return new Response(
          JSON.stringify({ success: false, error: 'Aucune photo de référence trouvée. Veuillez compléter la vérification d\'identité.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Download reference selfie from storage
      log('FACE-MATCH', 'Downloading reference selfie...');
      const refSelfieResponse = await fetch(profile.reference_selfie_url);
      if (!refSelfieResponse.ok) {
        logError('FACE-MATCH', `Failed to download reference selfie, status: ${refSelfieResponse.status}`);
        return new Response(
          JSON.stringify({ success: false, error: 'Impossible de récupérer la photo de référence.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const refSelfieBlob = await refSelfieResponse.blob();
      log('FACE-MATCH', `Reference selfie downloaded, size: ${refSelfieBlob.size} bytes`);
      
      // Convert base64 live selfie to blob
      const base64Data = live_selfie_base64.replace(/^data:image\/\w+;base64,/, '');
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const liveSelfieBlob = new Blob([bytes], { type: 'image/jpeg' });
      log('FACE-MATCH', `Live selfie prepared, size: ${liveSelfieBlob.size} bytes`);
      
      // Call Didit Face Match API
      const formData = new FormData();
      formData.append('user_image', liveSelfieBlob, 'live_selfie.jpg');
      formData.append('ref_image', refSelfieBlob, 'reference.jpg');
      
      log('FACE-MATCH', 'Calling Didit Face Match API...');
      
      const faceMatchResponse = await fetch('https://verification.didit.me/v2/face-match/', {
        method: 'POST',
        headers: {
          'x-api-key': DIDIT_API_KEY!,
        },
        body: formData,
      });
      
      log('FACE-MATCH', `API response status: ${faceMatchResponse.status}`);
      
      if (!faceMatchResponse.ok) {
        const errorText = await faceMatchResponse.text();
        logError('FACE-MATCH', `API error: ${faceMatchResponse.status}`, errorText);
        return new Response(
          JSON.stringify({ success: false, error: 'Erreur lors de la vérification faciale.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const faceMatchResult = await faceMatchResponse.json();
      log('FACE-MATCH', 'Face match result', faceMatchResult);
      
      const score = faceMatchResult.score || faceMatchResult.similarity || 0;
      const passed = score >= 0.75;
      
      log('FACE-MATCH', `Score: ${score}, Passed: ${passed}`);
      
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
          logError('FACE-MATCH', 'Failed to update registration', updateError);
          return new Response(
            JSON.stringify({ success: false, error: 'Erreur lors de la mise à jour.' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        log('FACE-MATCH', `Face match passed, QR token generated in ${Date.now() - startTime}ms`);
        
        return new Response(
          JSON.stringify({ success: true, passed: true, score, qr_token: qrToken }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        log('FACE-MATCH', `Face match failed with score: ${score}`);
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
        logError('QR-VERIFY', 'Missing QR token');
        return new Response(
          JSON.stringify({ success: false, error: 'Missing QR token' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      log('QR-VERIFY', `Verifying QR code: ${qr_token.substring(0, 8)}...`);
      
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
        logError('QR-VERIFY', 'Invalid QR code', regError);
        return new Response(
          JSON.stringify({ success: false, error: 'QR code invalide ou expiré.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (!registration.face_match_passed) {
        logError('QR-VERIFY', 'Face match not validated for this registration');
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
      
      log('QR-VERIFY', `Processing scan for: ${userName}`, {
        has_arrival: !!registration.certification_start_at,
        has_departure: !!registration.certification_end_at
      });
      
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
          logError('QR-VERIFY', 'Failed to record arrival', updateError);
          return new Response(
            JSON.stringify({ success: false, error: 'Erreur lors de l\'enregistrement.' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        log('QR-VERIFY', `Arrival recorded for: ${userName} in ${Date.now() - startTime}ms`);
        
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
          logError('QR-VERIFY', 'Failed to record departure', updateError);
          return new Response(
            JSON.stringify({ success: false, error: 'Erreur lors de l\'enregistrement.' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        log('QR-VERIFY', `Certification complete for: ${userName}, Duration: ${durationFormatted}, Time: ${Date.now() - startTime}ms`);
        
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
        
        log('QR-VERIFY', `User already certified: ${userName}`);
        
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
        logError('SESSION', 'Missing user_id');
        return new Response(
          JSON.stringify({ success: false, error: 'user_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      log('SESSION', `Creating Didit session for user: ${user_id}`);
      
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
      
      log('SESSION', `Didit API response status: ${diditResponse.status}`);
      
      if (!diditResponse.ok) {
        const errorText = await diditResponse.text();
        logError('SESSION', 'Didit API error', errorText);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create verification session', details: errorText }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const sessionData = await diditResponse.json();
      log('SESSION', `Session created successfully in ${Date.now() - startTime}ms`, { 
        session_id: sessionData.session_id,
        has_url: !!sessionData.url
      });
      
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
      const { session_id, user_id } = body;
      
      if (!session_id) {
        logError('CHECK-STATUS', 'Missing session_id');
        return new Response(
          JSON.stringify({ success: false, error: 'session_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      log('CHECK-STATUS', `Checking session status: ${session_id}, user: ${user_id || 'not provided'}`);
      
      const statusResponse = await fetch(`https://verification.didit.me/v2/session/${session_id}/decision/`, {
        method: 'GET',
        headers: {
          'x-api-key': DIDIT_API_KEY!,
        },
      });
      
      log('CHECK-STATUS', `Didit API response status: ${statusResponse.status}`);
      
      // Handle session not found (deleted from Didit)
      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        logError('CHECK-STATUS', `Status check failed: ${statusResponse.status}`, errorText);
        
        // If 404 = session deleted from Didit
        if (statusResponse.status === 404 && user_id) {
          log('CHECK-STATUS', 'Session not found in Didit (possibly deleted), checking profile state...');
          
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id_verified, reference_selfie_url')
            .eq('id', user_id)
            .single();
          
          if (profileError) {
            logError('CHECK-STATUS', 'Failed to fetch profile', profileError);
          } else {
            log('CHECK-STATUS', 'Profile state', {
              id_verified: profile?.id_verified,
              has_reference_selfie: !!profile?.reference_selfie_url
            });
            
            // User is marked verified but has no selfie = needs to reverify
            if (profile?.id_verified && !profile?.reference_selfie_url) {
              log('CHECK-STATUS', 'User verified but missing selfie - needs reverification');
              return new Response(
                JSON.stringify({ 
                  success: false, 
                  status: 'session_expired',
                  needs_reverification: true,
                  message: 'Session expirée. Le selfie de référence est manquant, veuillez refaire la vérification.'
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          }
        }
        
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to check session status', details: errorText }),
          { status: statusResponse.status === 404 ? 404 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const statusData = await statusResponse.json();
      log('CHECK-STATUS', 'Session status received', {
        status: statusData.status,
        has_selfie_url: !!statusData.selfie?.url,
        has_source_image: !!statusData.source_image
      });
      
      // If approved and user_id provided, update profile (fallback if webhook missed)
      if (statusData.status === 'Approved' && user_id) {
        log('CHECK-STATUS', `Status is Approved, checking profile for user: ${user_id}`);
        
        // Check current profile state
        const { data: existingProfile, error: profileFetchError } = await supabase
          .from('profiles')
          .select('id_verified, reference_selfie_url')
          .eq('id', user_id)
          .single();
        
        if (profileFetchError) {
          logError('CHECK-STATUS', 'Failed to fetch profile', profileFetchError);
        } else {
          log('CHECK-STATUS', 'Current profile state', {
            id_verified: existingProfile?.id_verified,
            has_reference_selfie: !!existingProfile?.reference_selfie_url
          });
          
          // Store selfie if missing (even if already verified)
          if (!existingProfile?.reference_selfie_url) {
            log('SELFIE', 'No reference selfie found, attempting to retrieve and store...');
            log('SELFIE', 'Available in Didit response', {
              selfie_url: statusData.selfie?.url?.substring(0, 50) + '...',
              source_image: statusData.source_image?.substring(0, 50) + '...'
            });
            
            if (statusData.selfie?.url || statusData.source_image) {
              const selfieUrl = statusData.selfie?.url || statusData.source_image;
              
              try {
                log('SELFIE', `Downloading selfie from: ${selfieUrl.substring(0, 50)}...`);
                const selfieResponse = await fetch(selfieUrl);
                log('SELFIE', `Download response status: ${selfieResponse.status}`);
                
                if (selfieResponse.ok) {
                  const selfieBlob = await selfieResponse.blob();
                  const selfieBuffer = await selfieBlob.arrayBuffer();
                  log('SELFIE', `Selfie downloaded, size: ${selfieBuffer.byteLength} bytes`);
                  
                  const fileName = `${user_id}/reference.jpg`;
                  log('SELFIE', `Uploading to storage: ${fileName}`);
                  
                  const { error: uploadError } = await supabase.storage
                    .from('verification-selfies')
                    .upload(fileName, selfieBuffer, {
                      contentType: 'image/jpeg',
                      upsert: true,
                    });
                  
                  if (!uploadError) {
                    log('SELFIE', 'Upload successful, creating signed URL...');
                    
                    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                      .from('verification-selfies')
                      .createSignedUrl(fileName, 60 * 60 * 24 * 365);
                    
                    if (signedUrlError) {
                      logError('SELFIE', 'Failed to create signed URL', signedUrlError);
                    } else {
                      const { error: updateSelfieError } = await supabase
                        .from('profiles')
                        .update({ reference_selfie_url: signedUrlData?.signedUrl })
                        .eq('id', user_id);
                      
                      if (updateSelfieError) {
                        logError('SELFIE', 'Failed to update profile', updateSelfieError);
                      } else {
                        log('SELFIE', `Reference selfie stored successfully for user: ${user_id}`);
                      }
                    }
                  } else {
                    logError('SELFIE', 'Upload failed', uploadError);
                  }
                } else {
                  logError('SELFIE', `Failed to download selfie from Didit: ${selfieResponse.status}`);
                }
              } catch (selfieError) {
                logError('SELFIE', 'Exception during selfie processing', selfieError);
              }
            } else {
              log('SELFIE', 'No selfie URL available in Didit response');
            }
          }
          
          // Update id_verified if not already set
          if (!existingProfile?.id_verified) {
            log('CHECK-STATUS', 'Updating id_verified to true...');
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ id_verified: true })
              .eq('id', user_id);
            
            if (updateError) {
              logError('CHECK-STATUS', 'Failed to update id_verified', updateError);
            } else {
              log('CHECK-STATUS', `Profile updated via check-status for user: ${user_id}`);
            }
          }
        }
      }
      
      log('CHECK-STATUS', `Completed in ${Date.now() - startTime}ms`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          status: statusData.status, 
          verified: statusData.status === 'Approved',
          data: statusData 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logError('REQUEST', 'Invalid action received', body.action);
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: unknown) {
    logError('REQUEST', 'Unhandled exception', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
