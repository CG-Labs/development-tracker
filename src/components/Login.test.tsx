import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { screen } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { Login } from "./Login";

// Mock the auth context
const mockLogin = vi.fn();

vi.mock("../contexts/AzureAuthContext", () => ({
  useAuth: () => ({
    login: mockLogin,
  }),
}));

describe("Login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Azure AD login button", () => {
    render(<Login />);
    const button = screen.getByRole("button", { name: /sign in with microsoft/i });
    expect(button).toBeInTheDocument();
  });

  it("displays help text about Microsoft account", () => {
    render(<Login />);
    expect(screen.getByText(/you'll be redirected to sign in with your microsoft account/i)).toBeInTheDocument();
  });

  it("displays contact admin message", () => {
    render(<Login />);
    expect(screen.getByText(/need an account\? contact your administrator/i)).toBeInTheDocument();
  });

  it("displays footer with version", () => {
    render(<Login />);
    expect(screen.getByText(/devtracker v1\.0/i)).toBeInTheDocument();
  });

  it("calls login when sign in button is clicked", async () => {
    const user = userEvent.setup();
    render(<Login />);

    const button = screen.getByRole("button", { name: /sign in with microsoft/i });
    await user.click(button);

    expect(mockLogin).toHaveBeenCalledTimes(1);
  });

  it("shows loading state during login", async () => {
    mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
    const user = userEvent.setup();
    render(<Login />);

    const button = screen.getByRole("button", { name: /sign in with microsoft/i });
    await user.click(button);

    expect(screen.getByText(/signing in/i)).toBeInTheDocument();
  });

  it("displays error when login fails", async () => {
    mockLogin.mockRejectedValueOnce(new Error("Failed to sign in"));
    const user = userEvent.setup();
    render(<Login />);

    const button = screen.getByRole("button", { name: /sign in with microsoft/i });
    await user.click(button);

    await vi.waitFor(() => {
      expect(screen.getByText(/failed to sign in/i)).toBeInTheDocument();
    });
  });

  it("has disabled button when loading", async () => {
    mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
    const user = userEvent.setup();
    render(<Login />);

    const button = screen.getByRole("button", { name: /sign in with microsoft/i });
    await user.click(button);

    expect(button).toBeDisabled();
  });
});
