// app/reset-credentials/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Loader2 } from "lucide-react";
import { Ubuntu } from "next/font/google";

const ubuntu = Ubuntu({
  weight: "400",
  subsets: ["latin"],
});

export default function ResetCredentials() {
  const [emailOTP, setEmailOTP] = useState("");
  const [username, setUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [sendingOTP, setSendingOTP] = useState<"email" | null>(null);

  const router = useRouter();

  const requestOTP = async () => {
    setError("");
    setMessage("");
    setSendingOTP("email");

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "email" }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setMessage("OTP sent successfully via email!");
    } catch {
      setError("Failed to send OTP");
    } finally {
      setSendingOTP(null);
    }
  };

  const resetCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);

    try {
      const payload = {
        type: "email",
        emailOTP,
        username,
        newPassword,
      };

      const res = await fetch("/api/auth/reset-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setMessage("Credentials updated successfully! Redirecting...");
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError("Failed to reset credentials");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`${ubuntu.className} antialiased min-h-screen flex items-center justify-center  bg-gradient-to-r from-amber-500 to-orange-500`}
    >
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
          Reset Credentials
        </h1>

        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        {message && (
          <p className="text-green-500 text-center mb-4">{message}</p>
        )}

        <button
          onClick={requestOTP}
          disabled={sendingOTP !== null}
          className="w-full mb-4 p-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 flex justify-center items-center"
        >
          {sendingOTP === "email" ? (
            <Loader2 className="animate-spin h-5 w-5 mr-2" />
          ) : (
            <Mail className="h-5 w-5 mr-2" />
          )}
          Email OTP
        </button>

        <form onSubmit={resetCredentials}>
          <div className="mb-4">
            <label
              htmlFor="email-otp"
              className="block text-lg font-medium text-gray-700 mb-1"
            >
              Email OTP
            </label>
            <input
              id="email-otp"
              value={emailOTP}
              onChange={(e) => setEmailOTP(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Enter email OTP"
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="username"
              className="block text-lg font-medium text-gray-700 mb-1"
            >
              New Username
            </label>
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Enter new username"
            />
          </div>

          <div className="mb-6">
            <label
              htmlFor="password"
              className="block text-lg font-medium text-gray-700 mb-1"
            >
              New Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2 pr-10 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full p-2 rounded-lg text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 flex justify-center items-center"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                Updating Credentials...
              </>
            ) : (
              "Update Credentials"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
