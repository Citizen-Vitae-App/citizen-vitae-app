import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  emails: string[];
  organizationId: string;
  organizationName: string;
  organizationLogoUrl?: string;
  customMessage?: string;
  subject?: string;
  isContactEmail?: boolean;
  isCollaboratorInvite?: boolean;
  role?: string;
  customRoleTitle?: string;
  teamId?: string;
  invitedBy?: string;
  baseUrl?: string;
  invitationType?: 'member' | 'contributor';
}

// Helper function to delay between emails to respect rate limits
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendEmail(to: string, subject: string, html: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Citizen Vitae <noreply@citizenvitae.com>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }

  return response.json();
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authUser) {
      console.error("Invalid authentication:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Authenticated user:", authUser.id);

    const { 
      emails, 
      organizationId,
      organizationName,
      organizationLogoUrl,
      customMessage, 
      subject, 
      isContactEmail,
      isCollaboratorInvite,
      role,
      customRoleTitle,
      teamId,
      invitedBy,
      baseUrl,
      invitationType
    }: InvitationRequest = await req.json();

    if (!emails || emails.length === 0) {
      throw new Error("No emails provided");
    }

    if (!organizationName) {
      throw new Error("Organization name is required");
    }

    // ===== Authorization: Verify user can send invitations for this organization =====
    if (organizationId) {
      // Check if user is an admin of this organization
      const { data: membership, error: membershipError } = await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", organizationId)
        .eq("user_id", authUser.id)
        .maybeSingle();

      if (membershipError) {
        console.error("Error checking membership:", membershipError);
        return new Response(
          JSON.stringify({ error: "Authorization check failed" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      let isAuthorized = membership?.role === "admin";

      // If not admin but has teamId, check if user is team leader
      if (!isAuthorized && teamId) {
        const { data: teamMembership, error: teamError } = await supabase
          .from("team_members")
          .select("is_leader")
          .eq("team_id", teamId)
          .eq("user_id", authUser.id)
          .maybeSingle();

        if (teamError) {
          console.error("Error checking team membership:", teamError);
        }

        isAuthorized = teamMembership?.is_leader === true;
      }

      if (!isAuthorized) {
        console.error("User not authorized to send invitations for this organization:", authUser.id);
        return new Response(
          JSON.stringify({ error: "Unauthorized: admin or team leader access required" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log("User authorized for organization:", organizationId);
    }

    console.log(`Sending ${isContactEmail ? 'contact email' : 'invitations'} to ${emails.length} recipients`);

    const results: Array<{ email: string; success: boolean; id?: string; error?: string }> = [];

    // Send emails sequentially with delay to respect rate limits (2 req/sec)
    for (const email of emails) {
      try {
        let emailSubject: string;
        let htmlContent: string;

if (isContactEmail) {
          emailSubject = subject || `Message de ${organizationName}`;
          htmlContent = generateContactEmailHtml(organizationName, customMessage || '');
        } else if (isCollaboratorInvite) {
          emailSubject = `Rejoignez l'équipe ${organizationName} sur Citizen Vitae`;
          htmlContent = generateCollaboratorInviteHtml(organizationName, organizationLogoUrl, role, customRoleTitle, email, baseUrl);
        } else {
          emailSubject = `${organizationName} vous invite à rejoindre Citizen Vitae`;
          htmlContent = generateInvitationEmailHtml(organizationName, customMessage, email, baseUrl);
        }

        const response = await sendEmail(email, emailSubject, htmlContent);
        console.log(`Email sent successfully to ${email}:`, response);
        
        // If not a contact email, save the invitation to database
        if (!isContactEmail && organizationId) {
          // Check if invitation already exists
          const { data: existing } = await supabase
            .from('organization_invitations')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('email', email.toLowerCase())
            .maybeSingle();

          if (existing) {
            // Update existing invitation
            const { error: updateError } = await supabase
              .from('organization_invitations')
              .update({
                status: 'pending',
                invited_by: invitedBy || null,
                custom_message: customMessage || null,
                role: role || 'member',
                custom_role_title: customRoleTitle || null,
                team_id: teamId || null,
                created_at: new Date().toISOString(),
                invitation_type: invitationType || 'member',
              })
              .eq('id', existing.id);

            if (updateError) {
              console.error(`Failed to update invitation for ${email}:`, updateError);
            } else {
              console.log(`Updated existing invitation for ${email}`);
            }
          } else {
            // Insert new invitation
            const { error: insertError } = await supabase
              .from('organization_invitations')
              .insert({
                organization_id: organizationId,
                email: email.toLowerCase(),
                status: 'pending',
                invited_by: invitedBy || null,
                custom_message: customMessage || null,
                role: role || 'member',
                custom_role_title: customRoleTitle || null,
                team_id: teamId || null,
                invitation_type: invitationType || 'member',
              });

            if (insertError) {
              console.error(`Failed to save invitation for ${email}:`, insertError);
            } else {
              console.log(`Created new invitation for ${email}`);
            }
          }
        }

        results.push({ email, success: true, id: response.id });

        // Wait 600ms between emails to stay under 2 req/sec limit
        if (emails.indexOf(email) < emails.length - 1) {
          await delay(600);
        }
      } catch (error: any) {
        console.error(`Failed to send email to ${email}:`, error);
        results.push({ email, success: false, error: error.message });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`Email results: ${successful} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successful, 
        failed,
        results 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-invitation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

function generateCollaboratorInviteHtml(organizationName: string, organizationLogoUrl?: string, role?: string, customRoleTitle?: string, recipientEmail?: string, baseUrl?: string): string {
  const roleLabel = customRoleTitle || (role === 'admin' ? 'Administrateur' : 'Membre');
  const siteUrl = baseUrl || Deno.env.get("SITE_URL") || 'https://dev.citizenvitae.com';
  const citizenVitaeLogo = 'https://tqrypdyxhemnupiwcfvd.supabase.co/storage/v1/object/public/public-assets/2500db7e-8966-4596-a8a8-7e21a789f58d/logo%20CzV.svg';
  const authLink = recipientEmail 
    ? `${siteUrl}/auth?email=${encodeURIComponent(recipientEmail)}`
    : `${siteUrl}/auth`;
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invitation à collaborer - Citizen Vitae</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 auto;">
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(1, 37, 115, 0.15);">
                <!-- Header with logos -->
                <tr>
                  <td style="background: linear-gradient(135deg, #012573 0%, #013a9d 100%); padding: 40px 30px; text-align: center;">
                    <img src="${citizenVitaeLogo}" alt="Citizen Vitae" style="height: 45px; max-width: 280px; margin-bottom: ${organizationLogoUrl ? '20px' : '12px'};" />
                    ${organizationLogoUrl ? `
                    <div style="margin: 20px 0 16px 0;">
                      <span style="color: rgba(255,255,255,0.6); font-size: 20px; display: block; margin-bottom: 12px;">×</span>
                      <div style="display: inline-block; width: 70px; height: 70px; border-radius: 50%; background: white; overflow: hidden; padding: 6px; box-sizing: border-box; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                        <img src="${organizationLogoUrl}" alt="${organizationName}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />
                      </div>
                    </div>
                    ` : '<p style="margin: 0; color: rgba(255, 255, 255, 0.9); font-size: 15px; font-weight: 500;">La plateforme de certification de l\'engagement citoyen</p>'}
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
                      <h2 style="margin: 0; color: #012573; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">
                        Bienvenue dans l'équipe !
                      </h2>
                    </div>
                    
                    <p style="margin: 0 0 24px; color: #334155; font-size: 16px; line-height: 1.7; text-align: center;">
                      <strong style="color: #012573;">${organizationName}</strong> vous invite à rejoindre son équipe sur <strong>Citizen Vitae</strong> en tant que <strong style="color: #E23428;">${roleLabel}</strong>.
                    </p>
                    
                    <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-left: 4px solid #E23428; padding: 24px 28px; margin: 30px 0; border-radius: 0 12px 12px 0;">
                      <h3 style="margin: 0 0 16px; color: #012573; font-size: 17px; font-weight: 700;">En tant que collaborateur, vous pourrez :</h3>
                      <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 15px; line-height: 1.9;">
                        <li style="margin-bottom: 8px;"><strong>Gérer les événements</strong> et missions de l'organisation</li>
                        <li style="margin-bottom: 8px;"><strong>Certifier les participations</strong> des bénévoles</li>
                        <li style="margin-bottom: 8px;"><strong>Suivre l'impact citoyen</strong> de votre organisation</li>
                        <li style="margin-bottom: 0;"><strong>Collaborer</strong> avec les autres membres de l'équipe</li>
                      </ul>
                    </div>
                    
                    <p style="margin: 0 0 30px; color: #64748b; font-size: 14px; line-height: 1.6; text-align: center;">
                      Créez votre compte en quelques clics pour commencer à collaborer dès maintenant.
                    </p>
                    
                    <div style="text-align: center;">
                      <a href="${authLink}" style="display: inline-block; background: linear-gradient(135deg, #E23428 0%, #b91c1c 100%); color: #ffffff; text-decoration: none; padding: 18px 45px; border-radius: 12px; font-weight: 700; font-size: 17px; box-shadow: 0 6px 20px rgba(226, 52, 40, 0.4); letter-spacing: 0.3px;">
                        Créer mon compte
                      </a>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 30px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 8px; color: #64748b; font-size: 13px; line-height: 1.6;">
                      Cette invitation vous a été envoyée par ${organizationName}
                    </p>
                    <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                      © ${new Date().getFullYear()} Citizen Vitae - La plateforme de valorisation de l'engagement citoyen
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function generateInvitationEmailHtml(organizationName: string, customMessage?: string, recipientEmail?: string, baseUrl?: string): string {
  const siteUrl = baseUrl || Deno.env.get("SITE_URL") || 'https://dev.citizenvitae.com';
  const citizenVitaeLogo = 'https://tqrypdyxhemnupiwcfvd.supabase.co/storage/v1/object/public/public-assets/2500db7e-8966-4596-a8a8-7e21a789f58d/logo%20CzV.svg';
  const authLink = recipientEmail 
    ? `${siteUrl}/auth?email=${encodeURIComponent(recipientEmail)}`
    : `${siteUrl}/auth`;
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invitation à rejoindre Citizen Vitae</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 auto;">
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(1, 37, 115, 0.15);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #012573 0%, #013a9d 100%); padding: 40px 40px 30px 40px; text-align: center;">
                    <img src="${citizenVitaeLogo}" alt="Citizen Vitae" style="height: 45px; max-width: 280px; margin-bottom: 12px;" />
                    <p style="margin: 0; color: rgba(255, 255, 255, 0.9); font-size: 15px; font-weight: 500;">Valorisez votre engagement citoyen</p>
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
                      <h2 style="margin: 0; color: #012573; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">
                        Vous êtes invité(e) à rejoindre
                      </h2>
                      <h3 style="margin: 8px 0 0 0; color: #E23428; font-size: 24px; font-weight: 700;">
                        ${organizationName}
                      </h3>
                    </div>
                    
                    <p style="margin: 0 0 24px; color: #334155; font-size: 16px; line-height: 1.7; text-align: center;">
                      L'organisation <strong style="color: #012573;">${organizationName}</strong> vous invite à rejoindre leur communauté de bénévoles sur <strong>Citizen Vitae</strong>.
                    </p>
                    
                    ${customMessage ? `
                    <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-left: 4px solid #E23428; padding: 20px 24px; margin: 30px 0; border-radius: 0 12px 12px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                      <p style="margin: 0; color: #475569; font-size: 15px; font-style: italic; line-height: 1.6;">"${customMessage}"</p>
                    </div>
                    ` : ''}
                    
                    <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 2px solid #bfdbfe; padding: 24px 28px; margin: 30px 0; border-radius: 12px;">
                      <h3 style="margin: 0 0 12px; color: #012573; font-size: 17px; font-weight: 700; text-align: center;">
                        Avec Citizen Vitae, vous pouvez :
                      </h3>
                      <ul style="margin: 0; padding-left: 20px; color: #334155; font-size: 15px; line-height: 1.9;">
                        <li style="margin-bottom: 8px;"><strong>Certifier</strong> vos engagements citoyens</li>
                        <li style="margin-bottom: 8px;"><strong>Valoriser</strong> vos compétences acquises</li>
                        <li style="margin-bottom: 0;"><strong>Télécharger</strong> vos certificats officiels</li>
                      </ul>
                    </div>
                    
                    <p style="margin: 0 0 30px; color: #64748b; font-size: 15px; line-height: 1.6; text-align: center;">
                      Créez votre compte gratuitement et commencez à certifier vos engagements citoyens.
                    </p>
                    
                    <div style="text-align: center;">
                      <a href="${authLink}" style="display: inline-block; background: linear-gradient(135deg, #E23428 0%, #b91c1c 100%); color: #ffffff; text-decoration: none; padding: 18px 45px; border-radius: 12px; font-weight: 700; font-size: 17px; box-shadow: 0 6px 20px rgba(226, 52, 40, 0.4); letter-spacing: 0.3px;">
                        🚀 Créer mon compte
                      </a>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 30px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 8px; color: #64748b; font-size: 13px; line-height: 1.6;">
                      Cet email vous a été envoyé par ${organizationName} via Citizen Vitae.
                    </p>
                    <p style="margin: 0; color: #94a3b8; font-size: 12px;">
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
  `;
}

function generateContactEmailHtml(organizationName: string, message: string): string {
  const citizenVitaeLogo = 'https://tqrypdyxhemnupiwcfvd.supabase.co/storage/v1/object/public/public-assets/2500db7e-8966-4596-a8a8-7e21a789f58d/logo%20CzV.svg';
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Message de ${organizationName}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 auto;">
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(1, 37, 115, 0.15);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #012573 0%, #013a9d 100%); padding: 35px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.3px;">Message de ${organizationName}</h1>
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
                    <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-left: 4px solid #E23428; padding: 28px 32px; border-radius: 0 12px 12px 0; box-shadow: 0 2px 12px rgba(0,0,0,0.06); margin-bottom: 30px;">
                      <p style="margin: 0; color: #334155; font-size: 16px; line-height: 1.8; white-space: pre-wrap;">${message}</p>
                    </div>
                    
                    <div style="text-align: center; padding: 24px; background-color: #eff6ff; border-radius: 12px; border: 1px solid #bfdbfe;">
                      <img src="${citizenVitaeLogo}" alt="Citizen Vitae" style="height: 35px; max-width: 220px; margin-bottom: 8px;" />
                      <p style="margin: 8px 0 0 0; color: #64748b; font-size: 13px; font-weight: 500;">
                        Via la plateforme Citizen Vitae
                      </p>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 30px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 8px; color: #64748b; font-size: 13px; line-height: 1.6;">
                      Ce message vous a été envoyé par ${organizationName} via Citizen Vitae.
                    </p>
                    <p style="margin: 0; color: #94a3b8; font-size: 12px;">
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
  `;
}

serve(handler);
