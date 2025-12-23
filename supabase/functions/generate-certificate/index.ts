import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateCertificateRequest {
  registration_id: string;
  validated_by?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: GenerateCertificateRequest = await req.json();
    const { registration_id, validated_by } = body;

    console.log(`[generate-certificate] Processing registration: ${registration_id}`);

    // Fetch registration with event, organization, and user details
    const { data: registration, error: regError } = await supabase
      .from("event_registrations")
      .select(`
        id,
        user_id,
        event_id,
        attended_at,
        status,
        certificate_id,
        events (
          id,
          name,
          start_date,
          end_date,
          location,
          organization_id,
          organizations (
            id,
            name,
            logo_url
          )
        )
      `)
      .eq("id", registration_id)
      .single();

    if (regError || !registration) {
      console.error(`[generate-certificate] Registration not found:`, regError);
      throw new Error("Registration not found");
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, date_of_birth")
      .eq("id", registration.user_id)
      .single();

    if (profileError || !profile) {
      console.error(`[generate-certificate] Profile not found:`, profileError);
      throw new Error("User profile not found");
    }

    // Get validator info if provided
    let validatorName = "Auto-certifié";
    let validatorRole = "";
    
    if (validated_by) {
      const { data: validator } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", validated_by)
        .single();

      if (validator) {
        validatorName = `${validator.first_name || ''} ${validator.last_name || ''}`.trim();
      }

      // Get validator's role in the organization
      const event = registration.events as any;
      const { data: membership } = await supabase
        .from("organization_members")
        .select("role, custom_role_title")
        .eq("user_id", validated_by)
        .eq("organization_id", event.organization_id)
        .single();

      if (membership) {
        validatorRole = membership.custom_role_title || (membership.role === 'admin' ? 'Administrateur' : 'Membre');
      }
    }

    // Update the registration with validated_by if provided
    if (validated_by) {
      await supabase
        .from("event_registrations")
        .update({ validated_by })
        .eq("id", registration_id);
    }

    const event = registration.events as any;
    const organization = event.organizations as any;

    // Format dates
    const startDate = new Date(event.start_date);
    const endDate = new Date(event.end_date);
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    };
    
    const formatTime = (date: Date) => {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDateOfBirth = (dob: string | null) => {
      if (!dob) return 'Non renseignée';
      return new Date(dob).toLocaleDateString('fr-FR');
    };

    // Build certificate data (stored as JSONB)
    const certificateData = {
      user: {
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        dateOfBirth: formatDateOfBirth(profile.date_of_birth),
      },
      event: {
        id: event.id,
        name: event.name,
        date: formatDate(startDate),
        startTime: formatTime(startDate),
        endTime: formatTime(endDate),
        location: event.location,
      },
      organization: {
        id: organization.id,
        name: organization.name,
        logoUrl: organization.logo_url,
      },
      validator: {
        name: validatorName,
        role: validatorRole,
      },
      certifiedAt: new Date().toISOString(),
      isSelfCertified: registration.status === 'self_certified' || !validated_by,
    };

    // Use existing certificate_id or generate new one
    const certificateId = registration.certificate_id;
    const certificateUrl = `/certificate/${certificateId}`;

    console.log(`[generate-certificate] Storing certificate data for ID: ${certificateId}`);

    // Update registration with certificate data and URL
    const { error: updateError } = await supabase
      .from("event_registrations")
      .update({ 
        certificate_url: certificateUrl,
        certificate_data: certificateData
      })
      .eq("id", registration_id);

    if (updateError) {
      console.error(`[generate-certificate] Update error:`, updateError);
      throw new Error(`Failed to store certificate data: ${updateError.message}`);
    }

    console.log(`[generate-certificate] Certificate data stored, URL: ${certificateUrl}`);

    // Send notification to user
    try {
      await supabase.functions.invoke("send-notification", {
        body: {
          user_id: registration.user_id,
          type: "certificate_ready",
          event_id: event.id,
          event_name: event.name,
          action_url: "/my-missions?tab=certificates",
          custom_message_fr: `🎉 Ton certificat d'action citoyenne pour "${event.name}" est disponible !`,
          custom_message_en: `🎉 Your citizen action certificate for "${event.name}" is ready!`,
        },
      });
      console.log(`[generate-certificate] Notification sent to user ${registration.user_id}`);
    } catch (notifError) {
      console.error(`[generate-certificate] Notification error:`, notifError);
      // Don't fail the whole process if notification fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        certificate_id: certificateId,
        certificate_url: certificateUrl,
        certificate_data: certificateData,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("[generate-certificate] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
