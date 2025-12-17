import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DIDIT_API_KEY = Deno.env.get('DIDIT_API_KEY');
const DIDIT_SECRET_KEY = Deno.env.get('DIDIT_SECRET_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const body = await req.json();
    
    console.log('[didit-verification] Request received:', JSON.stringify(body, null, 2));

    // Check if this is a webhook callback from Didit
    if (body.webhook_type === 'status.updated' || body.session_id) {
      console.log('[didit-verification] Processing webhook callback');
      
      const sessionId = body.session_id;
      const status = body.status || body.decision?.status;
      const vendorData = body.vendor_data; // This contains our user_id
      
      console.log('[didit-verification] Session:', sessionId, 'Status:', status, 'User:', vendorData);
      
      // If verification is approved, update user profile
      if (status === 'Approved' && vendorData) {
        console.log('[didit-verification] Updating user id_verified to true for:', vendorData);
        
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
          workflow_id: workflow_id || 'default', // Use workflow_id from request or default
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
