const nodemailer = require('nodemailer');

const mailService = {};

// Default recipient for Match Ready alerts
const DEFAULT_ALERT_RECIPIENT = 'brandstore111111@gmail.com';

/**
 * Creates and returns a configured nodemailer transporter.
 * Supports Gmail, custom SMTP, or any standard mail server.
 */
mailService.getTransporter = () => {
  const user = process.env.SMTP_USER || process.env.GMAIL_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASS || process.env.EMAIL_PASSWORD;

  if (!user || !pass) {
    return null;
  }

  // If host is explicitly set (e.g., custom SMTP server)
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '465', 10),
      secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
      auth: { user, pass },
    });
  }

  // Default: Gmail SMTP service
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
};

/**
 * Send an email alert to brandstore111111@gmail.com when a match gets full and ready to play.
 */
mailService.sendMatchReadyAlert = async (tournament) => {
  const recipient = process.env.ADMIN_ALERT_EMAIL || DEFAULT_ALERT_RECIPIENT;
  const clientUrl = process.env.CLIENT_URL || 'https://localesport.in';
  const adminConsoleUrl = `${clientUrl}/admin`;

  const matchId = tournament.id;
  const title = tournament.title || `Match #${matchId}`;
  const game = tournament.game_name || 'Free Fire';
  const format = (tournament.format || '1v1').toUpperCase();
  const prizePool = tournament.prize_pool || 0;
  const mapName = tournament.map_name || 'Bermuda';
  const totalSlots = tournament.total_slots || (tournament.total_teams * (tournament.players_per_team || 1));
  const startTime = tournament.match_start_at
    ? new Date(tournament.match_start_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
    : 'Upcoming';

  console.log(`\n======================================================`);
  console.log(`🚨 [MATCH READY ALERT] Tournament #${matchId} IS 100% FULL!`);
  console.log(`Title: ${title} | Format: ${format} | Game: ${game}`);
  console.log(`Target Email: ${recipient}`);
  console.log(`======================================================\n`);

  const transporter = mailService.getTransporter();
  if (!transporter) {
    console.warn(
      `[MAIL NOTICE] Email alert for Match #${matchId} not dispatched because SMTP credentials are not configured in BE/.env.\n` +
      `To send live emails to ${recipient}, please add SMTP_USER and SMTP_PASS (Gmail App Password) in your BE/.env file.`
    );
    return {
      status: false,
      message: 'SMTP credentials not configured in .env',
      loggedOnly: true,
    };
  }

  const senderEmail = process.env.SMTP_USER || process.env.GMAIL_USER || 'no-reply@localesport.in';

  const mailOptions = {
    from: `"LocalEsport Organizer Bot" <${senderEmail}>`,
    to: recipient,
    subject: `🚨 [ACTION REQUIRED] Match #${matchId} is FULL & READY TO PLAY! (${title})`,
    text: `LocalEsport Match Alert!\n\nMatch #${matchId} ("${title}") is now 100% FULL and READY TO PLAY!\n\n` +
          `Game: ${game}\n` +
          `Format: ${format}\n` +
          `Total Capacity: ${totalSlots} Players\n` +
          `Prize Pool: ₹${prizePool}\n` +
          `Map: ${mapName}\n` +
          `Scheduled Start: ${startTime}\n\n` +
          `ACTION REQUIRED:\n` +
          `Please create the Custom Room in Free Fire/BGMI and share the Room ID & Password with players in the Admin Console:\n` +
          `${adminConsoleUrl}\n\n` +
          `— LocalEsport Automated Tournament Engine`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Match Ready Alert</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #07070a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e4e4e7;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #07070a; padding: 30px 15px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #0d0e14; border: 1px solid #27272a; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.6);">
                
                <!-- Header Banner -->
                <tr>
                  <td style="background: linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%); padding: 24px 30px; text-align: left;">
                    <div style="display: inline-block; background-color: rgba(0, 0, 0, 0.35); padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; color: #6ee7b7; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                      ⚡ LOCALESPORT LIVE ALERT
                    </div>
                    <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">
                      Match #${matchId} is 100% Full!
                    </h1>
                    <p style="margin: 6px 0 0; font-size: 13px; color: #d1fae5;">
                      All player slots are filled and participants are waiting for Room Credentials.
                    </p>
                  </td>
                </tr>

                <!-- Content Body -->
                <tr>
                  <td style="padding: 26px 30px;">
                    <h2 style="margin: 0 0 16px; font-size: 18px; font-weight: 800; color: #ffffff;">
                      ${title}
                    </h2>

                    <!-- Match Specs Table -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #13141c; border: 1px solid #27272a; border-radius: 12px; margin-bottom: 24px;">
                      <tr>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #1f2029; font-size: 12px; color: #a1a1aa; font-weight: 600;">Game</td>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #1f2029; font-size: 13px; color: #ffffff; font-weight: 800; text-align: right;">${game}</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #1f2029; font-size: 12px; color: #a1a1aa; font-weight: 600;">Format</td>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #1f2029; font-size: 13px; color: #ffffff; font-weight: 800; text-align: right;">${format}</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #1f2029; font-size: 12px; color: #a1a1aa; font-weight: 600;">Slots Filled</td>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #1f2029; font-size: 13px; color: #10b981; font-weight: 800; text-align: right;">${totalSlots} / ${totalSlots} (100% FULL)</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #1f2029; font-size: 12px; color: #a1a1aa; font-weight: 600;">Prize Pool</td>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #1f2029; font-size: 14px; color: #fbbf24; font-weight: 900; text-align: right;">₹${prizePool}</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #1f2029; font-size: 12px; color: #a1a1aa; font-weight: 600;">Map</td>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #1f2029; font-size: 13px; color: #ffffff; font-weight: 800; text-align: right;">${mapName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 16px; font-size: 12px; color: #a1a1aa; font-weight: 600;">Match Schedule</td>
                        <td style="padding: 12px 16px; font-size: 13px; color: #ffffff; font-weight: 800; text-align: right;">${startTime}</td>
                      </tr>
                    </table>

                    <!-- Organizer Action Box -->
                    <div style="background-color: #171822; border-left: 4px solid #10b981; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                      <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #e4e4e7;">
                        <strong>Action Needed:</strong> Create the Custom Room in Free Fire or PUBG Mobile, then click the button below to publish the <strong>Room ID and Password</strong>. Once added, all players receive an automated instant push notification to join!
                      </p>
                    </div>

                    <!-- Call To Action Button -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 6px 0 10px;">
                          <a href="${adminConsoleUrl}" target="_blank" style="display: inline-block; background-color: #10b981; color: #000000; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);">
                            Open Admin Console &amp; Share Room ID →
                          </a>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #090a0e; border-top: 1px solid #1f2029; padding: 18px 30px; text-align: center;">
                    <p style="margin: 0; font-size: 11px; color: #71717a;">
                      This is an automated alert generated by the LocalEsport Competitive Arena engine.<br>
                      Notification destination: <strong>${recipient}</strong>
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[MAIL SUCCESS] Match Ready email sent to ${recipient}! Message ID: ${info.messageId}`);
    return { status: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[MAIL ERROR] Failed to send email to ${recipient}:`, err.message);
    return { status: false, error: err.message };
  }
};

module.exports = mailService;

