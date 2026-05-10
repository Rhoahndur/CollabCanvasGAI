const admin = require('firebase-admin');

const DEFAULT_AI_QUOTA_PER_MINUTE = 20;
const localQuotaMap = new Map();

function parseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw Object.assign(new Error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON'), {
      statusCode: 500,
      cause: error,
    });
  }
}

function getAdmin() {
  if (admin.apps.length > 0) {
    return admin;
  }

  const serviceAccount = parseServiceAccount();
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.VITE_FIREBASE_PROJECT_ID ||
    serviceAccount?.project_id;
  const databaseURL = process.env.FIREBASE_DATABASE_URL || process.env.VITE_FIREBASE_DATABASE_URL;

  const options = {};
  if (serviceAccount) {
    options.credential = admin.credential.cert(serviceAccount);
  }
  if (projectId) {
    options.projectId = projectId;
  }
  if (databaseURL) {
    options.databaseURL = databaseURL;
  }

  admin.initializeApp(options);
  return admin;
}

function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header || typeof header !== 'string' || !header.startsWith('Bearer ')) {
    throw Object.assign(new Error('Authentication required'), { statusCode: 401 });
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    throw Object.assign(new Error('Authentication required'), { statusCode: 401 });
  }

  return token;
}

async function verifyAuthenticatedUser(req) {
  const token = getBearerToken(req);

  try {
    const decoded = await getAdmin().auth().verifyIdToken(token);
    if (!decoded?.uid) {
      throw Object.assign(new Error('Invalid authentication token'), { statusCode: 401 });
    }
    return decoded;
  } catch (error) {
    if (error.statusCode) throw error;
    throw Object.assign(new Error('Invalid authentication token'), {
      statusCode: 401,
      cause: error,
    });
  }
}

function enforceLocalQuota(uid, quotaMax, now) {
  const windowStart = Math.floor(now / 60_000) * 60_000;
  const key = `${uid}:${windowStart}`;
  const count = localQuotaMap.get(key) || 0;

  if (count >= quotaMax) {
    throw Object.assign(new Error('AI quota exceeded. Try again later.'), { statusCode: 429 });
  }

  localQuotaMap.set(key, count + 1);

  for (const existingKey of localQuotaMap.keys()) {
    const [, existingWindowStart] = existingKey.split(':');
    if (Number(existingWindowStart) < windowStart - 60_000) {
      localQuotaMap.delete(existingKey);
    }
  }
}

async function enforceAiQuota(uid) {
  const quotaMax = Number(process.env.AI_QUOTA_PER_MINUTE || DEFAULT_AI_QUOTA_PER_MINUTE);
  if (!Number.isFinite(quotaMax) || quotaMax <= 0) return;

  const now = Date.now();
  const windowStart = Math.floor(now / 60_000) * 60_000;

  try {
    const adminInstance = getAdmin();
    const usageRef = adminInstance.database().ref(`aiUsage/${uid}/${windowStart}`);
    const result = await usageRef.transaction((current) => {
      const count = current?.count || 0;
      if (count >= quotaMax) {
        return;
      }

      return {
        count: count + 1,
        windowStart,
        updatedAt: adminInstance.database.ServerValue.TIMESTAMP,
      };
    });

    if (!result.committed) {
      throw Object.assign(new Error('AI quota exceeded. Try again later.'), { statusCode: 429 });
    }
  } catch (error) {
    if (error.statusCode === 429) throw error;

    if (
      process.env.NODE_ENV !== 'production' ||
      process.env.ALLOW_IN_MEMORY_AI_QUOTA_FALLBACK === 'true'
    ) {
      enforceLocalQuota(uid, quotaMax, now);
      return;
    }

    throw Object.assign(new Error('AI quota check is unavailable'), {
      statusCode: 503,
      cause: error,
    });
  }
}

module.exports = {
  verifyAuthenticatedUser,
  enforceAiQuota,
};
