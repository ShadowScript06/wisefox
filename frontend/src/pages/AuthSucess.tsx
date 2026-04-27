import axios from "axios";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AuthSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_BACKEND_URL}/auth/user`, {
        withCredentials: true,
      })
      .then((response) => {
        console.log(response.data);
        if (!response.data.success) {
          alert("Unauthorised");
          navigate("/login");
        } else {
          navigate("/dashboard");
        }
      })
      .catch((err) => {
        console.log(err);
        navigate("/signin");
      });
  }, []);

  return <p>Signing you in...</p>;
}
