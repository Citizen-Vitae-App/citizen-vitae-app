import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  emails: string[];
  organizationName: string;
  customMessage?: string;
  subject?: string;
  isContactEmail?: boolean;
}

async function sendEmail(to: string, subject: string, html: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Citizen Vitae <onboarding@resend.dev>",
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

    const { emails, organizationName, customMessage, subject, isContactEmail }: InvitationRequest = await req.json();

    if (!emails || emails.length === 0) {
      throw new Error("No emails provided");
    }

    if (!organizationName) {
      throw new Error("Organization name is required");
    }

    console.log(`Sending ${isContactEmail ? 'contact email' : 'invitations'} to ${emails.length} recipients`);

    const results = await Promise.all(
      emails.map(async (email) => {
        try {
          const emailSubject = isContactEmail 
            ? subject || `Message de ${organizationName}`
            : `${organizationName} vous invite à rejoindre Citizen Vitae`;

          const htmlContent = isContactEmail 
            ? generateContactEmailHtml(organizationName, customMessage || '')
            : generateInvitationEmailHtml(organizationName, customMessage);

          const response = await sendEmail(email, emailSubject, htmlContent);

          console.log(`Email sent successfully to ${email}:`, response);
          return { email, success: true, id: response.id };
        } catch (error: any) {
          console.error(`Failed to send email to ${email}:`, error);
          return { email, success: false, error: error.message };
        }
      })
    );

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

function generateInvitationEmailHtml(organizationName: string, customMessage?: string): string {
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
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Citizen Vitae</h1>
                    <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">Valorisez votre engagement citoyen</p>
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
                      <a href="https://citizen-vitae.lovable.app/auth" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
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
