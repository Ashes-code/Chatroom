import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, googleProvider, db } from "./firebase.js";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { createUserWithEmailAndPassword, signInWithPopup, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import "./App.css";

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dkiukbtsl/image/upload";
const CLOUDINARY_UPLOAD_PRESET = "profile_pictures";

const SignUp = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false)
  const [userName, setUserName] = useState("");
  const [profilePic, setProfilePic] = useState(null); // Holds the final URL
  const [previewPic, setPreviewPic] = useState(null); // Temporary preview
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleNavigate = () => {
    navigate("/Chatroom/login");
  };

  const togglePassword = () => {
    setShowPassword(!showPassword);
  };

  const handleImageUpload = async (file) => {
    if (!file) {
      toast.error("No file selected.");
      return null;
    }
  
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  
    try {
      const response = await axios.post(
        CLOUDINARY_URL,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      const imageUrl = response.data.secure_url;
      setProfilePic(imageUrl); 
      console.log("Cloudinary Upload Success:", imageUrl);
      return imageUrl;
    } catch (error) {
      toast.error("Error uploading image.");
      console.error("Cloudinary Upload Error:", error.response?.data || error);
      return null;
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);

    let imageUrl = profilePic;

    if (!imageUrl && previewPic) {
        imageUrl = await handleImageUpload(previewPic);
        setProfilePic(imageUrl); // Ensure profilePic is updated
    }

    if (!imageUrl) {
        toast.error("Profile picture upload failed!");
        setLoading(false);
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await updateProfile(user, { displayName: userName, photoURL: imageUrl });

        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            name: userName,
            email: user.email,
            profilePic: user.photoURL || "",
        });

        toast.success("Signed up successfully!");
        setTimeout(() => navigate("/Chatroom/dashboard"), 3000);
    } catch (err) {
        toast.error(err.message);
    } finally {
        setLoading(false);
    }
};


  const handleGoogleSignUp = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
  
      // Only update Firestore if the user document doesn't exist
      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          name: user.displayName,
          email: user.email,
          profilePic: user.photoURL, // Ensure this field is updated correctly
        },
        { merge: true } // Prevent overwriting existing data
      );
  
      toast.success("Signed up successfully!");
      setTimeout(() => navigate("/Chatroom/dashboard"), 2000);
    } catch (err) {
      console.log(err)
      toast.error(err.message);
    }
  };
  

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPreviewPic(file); // Set preview before upload
      setProfilePic(null); // Reset final URL to avoid confusion
    }
  };

  return (
    <div className="bg-gradient-to-b from-[#24013C] via-[#24013C] to-[#000000] flex flex-col items-center justify-center h-screen font-roboto">
      <ToastContainer position="top-right" autoClose={2000} />
      <div className="text-black px-6 rounded-lg shadow-lg sm:w-64 md:w-96 bg-white">
        <h2 className="text-2xl font-semibold text-center my-3">Sign Up</h2>
        
         <form onSubmit={handleSignUp} className="flex flex-col gap-4 items-center ">
          <div className="flex flex-col items-center gap-3">
            <img
              src={profilePic || (previewPic && URL.createObjectURL(previewPic)) || "/default-avatar.png"}
              alt="Profile"
              className="mt-2 w-24 h-24 rounded-full object-cover border-2"
            />
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="bg-blue-600 p-2 rounded-lg w-full py-2 outline-0 cursor-pointer"
            />
          </div>
          <input
            type="text"
            placeholder="Username"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="border-2 p-2 rounded w-full outline-0 cursor-pointer"
            required
          />
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

          { loading ? <p className="bg-gray-800 text-white py-2 rounded cursor-not-allowed w-full text-center">Signing Up....</p> :
          <button type="submit" className="bg-blue-500 text-white py-2 rounded hover:bg-blue-700 cursor-pointer w-full">
            Sign Up
          </button> }
        </form> 

        <hr className="my-2" />
        <button
          onClick={handleGoogleSignUp}
          className="bg-red-500 text-white py-2 rounded w-full hover:bg-red-600 cursor-pointer"
        >
          Sign Up with Google
        </button>
        <p className="font-normal hover:underline flex flex-col items-end my-3 text-black cursor-pointer" onClick={handleNavigate}>
          Already have an account? Login
        </p>
      </div>
    </div>
  );
};

export default SignUp;
