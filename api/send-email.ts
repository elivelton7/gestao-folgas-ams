import type { IncomingMessage, ServerResponse } from 'http';
import nodemailer from 'nodemailer';

export default async function handler(req: any, res: any) {
  // Configuração de CORS para permitir requisições da própria aplicação
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  try {
    const gmailUser = process.env.GMAIL_USER;
    const gmailPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailPassword) {
      return res.status(400).json({
        error: 'Credenciais do Gmail não configuradas nas Environment Variables da Vercel (GMAIL_USER e GMAIL_APP_PASSWORD).',
      });
    }

    const { recipients, timeOffs } = req.body || {};

    if (!recipients || recipients.length === 0) {
      return res.status(400).json({ error: 'Nenhum destinatário informado.' });
    }

    const cleanPassword = gmailPassword.replace(/\s+/g, '');

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: cleanPassword,
      },
    });

    const rowsHtml = (timeOffs || [])
      .map((item: any) => {
        const teamName = item.employees?.teams?.name || 'Geral';
        const employeeName = item.employees?.name || 'Colaborador';
        const dateParts = (item.date || '').split('-');
        const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : item.date;
        const typeText = item.is_full_day ? 'Dia Inteiro' : `${item.hours}h`;
        const desc = item.description || '-';

        return `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 12px; font-weight: bold; color: #0f172a;">${employeeName}</td>
            <td style="padding: 10px 12px; color: #2563eb; font-weight: 600;">${teamName}</td>
            <td style="padding: 10px 12px; font-family: monospace; color: #334155;">${formattedDate}</td>
            <td style="padding: 10px 12px; color: #059669; font-weight: 600;">${typeText}</td>
            <td style="padding: 10px 12px; color: #64748b;">${desc}</td>
          </tr>
        `;
      })
      .join('');

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #2563eb, #4f46e5); padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">Gestão de Folgas • TIME AMS</h1>
          <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">Relatório Atualizado da Escala de Ausências da Equipe</p>
        </div>
        
        <div style="padding: 24px;">
          <p style="color: #334155; font-size: 14px; margin-top: 0;">
            Olá! Segue a relação atualizada das próximas folgas e compensações cadastradas no sistema:
          </p>

          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; margin: 20px 0;">
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
              ${rowsHtml || '<tr><td colspan="5" style="text-align: center; padding: 16px; color: #94a3b8;">Nenhuma folga agendada no momento.</td></tr>'}
            </tbody>
          </table>

          <div style="background-color: #f1f5f9; padding: 14px; border-radius: 10px; margin-top: 20px; font-size: 12px; color: #475569;">
            ℹ️ <em>Este e-mail é gerado automaticamente pelo sistema de Gestão de Folgas do Time AMS.</em>
          </div>
        </div>

        <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px; text-align: center; font-size: 11px; color: #94a3b8;">
          TIME AMS • Notificação Confidencial Interna
        </div>
      </div>
    `;

    const toList = recipients.map((r: any) => r.email).join(', ');

    await transporter.sendMail({
      from: `"Gestão de Folgas AMS" <${gmailUser}>`,
      to: toList,
      subject: `[TIME AMS] Relatório de Folgas da Equipe`,
      html: emailHtml,
    });

    return res.status(200).json({
      success: true,
      message: `Relatório enviado com sucesso para: ${toList}`,
      count: recipients.length,
    });
  } catch (err: any) {
    console.error('Erro no envio via Gmail na Vercel Function:', err);
    return res.status(500).json({
      error: err.message || 'Falha ao conectar ou enviar via Gmail SMTP.',
    });
  }
}
