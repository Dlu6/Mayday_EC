import redisClient from "../config/redis.js";
import { ClientSession } from "../models/licenseModel.js";
import { Op } from "../config/sequelize.js";

/**
 * Redis-based session management service
 * Provides atomic operations and better performance than database-only approach
 */

// Constants
const SESSION_PREFIX = "session:";
const USER_SESSION_PREFIX = "user_sessions:";
const FEATURE_COUNT_PREFIX = "feature_count:";
const SESSION_TTL = 24 * 60 * 60; // 24 hours in seconds

/**
 * Generate session key for Redis
 */
export const getSessionKey = (sessionId) => {
  return `${SESSION_PREFIX}${sessionId}`;
};

/**
 * Generate user sessions key for Redis
 */
export const getUserSessionsKey = (userId, feature) => {
  return `${USER_SESSION_PREFIX}${userId}:${feature}`;
};

/**
 * Generate feature count key for Redis
 */
export const getFeatureCountKey = (licenseId, feature) => {
  return `${FEATURE_COUNT_PREFIX}${licenseId}:${feature}`;
};

/**
 * Check if user has active session using Redis
 */
export const hasActiveSession = async (userId, feature) => {
  try {
    if (!redisClient?.isReady) {
      console.warn(
        "[RedisSession] Redis not available, falling back to database"
      );
      return await hasActiveSessionDB(userId, feature);
    }

    const key = getUserSessionsKey(userId, feature);
    const sessionIds = await redisClient.sMembers(key);

    if (sessionIds.length === 0) {
      return { hasSession: false, sessionId: null };
    }

    // Check if any of the sessions are still valid
    for (const sessionId of sessionIds) {
      const sessionKey = getSessionKey(sessionId);
      const exists = await redisClient.exists(sessionKey);
      if (exists) {
        return { hasSession: true, sessionId };
      } else {
        // Remove expired session from set
        await redisClient.sRem(key, sessionId);
      }
    }

    return { hasSession: false, sessionId: null };
  } catch (error) {
    console.error("[RedisSession] Error checking active session:", error);
    // Fallback to database
    return await hasActiveSessionDB(userId, feature);
  }
};

/**
 * Check if user has active session using database (fallback)
 */
export const hasActiveSessionDB = async (userId, feature) => {
  try {
    const activeSession = await ClientSession.findOne({
      where: {
        user_id: userId,
        feature,
        status: "active",
        expires_at: {
          [Op.gt]: new Date(),
        },
      },
      order: [["created_at", "DESC"]],
    });

    return {
      hasSession: !!activeSession,
      sessionId: activeSession?.session_token || null,
    };
  } catch (error) {
    console.error("[RedisSession] Database fallback error:", error);
    return { hasSession: false, sessionId: null };
  }
};

/**
 * Create new session with Redis and database backup
 */
export const createSession = async (sessionData) => {
  const {
    sessionId,
    userId,
    username,
    feature,
    licenseId,
    clientFingerprint,
    expiresAt,
  } = sessionData;

  try {
    // Try Redis first
    if (redisClient?.isReady) {
      const sessionKey = getSessionKey(sessionId);
      const userSessionsKey = getUserSessionsKey(userId, feature);
      const featureCountKey = getFeatureCountKey(licenseId, feature);

      // Use Redis pipeline for atomic operations
      const pipeline = redisClient.multi();

      // Store session data
      pipeline.hSet(sessionKey, {
        userId: String(userId),
        username: String(username),
        feature: String(feature),
        licenseId: String(licenseId),
        clientFingerprint: String(clientFingerprint),
        ipAddress: String(sessionData.ipAddress || "unknown"),
        userAgent: String(sessionData.userAgent || "unknown"),
        createdAt: new Date().toISOString(),
        lastHeartbeat: new Date().toISOString(),
        status: "active",
      });

      // Set TTL
      pipeline.expire(sessionKey, SESSION_TTL);

      // Add to user's session set
      pipeline.sAdd(userSessionsKey, sessionId);
      pipeline.expire(userSessionsKey, SESSION_TTL);

      // Increment feature count
      pipeline.incr(featureCountKey);
      pipeline.expire(featureCountKey, SESSION_TTL);

      await pipeline.exec();

      console.log(`[RedisSession] Session created in Redis: ${sessionId}`);
    }

    // Always backup to database
    await createSessionDB(sessionData);

    return {
      success: true,
      sessionId,
      message: "Session created successfully",
    };
  } catch (error) {
    console.error("[RedisSession] Error creating session:", error);
    throw new Error(`Failed to create session: ${error.message}`);
  }
};

/**
 * Create session in database (backup)
 */
export const createSessionDB = async (sessionData) => {
  const {
    sessionId,
    userId,
    username,
    feature,
    licenseId,
    clientFingerprint,
    expiresAt,
  } = sessionData;

  await ClientSession.create({
    session_token: sessionId,
    user_id: userId,
    username,
    feature,
    license_cache_id: licenseId,
    client_fingerprint: clientFingerprint,
    ip_address: sessionData.ipAddress || "unknown",
    user_agent: sessionData.userAgent || "unknown",
    status: "active",
    expires_at: expiresAt,
    last_heartbeat: new Date(),
  });

  console.log(`[RedisSession] Session backed up to database: ${sessionId}`);
};

/**
 * Update session heartbeat
 */
export const updateHeartbeat = async (sessionId) => {
  try {
    if (redisClient?.isReady) {
      const sessionKey = getSessionKey(sessionId);
      const exists = await redisClient.exists(sessionKey);

      if (exists) {
        await redisClient.hSet(
          sessionKey,
          "lastHeartbeat",
          new Date().toISOString()
        );
        await redisClient.expire(sessionKey, SESSION_TTL);
        console.log(
          `[RedisSession] Heartbeat updated for session: ${sessionId}`
        );
      }
    }

    // Also update database
    await ClientSession.update(
      { last_heartbeat: new Date() },
      {
        where: {
          session_token: sessionId,
          status: "active",
        },
      }
    );

    return { success: true };
  } catch (error) {
    console.error("[RedisSession] Error updating heartbeat:", error);
    return { success: false, error: error.message };
  }
};

/**
 * End session and cleanup
 */
export const endSession = async (sessionId, userId, feature) => {
  try {
    let licenseId = null;

    // Get license ID from Redis first
    if (redisClient?.isReady) {
      const sessionKey = getSessionKey(sessionId);
      const sessionData = await redisClient.hGetAll(sessionKey);
      licenseId = sessionData.licenseId;

      if (licenseId) {
        const userSessionsKey = getUserSessionsKey(userId, feature);
        const featureCountKey = getFeatureCountKey(licenseId, feature);

        // Use pipeline for atomic cleanup
        const pipeline = redisClient.multi();
        pipeline.del(sessionKey);
        pipeline.sRem(userSessionsKey, sessionId);
        pipeline.decr(featureCountKey);
        await pipeline.exec();

        console.log(
          `[RedisSession] Session cleaned up from Redis: ${sessionId}`
        );
      }
    }

    // Always cleanup database
    await endSessionDB(sessionId);

    return {
      success: true,
      message: "Session ended successfully",
    };
  } catch (error) {
    console.error("[RedisSession] Error ending session:", error);
    throw new Error(`Failed to end session: ${error.message}`);
  }
};

/**
 * End session in database
 */
export const endSessionDB = async (sessionId) => {
  const result = await ClientSession.update(
    {
      status: "expired",
      ended_at: new Date(),
    },
    {
      where: {
        session_token: sessionId,
        status: "active",
      },
    }
  );

  console.log(
    `[RedisSession] Session marked as expired in database: ${sessionId}`
  );
  return result;
};

/**
 * Get current feature count
 */
export const getFeatureCount = async (licenseId, feature) => {
  try {
    if (redisClient?.isReady) {
      const countKey = getFeatureCountKey(licenseId, feature);
      const count = await redisClient.get(countKey);
      if (count !== null) {
        return parseInt(count, 10);
      }
    }

    // Fallback to database count
    const count = await ClientSession.count({
      where: {
        license_cache_id: licenseId,
        feature,
        status: "active",
        expires_at: {
          [Op.gt]: new Date(),
        },
      },
    });

    return count;
  } catch (error) {
    console.error("[RedisSession] Error getting feature count:", error);
    return 0;
  }
};

/**
 * Validate session exists and matches fingerprint
 */
export const validateSession = async (sessionId, clientFingerprint) => {
  try {
    if (redisClient?.isReady) {
      const sessionKey = getSessionKey(sessionId);
      const sessionData = await redisClient.hGetAll(sessionKey);

      if (Object.keys(sessionData).length > 0) {
        const isValid = sessionData.clientFingerprint === clientFingerprint;
        return {
          valid: isValid,
          session: isValid ? sessionData : null,
        };
      }
    }

    // Fallback to database
    const session = await ClientSession.findOne({
      where: {
        session_token: sessionId,
        client_fingerprint: clientFingerprint,
        status: "active",
        expires_at: {
          [Op.gt]: new Date(),
        },
      },
    });

    return {
      valid: !!session,
      session: session || null,
    };
  } catch (error) {
    console.error("[RedisSession] Error validating session:", error);
    return { valid: false, session: null };
  }
};

/**
 * Cleanup expired sessions
 */
export const cleanupExpiredSessions = async () => {
  try {
    console.log("[RedisSession] Starting cleanup of expired sessions...");

    // Cleanup database sessions
    const expiredCount = await ClientSession.update(
      {
        status: "expired",
        ended_at: new Date(),
      },
      {
        where: {
          status: "active",
          expires_at: {
            [Op.lt]: new Date(),
          },
        },
      }
    );

    console.log(
      `[RedisSession] Marked ${expiredCount[0]} sessions as expired in database`
    );

    // Redis cleanup is handled by TTL automatically
    if (redisClient?.isReady) {
      // Could scan for expired keys if needed, but TTL should handle most cases
      console.log("[RedisSession] Redis cleanup handled by TTL");
    }

    return {
      success: true,
      expiredCount: expiredCount[0],
    };
  } catch (error) {
    console.error("[RedisSession] Error during cleanup:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Get all active sessions for debugging
 */
export const getActiveSessions = async (userId = null, feature = null) => {
  try {
    const whereClause = {
      status: "active",
      expires_at: {
        [Op.gt]: new Date(),
      },
    };

    if (userId) whereClause.user_id = userId;
    if (feature) whereClause.feature = feature;

    const sessions = await ClientSession.findAll({
      where: whereClause,
      order: [["created_at", "DESC"]],
    });

    return sessions;
  } catch (error) {
    console.error("[RedisSession] Error getting active sessions:", error);
    return [];
  }
};

// Export a default object for backward compatibility
export default {
  hasActiveSession,
  hasActiveSessionDB,
  createSession,
  createSessionDB,
  updateHeartbeat,
  endSession,
  endSessionDB,
  getFeatureCount,
  validateSession,
  cleanupExpiredSessions,
  getActiveSessions,
  getSessionKey,
  getUserSessionsKey,
  getFeatureCountKey,
};
