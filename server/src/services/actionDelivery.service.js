import { config } from '../config/env.js';
import { sendBulkEmail } from './mailer.js';

const skipped = (channel, reason) => ({ channel, status: 'skipped', reason });

export async function deliverAction({ action, recipient, journey, institution }) {
  const requested = new Set(action.reminderChannels ?? ['in-app']);
  const report = requested.has('in-app')
    ? [{ channel: 'in-app', status: 'recorded' }]
    : [];

  if (requested.has('email')) {
    if (!journey?.channels?.email) report.push(skipped('email', 'The student has not opted into email reminders.'));
    else if (!institution?.providers?.email) report.push(skipped('email', 'The institution has not enabled an email provider.'));
    else {
      const [result] = await sendBulkEmail({
        recipients: [{ email: recipient.email }],
        subject: `Student OS action: ${action.title}`,
        text: [action.title, action.description, action.dueAt ? `Due: ${new Date(action.dueAt).toLocaleString('en-IN')}` : '', action.link ? `Open: ${config.clientUrl}${action.link}` : ''].filter(Boolean).join('\n\n'),
      });
      report.push({ channel: 'email', status: result.status, reason: result.error });
    }
  }

  if (requested.has('whatsapp')) {
    if (!journey?.channels?.whatsapp) report.push(skipped('whatsapp', 'The student has not opted into WhatsApp reminders.'));
    else if (!institution?.providers?.whatsapp || !config.whatsapp.webhookUrl) report.push(skipped('whatsapp', 'No WhatsApp webhook is configured.'));
    else if (!recipient.phone) report.push(skipped('whatsapp', 'The student has no phone number on their private profile.'));
    else {
      try {
        const response = await fetch(config.whatsapp.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(config.whatsapp.token ? { Authorization: `Bearer ${config.whatsapp.token}` } : {}),
          },
          body: JSON.stringify({
            to: recipient.phone,
            template: 'student_os_action',
            variables: { title: action.title, description: action.description, dueAt: action.dueAt, link: `${config.clientUrl}${action.link || '/updates'}` },
          }),
          signal: AbortSignal.timeout(8_000),
        });
        report.push(response.ok ? { channel: 'whatsapp', status: 'sent' } : skipped('whatsapp', `Provider returned HTTP ${response.status}.`));
      } catch (error) {
        report.push({ channel: 'whatsapp', status: 'failed', reason: error.message.slice(0, 200) });
      }
    }
  }

  return report;
}
