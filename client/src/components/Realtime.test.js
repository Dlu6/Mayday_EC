// client/src/components/Realtime.test.js
// Unit tests for Realtime component - Tests pause functionality logic
// These tests are standalone and focus on utility functions

describe("Realtime Component - Utility Functions", () => {
  describe("getStatusColor", () => {
    const getStatusColor = (status, pauseReason) => {
      if (status === "On Call") return "#f44336"; // error
      if (status === "Available") return "#4caf50"; // success
      if (status === "Paused") return pauseReason?.color || "#ff9800"; // warning or custom
      return "#9e9e9e"; // grey for offline
    };

    it("returns error color for On Call status", () => {
      expect(getStatusColor("On Call")).toBe("#f44336");
    });

    it("returns success color for Available status", () => {
      expect(getStatusColor("Available")).toBe("#4caf50");
    });

    it("returns warning color for Paused status without reason", () => {
      expect(getStatusColor("Paused")).toBe("#ff9800");
    });

    it("returns custom color for Paused status with reason", () => {
      const pauseReason = { code: "LUNCH", label: "Lunch", color: "#4caf50" };
      expect(getStatusColor("Paused", pauseReason)).toBe("#4caf50");
    });

    it("returns grey for Offline status", () => {
      expect(getStatusColor("Offline")).toBe("#9e9e9e");
    });
  });

  describe("getStatusLabel", () => {
    const getStatusLabel = (status, pauseReason) => {
      if (status === "Paused" && pauseReason?.label) {
        return pauseReason.label;
      }
      return status;
    };

    it("returns status for non-paused agents", () => {
      expect(getStatusLabel("Available")).toBe("Available");
      expect(getStatusLabel("On Call")).toBe("On Call");
    });

    it("returns pause reason label for paused agents", () => {
      const pauseReason = { code: "LUNCH", label: "Lunch Break" };
      expect(getStatusLabel("Paused", pauseReason)).toBe("Lunch Break");
    });

    it("returns Paused if no reason label", () => {
      expect(getStatusLabel("Paused")).toBe("Paused");
      expect(getStatusLabel("Paused", {})).toBe("Paused");
    });
  });

  describe("formatPauseDuration", () => {
    const formatPauseDuration = (startTime) => {
      if (!startTime) return "0:00";
      const start = new Date(startTime);
      const now = new Date();
      const diffSeconds = Math.floor((now - start) / 1000);

      const hours = Math.floor(diffSeconds / 3600);
      const minutes = Math.floor((diffSeconds % 3600) / 60);
      const seconds = diffSeconds % 60;

      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
          .toString()
          .padStart(2, "0")}`;
      }
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    it("returns 0:00 for null startTime", () => {
      expect(formatPauseDuration(null)).toBe("0:00");
    });

    it("returns 0:00 for undefined startTime", () => {
      expect(formatPauseDuration(undefined)).toBe("0:00");
    });

    it("calculates duration from past time", () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const result = formatPauseDuration(fiveMinutesAgo.toISOString());
      // Should be around 5:00
      expect(result).toMatch(/^[45]:\d{2}$/);
    });
  });

  describe("calculateAgentStats", () => {
    const calculateAgentStats = (agents) => {
      return {
        total: agents.length,
        available: agents.filter((a) => a.status === "Available").length,
        onCall: agents.filter((a) => a.status === "On Call").length,
        paused: agents.filter((a) => a.status === "Paused").length,
        offline: agents.filter(
          (a) => !["Available", "On Call", "Paused"].includes(a.status)
        ).length,
      };
    };

    it("calculates stats correctly for empty array", () => {
      const stats = calculateAgentStats([]);
      expect(stats.total).toBe(0);
      expect(stats.available).toBe(0);
      expect(stats.onCall).toBe(0);
      expect(stats.paused).toBe(0);
    });

    it("calculates stats correctly for mixed agents", () => {
      const agents = [
        { extension: "1001", status: "Available" },
        { extension: "1002", status: "On Call" },
        { extension: "1003", status: "Paused" },
        { extension: "1004", status: "Available" },
        { extension: "1005", status: "Offline" },
      ];
      const stats = calculateAgentStats(agents);
      expect(stats.total).toBe(5);
      expect(stats.available).toBe(2);
      expect(stats.onCall).toBe(1);
      expect(stats.paused).toBe(1);
      expect(stats.offline).toBe(1);
    });
  });

  describe("Agent Pause Event Handling", () => {
    it("should update agent status on pause event", () => {
      const agents = [
        { extension: "1001", status: "Available" },
        { extension: "1002", status: "Available" },
      ];

      const pauseEvent = {
        extension: "1001",
        pauseReason: { code: "BREAK", label: "Short Break", color: "#ff9800" },
        startTime: new Date().toISOString(),
      };

      // Simulate updating agent on pause event
      const updatedAgents = agents.map((agent) => {
        if (agent.extension === pauseEvent.extension) {
          return {
            ...agent,
            status: "Paused",
            pauseReason: pauseEvent.pauseReason,
            pauseStartTime: pauseEvent.startTime,
          };
        }
        return agent;
      });

      const pausedAgent = updatedAgents.find((a) => a.extension === "1001");
      expect(pausedAgent.status).toBe("Paused");
      expect(pausedAgent.pauseReason.code).toBe("BREAK");
      expect(pausedAgent.pauseReason.label).toBe("Short Break");
    });

    it("should update agent status on unpause event", () => {
      const agents = [
        {
          extension: "1001",
          status: "Paused",
          pauseReason: { code: "BREAK", label: "Short Break" },
        },
        { extension: "1002", status: "Available" },
      ];

      const unpauseEvent = {
        extension: "1001",
        pauseDuration: 300,
      };

      // Simulate updating agent on unpause event
      const updatedAgents = agents.map((agent) => {
        if (agent.extension === unpauseEvent.extension) {
          return {
            ...agent,
            status: "Available",
            pauseReason: null,
            pauseStartTime: null,
          };
        }
        return agent;
      });

      const unpausedAgent = updatedAgents.find((a) => a.extension === "1001");
      expect(unpausedAgent.status).toBe("Available");
      expect(unpausedAgent.pauseReason).toBeNull();
    });
  });
});
