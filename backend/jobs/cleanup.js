import Listing from '../models/Listing.js';

/**
 * Cleanup job to mark expired listings as 'expired' status
 * Runs daily at midnight to update listings where pickupWindowEnd has passed
 * Listings are NOT deleted - they remain in the database for historical purposes
 * (e.g., showing in user profiles), but are filtered out from Buy page listings
 */
export const cleanupExpiredListings = async () => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Find all active listings where pickupWindowEnd has passed (before today at midnight)
    // Update their status to 'expired' instead of deleting them
    // This preserves listings for historical purposes (profile page, orders, etc.)
    const result = await Listing.updateMany(
      {
        pickupWindowEnd: { $lt: today },
        status: { $ne: 'expired' } // Only update listings that aren't already expired
      },
      {
        $set: { status: 'expired' }
      }
    );

    console.log(`[Cleanup Job] Marked ${result.modifiedCount} listing(s) as expired at ${now.toISOString()}`);
    return result.modifiedCount;
  } catch (error) {
    console.error('[Cleanup Job] Error cleaning up expired listings:', error);
    throw error;
  }
};

/**
 * Schedule cleanup job to run daily at midnight
 * Uses setTimeout to schedule the next cleanup at midnight, then repeats every 24 hours
 */
export const scheduleDailyCleanup = () => {
  console.log('[Cleanup Job] Daily cleanup scheduler started');

  // Calculate milliseconds until next midnight
  const getMillisecondsUntilMidnight = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime() - now.getTime();
  };

  // Function to run cleanup and schedule next one
  const runCleanupAndScheduleNext = () => {
    cleanupExpiredListings()
      .then(() => {
        // Schedule next cleanup for 24 hours later (midnight tomorrow)
        setTimeout(runCleanupAndScheduleNext, 24 * 60 * 60 * 1000);
      })
      .catch(err => {
        console.error('[Cleanup Job] Error in scheduled cleanup:', err);
        // Still schedule next cleanup even if this one failed
        setTimeout(runCleanupAndScheduleNext, 24 * 60 * 60 * 1000);
      });
  };

  // Run cleanup immediately on startup (for listings that expired before server started)
  cleanupExpiredListings().catch(err => {
    console.error('[Cleanup Job] Error in initial cleanup:', err);
  });

  // Schedule first cleanup at midnight, then it will repeat every 24 hours
  const msUntilMidnight = getMillisecondsUntilMidnight();
  setTimeout(runCleanupAndScheduleNext, msUntilMidnight);
  
  console.log(`[Cleanup Job] Next cleanup scheduled in ${Math.round(msUntilMidnight / 1000 / 60)} minutes`);
};

