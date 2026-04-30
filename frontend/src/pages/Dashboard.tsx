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

interface Account {
  id: string;
  userId: string;
  balance: number;
  name: string;
  createdAt: string;
}

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

  const [user, setUser] = useState<User | null>(null);

  const [accountName, setAccountName] = useState<string>("");

  const [balance, setBalance] = useState<string>("");

  const [accounts, setAccounts] = useState<Account[]>([]);

  const handleCreateAccount = async () => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/accounts`,
        {
          name: accountName,
          balance:parseFloat(balance),
        },
        { withCredentials: true },
      );

      if (response.data.success) {
        setAccounts((prev) => [...prev, response.data.data]);
        setAccountName("");
        setBalance("");
      }
    } catch (error) {
      if (error instanceof Error) alert(error.message);
    }
  };

   const handleDelete = async (id:string) => {
    try {
      const response = await axios.delete(
        `${import.meta.env.VITE_BACKEND_URL}/accounts/${id}`,
        
        { withCredentials: true },
      );

      if (response.data.success) {
        const filtered=accounts.filter((account)=>{
          return account.id!==id;
        })  
        setAccounts(filtered);
        
      }
    } catch (error) {
      if (error instanceof Error) alert(error.message);
    }
  };

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


      axios
      .get(`${import.meta.env.VITE_BACKEND_URL}/accounts`, {
        withCredentials: true,
      })
      .then((res) => {
        if (res.data.success) setAccounts(res.data.data);
      })
      .catch((err) => {if(err instanceof Error){
        console.log(err)
      }});
  }, []);

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

      <div className="flex w-screen min-h-screen bg-gray-950 text-white">

  {/* LEFT PANEL - CREATE ACCOUNT */}
  <div className="w-1/3 p-8 border-r border-gray-800">
    <h1 className="text-2xl font-bold mb-6">Start Paper Trading</h1>

    <div className="space-y-5">

      <div>
        <label className="block text-sm text-gray-400 mb-1">
          Account Name
        </label>
        <input
          type="text"
          placeholder="Intraday, Swing, etc..."
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
          className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">
          A/C Balance
        </label>
        <input
          type="text"
          placeholder="$1000"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <button
        onClick={handleCreateAccount}
        className="w-full bg-blue-600 hover:bg-blue-700 transition-all py-2 rounded-lg font-semibold"
      >
        Create Account
      </button>
    </div>
  </div>

  {/* RIGHT PANEL - ACCOUNTS LIST */}
  <div className="w-2/3 p-8 bg-gray-950">
    <h2 className="text-xl font-semibold mb-6">Your Accounts</h2>

    {accounts.length > 0 ? (
      <div className="grid gap-4">
        {accounts.map((account) => (
          <div
            key={account.id}
            className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex justify-between items-center hover:border-gray-700 transition"
          >
            <div>
              <h1 className="text-lg font-bold">{account.name}</h1>
              <p className="text-sm text-gray-400">
                Balance: <span className="text-green-400">${account.balance}</span>
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/accounts/${account.id}`)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium"
              >
                Trade
              </button>

              <button
                onClick={() => handleDelete(account.id)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="text-gray-500 mt-10">
        No accounts found. Create one and start trading 🚀
      </div>
    )}
  </div>
</div>
    </div>
  );
}

export default Dashboard;
