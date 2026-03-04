import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type DeleteUserRequestBody = {
  userId: string;
};

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: DeleteUserRequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!body?.userId) {
    return new Response(JSON.stringify({ error: "Missing userId" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

  const {
    data: { user: caller },
    error: callerError,
  } = await userClient.auth.getUser();

  if (callerError || !caller) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: callerRow, error: callerRoleError } = await adminClient
    .from("users")
    .select("role")
    .eq("id", caller.id)
    .maybeSingle();

  if (callerRoleError) {
    return new Response(JSON.stringify({ error: "Failed to verify caller" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (callerRow?.role !== "super_admin") {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const targetUserId = body.userId;

  const { data: targetRow, error: targetRoleError } = await adminClient
    .from("users")
    .select("role")
    .eq("id", targetUserId)
    .maybeSingle();

  if (targetRoleError) {
    return new Response(JSON.stringify({ error: "Failed to load target user" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!targetRow) {
    return new Response(JSON.stringify({ error: "User not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (targetRow.role === "super_admin") {
    return new Response(JSON.stringify({ error: "Cannot delete super_admin" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { data: submissions, error: submissionsError } = await adminClient
      .from("submissions")
      .select("id")
      .eq("user_id", targetUserId);

    if (submissionsError) throw submissionsError;

    const submissionIds = (submissions ?? []).map((s) => s.id);

    if (submissionIds.length > 0) {
      const { error: deleteNotesBySubmissionError } = await adminClient
        .from("admin_notes")
        .delete()
        .in("submission_id", submissionIds);

      if (deleteNotesBySubmissionError) throw deleteNotesBySubmissionError;
    }

    const { error: deleteNotesByAdminError } = await adminClient
      .from("admin_notes")
      .delete()
      .eq("admin_id", targetUserId);

    if (deleteNotesByAdminError) throw deleteNotesByAdminError;

    const { error: deleteAssignmentsError } = await adminClient
      .from("admin_assignments")
      .delete()
      .or(`admin_id.eq.${targetUserId},user_id.eq.${targetUserId}`);

    if (deleteAssignmentsError) throw deleteAssignmentsError;

    const { error: deleteSubmissionsError } = await adminClient
      .from("submissions")
      .delete()
      .eq("user_id", targetUserId);

    if (deleteSubmissionsError) throw deleteSubmissionsError;

    const { error: nullTemplateCreatorError } = await adminClient
      .from("form_templates")
      .update({ created_by: null })
      .eq("created_by", targetUserId);

    if (nullTemplateCreatorError) throw nullTemplateCreatorError;

    const { error: deleteUserRowError } = await adminClient
      .from("users")
      .delete()
      .eq("id", targetUserId);

    if (deleteUserRowError) throw deleteUserRowError;

    const { error: deleteAuthUserError } = await adminClient.auth.admin.deleteUser(
      targetUserId,
    );

    if (deleteAuthUserError) throw deleteAuthUserError;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
