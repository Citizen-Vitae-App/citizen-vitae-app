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
    fr: "Le lieu de la mission {event_name} a été modifié. Vérifiez la nouvelle adresse.",
    en: "The location of mission {event_name} has been changed. Check the new address.",
  },
  mission_start_date_changed: {
    fr: "La date de début de la mission {event_name} a été modifiée.",
    en: "The start date of mission {event_name} has been changed.",
  },
  mission_end_date_changed: {
    fr: "La date de fin de la mission {event_name} a été modifiée.",
    en: "The end date of mission {event_name} has been changed.",
  },
  mission_date_changed: {
    fr: "Les dates de la mission {event_name} ont été modifiées.",
    en: "The dates of mission {event_name} have been changed.",
  },
};

interface NotificationRequest {
  user_id?: string;
  organization_id?: string;
  type: string;
  event_id?: string;
  event_name?: string;
  action_url?: string;
  custom_message_fr?: string;
  custom_message_en?: string;
  notify_participants?: boolean;
}

interface UserPreferences {
  language: 'fr' | 'en';
  email_opt_in: boolean;
  sms_opt_in: boolean;
  phone_number: string | null;
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
    const { user_id, organization_id, type, event_id, event_name, action_url, custom_message_fr, custom_message_en, notify_participants } = body;

    console.log(`[send-notification] Received request:`, JSON.stringify(body));

    // Determine target user(s)
    let targetUserIds: string[] = [];

    if (notify_participants && event_id) {
      // Notify all participants registered to the event
      console.log(`[send-notification] Fetching participants for event: ${event_id}`);
      
      const { data: registrations, error: regError } = await supabase
        .from("event_registrations")
        .select("user_id")
        .eq("event_id", event_id);

      if (regError) {
        console.error(`[send-notification] Error fetching participants:`, regError);
        throw new Error(`Failed to fetch event participants: ${regError.message}`);
      }

      if (!registrations || registrations.length === 0) {
        console.log(`[send-notification] No participants found for event ${event_id}`);
        return new Response(
          JSON.stringify({ success: true, message: "No participants to notify", notifications_sent: 0 }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      targetUserIds = registrations.map(r => r.user_id);
      console.log(`[send-notification] Found ${targetUserIds.length} participants:`, targetUserIds);
    } else if (user_id) {
      // Direct user notification
      targetUserIds = [user_id];
      console.log(`[send-notification] Direct notification to user: ${user_id}`);
    } else if (organization_id) {
      // Fetch organization admins (server-side, bypasses RLS)
      console.log(`[send-notification] Fetching admins for organization: ${organization_id}`);
      
      const { data: admins, error: adminsError } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", organization_id)
        .eq("role", "admin");

      if (adminsError) {
        console.error(`[send-notification] Error fetching admins:`, adminsError);
        throw new Error(`Failed to fetch organization admins: ${adminsError.message}`);
      }

      if (!admins || admins.length === 0) {
        console.log(`[send-notification] No admins found for organization ${organization_id}`);
        return new Response(
          JSON.stringify({ success: true, message: "No admins to notify", notifications_sent: 0 }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      targetUserIds = admins.map(a => a.user_id);
      console.log(`[send-notification] Found ${targetUserIds.length} admins:`, targetUserIds);
    } else {
      throw new Error("Either user_id, organization_id, or notify_participants with event_id must be provided");
    }

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

    // Send notification to each target user
    const results: { user_id: string; success: boolean; notification_id?: string; error?: string }[] = [];

    for (const targetUserId of targetUserIds) {
      try {
        // Verify user exists in profiles
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, email")
          .eq("id", targetUserId)
          .single();

        if (profileError || !profile) {
          console.log(`[send-notification] User ${targetUserId} not found in profiles, skipping`);
          results.push({ user_id: targetUserId, success: false, error: "User not found" });
          continue;
        }

        // Get user preferences
        const { data: preferences } = await supabase
          .from("user_preferences")
          .select("language, email_opt_in, sms_opt_in, phone_number")
          .eq("user_id", targetUserId)
          .single();

        const userPrefs: UserPreferences = preferences || {
          language: 'fr',
          email_opt_in: true,
          sms_opt_in: false,
          phone_number: null,
        };

        // Create in-app notification
        const { data: notification, error: notifError } = await supabase
          .from("notifications")
          .insert({
            user_id: targetUserId,
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
          console.error(`[send-notification] Error creating notification for ${targetUserId}:`, notifError);
          results.push({ user_id: targetUserId, success: false, error: notifError.message });
          continue;
        }

        console.log(`[send-notification] Notification created for ${targetUserId}: ${notification.id}`);
        results.push({ user_id: targetUserId, success: true, notification_id: notification.id });

        // Email placeholder (if opted in)
        if (userPrefs.email_opt_in && profile.email) {
          console.log(`[send-notification] Would send email to ${profile.email}`);
        }
      } catch (err: any) {
        console.error(`[send-notification] Error for user ${targetUserId}:`, err);
        results.push({ user_id: targetUserId, success: false, error: err.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`[send-notification] Completed: ${successCount}/${targetUserIds.length} notifications sent`);

    return new Response(
      JSON.stringify({
        success: true,
        notifications_sent: successCount,
        results,
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
