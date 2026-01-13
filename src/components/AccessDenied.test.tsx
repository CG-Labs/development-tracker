import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { screen } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { AccessDenied } from "./AccessDenied";

// Mock the auth context
const mockLogout = vi.fn();

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({
    logout: mockLogout,
  }),
}));

describe("AccessDenied", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("renders correct message for each denial reason", () => {
    it("displays no_invite message", () => {
      render(<AccessDenied reason="no_invite" />);

      expect(screen.getByText("Access Denied")).toBeInTheDocument();
      expect(
        screen.getByText(/You need an invitation to access this system/)
      ).toBeInTheDocument();
    });

    it("displays deactivated message", () => {
      render(<AccessDenied reason="deactivated" />);

      expect(screen.getByText("Account Deactivated")).toBeInTheDocument();
      expect(
        screen.getByText(/Your account has been deactivated/)
      ).toBeInTheDocument();
    });

    it("displays no_profile message", () => {
      render(<AccessDenied reason="no_profile" />);

      expect(screen.getByText("Account Not Found")).toBeInTheDocument();
      expect(
        screen.getByText(/Your account profile could not be found/)
      ).toBeInTheDocument();
    });

    it("defaults to no_invite when reason is null", () => {
      render(<AccessDenied reason={null} />);

      expect(screen.getByText("Access Denied")).toBeInTheDocument();
      expect(
        screen.getByText(/You need an invitation to access this system/)
      ).toBeInTheDocument();
    });
  });

  describe("sign out button", () => {
    it("renders sign out button", () => {
      render(<AccessDenied reason="no_invite" />);

      expect(screen.getByRole("button", { name: /Sign Out/i })).toBeInTheDocument();
    });

    it("calls logout when sign out button is clicked", async () => {
      const user = userEvent.setup();
      render(<AccessDenied reason="no_invite" />);

      await user.click(screen.getByRole("button", { name: /Sign Out/i }));

      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe("UI elements", () => {
    it("displays contact info", () => {
      render(<AccessDenied reason="no_invite" />);

      expect(
        screen.getByText(/Need help\? Contact your system administrator/)
      ).toBeInTheDocument();
    });

    it("displays footer with version", () => {
      render(<AccessDenied reason="no_invite" />);

      expect(screen.getByText("DevTracker v1.0")).toBeInTheDocument();
    });
  });
});
