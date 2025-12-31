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
  organizationName?: string;
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

    const { email, organizationName }: OwnerInvitationRequest = await req.json();
    
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return new Response(
        JSON.stringify({ error: "Valid email is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log("Sending owner invitation to:", normalizedEmail);

    // Check if email already has a pending invitation
    const { data: existingInvitation } = await supabaseClient
      .from("organization_invitations")
      .select("id")
      .eq("email", normalizedEmail)
      .eq("invitation_type", "owner")
      .eq("status", "pending")
      .maybeSingle();

    if (existingInvitation) {
      return new Response(
        JSON.stringify({ error: "Une invitation est déjà en attente pour cet email" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create a pending organization first
    const pendingOrgName = organizationName || `Organisation de ${normalizedEmail}`;
    const { data: newOrg, error: orgError } = await supabaseClient
      .from("organizations")
      .insert({
        name: pendingOrgName,
        type: "association",
        is_verified: false,
        visibility: "private",
      })
      .select("id")
      .single();

    if (orgError || !newOrg) {
      console.error("Error creating pending organization:", orgError);
      return new Response(
        JSON.stringify({ error: "Failed to create pending organization" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Created pending organization:", newOrg.id);

    // Create invitation record linked to the new organization
    const { error: inviteError } = await supabaseClient
      .from("organization_invitations")
      .insert({
        email: normalizedEmail,
        invitation_type: "owner",
        status: "pending",
        organization_id: newOrg.id,
        invited_by: authUser.id,
        role: "admin",
      });

    if (inviteError) {
      console.error("Error creating invitation:", inviteError);
      // Rollback: delete the organization
      await supabaseClient.from("organizations").delete().eq("id", newOrg.id);
      return new Response(
        JSON.stringify({ error: "Failed to create invitation" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Created invitation for organization:", newOrg.id);

    // Send invitation email
    const origin = req.headers.get("origin") || "https://citizenvitae.com";
    const encodedEmail = encodeURIComponent(normalizedEmail);
    const encodedOrgName = encodeURIComponent(pendingOrgName);
    const onboardingUrl = `${origin}/auth?redirect=/onboarding&invitation=owner&org=${newOrg.id}&email=${encodedEmail}&orgName=${encodedOrgName}`;

    const emailResponse = await resend.emails.send({
      from: "Citizen Vitae <no-reply@citizenvitae.com>",
      to: [normalizedEmail],
      subject: "Invitation à créer votre organisation sur Citizen Vitae",
      html: `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 20px 40px; text-align: center; border-bottom: 1px solid #e4e4e7;">
                      <h1 style="margin: 0; color: #10b981; font-size: 28px; font-weight: 700;">Citizen Vitae</h1>
                      <p style="margin: 8px 0 0 0; color: #71717a; font-size: 14px;">La plateforme de certification de l'engagement citoyen</p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 16px 0; color: #18181b; font-size: 24px; font-weight: 600;">
                        🎉 Vous êtes invité(e) !
                      </h2>
                      <p style="margin: 0 0 24px 0; color: #3f3f46; font-size: 16px; line-height: 1.6;">
                        Vous avez été sélectionné(e) pour créer et gérer une organisation sur Citizen Vitae.
                      </p>
                      <p style="margin: 0 0 32px 0; color: #3f3f46; font-size: 16px; line-height: 1.6;">
                        En tant que propriétaire d'organisation, vous pourrez :
                      </p>
                      <ul style="margin: 0 0 32px 0; padding-left: 20px; color: #3f3f46; font-size: 15px; line-height: 1.8;">
                        <li>Créer et gérer des événements citoyens</li>
                        <li>Certifier l'engagement de vos participants</li>
                        <li>Délivrer des certificats d'engagement</li>
                        <li>Constituer votre équipe de collaborateurs</li>
                      </ul>
                      
                      <!-- CTA Button -->
                      <table role="presentation" style="width: 100%;">
                        <tr>
                          <td align="center">
                            <a href="${onboardingUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
                              Créer mon organisation
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 32px 0 0 0; color: #71717a; font-size: 14px; text-align: center;">
                        Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
                        <a href="${onboardingUrl}" style="color: #10b981; word-break: break-all;">${onboardingUrl}</a>
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 24px 40px; background-color: #fafafa; border-radius: 0 0 16px 16px; border-top: 1px solid #e4e4e7;">
                      <p style="margin: 0; color: #a1a1aa; font-size: 13px; text-align: center; line-height: 1.5;">
                        Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.<br>
                        © ${new Date().getFullYear()} Citizen Vitae. Tous droits réservés.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log("Email response:", JSON.stringify(emailResponse));

    if (emailResponse.error) {
      console.error("Email sending failed:", emailResponse.error);
      // Don't rollback - the invitation is still valid, just log the email error
      return new Response(
        JSON.stringify({ 
          success: true, 
          warning: "Organisation créée mais erreur d'envoi email",
          organizationId: newOrg.id,
          emailError: emailResponse.error.message 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        organizationId: newOrg.id,
        message: "Invitation envoyée avec succès" 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-owner-invitation:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
