import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  // CORS headers
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Missing authorization header' }),
        { 
          status: 401, 
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          } 
        }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid authentication' }),
        { 
          status: 401, 
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          } 
        }
      );
    }

    console.log('Authenticated user:', user.id);

    const { accessToken, date } = await req.json();

    if (!accessToken || !date) {
      return new Response(
        JSON.stringify({ error: "Missing accessToken or date" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return new Response(
        JSON.stringify({ error: "Invalid date format. Use YYYY-MM-DD" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate date is parseable
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return new Response(
        JSON.stringify({ error: "Invalid date" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch events from Google Calendar for the specified date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const response = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/primary/events?` +
      `timeMin=${startOfDay.toISOString()}&` +
      `timeMax=${endOfDay.toISOString()}&` +
      `singleEvents=true&` +
      `orderBy=startTime`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Google Calendar API error: ${response.statusText}`);
    }

    const data = await response.json();
    const events: CalendarEvent[] = data.items || [];

    // Transform Google Calendar events to ChronoFocus format
    const timeBlocks = events.map((event: CalendarEvent) => {
      const start = event.start.dateTime || event.start.date;
      const end = event.end.dateTime || event.end.date;
      
      if (!start || !end) return null;

      const startDate = new Date(start);
      const endDate = new Date(end);

      return {
        id: `google-${event.id}`,
        title: event.summary || "Evento senza titolo",
        startTime: startDate.toLocaleTimeString("it-IT", { 
          hour: "2-digit", 
          minute: "2-digit" 
        }),
        endTime: endDate.toLocaleTimeString("it-IT", { 
          hour: "2-digit", 
          minute: "2-digit" 
        }),
        category: "other" as const,
        subTasks: [],
        date: date,
        completed: false,
        status: "planned" as const,
        externalEvent: true,
      };
    }).filter(Boolean);

    return new Response(
      JSON.stringify({ timeBlocks }),
      {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error("Error syncing calendar:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
