import { useNavigate } from "react-router-dom";

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div>
      LandingPage
      <button
        onClick={() => {
          navigate("/signin");
        }}
      >
        Sign in
      </button>
      <button
        onClick={() => {
          navigate("/signup");
        }}
      >
        Sign up
      </button>
    </div>
  );
}

export default LandingPage;
