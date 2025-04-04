import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db, googleProvider } from "./firebase";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleNavigate = () => {
    navigate("/");
  };
  const togglePassword = () => {
    setShowPassword(!showPassword);
  };

  // Save user info to Firestore
  const saveUserToFirestore = async (user) => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        name: user.displayName || "Anonymous",
        email: user.email,
        photoURL: user.photoURL || "", // Default to empty string if no profile picture
        createdAt: new Date(),
      });
    }
  };

  // Handle email/password login
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await saveUserToFirestore(userCredential.user); // Save user data to Firestore
      toast.success("Login successful!");
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Handle Google login
  const handleGoogleLogin = async () => {
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      await saveUserToFirestore(userCredential.user); // Save Google user data
      toast.success("You are logged in!");
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="bg-gradient-to-b from-[#24013C] via-[#24013C] to-[#000000] flex flex-col items-center justify-center min-h-screen font-roboto">
      <ToastContainer position="top-right" autoClose={2000} />
      <div className="text-white p-8 rounded-lg shadow-lg xs:w-56 md:w-96 bg-gradient-to-b from-[#1d0130] via-[#24013C] to-[#570191]">
        <h2 className="text-2xl font-semibold text-center mb-4">Login</h2>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border-2 p-2 rounded w-full outline-0 cursor-pointer"
            required
          />
          <div className="relative w-full">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-2 p-2 rounded w-full outline-0 cursor-pointer pr-10"
              required
            />
            <span
              onClick={togglePassword}
              className="absolute right-3 top-3 cursor-pointer text-gray-600"
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
            </div>

          <button type="submit" className="bg-blue-500 text-white py-2 rounded hover:bg-blue-600 cursor-pointer">
            Login
          </button>
        </form>
        <hr className="my-4" />
        <button
          onClick={handleGoogleLogin}
          className="bg-[#24013C] text-white py-2 rounded w-full hover:bg-[#12011d] cursor-pointer"
        >
          Login with Google
        </button>
        <p className="font-normal hover:underline flex flex-col items-end mt-3 text-white cursor-pointer" onClick={handleNavigate}>
          Don't have an account? Sign Up
        </p>
      </div>
    </div>
  );
};

export default Login;
