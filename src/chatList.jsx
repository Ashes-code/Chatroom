import "./App.css";
import profile from "./assets/profile.png";
import { useNavigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { FaSearch, FaUserEdit, FaPen } from "react-icons/fa";
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
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [editedName, setEditedName] = useState("");
  const [editedEmail, setEditedEmail] = useState("");
  const [unreadCounts, setUnreadCounts] = useState({});
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  const auth = getAuth();
  const navigate = useNavigate();

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
          className="w-12 h-12 rounded-full object-cover mr-3"
          title="Your Profile Image"
        />
        <div className="flex flex-col">
          <span className="font-semibold text-lg">{currentUser?.name || "Anonymous"}</span>
          <span className="text-sm text-blue-700">Online</span>
        </div>
        <button className="ml-auto p-2 text-gray-500 hover:text-blue-500" onClick={() => setIsModalOpen(true)}>
          <FaUserEdit size={25} />
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 mx-3 flex justify-center items-center z-50">
          <div className="bg-[#24013C] p-6 rounded-lg w-80 shadow-lg relative">
            <button className="absolute top-2 right-3 text-gray-600 text-xl" onClick={() => setIsModalOpen(false)}>
              ×
            </button>
            <h2 className="text-2xl font-bold mb-4">Profile Info</h2>
            <p>
              <strong>Name:</strong>{" "}
              {editingField === "name" ? (
                <input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="bg-transparent border-b border-gray-400 px-1 ml-2 text-white outline-none"
                />
              ) : (
                <span className="ml-2">{currentUser?.name || "Anonymous"}</span>
              )}
              <FaPen
                className="inline ml-2 cursor-pointer text-gray-400 hover:text-gray-200"
                onClick={() => setEditingField("name")}
              />
            </p>
            <p>
              <strong>Email:</strong>{" "}
              {editingField === "email" ? (
                <input
                  value={editedEmail}
                  onChange={(e) => setEditedEmail(e.target.value)}
                  className="bg-transparent border-b border-gray-400 px-1 ml-2 text-white outline-none"
                />
              ) : (
                <span className="ml-2">{currentUser?.email || "Not Available"}</span>
              )}
              <FaPen
                className="inline ml-2 cursor-pointer text-gray-400 hover:text-gray-200"
                onClick={() => setEditingField("email")}
              />
            </p>
            {editingField && (
              <button className="bg-green-500 text-white py-2 px-4 rounded-lg mt-3" onClick={saveChanges}>
                Save
              </button>
            )}
            <button
              className="mt-5 w-full bg-red-500 text-white py-2 rounded-lg hover:bg-red-600"
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
    </div>
  );
};

export default ChatList;