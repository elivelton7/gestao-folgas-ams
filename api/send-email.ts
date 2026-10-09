import type { IncomingMessage, ServerResponse } from 'http';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import { buildReportEmailHtml } from './cron-report';

export default async function handler(req: any, res: any) {
  // Configuração de CORS para permitir requisições da própria aplicação
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const gmailUser = process.env.GMAIL_USER;
    const gmailPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailPassword) {
      return res.status(400).json({
        error: 'Credenciais do Gmail não configuradas nas Environment Variables da Vercel (GMAIL_USER e GMAIL_APP_PASSWORD).',
      });
    }

    const todayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());

    let recipients = req.body?.recipients;
    let timeOffs = req.body?.timeOffs;
    let vacations = req.body?.vacations;

    // Se a requisição não trouxer destinatários ou for GET, busca diretamente do Supabase
    if (!recipients || recipients.length === 0) {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: recData } = await supabase
          .from('report_recipients')
          .select('id, name, email, frequency, is_active')
          .eq('is_active', true);

        recipients = recData || [];

        if (timeOffs === undefined) {
          const { data: toData } = await supabase
            .from('time_offs')
            .select(`
              id,
              employee_id,
              date,
              description,
              is_full_day,
              hours,
              employees (
                id,
                name,
                team_id,
                teams (
                  id,
                  name
                )
              )
            `)
            .gte('date', todayStr)
            .order('date', { ascending: true });
          timeOffs = toData || [];
        }

        if (vacations === undefined) {
          const { data: vacData } = await supabase
            .from('vacations')
            .select(`
              id,
              employee_id,
              start_date,
              return_date,
              days,
              notes,
              employees (
                id,
                name,
                team_id,
                teams (
                  id,
                  name
                )
              )
            `)
            .gt('return_date', todayStr)
            .order('start_date', { ascending: true });
          vacations = vacData || [];
        }
      }
    }

    if (!recipients || recipients.length === 0) {
      return res.status(400).json({ error: 'Nenhum destinatário informado ou ativo no sistema.' });
    }

    const cleanPassword = gmailPassword.replace(/\s+/g, '');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: cleanPassword,
      },
    });

    const emailHtml = buildReportEmailHtml({
      timeOffs: timeOffs || [],
      vacations: vacations || [],
      todayStr,
      frequencyLabel: 'Disparo Manual / Prévia',
    });

    const toList = recipients.map((r: any) => r.email).join(', ');

    await transporter.sendMail({
      from: `"Gestão de Folgas & Férias AMS" <${gmailUser}>`,
      to: toList,
      subject: `[TIME AMS] Relatório da Escala: Folgas e Férias da Equipe`,
      html: emailHtml,
    });

    return res.status(200).json({
      success: true,
      message: `Relatório enviado com sucesso para: ${toList}`,
      count: recipients.length,
      timeOffCount: (timeOffs || []).length,
      vacationCount: (vacations || []).length,
    });
  } catch (err: any) {
    console.error('Erro no envio via Gmail na Vercel Function:', err);
    return res.status(500).json({
      error: err.message || 'Falha ao conectar ou enviar via Gmail SMTP.',
    });
  }
}
