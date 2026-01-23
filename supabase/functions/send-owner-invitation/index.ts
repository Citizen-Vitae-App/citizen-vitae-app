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
  organizationType?: string;
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

    const { email, organizationName, organizationType }: OwnerInvitationRequest = await req.json();
    
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return new Response(
        JSON.stringify({ error: "Valid email is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const orgType = organizationType || "association";
    console.log("Sending owner invitation to:", normalizedEmail, "with type:", orgType);

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
        type: orgType,
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

    // Generate a Magic Link that authenticates the user and redirects directly to org onboarding
    // Dynamically derive origin from request headers to support multiple environments
    const requestOrigin = req.headers.get("origin");
    const referer = req.headers.get("referer");
    let origin = "https://dev.citizenvitae.com"; // fallback
    
    if (requestOrigin && requestOrigin.startsWith("http")) {
      origin = requestOrigin;
    } else if (referer) {
      try {
        const refererUrl = new URL(referer);
        origin = refererUrl.origin;
      } catch (e) {
        console.log("Could not parse referer, using fallback origin");
      }
    }
    
    console.log("Using origin:", origin);
    
    const encodedOrgName = encodeURIComponent(pendingOrgName);
    const redirectTo = `${origin}/organization/onboarding?org=${newOrg.id}&orgName=${encodedOrgName}&invitation=owner`;

    console.log("Generating magic link with redirectTo:", redirectTo);

    // Use Supabase Admin API to generate a magic link
    const { data: linkData, error: linkError } = await supabaseClient.auth.admin.generateLink({
      type: "magiclink",
      email: normalizedEmail,
      options: {
        redirectTo,
      },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error("Error generating magic link:", linkError);
      // Fallback: delete org and invitation, return error
      await supabaseClient.from("organization_invitations").delete().eq("organization_id", newOrg.id);
      await supabaseClient.from("organizations").delete().eq("id", newOrg.id);
      return new Response(
        JSON.stringify({ error: "Failed to generate invitation link" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const magicLinkUrl = linkData.properties.action_link;
    console.log("Magic link generated successfully");

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
        <body style="margin: 0; padding: 0; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 20px; box-shadow: 0 10px 40px rgba(1, 37, 115, 0.15); overflow: hidden;">
                  <!-- Header with Logo -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #012573 0%, #013a9d 100%); padding: 40px 40px 30px 40px; text-align: center;">
                      <img src="https://tqrypdyxhemnupiwcfvd.supabase.co/storage/v1/object/public/public-assets/2500db7e-8966-4596-a8a8-7e21a789f58d/logo%20CzV.svg" alt="Citizen Vitae" style="height: 45px; max-width: 280px; margin-bottom: 12px;" />
                      <p style="margin: 0; color: rgba(255, 255, 255, 0.9); font-size: 15px; font-weight: 500;">La plateforme de certification de l'engagement citoyen</p>
                    </td>
                  </tr>
                  
                  <!-- Decorative Banner -->
                  <tr>
                    <td style="background: linear-gradient(90deg, #E23428 0%, #E23428 50%, #012573 50%, #012573 100%); height: 6px;">
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 50px 40px;">
                      <div style="text-align: center; margin-bottom: 30px;">
                        <h2 style="margin: 0; color: #012573; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                          Vous êtes invité(e) !
                        </h2>
                      </div>
                      
                      <p style="margin: 0 0 24px 0; color: #334155; font-size: 16px; line-height: 1.7; text-align: center;">
                        Vous avez été sélectionné(e) pour <strong style="color: #012573;">créer et gérer une organisation</strong> sur Citizen Vitae.
                      </p>
                      
                      <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-left: 4px solid #E23428; padding: 24px 28px; margin: 30px 0; border-radius: 0 12px 12px 0;">
                        <h3 style="margin: 0 0 16px 0; color: #012573; font-size: 17px; font-weight: 700;">
                          En tant que propriétaire d'organisation, vous pourrez :
                        </h3>
                        <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 15px; line-height: 1.9;">
                          <li style="margin-bottom: 8px;"><strong>Créer et gérer</strong> des événements citoyens</li>
                          <li style="margin-bottom: 8px;"><strong>Certifier l'engagement</strong> de vos participants</li>
                          <li style="margin-bottom: 8px;"><strong>Délivrer des certificats</strong> d'engagement officiels</li>
                          <li style="margin-bottom: 0;"><strong>Constituer votre équipe</strong> de collaborateurs</li>
                        </ul>
                      </div>
                      
                      <!-- CTA Button -->
                      <table role="presentation" style="width: 100%; margin: 35px 0;">
                        <tr>
                          <td align="center">
                            <a href="${magicLinkUrl}" style="display: inline-block; background: linear-gradient(135deg, #E23428 0%, #b91c1c 100%); color: #ffffff; padding: 18px 45px; text-decoration: none; border-radius: 12px; font-size: 17px; font-weight: 700; box-shadow: 0 6px 20px rgba(226, 52, 40, 0.4); letter-spacing: 0.3px;">
                              Créer mon organisation
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <div style="background-color: #fef9f6; border: 1px solid #fed7aa; padding: 16px 20px; border-radius: 10px; margin-top: 30px;">
                        <p style="margin: 0; color: #92400e; font-size: 13px; text-align: center; line-height: 1.6;">
                          <strong>Astuce :</strong> Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
                          <a href="${magicLinkUrl}" style="color: #E23428; word-break: break-all; text-decoration: underline;">${magicLinkUrl}</a>
                        </p>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
                      <p style="margin: 0 0 8px 0; color: #64748b; font-size: 13px; text-align: center; line-height: 1.6;">
                        Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.
                      </p>
                      <p style="margin: 0; color: #94a3b8; font-size: 12px; text-align: center;">
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
