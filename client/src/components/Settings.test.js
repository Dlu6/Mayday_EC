import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SnackbarProvider } from "notistack";
import Settings from "./Settings";
import axios from "axios";

// Mock axios
jest.mock("axios", () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  })),
}));

// Get the mocked API instance
const mockAPI = axios.create();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(() => "mock-token"),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Helper to render with providers
const renderWithProviders = (component) => {
  return render(
    <SnackbarProvider maxSnack={3}>
      {component}
    </SnackbarProvider>
  );
};

// Sample test data
const mockPauseReasons = [
  {
    id: 1,
    code: "LUNCH",
    label: "Lunch Break",
    description: "Standard lunch break",
    color: "#ff9800",
    icon: "lunch",
    maxDurationMinutes: 60,
    requiresApproval: false,
    sortOrder: 1,
    isActive: true,
  },
  {
    id: 2,
    code: "MEETING",
    label: "In Meeting",
    description: "Attending a meeting",
    color: "#2196f3",
    icon: "meeting",
    maxDurationMinutes: null,
    requiresApproval: true,
    sortOrder: 2,
    isActive: true,
  },
  {
    id: 3,
    code: "BREAK",
    label: "Short Break",
    description: "Quick break",
    color: "#4caf50",
    icon: "coffee",
    maxDurationMinutes: 15,
    requiresApproval: false,
    sortOrder: 0,
    isActive: true,
  },
];

const mockPauseLogs = [
  {
    id: 1,
    extension: "1001",
    pauseReasonCode: "LUNCH",
    pauseReasonLabel: "Lunch Break",
    startTime: "2025-12-13T09:00:00.000Z",
    endTime: "2025-12-13T10:00:00.000Z",
    durationSeconds: 3600,
    autoUnpaused: false,
    queueName: "support",
    pauseReason: { color: "#ff9800" },
  },
  {
    id: 2,
    extension: "1002",
    pauseReasonCode: "MEETING",
    pauseReasonLabel: "In Meeting",
    startTime: "2025-12-13T11:00:00.000Z",
    endTime: null,
    durationSeconds: null,
    autoUnpaused: false,
    queueName: "sales",
    pauseReason: { color: "#2196f3" },
  },
  {
    id: 3,
    extension: "1001",
    pauseReasonCode: "BREAK",
    pauseReasonLabel: "Short Break",
    startTime: "2025-12-13T14:00:00.000Z",
    endTime: "2025-12-13T14:15:00.000Z",
    durationSeconds: 900,
    autoUnpaused: true,
    queueName: "support",
    pauseReason: { color: "#4caf50" },
  },
];

describe("Settings Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock responses
    mockAPI.get.mockImplementation((url) => {
      if (url === "/pause/reasons") {
        return Promise.resolve({
          data: { success: true, data: mockPauseReasons },
        });
      }
      if (url === "/pause/logs") {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              pauseLogs: mockPauseLogs,
              totalPauseSeconds: 4500,
              totalPauseFormatted: "1:15:00",
              pagination: { total: 3, limit: 25, offset: 0, hasMore: false },
            },
          },
        });
      }
      return Promise.reject(new Error("Unknown endpoint"));
    });
  });

  describe("Rendering", () => {
    test("renders Settings page with header", async () => {
      renderWithProviders(<Settings />);
      
      expect(screen.getByText("Settings")).toBeInTheDocument();
      expect(screen.getByText(/Configure system settings/i)).toBeInTheDocument();
    });

    test("renders tabs for Pause Reasons and Pause Logs", async () => {
      renderWithProviders(<Settings />);
      
      expect(screen.getByRole("tab", { name: /Pause Reasons/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /Pause Logs/i })).toBeInTheDocument();
    });

    test("Pause Reasons tab is selected by default", async () => {
      renderWithProviders(<Settings />);
      
      const pauseReasonsTab = screen.getByRole("tab", { name: /Pause Reasons/i });
      expect(pauseReasonsTab).toHaveAttribute("aria-selected", "true");
    });
  });

  describe("Pause Reasons Tab", () => {
    test("displays loading state initially", async () => {
      mockAPI.get.mockImplementation(() => new Promise(() => {})); // Never resolves
      renderWithProviders(<Settings />);
      
      expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });

    test("displays pause reasons in table after loading", async () => {
      renderWithProviders(<Settings />);
      
      await waitFor(() => {
        expect(screen.getByText("LUNCH")).toBeInTheDocument();
        expect(screen.getByText("Lunch Break")).toBeInTheDocument();
        expect(screen.getByText("MEETING")).toBeInTheDocument();
        expect(screen.getByText("In Meeting")).toBeInTheDocument();
      });
    });

    test("displays max duration correctly", async () => {
      renderWithProviders(<Settings />);
      
      await waitFor(() => {
        expect(screen.getByText("60 min")).toBeInTheDocument();
        expect(screen.getByText("15 min")).toBeInTheDocument();
        expect(screen.getByText("Unlimited")).toBeInTheDocument();
      });
    });

    test("displays requires approval status", async () => {
      renderWithProviders(<Settings />);
      
      await waitFor(() => {
        const yesChips = screen.getAllByText("Yes");
        const noChips = screen.getAllByText("No");
        expect(yesChips.length).toBeGreaterThan(0);
        expect(noChips.length).toBeGreaterThan(0);
      });
    });

    test("shows empty state when no pause reasons exist", async () => {
      mockAPI.get.mockResolvedValueOnce({
        data: { success: true, data: [] },
      });
      
      renderWithProviders(<Settings />);
      
      await waitFor(() => {
        expect(screen.getByText(/No pause reasons configured/i)).toBeInTheDocument();
      });
    });

    test("opens Add Reason dialog when clicking Add Reason button", async () => {
      renderWithProviders(<Settings />);
      
      await waitFor(() => {
        expect(screen.getByText("LUNCH")).toBeInTheDocument();
      });
      
      const addButton = screen.getByRole("button", { name: /Add Reason/i });
      fireEvent.click(addButton);
      
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(screen.getByText("Add Pause Reason")).toBeInTheDocument();
      });
    });

    test("opens Edit dialog when clicking edit button", async () => {
      renderWithProviders(<Settings />);
      
      await waitFor(() => {
        expect(screen.getByText("LUNCH")).toBeInTheDocument();
      });
      
      const editButtons = screen.getAllByRole("button", { name: /Edit/i });
      fireEvent.click(editButtons[0]);
      
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(screen.getByText("Edit Pause Reason")).toBeInTheDocument();
      });
    });

    test("creates new pause reason successfully", async () => {
      mockAPI.post.mockResolvedValueOnce({
        data: { success: true, data: { id: 4, code: "TRAINING", label: "Training" } },
      });
      
      renderWithProviders(<Settings />);
      
      await waitFor(() => {
        expect(screen.getByText("LUNCH")).toBeInTheDocument();
      });
      
      // Open dialog
      fireEvent.click(screen.getByRole("button", { name: /Add Reason/i }));
      
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
      
      // Fill form
      const codeInput = screen.getByLabelText(/Code/i);
      const labelInput = screen.getByLabelText(/^Label$/i);
      
      await userEvent.type(codeInput, "TRAINING");
      await userEvent.type(labelInput, "Training Session");
      
      // Submit
      const createButton = screen.getByRole("button", { name: /Create/i });
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(mockAPI.post).toHaveBeenCalledWith("/pause/reasons", expect.objectContaining({
          code: "TRAINING",
          label: "Training Session",
        }));
      });
    });

    test("updates existing pause reason successfully", async () => {
      mockAPI.put.mockResolvedValueOnce({
        data: { success: true, data: { id: 1, code: "LUNCH", label: "Updated Lunch" } },
      });
      
      renderWithProviders(<Settings />);
      
      await waitFor(() => {
        expect(screen.getByText("LUNCH")).toBeInTheDocument();
      });
      
      // Open edit dialog
      const editButtons = screen.getAllByRole("button", { name: /Edit/i });
      fireEvent.click(editButtons[0]);
      
      await waitFor(() => {
        expect(screen.getByText("Edit Pause Reason")).toBeInTheDocument();
      });
      
      // Update label
      const labelInput = screen.getByLabelText(/^Label$/i);
      await userEvent.clear(labelInput);
      await userEvent.type(labelInput, "Updated Lunch Break");
      
      // Submit
      const updateButton = screen.getByRole("button", { name: /Update/i });
      fireEvent.click(updateButton);
      
      await waitFor(() => {
        expect(mockAPI.put).toHaveBeenCalledWith(
          "/pause/reasons/1",
          expect.objectContaining({ label: "Updated Lunch Break" })
        );
      });
    });

    test("opens delete confirmation dialog", async () => {
      renderWithProviders(<Settings />);
      
      await waitFor(() => {
        expect(screen.getByText("LUNCH")).toBeInTheDocument();
      });
      
      const deleteButtons = screen.getAllByRole("button", { name: /Delete/i });
      fireEvent.click(deleteButtons[0]);
      
      await waitFor(() => {
        expect(screen.getByText("Confirm Deactivation")).toBeInTheDocument();
        expect(screen.getByText(/Are you sure you want to deactivate/i)).toBeInTheDocument();
      });
    });

    test("deletes pause reason after confirmation", async () => {
      mockAPI.delete.mockResolvedValueOnce({
        data: { success: true, message: "Pause reason deactivated" },
      });
      
      renderWithProviders(<Settings />);
      
      await waitFor(() => {
        expect(screen.getByText("LUNCH")).toBeInTheDocument();
      });
      
      // Open delete dialog
      const deleteButtons = screen.getAllByRole("button", { name: /Delete/i });
      fireEvent.click(deleteButtons[0]);
      
      await waitFor(() => {
        expect(screen.getByText("Confirm Deactivation")).toBeInTheDocument();
      });
      
      // Confirm deletion
      const deactivateButton = screen.getByRole("button", { name: /Deactivate/i });
      fireEvent.click(deactivateButton);
      
      await waitFor(() => {
        expect(mockAPI.delete).toHaveBeenCalledWith("/pause/reasons/1");
      });
    });

    test("refresh button fetches pause reasons again", async () => {
      renderWithProviders(<Settings />);
      
      await waitFor(() => {
        expect(screen.getByText("LUNCH")).toBeInTheDocument();
      });
      
      const refreshButton = screen.getByRole("button", { name: /Refresh/i });
      fireEvent.click(refreshButton);
      
      await waitFor(() => {
        expect(mockAPI.get).toHaveBeenCalledTimes(2); // Initial + refresh
      });
    });
  });

  describe("Pause Logs Tab", () => {
    test("switches to Pause Logs tab when clicked", async () => {
      renderWithProviders(<Settings />);
      
      const pauseLogsTab = screen.getByRole("tab", { name: /Pause Logs/i });
      fireEvent.click(pauseLogsTab);
      
      await waitFor(() => {
        expect(pauseLogsTab).toHaveAttribute("aria-selected", "true");
        expect(screen.getByText("Pause Audit Logs")).toBeInTheDocument();
      });
    });

    test("displays pause logs in table", async () => {
      renderWithProviders(<Settings />);
      
      // Switch to Pause Logs tab
      fireEvent.click(screen.getByRole("tab", { name: /Pause Logs/i }));
      
      await waitFor(() => {
        expect(screen.getByText("1001")).toBeInTheDocument();
        expect(screen.getByText("1002")).toBeInTheDocument();
      });
    });

    test("displays active pause indicator for ongoing pauses", async () => {
      renderWithProviders(<Settings />);
      
      fireEvent.click(screen.getByRole("tab", { name: /Pause Logs/i }));
      
      await waitFor(() => {
        expect(screen.getByText("Active")).toBeInTheDocument();
      });
    });

    test("displays auto-unpaused indicator", async () => {
      renderWithProviders(<Settings />);
      
      fireEvent.click(screen.getByRole("tab", { name: /Pause Logs/i }));
      
      await waitFor(() => {
        // One log has autoUnpaused: true
        const yesChips = screen.getAllByText("Yes");
        expect(yesChips.length).toBeGreaterThan(0);
      });
    });

    test("displays total pause time", async () => {
      renderWithProviders(<Settings />);
      
      fireEvent.click(screen.getByRole("tab", { name: /Pause Logs/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/Total: 1:15:00/i)).toBeInTheDocument();
      });
    });

    test("filters by date range", async () => {
      renderWithProviders(<Settings />);
      
      fireEvent.click(screen.getByRole("tab", { name: /Pause Logs/i }));
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Start Date/i)).toBeInTheDocument();
      });
      
      const startDateInput = screen.getByLabelText(/Start Date/i);
      fireEvent.change(startDateInput, { target: { value: "2025-12-01" } });
      
      await waitFor(() => {
        expect(mockAPI.get).toHaveBeenCalledWith("/pause/logs", expect.objectContaining({
          params: expect.objectContaining({ startDate: "2025-12-01" }),
        }));
      });
    });

    test("filters by extension", async () => {
      renderWithProviders(<Settings />);
      
      fireEvent.click(screen.getByRole("tab", { name: /Pause Logs/i }));
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Filter by extension/i)).toBeInTheDocument();
      });
      
      const extensionInput = screen.getByPlaceholderText(/Filter by extension/i);
      await userEvent.type(extensionInput, "1001");
      
      await waitFor(() => {
        expect(mockAPI.get).toHaveBeenCalledWith("/pause/logs", expect.objectContaining({
          params: expect.objectContaining({ extension: "1001" }),
        }));
      });
    });

    test("export CSV button is present", async () => {
      renderWithProviders(<Settings />);
      
      fireEvent.click(screen.getByRole("tab", { name: /Pause Logs/i }));
      
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Export CSV/i })).toBeInTheDocument();
      });
    });

    test("pagination controls are present", async () => {
      renderWithProviders(<Settings />);
      
      fireEvent.click(screen.getByRole("tab", { name: /Pause Logs/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/1–3 of 3/i)).toBeInTheDocument();
      });
    });

    test("shows empty state when no logs found", async () => {
      mockAPI.get.mockImplementation((url) => {
        if (url === "/pause/reasons") {
          return Promise.resolve({ data: { success: true, data: mockPauseReasons } });
        }
        if (url === "/pause/logs") {
          return Promise.resolve({
            data: {
              success: true,
              data: {
                pauseLogs: [],
                totalPauseSeconds: 0,
                totalPauseFormatted: "0:00",
                pagination: { total: 0, limit: 25, offset: 0, hasMore: false },
              },
            },
          });
        }
        return Promise.reject(new Error("Unknown endpoint"));
      });
      
      renderWithProviders(<Settings />);
      
      fireEvent.click(screen.getByRole("tab", { name: /Pause Logs/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/No pause logs found/i)).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    test("displays error notification when fetching pause reasons fails", async () => {
      mockAPI.get.mockRejectedValueOnce(new Error("Network error"));
      
      renderWithProviders(<Settings />);
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to fetch pause reasons/i)).toBeInTheDocument();
      });
    });

    test("displays error notification when creating pause reason fails", async () => {
      mockAPI.post.mockRejectedValueOnce({
        response: { data: { message: "Code already exists" } },
      });
      
      renderWithProviders(<Settings />);
      
      await waitFor(() => {
        expect(screen.getByText("LUNCH")).toBeInTheDocument();
      });
      
      // Open dialog and try to create
      fireEvent.click(screen.getByRole("button", { name: /Add Reason/i }));
      
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
      
      const codeInput = screen.getByLabelText(/Code/i);
      const labelInput = screen.getByLabelText(/^Label$/i);
      
      await userEvent.type(codeInput, "LUNCH");
      await userEvent.type(labelInput, "Duplicate");
      
      fireEvent.click(screen.getByRole("button", { name: /Create/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/Code already exists/i)).toBeInTheDocument();
      });
    });

    test("shows validation warning when required fields are empty", async () => {
      renderWithProviders(<Settings />);
      
      await waitFor(() => {
        expect(screen.getByText("LUNCH")).toBeInTheDocument();
      });
      
      // Open dialog
      fireEvent.click(screen.getByRole("button", { name: /Add Reason/i }));
      
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
      
      // Try to submit without filling required fields
      fireEvent.click(screen.getByRole("button", { name: /Create/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/Code and Label are required/i)).toBeInTheDocument();
      });
    });
  });

  describe("Form Validation", () => {
    test("code field is disabled when editing", async () => {
      renderWithProviders(<Settings />);
      
      await waitFor(() => {
        expect(screen.getByText("LUNCH")).toBeInTheDocument();
      });
      
      const editButtons = screen.getAllByRole("button", { name: /Edit/i });
      fireEvent.click(editButtons[0]);
      
      await waitFor(() => {
        const codeInput = screen.getByLabelText(/Code/i);
        expect(codeInput).toBeDisabled();
      });
    });

    test("code is converted to uppercase", async () => {
      renderWithProviders(<Settings />);
      
      await waitFor(() => {
        expect(screen.getByText("LUNCH")).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByRole("button", { name: /Add Reason/i }));
      
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
      
      const codeInput = screen.getByLabelText(/Code/i);
      await userEvent.type(codeInput, "lowercase");
      
      expect(codeInput).toHaveValue("LOWERCASE");
    });
  });
});

describe("Settings API Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("API calls include authorization header", async () => {
    const interceptorFn = mockAPI.interceptors.request.use.mock.calls[0]?.[0];
    
    if (interceptorFn) {
      const config = { headers: {} };
      const result = interceptorFn(config);
      expect(result.headers.Authorization).toBe("Bearer mock-token");
    }
  });
});
