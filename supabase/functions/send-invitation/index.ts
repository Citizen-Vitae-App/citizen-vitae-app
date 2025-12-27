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
  invitedBy?: string;
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
      invitedBy
    }: InvitationRequest = await req.json();

    if (!emails || emails.length === 0) {
      throw new Error("No emails provided");
    }

    if (!organizationName) {
      throw new Error("Organization name is required");
    }

    console.log(`Sending ${isContactEmail ? 'contact email' : 'invitations'} to ${emails.length} recipients`);

    // Create Supabase client with service role for inserting invitations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
          htmlContent = generateCollaboratorInviteHtml(organizationName, organizationLogoUrl, role, customRoleTitle);
        } else {
          emailSubject = `${organizationName} vous invite à rejoindre Citizen Vitae`;
          htmlContent = generateInvitationEmailHtml(organizationName, customMessage);
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
                created_at: new Date().toISOString(),
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

function generateCollaboratorInviteHtml(organizationName: string, organizationLogoUrl?: string, role?: string, customRoleTitle?: string): string {
  const roleLabel = customRoleTitle || (role === 'admin' ? 'Administrateur' : 'Membre');
  const citizenVitaeLogo = 'https://dev.citizenvitae.com/lovable-uploads/8ad21a60-5520-4339-be68-fb3c7d91a8c5.png';
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invitation à collaborer - Citizen Vitae</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 auto;">
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header with logos -->
                <tr>
                  <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="text-align: center;">
                          <img src="${citizenVitaeLogo}" alt="Citizen Vitae" style="height: 50px; margin-bottom: 16px;" />
                          ${organizationLogoUrl ? `
                          <div style="margin: 16px 0;">
                            <span style="color: rgba(255,255,255,0.7); font-size: 24px;">×</span>
                          </div>
                          <img src="${organizationLogoUrl}" alt="${organizationName}" style="height: 50px; max-width: 150px; object-fit: contain; background: white; border-radius: 8px; padding: 8px;" />
                          ` : ''}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px; font-weight: 700; text-align: center;">
                      Bienvenue dans l'équipe !
                    </h2>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.7; text-align: center;">
                      <strong>${organizationName}</strong> vous invite à rejoindre son équipe sur <strong>Citizen Vitae</strong> en tant que <strong>${roleLabel}</strong>.
                    </p>
                    
                    <div style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 1px solid #bbf7d0; padding: 24px; margin: 24px 0; border-radius: 12px;">
                      <h3 style="margin: 0 0 12px; color: #166534; font-size: 16px; font-weight: 600;">En tant que collaborateur, vous pourrez :</h3>
                      <ul style="margin: 0; padding-left: 20px; color: #15803d; font-size: 14px; line-height: 1.8;">
                        <li>Gérer les événements et missions de l'organisation</li>
                        <li>Certifier les participations des bénévoles</li>
                        <li>Suivre l'impact citoyen de votre organisation</li>
                        <li>Collaborer avec les autres membres de l'équipe</li>
                      </ul>
                    </div>
                    
                    <p style="margin: 0 0 30px; color: #6b7280; font-size: 14px; line-height: 1.6; text-align: center;">
                      Créez votre compte en quelques clics pour commencer à collaborer dès maintenant.
                    </p>
                    
                    <div style="text-align: center;">
                      <a href="https://dev.citizenvitae.com/auth" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
                        Créer mon compte collaborateur
                      </a>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 24px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px;">
                      Cette invitation vous a été envoyée par ${organizationName}
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                      Citizen Vitae - La plateforme de valorisation de l'engagement citoyen
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

function generateInvitationEmailHtml(organizationName: string, customMessage?: string): string {
  const citizenVitaeLogo = 'https://dev.citizenvitae.com/lovable-uploads/8ad21a60-5520-4339-be68-fb3c7d91a8c5.png';
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invitation à rejoindre Citizen Vitae</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 auto;">
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
                    <img src="${citizenVitaeLogo}" alt="Citizen Vitae" style="height: 50px; margin-bottom: 16px;" />
                    <p style="margin: 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">Valorisez votre engagement citoyen</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 22px; font-weight: 600;">
                      Vous êtes invité(e) à rejoindre ${organizationName} !
                    </h2>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      L'organisation <strong>${organizationName}</strong> vous invite à rejoindre leur communauté de bénévoles sur Citizen Vitae.
                    </p>
                    
                    ${customMessage ? `
                    <div style="background-color: #f9fafb; border-left: 4px solid #10b981; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                      <p style="margin: 0; color: #374151; font-size: 14px; font-style: italic;">"${customMessage}"</p>
                    </div>
                    ` : ''}
                    
                    <p style="margin: 0 0 30px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Créez votre compte gratuitement et commencez à certifier vos engagements citoyens.
                    </p>
                    
                    <div style="text-align: center;">
                      <a href="https://dev.citizenvitae.com/auth" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                        Créer mon compte
                      </a>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 24px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                      Cet email vous a été envoyé par ${organizationName} via Citizen Vitae.
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
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Message de ${organizationName}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 auto;">
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Message de ${organizationName}</h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                      <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.7; white-space: pre-wrap;">${message}</p>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 24px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                      Ce message vous a été envoyé par ${organizationName} via Citizen Vitae.
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
