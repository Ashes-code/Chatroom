import "./App.css";
import profile from "./assets/profile.png";
import { useNavigate } from "react-router-dom";
import React, { useState, useEffect, useRef } from "react";
import { FaSearch, FaUserEdit, FaPen, FaTimes } from "react-icons/fa";
import Zoom from 'react-medium-image-zoom';
import 'react-medium-image-zoom/dist/styles.css';
import { db } from "./firebase";
import {
  collection,
  query,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const ChatList = ({ setSelectedChat }) => { 
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [editedName, setEditedName] = useState("");
  const [editedEmail, setEditedEmail] = useState("");
  const [unreadCounts, setUnreadCounts] = useState({});
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [previewImage, setPreviewImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const auth = getAuth();
  const navigate = useNavigate();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0] || e.dataTransfer?.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.match('image.*')) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error("Image size should be less than 5MB");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "profile_pictures"); // Replace with your preset

    try {
      const response = await fetch(
        "https://api.cloudinary.com/v1_1/dkiukbtsl/image/upload", // Replace with your cloud name
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();
      await updateUserProfile(data.secure_url);
      toast.success("Profile picture updated successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
      setIsDragOver(false);
    }
  };

  const updateUserProfile = async (imageUrl) => {
    try {
      const userRef = doc(db, "users", currentUser.id);
      await updateDoc(userRef, {
        profilePic: imageUrl,
      });
      setCurrentUser(prev => ({ ...prev, profilePic: imageUrl }));
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileChange(e);
  };


  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setCurrentUser({ id: user.uid, ...userDoc.data() });
          setEditedName(userDoc.data().name || "");
          setEditedEmail(userDoc.data().email || "");
        }
      }
    });
    return () => unsubscribeAuth();
  }, [auth]);

  useEffect(() => {
    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return;

    const chatsRef = collection(db, "chats");
    const q = query(
      chatsRef,
      where("receiverId", "==", currentUser.id),
      where("read", "==", false),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newUnreadCounts = {};
      let newTotalCount = 0;

      snapshot.docs.forEach((doc) => {
        const message = doc.data();
        const senderId = message.userId;
        if (senderId !== currentUser.id) {
          newUnreadCounts[senderId] = (newUnreadCounts[senderId] || 0) + 1;
          newTotalCount++;
          
          if (message.timestamp?.seconds > Date.now() / 1000 - 10) {
            toast.info(`📩 New message from ${message.user}: ${message.text}`, {
              position: "bottom-right",
              autoClose: 3000,
              theme: "dark",
            });
          }
        }
      });

      setUnreadCounts(newUnreadCounts);
      setTotalUnreadCount(newTotalCount);
      
      // Update the browser tab title with unread count
      if (newTotalCount > 0) {
        document.title = `(${newTotalCount}) Chat App`;
      } else {
        document.title = "Chat App";
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  const saveChanges = async () => {
    if (!currentUser?.id) return;
    try {
      await updateDoc(doc(db, "users", currentUser.id), {
        name: editedName,
        email: editedEmail,
      });
      setCurrentUser((prev) => ({ ...prev, name: editedName, email: editedEmail }));
      toast.success("Profile updated successfully!", { position: "top-right", theme: "dark" });
      setEditingField(null);
    } catch (error) {
      toast.error(`Error updating profile: ${error.message}`, { position: "top-right", theme: "dark" });
    }
  };

  const openChat = async (user) => {
    setSelectedChat(user);
    
    // Update unread counts
    setUnreadCounts((prev) => {
      const newCounts = { ...prev };
      const countForUser = newCounts[user.id] || 0;
      
      // Subtract this user's unread count from total
      setTotalUnreadCount(prev => {
        const newTotal = prev - countForUser;
        
        // Update document title
        if (newTotal > 0) {
          document.title = `(${newTotal}) Chat App`;
        } else {
          document.title = "Chat App";
        }
        
        return newTotal;
      });
      
      // Clear this user's unread count
      newCounts[user.id] = 0;
      return newCounts;
    });

    if (currentUser?.id) {
      const chatId =
        currentUser.id < user.id
          ? `${currentUser.id}_${user.id}`
          : `${user.id}_${currentUser.id}`;
      const chatsRef = collection(db, "chats");
      const q = query(
        chatsRef,
        where("chatId", "==", chatId),
        where("receiverId", "==", currentUser.id),
        where("read", "==", false)
      );
      const querySnapshot = await getDocs(q);
      const batchUpdates = querySnapshot.docs.map((doc) =>
        updateDoc(doc.ref, { read: true })
      );
      await Promise.all(batchUpdates);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully!");
      document.title = "Chat App"; // Reset title on logout
      navigate("/login");
    } catch (error) {
      toast.error(`Logout error: ${error.message}`);
    }
  };

  return (
    <div className="bg-gradient-to-b from-[#24013C] via-[#24013C] to-[#000000] px-3 py-3 w-full h-screen flex-1 text-white">
      <ToastContainer />
      <div className="flex items-center mb-6 py-2">
      <img
        src={currentUser?.profilePic || profile}
        alt="Profile"
        className="w-12 h-12 cursor-pointer rounded-full object-cover mr-3"
        title={currentUser?.name}
        onClick={() => setSelectedImage(currentUser?.profilePic || profile || currentUser?.photoURL)}
        />
        <div className="flex flex-col">
          <span className="font-semibold text-lg">{currentUser?.name || "Anonymous"}</span>
          <span className="text-sm text-blue-700">Online</span>
        </div>
        <button className="ml-auto p-2 text-gray-500 hover:text-blue-500 cursor-pointer" onClick={() => setIsModalOpen(true)}>
          <FaUserEdit size={25} />
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 flex justify-center items-center z-50 px-3 px:mx-0">
          <div className="bg-[#24013C] p-6 rounded-lg w-full max-w-md shadow-lg relative">
            <button 
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
              onClick={() => setIsModalOpen(false)}
            >
              <FaTimes size={20} />
            </button>
            
            <h2 className="text-2xl font-bold mb-4">Edit Profile</h2>
            
            {/* Profile Picture Upload */}
            <div 
              className={`mb-6 p-4 border-2 border-dashed rounded-lg flex flex-col items-center justify-center 
                ${isDragOver ? 'border-purple-500 bg-purple-900/20' : 'border-gray-600'} 
                ${isUploading ? 'opacity-70 cursor-wait' : 'cursor-pointer'}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current.click()}
            >
              {isUploading ? (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto mb-2"></div>
                  <p>Uploading...</p>
                </div>
              ) : (
                <>
                  <img
                    src={currentUser?.profilePic || profile}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover mb-3"
                  />
                  <p className="text-center text-gray-300">
                    {isDragOver ? 'Drop image here' : 'Click to upload or drag & drop'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Supports JPG, PNG (Max 5MB)</p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={isUploading}
                  />
                </>
              )}
            </div>

            {/* Name and Email Fields (keep your existing implementation) */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <div className="flex items-center">
                  {editingField === "name" ? (
                    <input
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="bg-[#1a0030] border border-gray-600 rounded px-3 py-2 w-full text-white"
                    />
                  ) : (
                    <span className="flex-1">{currentUser?.name || "Anonymous"}</span>
                  )}
                  <button 
                    className="ml-2 text-gray-400 hover:text-white"
                    onClick={() => setEditingField(editingField === "name" ? null : "name")}
                  >
                    <FaPen />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <div className="flex items-center">
                  {editingField === "email" ? (
                    <input
                      value={editedEmail}
                      onChange={(e) => setEditedEmail(e.target.value)}
                      className="bg-[#1a0030] border border-gray-600 rounded px-3 py-2 w-full text-white"
                    />
                  ) : (
                    <span className="flex-1">{currentUser?.email || "Not available"}</span>
                  )}
                  <button 
                    className="ml-2 text-gray-400 hover:text-white"
                    onClick={() => setEditingField(editingField === "email" ? null : "email")}
                  >
                    <FaPen />
                  </button>
                </div>
              </div>
            </div>

            {/* Save Button */}
            {editingField && (
              <button
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg mt-6"
                onClick={saveChanges}
              >
                Save Changes
              </button>
            )}

            {/* Logout Button */}
            <button
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg mt-4"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      )}


      <div className="flex items-center mb-5 px-3 py-2 border-2 rounded-lg">
        <FaSearch className="text-gray-400 mr-2" />
        <input
          type="text"
          placeholder="Search users"
          className="bg-transparent w-full outline-none text-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="scroll overflow-y-scroll h-10/12 pb-5">
        {users
          .filter((user) =>
            user.id !== currentUser?.id &&
            (user.name?.toLowerCase() || "").includes(searchQuery.toLowerCase())
          )
          .map((user) => (
            <div
              key={user.id}
              onClick={() => openChat(user)}
              className="flex items-center justify-between p-2 rounded-sm hover:bg-[#070010]/50 cursor-pointer mb-3"
            >
              <div className="flex items-center">
                <img
                  src={user.profilePic || profile}
                  alt={user.name || "User"}
                  className="w-12 h-12 rounded-full object-cover mr-3"
                  title={user.name}
                />
                <span>{user.name || "Unknown"}</span>
              </div>
              {unreadCounts[user.id] > 0 && (
                <span className="bg-green-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCounts[user.id]}
                </span>
              )}
            </div>
          ))}
      </div>

      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80"
          onClick={() => setSelectedImage(null)}
        >
          <Zoom>
            <img
              src={selectedImage}
              alt="Full View"
              className="max-w-full max-h-full rounded-md shadow-lg"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking image
            />
          </Zoom>
          <button
            className="absolute top-4 right-4 text-white text-xl bg-gray-800 px-3 py-1 rounded-full hover:bg-gray-600"
            onClick={() => setSelectedImage(null)}
          >
            ✕
          </button>
        </div>
      )}
      
    </div>
  );
};

export default ChatList;