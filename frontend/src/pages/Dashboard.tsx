import axios from "axios";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../redux/store";
import { useNavigate } from "react-router-dom";

interface User {
  id: string;
  email: string;
  name: string;
}

type CryptoCardProps = {
  symbol: string;
  price: number;
};

function CryptoCard({ symbol, price }: CryptoCardProps) {
  return (
    <div className="w-72 rounded-2xl p-5 bg-linear-to-br from-gray-900 to-gray-800 shadow-lg border border-gray-700 text-white">
      <h2 className="text-lg font-semibold text-gray-300">{symbol}</h2>

      <div className="mt-4 text-3xl font-bold">
        ${(price ?? 0).toLocaleString()}
      </div>
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();

  // ---------------- AUTH ----------------
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_BACKEND_URL}/auth/user`, {
        withCredentials: true,
      })
      .then((res) => {
        if (res.data.success) setUser(res.data.data);
        else navigate("/signin");
      })
      .catch(() => navigate("/signin"));
  }, [navigate]);

  // ---------------- REDUX PRICES ----------------
  const prices = useSelector((state: RootState) => state.market);

  const paxgPrice = prices.PAXGUSD ?? 0;
  const btcPrice = prices.BTCUSD ?? 0;

  // ---------------- LOADING ----------------
  if (!user) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* USER INFO */}
      <div className="mb-4 text-sm text-gray-600">
        {user.name} ({user.email})
      </div>

      {/* LOGOUT */}
      <button
        className="mb-6 px-4 py-2 bg-black text-white rounded"
        onClick={() => navigate("/")}
      >
        Logout
      </button>

      <h1 className="text-2xl font-bold mb-6">Live Market Dashboard</h1>

      {/* CARDS */}
      <div className="flex gap-6">
        <CryptoCard symbol="XAU/USD" price={paxgPrice} />
        <CryptoCard symbol="BTC/USD" price={btcPrice} />
      </div>

      {/* DEBUG */}
      <div className="mt-6 text-gray-600 text-sm">
        {JSON.stringify(prices)}
      </div>
    </div>
  );
}

export default Dashboard;