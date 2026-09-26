// ==============================================================================
// SUPABASE EDGE FUNCTION: Envio de Relatórios por E-mail (Gmail SMTP)
// ==============================================================================
// Esta Edge Function roda no ambiente Deno do Supabase.
// Ela consulta as folgas agendadas e os destinatários ativos, montando o template
// HTML e disparando via Gmail com as variáveis GMAIL_USER e GMAIL_APP_PASSWORD.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!gmailUser || !gmailPassword) {
      throw new Error("Variáveis GMAIL_USER e GMAIL_APP_PASSWORD não configuradas.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRole);

    // 1. Busca os destinatários ativos
    const { data: recipients, error: recError } = await supabase
      .from("report_recipients")
      .select("email, name, frequency")
      .eq("is_active", true);

    if (recError || !recipients || recipients.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum destinatário ativo encontrado." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Busca as próximas folgas
    const today = new Date().toISOString().split("T")[0];
    const { data: timeOffs, error: timeOffError } = await supabase
      .from("time_offs")
      .select(`
        id,
        date,
        description,
        is_full_day,
        hours,
        employees (
          name,
          teams ( name )
        )
      `)
      .gte("date", today)
      .order("date", { ascending: true });

    if (timeOffError) throw timeOffError;

    // 3. Monta o corpo do e-mail em HTML
    const rowsHtml = (timeOffs || [])
      .map((item: any) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${item.employees?.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${item.employees?.teams?.name || "Geral"}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${item.date}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${item.is_full_day ? "Dia Inteiro" : `${item.hours}h`}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${item.description || "-"}</td>
        </tr>
      `)
      .join("");

    const emailContent = `
      <div style="font-family: sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
        <h2 style="color: #2563eb; margin-top: 0;">Gestão de Folgas - TIME AMS</h2>
        <p>Olá! Segue a programação atualizada das folgas e ausências da equipe:</p>
        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
          <thead>
            <tr style="background-color: #f8fafc;">
              <th style="padding: 8px; border-bottom: 2px solid #cbd5e1;">Colaborador</th>
              <th style="padding: 8px; border-bottom: 2px solid #cbd5e1;">Time</th>
              <th style="padding: 8px; border-bottom: 2px solid #cbd5e1;">Data</th>
              <th style="padding: 8px; border-bottom: 2px solid #cbd5e1;">Tipo</th>
              <th style="padding: 8px; border-bottom: 2px solid #cbd5e1;">Motivo</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || "<tr><td colspan='5' style='text-align: center; padding: 12px;'>Nenhuma folga agendada.</td></tr>"}
          </tbody>
        </table>
        <p style="font-size: 11px; color: #94a3b8; margin-top: 24px; text-align: center;">TIME AMS • Gestão de Folgas</p>
      </div>
    `;

    // 4. Envia via Gmail SMTP
    const client = new SmtpClient();
    await client.connectTLS({
      hostname: "smtp.gmail.com",
      port: 465,
      username: gmailUser,
      password: gmailPassword,
    });

    for (const rec of recipients) {
      await client.send({
        from: gmailUser,
        to: rec.email,
        subject: `[TIME AMS] Relatório de Folgas - ${today}`,
        content: emailContent,
        html: emailContent,
      });
    }

    await client.close();

    return new Response(JSON.stringify({ success: true, recipientsCount: recipients.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
