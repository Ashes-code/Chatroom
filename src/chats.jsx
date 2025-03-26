import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import profile from "./assets/profile.png";
import EmojiPicker from "emoji-picker-react";
import { FaSmile, FaPaperPlane, FaArrowLeft } from "react-icons/fa";
import { auth, db } from "./firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";

const WholeChats = ({ selectedChat, setSelectedChat }) => {
  const [message, setMessage] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [chats, setChats] = useState([]);
  const messagesEndRef = useRef(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [dropdownMessageId, setDropdownMessageId] = useState(null);

  useEffect(() => {
    // Fetch current authenticated user
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!selectedChat || !currentUser) return;

    const chatId =
      currentUser.uid < selectedChat.id
        ? `${currentUser.uid}_${selectedChat.id}`
        : `${selectedChat.id}_${currentUser.uid}`;

    const q = query(
      collection(db, "chats"),
      where("chatId", "==", chatId),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setChats(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [selectedChat, currentUser]);

  // Scroll to the last message
  useEffect(() => {
    if (messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest", });
      }, 100);
    }
  }, [chats]);

  // Send Message
  const handleSendMessage = async () => {
    if (!message.trim() || !selectedChat || !currentUser) return;

    const chatId =
      currentUser.uid < selectedChat.id
        ? `${currentUser.uid}_${selectedChat.id}`
        : `${selectedChat.id}_${currentUser.uid}`;

    await addDoc(collection(db, "chats"), {
      chatId,
      userId: currentUser.uid,
      user: currentUser.displayName || "Anonymous",
      receiverId: selectedChat.id,
      text: message,
      timestamp: serverTimestamp(),
    });

    setMessage("");
  };

  // Delete Message
  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "chats", id));
  };

  // Edit Message
  const handleEdit = async (id) => {
    if (newMessage.trim() === "") return;
    await updateDoc(doc(db, "chats", id), { text: newMessage });
    setEditingMessageId(null);
    setNewMessage("");
  };

  // Handle Emoji Selection
  const handleEmojiSelect = (emojiObject) => {
    setMessage((prev) => prev + emojiObject.emoji);
    console.log("Current Message:", message);
    setShowPicker(false);
  };

  return (
    <div className="flex-3 flex flex-col h-full text-white shadow-md relative background">
      {/* User Profile Section */}
      <div className="bg-[#24013C] flex items-center mb-3 p-3">
        <button className="md:hidden text-white mr-3" onClick={() => setSelectedChat(null)}>
          <FaArrowLeft size={25} />
        </button>

        <img
          src={selectedChat?.photoURL || selectedChat?.profilePic || profile}
          alt="User Profile"
          className="w-12 h-12 rounded-full object-cover mr-3"
        />
        <div className="flex flex-col">
          <span className="font-semibold text-lg">{selectedChat?.name || "Anonymous"}</span>
          <span className="text-sm text-blue-600">Online</span>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto mb-2 scroll">
        <div className="space-y-2">
          {chats.length === 0 && (
            <div className="flex flex-col items-center">
                <p className="text-center py-2 px-2 text-xl font-bold bg-white text-[#24013C] rounded-lg">
                No messages yet. Say hello!
              </p>
            </div>
          )}

          {chats.map((chat) => {
            const isSent = chat.userId === currentUser?.uid;
            const formattedTime = chat.timestamp?.seconds
              ? new Date(chat.timestamp.seconds * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "Sending...";

            return (
              <div
                key={chat.id}
                onMouseEnter={() => setDropdownMessageId(chat.id)}
                onMouseLeave={() => setDropdownMessageId(null)}
                className={`flex ${isSent ? "justify-end" : "justify-start"} mx-3`}
              >
                {!isSent && (
                  <img
                    src={selectedChat?.photoURL || selectedChat?.profilePic || profile}
                    alt="User Profile"
                    className="w-8 h-8 rounded-full object-cover mr-2"
                  />
                )}

                <div
                  className={`relative max-w-[15rem] px-3 py-2 lg:max-w-[30rem] rounded-lg shadow-lg ${
                    isSent ? "bg-[#5f029c] text-white" : "bg-[#24013C] text-white"
                  }`}
                >
                  {editingMessageId === chat.id ? (
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="w-full bg-transparent border border-gray-300 text-sm p-1 rounded-md"
                    />
                  ) : (
                    <div className="flex justify-between">
                      <span className="text-sm font-light ">{chat.text}</span>
                      <span className="text-xs font-thin ml-4 flex items-end">{formattedTime}</span>
                    </div>
                  )}

                  {dropdownMessageId === chat.id && isSent && (
                    <div className="absolute top-0 left-[-6rem] bg-gray-800/25 text-white text-xs rounded-lg shadow-md p-2 z-10">
                      {editingMessageId === chat.id ? (
                        <button onClick={() => handleEdit(chat.id)} className="w-full px-2 py-1 hover:bg-gray-700">
                          Save
                        </button>
                      ) : (
                        <>
                          <button onClick={() => setEditingMessageId(chat.id)} className="w-full px-2 py-1 hover:bg-gray-700">
                            Edit
                          </button>
                          <button onClick={() => handleDelete(chat.id)} className="w-full px-2 py-1 hover:bg-gray-700 text-red-400">
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef}></div>

        </div>
      </div>

      {/* Input Bar */}
      <div className="flex items-center border-2 p-3 mb-2 mx-3 rounded-lg bg-transparent">
        <FaSmile className="text-white mr-3 cursor-pointer" onClick={() => setShowPicker(!showPicker)} />

        <input
          type="text"
          placeholder="Type a message"
          className="bg-transparent w-full outline-none text-sm font-"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
        />

        <FaPaperPlane className="text-white ml-3 cursor-pointer" onClick={handleSendMessage} size={20} />
      </div>

      {showPicker && (
        <div className="absolute bottom-16 left-2 z-50">
          <EmojiPicker onEmojiClick={handleEmojiSelect} theme="dark" height={400} width={300} />
        </div>
      )}
    </div>
  );
};

export default WholeChats;
