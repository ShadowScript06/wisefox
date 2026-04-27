import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

function SignInPage() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const navigate = useNavigate();
  async function handleLogin() {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/auth/email/signin`,
        {
          email,
          password,
        },
        {withCredentials:true}
      );

      if (response.data.success) {
        navigate("/authsuccess");
      }
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert("Unknown error");
      }
    }
  }
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white shadow-lg rounded-2xl p-8">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
          Welcome Back
        </h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          Sign in to continue
        </p>

        <div className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              placeholder="abc@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition"
            onClick={handleLogin}
          >
            Login
          </button>

          <div className="flex items-center gap-3 my-1">
            <div className="h-px bg-gray-300 flex-1"></div>
            <span className="text-sm text-gray-400">OR</span>
            <div className="h-px bg-gray-300 flex-1"></div>
          </div>

          <a
            href={`${import.meta.env.VITE_BACKEND_URL}/auth/google`}
            className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2 rounded-lg text-center transition"
          >
            Sign in with Google
          </a>

          <p className="text-sm text-center text-gray-500 mt-6">
          New here, want to Create account?{" "} 
          <span
            onClick={() => navigate("/signup")}
            className="text-blue-600 cursor-pointer hover:underline font-medium"
          >
            Sign Up
          </span>
        </p>
        </div>
      </div>
    </div>
  );
}

export default SignInPage;
