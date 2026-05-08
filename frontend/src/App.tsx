import { Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import SignUpPage from "./pages/SignUpPage";
import SignInPage from "./pages/SignInPage";
import AuthSuccess from "./pages/AuthSucess";
import Dashboard from "./pages/Dashboard";
import AccountPage from "./pages/AccountPage";

import { closeWS, openWS } from "./services/ws/marketSocket";
import { useEffect } from "react";
import type { RootState } from "./redux/store";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "./redux/store";

import { remove } from "./redux/notificationSlice";

import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AccountOverview from "./pages/AccountOverview";
import JournalsPage from "./pages/JournalsPage";
import JournalDetailPage from "./pages/JournalDetailsPage";
import AiFeedbackPage from "./pages/AiFeedbackPage";

function App() {
  const dispatch = useDispatch<AppDispatch>();

  const notifications = useSelector((s: RootState) => s.notifications.queue);

  // WS setup
  useEffect(() => {
    openWS(dispatch);

    return () => {
      closeWS();
    };
  }, [dispatch]);

  // Toast consumer
  useEffect(() => {
    const toastStyleMap = {
      MARGIN_CALL: "warning",
      LIQUIDATED: "error",
      ALERT_TRIGGERED: "info",
    } as const;
    if (!notifications.length) return;

    const n = notifications[0];

    toast(n.message, {
      type: toastStyleMap[n.type],
    });

    dispatch(remove(n.id));
  }, [notifications, dispatch]);

  return (
    <div>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/authsuccess" element={<AuthSuccess />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/accounts/:id" element={<AccountPage />} />
        <Route path="/accounts/:id/overview" element={<AccountOverview />} />
        <Route path="/accounts/:id/journals" element={<JournalsPage />} />
        <Route
          path="/accounts/:id/journals/:journalId"
          element={<JournalDetailPage />}
        />
        <Route path="/accounts/:id/ai-feedback" element={<AiFeedbackPage />} />
      </Routes>

      <ToastContainer />
    </div>
  );
}

export default App;
