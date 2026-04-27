import axios from "axios";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import PreTradeCalculator from "../components/PreTradeCalculator";

interface Account {
  id: string;
  userId: string;
  balance: number;
  name: string;
  createdAt: string;
}
function AccountPage() {
  const { id } = useParams();

  const [account, setAccount] = useState<Account | null>(null);
 




  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_BACKEND_URL}/accounts/${id}`, {
        withCredentials: true,
      })
      .then((response) => {
        if (response.data.success) {
          setAccount(response.data.data);
        }
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);

  return (
    <div>
      AccountPage
      {account ? <>
      <h1>{account.name}</h1>
      <h1>{account.balance}</h1>
        <PreTradeCalculator/>
      
      </> : <>No account Found</>}
    </div>
  );
}

export default AccountPage;
