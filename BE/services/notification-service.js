const webpush = require('web-push');
const db = require('../connection');

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BNZ_3fCNICzmGUzocUJrOTaD8D9I4Z4V1Zn9NOQcdEZREPZqlXDt1ihDIrA4FD7RT19whtZGt5UGNOAozWg7qm4';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '78plGsEtqZyDkO4udPFYrHVqDQePvD1qcJxWVNitHBw';
const VAPID_MAILTO = process.env.VAPID_MAILTO || 'mailto:support@localesport.in';

try {
  webpush.setVapidDetails(VAPID_MAILTO, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log('[NotificationService] VAPID configured successfully');
} catch (e) {
  console.error('[NotificationService] VAPID config error:', e);
}

const notificationService = {};

notificationService.getPublicKey = () => {
  return VAPID_PUBLIC_KEY;
};

/**
 * Save browser push subscription for a user
 */
notificationService.saveSubscription = async (userId, subscription) => {
  if (!userId || !subscription || !subscription.endpoint || !subscription.keys) {
    return { status: false, message: 'Invalid subscription payload' };
  }

  const { endpoint, keys } = subscription;
  const p256dh = keys.p256dh;
  const auth = keys.auth;

  if (!p256dh || !auth) {
    return { status: false, message: 'Missing encryption keys' };
  }

  try {
    // Auto-create push_subscriptions table if not present
    await db.promise().query(`
      CREATE TABLE IF NOT EXISTS \`push_subscriptions\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`user_id\` int NOT NULL,
        \`endpoint\` text NOT NULL,
        \`p256dh\` varchar(255) NOT NULL,
        \`auth\` varchar(255) NOT NULL,
        \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_user_endpoint\` (\`user_id\`,\`endpoint\`(190)),
        KEY \`idx_user_id\` (\`user_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    const query = `
      INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE p256dh = VALUES(p256dh), auth = VALUES(auth), updated_at = NOW()
    `;
    await db.promise().query(query, [userId, endpoint, p256dh, auth]);

    return { status: true, message: 'Subscription saved successfully' };
  } catch (error) {
    console.error('[NotificationService] Save subscription error:', error);
    return { status: false, message: error.message };
  }
};

/**
 * Dispatch web push notification to a list of subscriptions
 */
const sendPushToSubscription = async (sub, payloadStr) => {
  const pushConfig = {
    endpoint: sub.endpoint,
    keys: {
      p256dh: sub.p256dh,
      auth: sub.auth,
    },
  };

  try {
    await webpush.sendNotification(pushConfig, payloadStr, {
      TTL: 60 * 60 * 2, // 2 hours
      urgency: 'high',
    });
    return true;
  } catch (err) {
    console.warn(`[NotificationService] Push failed for endpoint (status ${err.statusCode}):`, err.message);
    // If subscription is expired or unsubscribed (404 or 410 Gone), remove from database
    if (err.statusCode === 404 || err.statusCode === 410) {
      try {
        await db.promise().query('DELETE FROM push_subscriptions WHERE id = ?', [sub.id]);
        console.log(`[NotificationService] Pruned expired subscription ID #${sub.id}`);
      } catch (delErr) {
        // ignore
      }
    }
    return false;
  }
};

/**
 * Dispatch notification to all devices belonging to a single user
 */
notificationService.sendToUser = async (userId, payload) => {
  try {
    const [subs] = await db.promise().query(
      'SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?',
      [userId]
    );

    if (!subs || subs.length === 0) return { delivered: 0 };

    const payloadStr = JSON.stringify(payload);
    let delivered = 0;
    for (const sub of subs) {
      const ok = await sendPushToSubscription(sub, payloadStr);
      if (ok) delivered++;
    }
    return { delivered };
  } catch (err) {
    console.error('[NotificationService] sendToUser error:', err);
    return { delivered: 0, error: err.message };
  }
};

/**
 * Dispatch notification to all participants of a tournament (Team Leaders & Squad Members)
 */
notificationService.sendToTournamentParticipants = async (tournamentId, payload) => {
  try {
    const query = `
      SELECT DISTINCT u.id as user_id
      FROM tournaments t
      JOIN tournament_teams tt ON tt.tournament_id = t.id
      LEFT JOIN tournament_participants tp ON tp.team_id = tt.id
      JOIN users u ON (u.id = tt.leader_user_id OR u.id = tp.user_id)
      WHERE t.id = ?
    `;

    const [users] = await db.promise().query(query, [tournamentId]);
    if (!users || users.length === 0) {
      console.log(`[NotificationService] No registered users found for tournament #${tournamentId}`);
      return { recipientCount: 0, delivered: 0 };
    }

    const userIds = users.map((u) => u.user_id);
    const [subs] = await db.promise().query(
      'SELECT id, user_id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id IN (?)',
      [userIds]
    );

    console.log(`[NotificationService] Sending push to ${subs.length} active subscription(s) across ${userIds.length} participant(s) for Match #${tournamentId}`);

    const payloadStr = JSON.stringify(payload);
    let delivered = 0;
    for (const sub of subs) {
      const ok = await sendPushToSubscription(sub, payloadStr);
      if (ok) delivered++;
    }

    return { recipientCount: userIds.length, subscriptionsCount: subs.length, delivered };
  } catch (err) {
    console.error('[NotificationService] sendToTournamentParticipants error:', err);
    return { recipientCount: 0, delivered: 0, error: err.message };
  }
};

module.exports = notificationService;
