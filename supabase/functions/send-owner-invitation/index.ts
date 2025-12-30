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

    // ===== JWT Authentication =====
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !authUser) {
      console.error("Invalid authentication:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Authenticated user:", authUser.id);

    // ===== Authorization: Only super_admins can send owner invitations =====
    const { data: roleData, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", authUser.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (roleError) {
      console.error("Error checking user role:", roleError);
      return new Response(
        JSON.stringify({ error: "Authorization check failed" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!roleData) {
      console.error("User is not a super admin:", authUser.id);
      return new Response(
        JSON.stringify({ error: "Unauthorized: super admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("User authorized as super admin");

    const { email }: OwnerInvitationRequest = await req.json();
    
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return new Response(
        JSON.stringify({ error: "Valid email is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Sending owner invitation to:", email);

    // Create invitation record
    const { error: inviteError } = await supabaseClient
      .from("organization_invitations")
      .insert({
        email: email.toLowerCase(),
        invitation_type: "owner",
        status: "pending",
        organization_id: "00000000-0000-0000-0000-000000000000", // Placeholder, will be created during onboarding
        invited_by: authUser.id,
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
