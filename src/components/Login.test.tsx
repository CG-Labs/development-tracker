import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Login } from "./Login";

// Mock the auth context
const mockLogin = vi.fn();
const mockResetPassword = vi.fn();

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({
    login: mockLogin,
    resetPassword: mockResetPassword,
  }),
}));

describe("Login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("login form", () => {
    it("renders login form elements", () => {
      render(<Login />);

      expect(screen.getByText("Welcome Back")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Enter your password")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
    });

    it("renders forgot password link", () => {
      render(<Login />);

      expect(screen.getByText("Forgot Password?")).toBeInTheDocument();
    });

    it("allows user to type email and password", async () => {
      const user = userEvent.setup();
      render(<Login />);

      const emailInput = screen.getByPlaceholderText("you@example.com");
      const passwordInput = screen.getByPlaceholderText("Enter your password");

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");

      expect(emailInput).toHaveValue("test@example.com");
      expect(passwordInput).toHaveValue("password123");
    });

    it("calls login with credentials on form submit", async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue(undefined);
      render(<Login />);

      await user.type(screen.getByPlaceholderText("you@example.com"), "test@example.com");
      await user.type(screen.getByPlaceholderText("Enter your password"), "password123");
      await user.click(screen.getByRole("button", { name: "Sign In" }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith("test@example.com", "password123");
      });
    });

    it("shows loading state during login", async () => {
      const user = userEvent.setup();
      // Make login take time
      mockLogin.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));
      render(<Login />);

      await user.type(screen.getByPlaceholderText("you@example.com"), "test@example.com");
      await user.type(screen.getByPlaceholderText("Enter your password"), "password123");
      await user.click(screen.getByRole("button", { name: "Sign In" }));

      expect(screen.getByText("Signing in...")).toBeInTheDocument();
    });

    it("displays invalid-credential error message", async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValue(new Error("invalid-credential"));
      render(<Login />);

      await user.type(screen.getByPlaceholderText("you@example.com"), "test@example.com");
      await user.type(screen.getByPlaceholderText("Enter your password"), "wrongpassword");
      await user.click(screen.getByRole("button", { name: "Sign In" }));

      await waitFor(() => {
        expect(screen.getByText("Invalid email or password")).toBeInTheDocument();
      });
    });

    it("displays too-many-requests error message", async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValue(new Error("too-many-requests"));
      render(<Login />);

      await user.type(screen.getByPlaceholderText("you@example.com"), "test@example.com");
      await user.type(screen.getByPlaceholderText("Enter your password"), "password123");
      await user.click(screen.getByRole("button", { name: "Sign In" }));

      await waitFor(() => {
        expect(screen.getByText("Too many failed attempts. Please try again later.")).toBeInTheDocument();
      });
    });

    it("displays generic error message for other errors", async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValue(new Error("Network error"));
      render(<Login />);

      await user.type(screen.getByPlaceholderText("you@example.com"), "test@example.com");
      await user.type(screen.getByPlaceholderText("Enter your password"), "password123");
      await user.click(screen.getByRole("button", { name: "Sign In" }));

      await waitFor(() => {
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });
    });
  });

  describe("reset password form", () => {
    it("shows reset password form when forgot password is clicked", async () => {
      const user = userEvent.setup();
      render(<Login />);

      await user.click(screen.getByText("Forgot Password?"));

      expect(screen.getByText("Reset Password")).toBeInTheDocument();
      expect(screen.getByText("Enter your email to receive a reset link")).toBeInTheDocument();
    });

    it("requires email field to be filled before reset", async () => {
      const user = userEvent.setup();
      render(<Login />);

      await user.click(screen.getByText("Forgot Password?"));

      // The email input has the 'required' attribute
      const emailInput = screen.getByPlaceholderText("you@example.com");
      expect(emailInput).toBeRequired();
    });

    it("calls resetPassword with email", async () => {
      const user = userEvent.setup();
      mockResetPassword.mockResolvedValue(undefined);
      render(<Login />);

      await user.click(screen.getByText("Forgot Password?"));
      await user.type(screen.getByPlaceholderText("you@example.com"), "test@example.com");
      await user.click(screen.getByRole("button", { name: "Send Reset Link" }));

      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith("test@example.com");
      });
    });

    it("shows success message after reset email sent", async () => {
      const user = userEvent.setup();
      mockResetPassword.mockResolvedValue(undefined);
      render(<Login />);

      await user.click(screen.getByText("Forgot Password?"));
      await user.type(screen.getByPlaceholderText("you@example.com"), "test@example.com");
      await user.click(screen.getByRole("button", { name: "Send Reset Link" }));

      await waitFor(() => {
        expect(screen.getByText("Password reset email sent!")).toBeInTheDocument();
      });
    });

    it("shows user-not-found error message", async () => {
      const user = userEvent.setup();
      mockResetPassword.mockRejectedValue(new Error("user-not-found"));
      render(<Login />);

      await user.click(screen.getByText("Forgot Password?"));
      await user.type(screen.getByPlaceholderText("you@example.com"), "notfound@example.com");
      await user.click(screen.getByRole("button", { name: "Send Reset Link" }));

      await waitFor(() => {
        expect(screen.getByText("No account found with this email")).toBeInTheDocument();
      });
    });

    it("returns to login form when back button is clicked", async () => {
      const user = userEvent.setup();
      render(<Login />);

      await user.click(screen.getByText("Forgot Password?"));
      expect(screen.getByText("Reset Password")).toBeInTheDocument();

      await user.click(screen.getByText("Back to Login"));
      expect(screen.getByText("Welcome Back")).toBeInTheDocument();
    });

    it("returns to login form after successful reset when back button is clicked", async () => {
      const user = userEvent.setup();
      mockResetPassword.mockResolvedValue(undefined);
      render(<Login />);

      await user.click(screen.getByText("Forgot Password?"));
      await user.type(screen.getByPlaceholderText("you@example.com"), "test@example.com");
      await user.click(screen.getByRole("button", { name: "Send Reset Link" }));

      await waitFor(() => {
        expect(screen.getByText("Password reset email sent!")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Back to Login" }));
      expect(screen.getByText("Welcome Back")).toBeInTheDocument();
    });
  });

  describe("UI elements", () => {
    it("displays footer with version", () => {
      render(<Login />);

      expect(screen.getByText("DevTracker v1.0")).toBeInTheDocument();
    });

    it("displays contact admin message", () => {
      render(<Login />);

      expect(
        screen.getByText(/Need an account\? Contact your administrator/)
      ).toBeInTheDocument();
    });
  });
});
