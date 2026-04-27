import { Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import SignUpPage from "./pages/SignUpPage";
import SignInPage from "./pages/SignInPage";
import AuthSuccess from "./pages/AuthSucess";
import Dashboard from "./pages/Dashboard";
import { closeWS, openWS } from "./services/ws/marketSocket";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "./redux/store";

function App() {
  const dispatch=useDispatch<AppDispatch>();

  useEffect(() => {
    openWS(dispatch);

    return () => {
      closeWS();
    };
  }, []);

  return (
    <div>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route path="/signup" element={<SignUpPage />} />

        <Route path="/signin" element={<SignInPage />} />

        <Route path="/authsuccess" element={<AuthSuccess />} />

        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </div>
  );
}

export default App;
