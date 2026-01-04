import express from "express";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import sequelize from "../config/sequelize.js";
import RecordingRating from "../models/recordingRatingModel.js";

const router = express.Router();
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// Add configurable recording base directory (same as in inboundRouteController.js)
const RECORDING_BASE_DIR =
  process.env.RECORDING_BASE_DIR || "/var/spool/asterisk/monitor";

// List recordings by date
router.get("/list/:year/:month/:day", async (req, res) => {
  try {
    const { year, month, day } = req.params;
    const recordingDir = path.join(RECORDING_BASE_DIR, year, month, day);

    // Check if directory exists - return empty array if not (no recordings for this date)
    try {
      await stat(recordingDir);
    } catch (error) {
      // Directory doesn't exist - this is normal, just means no recordings for this date
      return res.json({
        success: true,
        recordings: [],
        message: "No recordings found for this date",
      });
    }

    // Get recordings - support multiple formats (wav, mp3, gsm)
    const files = await readdir(recordingDir);
    const supportedFormats = [".wav", ".mp3", ".gsm"];
    const recordings = await Promise.all(
      files
        .filter((file) => supportedFormats.some((ext) => file.endsWith(ext)))
        .map(async (file) => {
          const filePath = path.join(recordingDir, file);
          const fileStat = await stat(filePath);

          // Parse filename to extract metadata
          // Supported patterns:
          // - queue-{queueName}-{uniqueid}.{format} (queue recordings)
          // - agent-{extension}-{uniqueid}.{format} (agent extension recordings)
          const parts = file.split("-");
          let type = "unknown";
          let identifier = "";

          if (parts.length >= 2) {
            type = parts[0]; // e.g., "queue", "agent"
            // The last part will contain the uniqueid with extension
            const fileExt = supportedFormats.find((ext) => file.endsWith(ext)) || ".wav";
            const uniqueId = parts[parts.length - 1].replace(fileExt, "");

            // For queue recordings, the queue name is the second part
            if (type === "queue" && parts.length >= 3) {
              identifier = parts[1];
            }
            // For agent recordings, the extension number is the second part
            else if (type === "agent" && parts.length >= 3) {
              identifier = parts[1]; // This is the extension number
            }
          }

          // Try to find call details in CDR if available
          let callDetails = null;
          let duration = 0;
          try {
            // Note: CDR table uses 'start' column instead of 'calldate'
            const cdr = await sequelize.query(
              `SELECT src, dst, disposition, billsec, duration as call_duration, start as calldate 
             FROM cdr 
             WHERE uniqueid = ? OR userfield LIKE ?`,
              {
                replacements: [
                  parts[parts.length - 1].replace(/\.(wav|mp3|gsm)$/, ""),
                  `%${file}%`,
                ],
                type: sequelize.QueryTypes.SELECT,
              }
            );

            if (cdr && cdr.length > 0) {
              callDetails = cdr[0];
              console.log("CDR details found for", file, ":", callDetails);
              // Use billsec first (actual talk time), fall back to duration (total call time)
              duration =
                callDetails.billsec > 0
                  ? callDetails.billsec
                  : callDetails.call_duration || 0;
            } else {
              console.log("No CDR details found for", file);
            }
          } catch (err) {
            console.error("Error fetching CDR info:", err);
          }

          // If we couldn't get duration from CDR, estimate from file size
          // Average WAV file size is about 85KB per minute for 8kHz 16-bit mono
          if (!duration && fileStat.size > 0) {
            // Rough approximation: 1.42KB per second for WAV files
            const estimatedSeconds = Math.round(fileStat.size / (1.42 * 1024));
            duration = estimatedSeconds > 0 ? estimatedSeconds : 0;
          }

          // Look up rating for this file
          let rating = null;
          let notes = null;
          try {
            const ratingRecord = await RecordingRating.findOne({
              where: {
                filename: file,
                path: path.join(year, month, day, file),
              },
            });

            if (ratingRecord) {
              rating = ratingRecord.rating;
              notes = ratingRecord.notes;
            }
          } catch (err) {
            console.error("Error fetching rating:", err);
          }

          return {
            filename: file,
            path: `/api/recordings/play/${year}/${month}/${day}/${file}`,
            downloadUrl: `/api/recordings/download/${year}/${month}/${day}/${file}`,
            size: fileStat.size,
            created: fileStat.birthtime || fileStat.ctime,
            duration: duration,
            type,
            identifier,
            callDetails,
            rating,
            notes,
          };
        })
    );

    // Filter out short, likely automated/unanswered calls and empty files
    const filteredRecordings = recordings.filter((recording) => {
      const isAnswered = recording.callDetails?.disposition === "ANSWERED";
      const isLongEnough = recording.duration > 2; // Longer than 2 seconds
      const isNotEmpty = recording.size > 1024; // Larger than 1KB

      // Log and filter out anything that's too short and wasn't answered
      if (!isLongEnough && !isAnswered) {
        console.log(
          `Filtering out short, unanswered call: ${recording.filename}, Duration: ${recording.duration}s`
        );
        return false;
      }
      // Also filter out any files that are essentially empty
      if (!isNotEmpty) {
        console.log(
          `Filtering out empty recording file: ${recording.filename}, Size: ${recording.size} bytes`
        );
        return false;
      }
      return true;
    });

    res.json({
      success: true,
      recordings: filteredRecordings.sort((a, b) => b.created - a.created), // Sort by date, newest first
    });
  } catch (error) {
    console.error("Error listing recordings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve recordings",
      error: error.message,
    });
  }
});

// Helper function to get MIME type based on file extension
function getAudioMimeType(filename) {
  if (filename.endsWith(".mp3")) return "audio/mpeg";
  if (filename.endsWith(".gsm")) return "audio/gsm";
  return "audio/wav"; // Default to wav
}

// Helper function to get all dates between start and end date
function getDateRange(startDate, endDate) {
  const dates = [];
  const currentDate = new Date(startDate);
  const end = new Date(endDate);
  
  while (currentDate <= end) {
    dates.push({
      year: currentDate.getFullYear().toString(),
      month: (currentDate.getMonth() + 1).toString().padStart(2, "0"),
      day: currentDate.getDate().toString().padStart(2, "0"),
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
}

// Helper function to process recordings from a single directory
async function getRecordingsFromDir(recordingDir, year, month, day) {
  const supportedFormats = [".wav", ".mp3", ".gsm"];
  
  try {
    await stat(recordingDir);
  } catch (error) {
    return []; // Directory doesn't exist
  }

  const files = await readdir(recordingDir);
  const recordings = await Promise.all(
    files
      .filter((file) => supportedFormats.some((ext) => file.endsWith(ext)))
      .map(async (file) => {
        const filePath = path.join(recordingDir, file);
        const fileStat = await stat(filePath);

        const parts = file.split("-");
        let type = "unknown";
        let identifier = "";

        if (parts.length >= 2) {
          type = parts[0]; // e.g., "queue", "agent", "outbound"
          const fileExt = supportedFormats.find((ext) => file.endsWith(ext)) || ".wav";

          if (type === "queue" && parts.length >= 3) {
            identifier = parts[1]; // Queue name
          } else if (type === "agent" && parts.length >= 3) {
            identifier = parts[1]; // Extension number
          } else if (type === "outbound" && parts.length >= 3) {
            identifier = parts[1]; // Caller extension number
          }
        }

        let callDetails = null;
        let duration = 0;
        try {
          const cdr = await sequelize.query(
            `SELECT src, dst, disposition, billsec, duration as call_duration, start as calldate 
             FROM cdr 
             WHERE uniqueid = ? OR userfield LIKE ?`,
            {
              replacements: [
                parts[parts.length - 1].replace(/\.(wav|mp3|gsm)$/, ""),
                `%${file}%`,
              ],
              type: sequelize.QueryTypes.SELECT,
            }
          );

          if (cdr && cdr.length > 0) {
            callDetails = cdr[0];
            duration = callDetails.billsec > 0 ? callDetails.billsec : callDetails.call_duration || 0;
          }
        } catch (err) {
          console.error("Error fetching CDR info:", err);
        }

        if (!duration && fileStat.size > 0) {
          const estimatedSeconds = Math.round(fileStat.size / (1.42 * 1024));
          duration = estimatedSeconds > 0 ? estimatedSeconds : 0;
        }

        let rating = null;
        let notes = null;
        try {
          const ratingRecord = await RecordingRating.findOne({
            where: {
              filename: file,
              path: path.join(year, month, day, file),
            },
          });

          if (ratingRecord) {
            rating = ratingRecord.rating;
            notes = ratingRecord.notes;
          }
        } catch (err) {
          console.error("Error fetching rating:", err);
        }

        // Look up agent username from extension number
        let agentName = null;
        let agentExtension = identifier;
        if ((type === "agent" || type === "outbound") && identifier) {
          try {
            const userResult = await sequelize.query(
              `SELECT username, firstName, lastName FROM users WHERE extension = ? LIMIT 1`,
              {
                replacements: [identifier],
                type: sequelize.QueryTypes.SELECT,
              }
            );
            if (userResult && userResult.length > 0) {
              const user = userResult[0];
              agentName = user.firstName && user.lastName 
                ? `${user.firstName} ${user.lastName}` 
                : user.username;
            }
          } catch (err) {
            console.error("Error fetching agent info:", err);
          }
        }

        return {
          filename: file,
          path: `/api/recordings/play/${year}/${month}/${day}/${file}`,
          downloadPath: `/api/recordings/download/${year}/${month}/${day}/${file}`,
          size: fileStat.size,
          created: fileStat.birthtime,
          modified: fileStat.mtime,
          type,
          identifier,
          agentName,
          agentExtension,
          callDetails,
          duration,
          rating,
          notes,
          date: `${year}-${month}-${day}`,
        };
      })
  );

  return recordings.filter((r) => r.size > 1024);
}

// List recordings by date range
router.get("/list-range", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "startDate and endDate query parameters are required",
      });
    }

    const dateRange = getDateRange(startDate, endDate);
    const allRecordings = [];

    for (const { year, month, day } of dateRange) {
      const recordingDir = path.join(RECORDING_BASE_DIR, year, month, day);
      const recordings = await getRecordingsFromDir(recordingDir, year, month, day);
      allRecordings.push(...recordings);
    }

    res.json({
      success: true,
      recordings: allRecordings.sort((a, b) => new Date(b.created) - new Date(a.created)),
      totalCount: allRecordings.length,
      dateRange: { startDate, endDate },
    });
  } catch (error) {
    console.error("Error listing recordings by range:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve recordings",
      error: error.message,
    });
  }
});

// Stream recording for playback
router.get("/play/:year/:month/:day/:filename", async (req, res) => {
  try {
    const { year, month, day, filename } = req.params;
    const filePath = path.join(RECORDING_BASE_DIR, year, month, day, filename);

    // Asynchronously get file stats
    const fileStat = await stat(filePath);

    // Set appropriate headers based on file type
    res.setHeader("Content-Length", fileStat.size);
    res.setHeader("Content-Type", getAudioMimeType(filename));
    res.setHeader("Accept-Ranges", "bytes");

    // Create read stream and pipe to response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    // Handle errors
    fileStream.on("error", (error) => {
      console.error("Error streaming recording:", error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: "Error streaming recording",
          error: error.message,
        });
      }
    });
  } catch (error) {
    // If stat fails (e.g., file not found), this will catch it
    if (error.code === "ENOENT") {
      return res.status(404).json({
        success: false,
        message: "Recording not found",
      });
    }
    console.error("Error preparing recording for streaming:", error);
    res.status(500).json({
      success: false,
      message: "Failed to stream recording",
      error: error.message,
    });
  }
});

// Download recording
router.get("/download/:year/:month/:day/:filename", (req, res) => {
  try {
    const { year, month, day, filename } = req.params;
    const filePath = path.join(RECORDING_BASE_DIR, year, month, day, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "Recording not found",
      });
    }

    // Set headers for download
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", getAudioMimeType(filename));

    // Create read stream and pipe to response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    // Handle errors
    fileStream.on("error", (error) => {
      console.error("Error downloading recording:", error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: "Error downloading recording",
          error: error.message,
        });
      }
    });
  } catch (error) {
    console.error("Error downloading recording:", error);
    res.status(500).json({
      success: false,
      message: "Failed to download recording",
      error: error.message,
    });
  }
});

// Rate recording
router.post("/rate/:year/:month/:day/:filename", async (req, res) => {
  try {
    const { year, month, day, filename } = req.params;
    const { rating, notes } = req.body;
    const filePath = path.join(year, month, day, filename);

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    // Store rating in database using the RecordingRating model
    const [ratingRecord, created] = await RecordingRating.findOrCreate({
      where: {
        filename,
        path: filePath,
      },
      defaults: {
        rating,
        notes: notes || "",
        created_at: new Date(),
      },
    });

    // If record already existed, update it
    if (!created) {
      ratingRecord.rating = rating;
      ratingRecord.notes = notes || "";
      ratingRecord.updated_at = new Date();
      await ratingRecord.save();
    }

    res.json({
      success: true,
      message: "Rating saved successfully",
    });
  } catch (error) {
    console.error("Error rating recording:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save rating",
      error: error.message,
    });
  }
});

// Get available dates with recordings
router.get("/dates", async (req, res) => {
  try {
    // Check if base directory exists first
    try {
      await stat(RECORDING_BASE_DIR);
    } catch (error) {
      // Base directory doesn't exist - return empty dates array
      return res.json({
        success: true,
        dates: [],
        message: "Recording directory not found",
      });
    }

    const years = await readdir(RECORDING_BASE_DIR);

    const dates = [];

    for (const year of years.filter((y) => /^\d{4}$/.test(y))) {
      const yearPath = path.join(RECORDING_BASE_DIR, year);
      const months = await readdir(yearPath);

      for (const month of months.filter((m) => /^\d{2}$/.test(m))) {
        const monthPath = path.join(yearPath, month);
        const days = await readdir(monthPath);

        for (const day of days.filter((d) => /^\d{2}$/.test(d))) {
          const dayPath = path.join(monthPath, day);
          const files = await readdir(dayPath);

          if (files.some((file) => file.endsWith(".wav"))) {
            dates.push(`${year}-${month}-${day}`);
          }
        }
      }
    }

    res.json({
      success: true,
      dates: dates.sort().reverse(), // Sort by date, newest first
    });
  } catch (error) {
    console.error("Error getting recording dates:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve recording dates",
      error: error.message,
    });
  }
});

export default router;
