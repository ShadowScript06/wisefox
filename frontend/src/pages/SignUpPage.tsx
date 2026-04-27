import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

type SignupFormType = {
  name: string;
  email: string;
  password: string;
};

function SignUpPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<SignupFormType>({
    name: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState<boolean>(false);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSignup() {
    try {
      setLoading(true);

      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/auth/email/signup`,
        formData,
        {
          withCredentials: true,
        },
      );

      if (response.data.success) {
        navigate("/signin");
      }
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert("Unknown error");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white shadow-xl rounded-2xl p-8">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
          Create Account
        </h1>

        <p className="text-sm text-gray-500 text-center mb-6">
          Sign up to get started
        </p>

        <div className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Name
            </label>

            <input
              id="name"
              name="name"
              type="text"
              placeholder="Your full name"
              value={formData.name}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email
            </label>

            <input
              id="email"
              name="email"
              type="email"
              placeholder="abc@gmail.com"
              value={formData.email}
              onChange={handleChange}
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
              name="password"
              type="password"
              placeholder="At least 8 characters"
              value={formData.password}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleSignup}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 rounded-lg transition"
          >
            {loading ? "Creating Account..." : "Sign Up"}
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
            Sign up with Google
          </a>
        </div>

        <p className="text-sm text-center text-gray-500 mt-6">
          Already have an account?{" "}
          <span
            onClick={() => navigate("/signin")}
            className="text-blue-600 cursor-pointer hover:underline font-medium"
          >
            Sign In
          </span>
        </p>
      </div>
    </div>
  );
}

export default SignUpPage;
