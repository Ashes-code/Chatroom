// AuthWrapper.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "./firebase";

const AuthWrapper = ({ children }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        navigate("/dashboard");
      } else {
        navigate("/");
      }
    });

    return () => unsubscribe(); // cleanup
  }, [navigate]);

  return children;
};

export default AuthWrapper;
