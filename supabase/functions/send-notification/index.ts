import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Predefined notification messages
const NOTIFICATION_MESSAGES: Record<string, { fr: string; en: string }> = {
  mission_signup: {
    fr: "Un nouveau participant s'est inscrit à votre mission : {event_name}",
    en: "A new participant signed up for your mission: {event_name}",
  },
  mission_reminder: {
    fr: "Rappel : votre mission {event_name} commence demain !",
    en: "Reminder: your mission {event_name} starts tomorrow!",
  },
  mission_updated: {
    fr: "La mission {event_name} a été modifiée. Vérifiez les détails.",
    en: "The mission {event_name} has been updated. Check the details.",
  },
  mission_canceled: {
    fr: "La mission {event_name} a été annulée.",
    en: "The mission {event_name} has been canceled.",
  },
  mission_location_changed: {
    fr: "Le lieu de la mission {event_name} a changé.",
    en: "The location of mission {event_name} has changed.",
  },
  mission_date_changed: {
    fr: "La date de la mission {event_name} a été modifiée.",
    en: "The date of mission {event_name} has been changed.",
  },
};

interface NotificationRequest {
  user_id: string;
  type: string;
  event_id?: string;
  event_name?: string;
  action_url?: string;
  custom_message_fr?: string;
  custom_message_en?: string;
}

interface UserPreferences {
  language: 'fr' | 'en';
  email_opt_in: boolean;
  sms_opt_in: boolean;
  phone_number: string | null;
}

interface Profile {
  email: string | null;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: NotificationRequest = await req.json();
    const { user_id, type, event_id, event_name, action_url, custom_message_fr, custom_message_en } = body;

    console.log(`[send-notification] Processing notification for user ${user_id}, type: ${type}`);

    // Get user preferences
    const { data: preferences, error: prefError } = await supabase
      .from("user_preferences")
      .select("language, email_opt_in, sms_opt_in, phone_number")
      .eq("user_id", user_id)
      .single();

    if (prefError) {
      console.log(`[send-notification] No preferences found for user ${user_id}, using defaults`);
    }

    const userPrefs: UserPreferences = preferences || {
      language: 'fr',
      email_opt_in: true,
      sms_opt_in: false,
      phone_number: null,
    };

    // Get message content
    let message_fr: string;
    let message_en: string;

    if (custom_message_fr && custom_message_en) {
      message_fr = custom_message_fr;
      message_en = custom_message_en;
    } else if (NOTIFICATION_MESSAGES[type]) {
      message_fr = NOTIFICATION_MESSAGES[type].fr.replace("{event_name}", event_name || "");
      message_en = NOTIFICATION_MESSAGES[type].en.replace("{event_name}", event_name || "");
    } else {
      message_fr = `Nouvelle notification: ${type}`;
      message_en = `New notification: ${type}`;
    }

    // 1. ALWAYS create in-app notification
    const { data: notification, error: notifError } = await supabase
      .from("notifications")
      .insert({
        user_id,
        type,
        event_id: event_id || null,
        message_fr,
        message_en,
        action_url: action_url || null,
        is_read: false,
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (notifError) {
      console.error(`[send-notification] Error creating notification:`, notifError);
      throw notifError;
    }

    console.log(`[send-notification] In-app notification created: ${notification.id}`);

    // 2. Send email if opted in (placeholder for future Resend integration)
    if (userPrefs.email_opt_in) {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      
      if (resendApiKey) {
        // Get user email
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", user_id)
          .single();

        if (profile?.email) {
          const message = userPrefs.language === 'fr' ? message_fr : message_en;
          
          try {
            // TODO: Implement Resend email sending
            console.log(`[send-notification] Would send email to ${profile.email}: ${message}`);
            
            // Placeholder for Resend integration:
            // const resend = new Resend(resendApiKey);
            // await resend.emails.send({
            //   from: "CitizenVitae <notifications@citizenvitae.com>",
            //   to: [profile.email],
            //   subject: "Nouvelle notification CitizenVitae",
            //   html: `<p>${message}</p>`,
            // });
          } catch (emailError) {
            console.error(`[send-notification] Email sending failed:`, emailError);
          }
        }
      } else {
        console.log(`[send-notification] Email opted in but RESEND_API_KEY not configured`);
      }
    }

    // 3. Send SMS if opted in (placeholder for future Twilio integration)
    if (userPrefs.sms_opt_in && userPrefs.phone_number) {
      const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
      
      if (twilioAccountSid && twilioAuthToken) {
        const message = userPrefs.language === 'fr' ? message_fr : message_en;
        
        try {
          // TODO: Implement Twilio SMS sending
          console.log(`[send-notification] Would send SMS to ${userPrefs.phone_number}: ${message}`);
          
          // Placeholder for Twilio integration:
          // const twilioClient = twilio(twilioAccountSid, twilioAuthToken);
          // await twilioClient.messages.create({
          //   body: message,
          //   from: Deno.env.get("TWILIO_PHONE_NUMBER"),
          //   to: userPrefs.phone_number,
          // });
        } catch (smsError) {
          console.error(`[send-notification] SMS sending failed:`, smsError);
        }
      } else {
        console.log(`[send-notification] SMS opted in but Twilio not configured`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notification_id: notification.id,
        channels: {
          inapp: true,
          email: userPrefs.email_opt_in,
          sms: userPrefs.sms_opt_in && !!userPrefs.phone_number,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("[send-notification] Error:", error);
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
