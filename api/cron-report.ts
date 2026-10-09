import type { IncomingMessage, ServerResponse } from 'http';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

// Função para obter a data atual no fuso horário do Brasil (America/Sao_Paulo)
function getBrazilDateString(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date()); // Formato YYYY-MM-DD
}

function getBrazilDayOfWeek(): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'short',
  }).format(new Date()); // "Mon", "Tue", etc.
}

export function buildReportEmailHtml({
  timeOffs,
  vacations,
  todayStr,
  frequencyLabel = 'Atualizado',
}: {
  timeOffs: any[];
  vacations: any[];
  todayStr: string;
  frequencyLabel?: string;
}) {
  // 1. Filtrar somente férias em curso e próximas (exclui passadas onde return_date <= todayStr)
  const validVacations = (vacations || [])
    .filter((item: any) => {
      if (!item.start_date || !item.return_date) return false;
      return item.return_date > todayStr;
    })
    .sort((a: any, b: any) => {
      const isACurrent = a.start_date <= todayStr && todayStr < a.return_date;
      const isBCurrent = b.start_date <= todayStr && todayStr < b.return_date;
      if (isACurrent && !isBCurrent) return -1;
      if (!isACurrent && isBCurrent) return 1;
      if (isACurrent && isBCurrent) return a.return_date.localeCompare(b.return_date);
      return a.start_date.localeCompare(b.start_date);
    });

  // Linhas das Férias
  const vacationRowsHtml = validVacations
    .map((item: any) => {
      const isCurrent = item.start_date <= todayStr && todayStr < item.return_date;
      const statusBadge = isCurrent
        ? '<span style="display: inline-block; padding: 4px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700; background-color: #fef3c7; color: #b45309; border: 1px solid #fde68a;">🟡 EM CURSO</span>'
        : '<span style="display: inline-block; padding: 4px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700; background-color: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe;">🔵 PRÓXIMA</span>';

      const employeeName = item.employees?.name || 'Colaborador';
      const teamName = item.employees?.teams?.name || 'Geral';

      const formatBR = (d: string) => {
        const parts = (d || '').split('-');
        return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : d;
      };

      const period = `${formatBR(item.start_date)} até ${formatBR(item.return_date)}`;
      const days = `${item.days} ${item.days === 1 ? 'dia' : 'dias'}`;
      const notes = item.notes || '-';

      return `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px 12px; white-space: nowrap;">${statusBadge}</td>
          <td style="padding: 10px 12px; font-weight: 700; color: #0f172a;">${employeeName}</td>
          <td style="padding: 10px 12px; color: #2563eb; font-weight: 600;">${teamName}</td>
          <td style="padding: 10px 12px; font-family: monospace; color: #334155; white-space: nowrap;">${period}</td>
          <td style="padding: 10px 12px; color: #0f766e; font-weight: 600;">${days}</td>
          <td style="padding: 10px 12px; color: #64748b; font-size: 12px;">${notes}</td>
        </tr>
      `;
    })
    .join('');

  // Linhas das Folgas
  const timeOffRowsHtml = (timeOffs || [])
    .map((item: any) => {
      const employeeName = item.employees?.name || 'Colaborador';
      const teamName = item.employees?.teams?.name || 'Geral';
      const parts = (item.date || '').split('-');
      const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : item.date;
      const typeText = item.is_full_day ? 'Dia Inteiro' : `${item.hours}h`;
      const desc = item.description || '-';

      return `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px 12px; font-weight: 700; color: #0f172a;">${employeeName}</td>
          <td style="padding: 10px 12px; color: #2563eb; font-weight: 600;">${teamName}</td>
          <td style="padding: 10px 12px; font-family: monospace; color: #334155;">${formattedDate}</td>
          <td style="padding: 10px 12px; color: #059669; font-weight: 600;">${typeText}</td>
          <td style="padding: 10px 12px; color: #64748b;">${desc}</td>
        </tr>
      `;
    })
    .join('');

  const [tY, tM, tD] = todayStr.split('-');
  const formattedToday = `${tD}/${tM}/${tY}`;

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 720px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #1e3a8a, #2563eb); padding: 26px 20px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Gestão de Folgas & Férias • TIME AMS</h1>
        <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.95;">Relatório da Escala de Ausências da Equipe (${frequencyLabel})</p>
        <p style="margin: 4px 0 0 0; font-size: 11px; opacity: 0.75;">Data de referência: ${formattedToday}</p>
      </div>

      <div style="padding: 24px;">
        <!-- Seção 1: Férias da Equipe -->
        <div style="margin-bottom: 30px;">
          <div style="margin-bottom: 12px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
            <h2 style="margin: 0; font-size: 15px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px;">
              🏖️ Programação de Férias (Em Curso & Próximas)
            </h2>
          </div>
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; margin: 8px 0;">
            <thead>
              <tr style="background-color: #f8fafc; border-bottom: 2px solid #cbd5e1; text-transform: uppercase; font-size: 11px; color: #64748b;">
                <th style="padding: 10px 12px;">Status</th>
                <th style="padding: 10px 12px;">Colaborador</th>
                <th style="padding: 10px 12px;">Time</th>
                <th style="padding: 10px 12px;">Período</th>
                <th style="padding: 10px 12px;">Duração</th>
                <th style="padding: 10px 12px;">Observações</th>
              </tr>
            </thead>
            <tbody>
              ${vacationRowsHtml || '<tr><td colspan="6" style="text-align: center; padding: 18px; color: #94a3b8; font-style: italic;">Nenhuma férias em curso ou próxima programada no momento.</td></tr>'}
            </tbody>
          </table>
        </div>

        <!-- Seção 2: Folgas Agendadas -->
        <div style="margin-bottom: 20px;">
          <div style="margin-bottom: 12px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
            <h2 style="margin: 0; font-size: 15px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px;">
              📅 Próximas Folgas & Compensações
            </h2>
          </div>
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; margin: 8px 0;">
            <thead>
              <tr style="background-color: #f8fafc; border-bottom: 2px solid #cbd5e1; text-transform: uppercase; font-size: 11px; color: #64748b;">
                <th style="padding: 10px 12px;">Colaborador</th>
                <th style="padding: 10px 12px;">Time</th>
                <th style="padding: 10px 12px;">Data</th>
                <th style="padding: 10px 12px;">Tipo</th>
                <th style="padding: 10px 12px;">Descrição</th>
              </tr>
            </thead>
            <tbody>
              ${timeOffRowsHtml || '<tr><td colspan="5" style="text-align: center; padding: 18px; color: #94a3b8; font-style: italic;">Nenhuma folga agendada no momento.</td></tr>'}
            </tbody>
          </table>
        </div>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 14px; border-radius: 10px; margin-top: 24px; font-size: 12px; color: #475569;">
          ℹ️ <em>Este e-mail é gerado automaticamente pelo sistema de Gestão de Folgas & Férias do Time AMS. Disparos programados para às 08:00 (Horário de Brasília).</em>
        </div>
      </div>

      <div style="background-color: #f1f5f9; border-top: 1px solid #e2e8f0; padding: 14px; text-align: center; font-size: 11px; color: #94a3b8;">
        TIME AMS • Notificação Confidencial Interna
      </div>
    </div>
  `;
}

export default async function handler(req: any, res: any) {
  // Configuração de CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
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

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(400).json({
        error: 'Variáveis de conexão com o Supabase não encontradas (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY).',
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const todayStr = getBrazilDateString();
    const isMonday = getBrazilDayOfWeek() === 'Mon';

    // Determina a frequência a ser disparada
    const queryFreq = (req.query?.frequency as string)?.toUpperCase();
    let targetFrequencies: string[] = [];

    if (queryFreq === 'DAILY') {
      targetFrequencies = ['DAILY'];
    } else if (queryFreq === 'WEEKLY') {
      targetFrequencies = ['WEEKLY'];
    } else if (queryFreq === 'ALL') {
      targetFrequencies = ['DAILY', 'WEEKLY', 'REALTIME'];
    } else {
      // Disparo automático padrão (Vercel Cron diário às 08:00 BRT):
      // Às segundas-feiras, dispara para DAILY e WEEKLY. Nos demais dias, dispara para DAILY.
      targetFrequencies = isMonday ? ['DAILY', 'WEEKLY'] : ['DAILY'];
    }

    // 1. Busca os destinatários ativos configurados para a frequência
    const { data: recipients, error: recError } = await supabase
      .from('report_recipients')
      .select('id, name, email, frequency, is_active')
      .eq('is_active', true)
      .in('frequency', targetFrequencies);

    if (recError) {
      console.error('Erro ao buscar destinatários no Supabase:', recError);
      return res.status(500).json({ error: `Erro no Supabase: ${recError.message}` });
    }

    if (!recipients || recipients.length === 0) {
      return res.status(200).json({
        success: true,
        message: `Nenhum destinatário ativo encontrado para a frequência [${targetFrequencies.join(', ')}].`,
        count: 0,
      });
    }

    // 2. Busca folgas futuras ou de hoje
    const { data: timeOffs, error: timeOffError } = await supabase
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

    if (timeOffError) {
      console.warn('Erro ao consultar folgas no Supabase:', timeOffError.message);
    }

    // 3. Busca férias (somente em curso ou próximas: return_date > todayStr)
    const { data: vacations, error: vacError } = await supabase
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

    if (vacError) {
      console.warn('Aviso: Tabela vacations pode não estar criada ou sem registros:', vacError.message);
    }

    const frequencyLabel = targetFrequencies.includes('WEEKLY') && !targetFrequencies.includes('DAILY')
      ? 'Relatório Semanal'
      : targetFrequencies.includes('DAILY') && !targetFrequencies.includes('WEEKLY')
      ? 'Relatório Diário'
      : 'Relatório Diário / Semanal';

    const emailHtml = buildReportEmailHtml({
      timeOffs: timeOffs || [],
      vacations: vacations || [],
      todayStr,
      frequencyLabel,
    });

    const cleanPassword = gmailPassword.replace(/\s+/g, '');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: cleanPassword,
      },
    });

    const toList = recipients.map((r: any) => r.email).join(', ');

    await transporter.sendMail({
      from: `"Gestão de Folgas & Férias AMS" <${gmailUser}>`,
      to: toList,
      subject: `[TIME AMS] ${frequencyLabel}: Folgas e Férias da Equipe`,
      html: emailHtml,
    });

    return res.status(200).json({
      success: true,
      message: `Relatório automatizado (${frequencyLabel}) enviado com sucesso para ${recipients.length} destinatário(s): ${toList}`,
      recipientCount: recipients.length,
      timeOffCount: (timeOffs || []).length,
      vacationCount: (vacations || []).length,
    });
  } catch (err: any) {
    console.error('Erro ao executar cron-report:', err);
    return res.status(500).json({
      error: err.message || 'Falha ao processar relatório automatizado.',
    });
  }
}
