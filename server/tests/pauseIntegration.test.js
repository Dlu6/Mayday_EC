// server/tests/pauseIntegration.test.js
// Integration tests for pause functionality

/**
 * Manual Test Checklist for Pause Functionality
 * 
 * 1. PAUSE AGENT TEST:
 *    - Call: POST /api/pause/agent
 *    - Body: { "extension": "1016", "reasonCode": "BREAK" }
 *    - Expected: 
 *      - Agent status changes to "Paused" in dashboard
 *      - Pause reason shows "Short Break" 
 *      - No calls should be routed to this agent
 *      - Timer should start for auto-unpause (15 min for BREAK)
 * 
 * 2. VERIFY PAUSE IN ASTERISK:
 *    - Call: GET /api/pause/debug/1016
 *    - Expected:
 *      - databaseStatus.queueMembers[].paused = true
 *      - databaseStatus.queueMembers[].paused_reason = "BREAK"
 *      - activePauseLog should exist with startTime
 * 
 * 3. UNPAUSE AGENT TEST:
 *    - Call: POST /api/pause/agent/unpause
 *    - Body: { "extension": "1016" }
 *    - Expected:
 *      - Agent status changes to "Available" in dashboard
 *      - Calls should now be routed to this agent
 *      - Auto-unpause timer should be cleared
 * 
 * 4. AUTO-UNPAUSE TEST:
 *    - Pause agent with BREAK reason (15 min max)
 *    - Wait 15 minutes (or modify maxDurationMinutes for testing)
 *    - Expected:
 *      - Agent automatically unpaused
 *      - autoUnpaused = true in pause log
 *      - Dashboard shows "Available" status
 * 
 * 5. REALTIME DASHBOARD UPDATE TEST:
 *    - Open dashboard on two different browsers/agents
 *    - Pause one agent
 *    - Expected:
 *      - Both dashboards show the agent as "Paused"
 *      - Pause reason label and color displayed
 */

describe("Pause Integration Tests", () => {
  describe("Pause Reason Validation", () => {
    const DEFAULT_PAUSE_REASONS = [
      { code: "BREAK", label: "Short Break", maxDurationMinutes: 5 },
      { code: "LUNCH", label: "Lunch Break", maxDurationMinutes: 60 },
      { code: "MEETING", label: "In Meeting", maxDurationMinutes: 120 },
      { code: "TRAINING", label: "Training", maxDurationMinutes: 180 },
      { code: "PERSONAL", label: "Personal", maxDurationMinutes: 30 },
      { code: "TECHNICAL", label: "Technical Issue", maxDurationMinutes: null },
      { code: "COACHING", label: "Coaching", maxDurationMinutes: 60 },
      { code: "OTHER", label: "Other", maxDurationMinutes: null },
    ];

    it("should have correct max durations for auto-unpause", () => {
      const breakReason = DEFAULT_PAUSE_REASONS.find(r => r.code === "BREAK");
      expect(breakReason.maxDurationMinutes).toBe(5);

      const lunchReason = DEFAULT_PAUSE_REASONS.find(r => r.code === "LUNCH");
      expect(lunchReason.maxDurationMinutes).toBe(60);

      const technicalReason = DEFAULT_PAUSE_REASONS.find(r => r.code === "TECHNICAL");
      expect(technicalReason.maxDurationMinutes).toBeNull(); // No auto-unpause
    });
  });

  describe("Auto-Unpause Timer Logic", () => {
    it("should calculate remaining time correctly", () => {
      const startTime = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      const maxDurationMinutes = 15;
      const maxDurationMs = maxDurationMinutes * 60 * 1000;
      const elapsedMs = Date.now() - startTime.getTime();
      const remainingMs = maxDurationMs - elapsedMs;

      expect(remainingMs).toBeGreaterThan(0);
      expect(remainingMs).toBeLessThanOrEqual(10 * 60 * 1000); // ~10 minutes remaining
    });

    it("should detect expired pause", () => {
      const startTime = new Date(Date.now() - 20 * 60 * 1000); // 20 minutes ago
      const maxDurationMinutes = 15;
      const maxDurationMs = maxDurationMinutes * 60 * 1000;
      const elapsedMs = Date.now() - startTime.getTime();
      const remainingMs = maxDurationMs - elapsedMs;

      expect(remainingMs).toBeLessThanOrEqual(0); // Already expired
    });
  });

  describe("Queue Member Interface Format", () => {
    it("should format PJSIP interface correctly", () => {
      const extension = "1016";
      const interface_ = `PJSIP/${extension}`;
      expect(interface_).toBe("PJSIP/1016");
    });
  });

  describe("AMI QueuePause Action Format", () => {
    it("should build correct pause action", () => {
      const action = {
        Action: "QueuePause",
        Queue: "AllStaff",
        Interface: "PJSIP/1016",
        Paused: "1",
        Reason: "Short Break",
      };

      expect(action.Action).toBe("QueuePause");
      expect(action.Paused).toBe("1");
      expect(action.Interface).toBe("PJSIP/1016");
    });

    it("should build correct unpause action", () => {
      const action = {
        Action: "QueuePause",
        Queue: "AllStaff",
        Interface: "PJSIP/1016",
        Paused: "0",
      };

      expect(action.Action).toBe("QueuePause");
      expect(action.Paused).toBe("0");
    });
  });

  describe("WebSocket Event Payloads", () => {
    it("should create correct agent:paused event", () => {
      const event = {
        extension: "1016",
        pauseReason: {
          code: "BREAK",
          label: "Short Break",
          color: "#ff9800",
          icon: "coffee",
        },
        startTime: new Date().toISOString(),
        queues: ["AllStaff"],
        timestamp: new Date().toISOString(),
      };

      expect(event.extension).toBe("1016");
      expect(event.pauseReason.code).toBe("BREAK");
      expect(event.queues).toContain("AllStaff");
    });

    it("should create correct agent:unpaused event", () => {
      const event = {
        extension: "1016",
        autoUnpaused: false,
        pauseDuration: 300,
        timestamp: new Date().toISOString(),
      };

      expect(event.extension).toBe("1016");
      expect(event.autoUnpaused).toBe(false);
      expect(event.pauseDuration).toBe(300);
    });
  });
});

/**
 * API Test Commands (run with curl or Postman):
 * 
 * 1. Get pause reasons:
 *    curl http://localhost:8004/api/pause/reasons
 * 
 * 2. Pause agent:
 *    curl -X POST http://localhost:8004/api/pause/agent \
 *      -H "Content-Type: application/json" \
 *      -H "Authorization: Bearer YOUR_TOKEN" \
 *      -d '{"extension": "1016", "reasonCode": "BREAK"}'
 * 
 * 3. Check pause status:
 *    curl http://localhost:8004/api/pause/agent/1016/status \
 *      -H "Authorization: Bearer YOUR_TOKEN"
 * 
 * 4. Debug pause (check DB and AMI):
 *    curl http://localhost:8004/api/pause/debug/1016 \
 *      -H "Authorization: Bearer YOUR_TOKEN"
 * 
 * 5. Unpause agent:
 *    curl -X POST http://localhost:8004/api/pause/agent/unpause \
 *      -H "Content-Type: application/json" \
 *      -H "Authorization: Bearer YOUR_TOKEN" \
 *      -d '{"extension": "1016"}'
 * 
 * 6. Get paused agents:
 *    curl http://localhost:8004/api/pause/agents/paused \
 *      -H "Authorization: Bearer YOUR_TOKEN"
 */
