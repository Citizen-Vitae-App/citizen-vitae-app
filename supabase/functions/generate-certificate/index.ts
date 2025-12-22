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

    // Build certificate data
    const certificateData = {
      user: {
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        dateOfBirth: formatDateOfBirth(profile.date_of_birth),
      },
      event: {
        name: event.name,
        date: formatDate(startDate),
        startTime: formatTime(startDate),
        endTime: formatTime(endDate),
        location: event.location,
      },
      organization: {
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

    // Generate a simple HTML certificate
    const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Certificat d'Engagement Citoyen</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Georgia', serif; 
      background: #f5f5f5; 
      padding: 20px; 
    }
    .certificate { 
      max-width: 800px; 
      margin: 0 auto; 
      background: white; 
      padding: 50px; 
      border: 3px solid #012573;
      position: relative;
    }
    .header { 
      text-align: center; 
      margin-bottom: 40px; 
    }
    .badge {
      display: inline-block;
      padding: 8px 24px;
      background: ${certificateData.isSelfCertified ? '#059669' : '#012573'};
      color: white;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      border-radius: 4px;
      margin-bottom: 20px;
    }
    .title { 
      font-size: 28px; 
      color: #012573; 
      margin-bottom: 10px;
      font-weight: bold;
    }
    .subtitle { 
      font-size: 14px; 
      color: #666;
      font-style: italic;
    }
    .participant-name { 
      font-size: 36px; 
      color: #012573; 
      text-align: center;
      margin: 30px 0;
      font-weight: bold;
    }
    .dob {
      text-align: center;
      color: #666;
      margin-bottom: 30px;
    }
    .main-text {
      text-align: center;
      font-size: 16px;
      line-height: 1.8;
      margin-bottom: 30px;
    }
    .event-details {
      background: #f8f9fa;
      padding: 25px;
      border-radius: 8px;
      margin: 30px 0;
    }
    .event-name {
      font-size: 20px;
      font-weight: bold;
      color: #012573;
      margin-bottom: 15px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { 
      font-weight: bold; 
      color: #333; 
    }
    .detail-value { 
      color: #666; 
    }
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 40px;
      padding-top: 30px;
      border-top: 1px solid #ddd;
    }
    .org-info {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .org-logo {
      width: 60px;
      height: 60px;
      object-fit: contain;
      border-radius: 8px;
    }
    .org-name {
      font-weight: bold;
      color: #333;
    }
    .validator-info {
      text-align: right;
    }
    .validator-name {
      font-weight: bold;
      color: #333;
    }
    .validator-role {
      font-size: 12px;
      color: #666;
    }
    .watermark {
      text-align: center;
      margin-top: 40px;
      font-size: 11px;
      color: #999;
      font-style: italic;
    }
    .cv-logo {
      color: #012573;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="header">
      <div class="badge">${certificateData.isSelfCertified ? '✓ Auto-certifié' : '✓ Certifié manuellement'}</div>
      <h1 class="title">Certificat d'Engagement Citoyen</h1>
      <p class="subtitle">Attestation de participation à une action citoyenne</p>
    </div>
    
    <p class="participant-name">${certificateData.user.firstName} ${certificateData.user.lastName}</p>
    <p class="dob">Né(e) le ${certificateData.user.dateOfBirth}</p>
    
    <p class="main-text">
      A participé à la mission citoyenne organisée par <strong>${certificateData.organization.name}</strong>.
    </p>
    
    <div class="event-details">
      <div class="event-name">${certificateData.event.name}</div>
      <div class="detail-row">
        <span class="detail-label">Date</span>
        <span class="detail-value">${certificateData.event.date}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Horaires</span>
        <span class="detail-value">${certificateData.event.startTime} → ${certificateData.event.endTime}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Lieu</span>
        <span class="detail-value">${certificateData.event.location}</span>
      </div>
    </div>
    
    <div class="footer">
      <div class="org-info">
        ${certificateData.organization.logoUrl ? `<img src="${certificateData.organization.logoUrl}" alt="Logo" class="org-logo" />` : ''}
        <div>
          <div class="org-name">${certificateData.organization.name}</div>
          <div class="validator-role">Organisateur</div>
        </div>
      </div>
      <div class="validator-info">
        <div class="validator-name">${certificateData.validator.name}</div>
        ${certificateData.validator.role ? `<div class="validator-role">${certificateData.validator.role}</div>` : ''}
      </div>
    </div>
    
    <p class="watermark">
      Sécurisé par <span class="cv-logo">Citizen Vitae®</span>, l'authenticité de l'engagement, vérifiée.
    </p>
  </div>
</body>
</html>`;

    // Store the HTML certificate as a file in storage
    const fileName = `${registration.user_id}/${registration_id}/certificate.html`;
    
    const { error: uploadError } = await supabase.storage
      .from("certificates")
      .upload(fileName, htmlContent, {
        contentType: "text/html",
        upsert: true,
      });

    if (uploadError) {
      console.error(`[generate-certificate] Upload error:`, uploadError);
      throw new Error(`Failed to upload certificate: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("certificates")
      .getPublicUrl(fileName);

    const certificateUrl = urlData.publicUrl;

    // Update registration with certificate URL
    const { error: updateError } = await supabase
      .from("event_registrations")
      .update({ certificate_url: certificateUrl })
      .eq("id", registration_id);

    if (updateError) {
      console.error(`[generate-certificate] Update error:`, updateError);
    }

    console.log(`[generate-certificate] Certificate generated: ${certificateUrl}`);

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
