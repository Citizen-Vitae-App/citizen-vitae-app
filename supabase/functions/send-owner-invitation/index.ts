import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OwnerInvitationRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { email }: OwnerInvitationRequest = await req.json();
    console.log("Sending owner invitation to:", email);

    // Create invitation record
    const { error: inviteError } = await supabaseClient
      .from("organization_invitations")
      .insert({
        email,
        invitation_type: "owner",
        status: "pending",
        organization_id: "00000000-0000-0000-0000-000000000000", // Placeholder, will be created during onboarding
      });

    if (inviteError) {
      console.error("Error creating invitation:", inviteError);
    }

    // Send invitation email
    const onboardingUrl = `${req.headers.get("origin")}/organization-onboarding?email=${encodeURIComponent(email)}`;

    const emailResponse = await resend.emails.send({
      from: "Citizen Vitae <onboarding@resend.dev>",
      to: [email],
      subject: "Invitation à créer votre organisation sur Citizen Vitae",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #10b981;">Bienvenue sur Citizen Vitae</h1>
          <p>Vous avez été invité(e) à créer et gérer une organisation sur Citizen Vitae, la plateforme de certification de l'engagement citoyen.</p>
          <p>Cliquez sur le bouton ci-dessous pour créer votre compte et configurer votre organisation :</p>
          <a href="${onboardingUrl}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0;">
            Créer mon organisation
          </a>
          <p style="color: #666; font-size: 14px;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
          <p style="color: #666; font-size: 14px;">L'équipe Citizen Vitae</p>
        </div>
      `,
    });

    console.log("Email sent:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-owner-invitation:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
