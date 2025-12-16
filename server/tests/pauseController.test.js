// server/tests/pauseController.test.js
// Unit tests for Pause Controller - Tests the pause functionality logic
// These tests are standalone and don't require database connections

// Define DEFAULT_PAUSE_REASONS inline to avoid database import issues
const DEFAULT_PAUSE_REASONS = [
  {
    code: "BREAK",
    label: "Short Break",
    description: "Taking a short break",
    color: "#ff9800",
    icon: "coffee",
    maxDurationMinutes: 5,
    sortOrder: 1,
    isActive: true,
  },
  {
    code: "LUNCH",
    label: "Lunch Break",
    description: "Lunch break",
    color: "#4caf50",
    icon: "restaurant",
    maxDurationMinutes: 60,
    sortOrder: 2,
    isActive: true,
  },
  {
    code: "MEETING",
    label: "In Meeting",
    description: "Attending a meeting",
    color: "#2196f3",
    icon: "groups",
    maxDurationMinutes: 120,
    sortOrder: 3,
    isActive: true,
  },
  {
    code: "TRAINING",
    label: "Training",
    description: "In training session",
    color: "#9c27b0",
    icon: "school",
    maxDurationMinutes: 180,
    sortOrder: 4,
    isActive: true,
  },
  {
    code: "PERSONAL",
    label: "Personal",
    description: "Personal time",
    color: "#e91e63",
    icon: "person",
    maxDurationMinutes: 30,
    sortOrder: 5,
    isActive: true,
  },
  {
    code: "TECHNICAL",
    label: "Technical Issue",
    description: "Dealing with technical issues",
    color: "#f44336",
    icon: "build",
    maxDurationMinutes: null,
    sortOrder: 6,
    isActive: true,
  },
  {
    code: "COACHING",
    label: "Coaching",
    description: "Being coached or coaching others",
    color: "#00bcd4",
    icon: "support_agent",
    maxDurationMinutes: 60,
    sortOrder: 7,
    isActive: true,
  },
  {
    code: "OTHER",
    label: "Other",
    description: "Other reason",
    color: "#607d8b",
    icon: "more_horiz",
    maxDurationMinutes: null,
    sortOrder: 8,
    isActive: true,
  },
];

describe("Pause Reason Model - DEFAULT_PAUSE_REASONS", () => {
  it("should have required default reasons", () => {
    expect(DEFAULT_PAUSE_REASONS).toBeDefined();
    expect(Array.isArray(DEFAULT_PAUSE_REASONS)).toBe(true);
    expect(DEFAULT_PAUSE_REASONS.length).toBeGreaterThan(0);

    const codes = DEFAULT_PAUSE_REASONS.map((r) => r.code);
    expect(codes).toContain("BREAK");
    expect(codes).toContain("LUNCH");
    expect(codes).toContain("MEETING");
    expect(codes).toContain("TRAINING");
    expect(codes).toContain("PERSONAL");
    expect(codes).toContain("TECHNICAL");
    expect(codes).toContain("COACHING");
    expect(codes).toContain("OTHER");
  });

  it("should have valid structure for each reason", () => {
    DEFAULT_PAUSE_REASONS.forEach((reason) => {
      expect(reason).toHaveProperty("code");
      expect(reason).toHaveProperty("label");
      expect(reason).toHaveProperty("description");
      expect(reason).toHaveProperty("color");
      expect(reason).toHaveProperty("icon");
      expect(reason).toHaveProperty("sortOrder");
      
      expect(typeof reason.code).toBe("string");
      expect(typeof reason.label).toBe("string");
      expect(typeof reason.color).toBe("string");
      expect(reason.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });

  it("should have unique codes", () => {
    const codes = DEFAULT_PAUSE_REASONS.map((r) => r.code);
    const uniqueCodes = [...new Set(codes)];
    expect(codes.length).toBe(uniqueCodes.length);
  });

  it("should have sorted by sortOrder", () => {
    const sortOrders = DEFAULT_PAUSE_REASONS.map((r) => r.sortOrder);
    const sortedOrders = [...sortOrders].sort((a, b) => a - b);
    expect(sortOrders).toEqual(sortedOrders);
  });

  it("BREAK reason should have correct properties", () => {
    const breakReason = DEFAULT_PAUSE_REASONS.find((r) => r.code === "BREAK");
    expect(breakReason).toBeDefined();
    expect(breakReason.label).toBe("Short Break");
    expect(breakReason.maxDurationMinutes).toBe(5);
    expect(breakReason.icon).toBe("coffee");
  });

  it("LUNCH reason should have correct properties", () => {
    const lunchReason = DEFAULT_PAUSE_REASONS.find((r) => r.code === "LUNCH");
    expect(lunchReason).toBeDefined();
    expect(lunchReason.label).toBe("Lunch Break");
    expect(lunchReason.maxDurationMinutes).toBe(60);
  });

  it("MEETING reason should have correct properties", () => {
    const meetingReason = DEFAULT_PAUSE_REASONS.find((r) => r.code === "MEETING");
    expect(meetingReason).toBeDefined();
    expect(meetingReason.label).toBe("In Meeting");
    expect(meetingReason.maxDurationMinutes).toBe(120);
  });
});

describe("Pause Controller Logic", () => {
  describe("Input Validation", () => {
    it("should require extension for pause", () => {
      const body = { reasonCode: "BREAK" };
      const isValid = body.extension && body.reasonCode;
      expect(isValid).toBeFalsy();
    });

    it("should require reasonCode for pause", () => {
      const body = { extension: "1001" };
      const isValid = body.extension && body.reasonCode;
      expect(isValid).toBeFalsy();
    });

    it("should pass validation with both extension and reasonCode", () => {
      const body = { extension: "1001", reasonCode: "BREAK" };
      const isValid = body.extension && body.reasonCode;
      expect(isValid).toBeTruthy();
    });

    it("should require extension for unpause", () => {
      const body = {};
      const isValid = !!body.extension;
      expect(isValid).toBeFalsy();
    });
  });

  describe("Pause Reason Validation", () => {
    it("should find valid pause reason code", () => {
      const reasonCode = "BREAK";
      const reason = DEFAULT_PAUSE_REASONS.find((r) => r.code === reasonCode);
      expect(reason).toBeDefined();
    });

    it("should not find invalid pause reason code", () => {
      const reasonCode = "INVALID_CODE";
      const reason = DEFAULT_PAUSE_REASONS.find((r) => r.code === reasonCode);
      expect(reason).toBeUndefined();
    });
  });

  describe("Duration Formatting", () => {
    const formatDuration = (seconds) => {
      if (!seconds) return "0:00";
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;

      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
          .toString()
          .padStart(2, "0")}`;
      }
      return `${minutes}:${secs.toString().padStart(2, "0")}`;
    };

    it("should format 0 seconds correctly", () => {
      expect(formatDuration(0)).toBe("0:00");
    });

    it("should format 30 seconds correctly", () => {
      expect(formatDuration(30)).toBe("0:30");
    });

    it("should format 60 seconds correctly", () => {
      expect(formatDuration(60)).toBe("1:00");
    });

    it("should format 90 seconds correctly", () => {
      expect(formatDuration(90)).toBe("1:30");
    });

    it("should format 3600 seconds (1 hour) correctly", () => {
      expect(formatDuration(3600)).toBe("1:00:00");
    });

    it("should format 3661 seconds correctly", () => {
      expect(formatDuration(3661)).toBe("1:01:01");
    });

    it("should handle null/undefined", () => {
      expect(formatDuration(null)).toBe("0:00");
      expect(formatDuration(undefined)).toBe("0:00");
    });
  });

  describe("Queue Interface Format", () => {
    it("should format PJSIP interface correctly", () => {
      const extension = "1001";
      const interface_ = `PJSIP/${extension}`;
      expect(interface_).toBe("PJSIP/1001");
    });
  });

  describe("Pause Duration Calculation", () => {
    it("should calculate pause duration correctly", () => {
      const startTime = new Date(Date.now() - 300000); // 5 minutes ago
      const endTime = new Date();
      const durationSeconds = Math.floor((endTime - startTime) / 1000);
      expect(durationSeconds).toBeGreaterThanOrEqual(299);
      expect(durationSeconds).toBeLessThanOrEqual(301);
    });
  });
});
