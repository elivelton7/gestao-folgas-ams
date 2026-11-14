import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import {
  buildReportEmailHtml,
  extractRecipientTeamIds,
  filterRecordsByTeams,
} from './cron-report';

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
    const teamsFromBody = req.body?.teams || [];

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey =
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    const teamNameMap = new Map<string, string>();
    (teamsFromBody || []).forEach((t: any) => {
      if (t?.id && t?.name) teamNameMap.set(t.id, t.name);
    });

    // Se a requisição não trouxer destinatários ou for GET, busca diretamente do Supabase
    if ((!recipients || recipients.length === 0) && supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: recData } = await supabase
        .from('report_recipients')
        .select('id, name, email, frequency, is_active')
        .eq('is_active', true);

      recipients = recData || [];

      if (teamNameMap.size === 0) {
        const { data: allTeams } = await supabase.from('teams').select('id, name');
        (allTeams || []).forEach((t: any) => teamNameMap.set(t.id, t.name));
      }

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

    if (!recipients || recipients.length === 0) {
      return res.status(400).json({ error: 'Nenhum destinatário informado ou ativo no sistema.' });
    }

    // Popula nomes das equipes também a partir dos registros de folgas e férias recebidos
    for (const item of [...(timeOffs || []), ...(vacations || [])]) {
      const tId = item?.employees?.team_id || item?.employees?.teams?.id;
      const tName = item?.employees?.teams?.name;
      if (tId && tName && !teamNameMap.has(tId)) {
        teamNameMap.set(tId, tName);
      }
    }

    const cleanPassword = gmailPassword.replace(/\s+/g, '');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: cleanPassword,
      },
    });

    // Agrupa destinatários pelas equipes configuradas para enviar a cada pessoa apenas as equipes que ela escolheu
    const groups = new Map<string, { emails: string[]; teamIds: string[] }>();
    for (const r of recipients) {
      const tIds = extractRecipientTeamIds(r).sort();
      const key = tIds.length === 0 ? '__ALL__' : tIds.join(',');
      const current = groups.get(key) || { emails: [], teamIds: tIds };
      current.emails.push(r.email);
      groups.set(key, current);
    }

    const allSentEmails: string[] = [];

    for (const [, group] of groups.entries()) {
      const filteredTO = filterRecordsByTeams(timeOffs || [], group.teamIds);
      const filteredVac = filterRecordsByTeams(vacations || [], group.teamIds);

      const teamsScopeLabel =
        group.teamIds.length === 0
          ? 'Todas as Equipes'
          : group.teamIds.map((id) => teamNameMap.get(id) || id).join(', ');

      const emailHtml = buildReportEmailHtml({
        timeOffs: filteredTO,
        vacations: filteredVac,
        todayStr,
        frequencyLabel: 'Disparo Manual / Prévia',
        teamsScopeLabel,
      });

      const toList = group.emails.join(', ');
      await transporter.sendMail({
        from: `"Gestão de Folgas & Férias AMS" <${gmailUser}>`,
        to: toList,
        subject: `[TIME AMS] Relatório da Escala: Folgas e Férias (${teamsScopeLabel})`,
        html: emailHtml,
      });

      allSentEmails.push(...group.emails);
    }

    return res.status(200).json({
      success: true,
      message: `Relatório enviado com sucesso para: ${allSentEmails.join(', ')}`,
      count: allSentEmails.length,
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
