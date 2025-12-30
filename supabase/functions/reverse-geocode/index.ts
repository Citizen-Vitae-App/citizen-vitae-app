import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory cache with TTL (1 hour)
const cache = new Map<string, { data: unknown; expires: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

// Rate limiting: max 1 request per second per user
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 1000;

interface ReverseGeocodeRequest {
  latitude: number;
  longitude: number;
}

interface AddressResult {
  road?: string;
  house_number?: string;
  city?: string;
  town?: string;
  village?: string;
  postcode?: string;
}

interface NominatimResponse {
  display_name?: string;
  address?: AddressResult;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log("Authentication failed:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting per user
    const now = Date.now();
    const lastRequest = rateLimitMap.get(user.id) || 0;
    if (now - lastRequest < RATE_LIMIT_MS) {
      console.log(`Rate limit exceeded for user ${user.id}`);
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please wait before trying again." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    rateLimitMap.set(user.id, now);

    // Parse request body
    const { latitude, longitude }: ReverseGeocodeRequest = await req.json();

    // Validate inputs
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return new Response(
        JSON.stringify({ error: "Invalid coordinates" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return new Response(
        JSON.stringify({ error: "Coordinates out of range" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Round coordinates to 4 decimal places for caching (about 11 meters precision)
    const roundedLat = Math.round(latitude * 10000) / 10000;
    const roundedLon = Math.round(longitude * 10000) / 10000;
    const cacheKey = `${roundedLat},${roundedLon}`;

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached && cached.expires > now) {
      console.log(`Cache hit for ${cacheKey}`);
      return new Response(
        JSON.stringify(cached.data),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Nominatim API with proper headers
    console.log(`Fetching from Nominatim for ${cacheKey}`);
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?lat=${roundedLat}&lon=${roundedLon}&format=json&addressdetails=1`;
    
    const response = await fetch(nominatimUrl, {
      headers: {
        "Accept-Language": "fr",
        "User-Agent": "CitizenVitae/1.0 (contact@citizenvitae.com)",
      },
    });

    if (!response.ok) {
      console.error(`Nominatim API error: ${response.status}`);
      return new Response(
        JSON.stringify({ 
          address: `${roundedLat}, ${roundedLon}`,
          fallback: true 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data: NominatimResponse = await response.json();
    
    // Format address
    let formattedAddress: string;
    if (data.display_name) {
      const address = data.address;
      const parts: string[] = [];
      if (address?.house_number) parts.push(address.house_number);
      if (address?.road) parts.push(address.road);
      if (address?.city || address?.town || address?.village) {
        parts.push(address.city || address.town || address.village || "");
      }
      if (address?.postcode) parts.push(address.postcode);
      formattedAddress = parts.length > 0 ? parts.join(", ") : data.display_name;
    } else {
      formattedAddress = `${roundedLat}, ${roundedLon}`;
    }

    const result = { address: formattedAddress };

    // Store in cache
    cache.set(cacheKey, { data: result, expires: now + CACHE_TTL });

    // Cleanup expired cache entries periodically
    if (Math.random() < 0.1) {
      for (const [key, value] of cache.entries()) {
        if (value.expires < now) {
          cache.delete(key);
        }
      }
    }

    console.log(`Successfully geocoded ${cacheKey} -> ${formattedAddress}`);
    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in reverse-geocode function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
