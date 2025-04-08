import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import profile from "./assets/profile.png";
import EmojiPicker from "emoji-picker-react";
import { FaSmile, FaPaperPlane, FaArrowLeft } from "react-icons/fa";
import { BiDotsVerticalRounded, BiCheck, BiCheckDouble } from "react-icons/bi";
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
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [chats, setChats] = useState([]);
  const messagesEndRef = useRef(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [dropdownMessageId, setDropdownMessageId] = useState(null);

  useEffect(() => {
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

  useEffect(() => {
    if (messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 100);
    }
  }, [chats]);

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
      replyTo: replyToMessage ? { 
        text: replyToMessage.text, 
        user: replyToMessage.user,
        messageId: replyToMessage.id 
      } : null,
    });

    setMessage("");
    setReplyToMessage(null);
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "chats", id));
  };

  const handleEdit = async (id) => {
    if (newMessage.trim() === "") return;
    await updateDoc(doc(db, "chats", id), { text: newMessage });
    setEditingMessageId(null);
    setNewMessage("");
  };

  const handleEmojiSelect = (emojiObject) => {
    setMessage((prev) => prev + emojiObject.emoji);
    setShowPicker(false);
  };

  return (
    <div className="flex-3 flex flex-col h-full text-white shadow-md relative background">
      {/* Header */}
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
        </div>
      </div>

      {/* Messages */}
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
                className={`flex ${isSent ? "justify-end" : "justify-start"} mx-3`}
              >
                {!isSent && (
                  <img
                    src={selectedChat?.photoURL || selectedChat?.profilePic || profile}
                    alt="User Profile"
                    className="w-8 h-8 rounded-full object-cover mr-2"
                  />
                )}

                <div className={`relative max-w-[15rem] lg:max-w-[30rem] px-3 py-2 rounded-lg shadow-lg flex flex-col
                  ${isSent ? "bg-[#5f029c] text-white" : "bg-[#24013C] text-white"}`}>
                  
                  {/* Reply preview if this is a reply */}
                  {chat.replyTo && (
                    <div className="text-xs mb-1 p-1 bg-black/20 rounded border-l-2 border-white/50 pl-2">
                      <div className="font-semibold">{chat.replyTo.user}</div>
                      <div className="truncate">{chat.replyTo.text}</div>
                    </div>
                  )}

                  <div className="flex items-start justify-between">
                    {editingMessageId === chat.id ? (
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="w-full mt-1 bg-white text-black text-sm p-1 rounded-md"
                        autoFocus
                      />
                    ) : (
                      <span className="text-sm font-light">{chat.text}</span>
                    )}
                    
                    <div className="relative ml-2">
                      <button 
                        onClick={() => setDropdownMessageId(dropdownMessageId === chat.id ? null : chat.id)}
                        className="text-white/50 hover:text-white focus:outline-none"
                      >
                        <BiDotsVerticalRounded size={16} />
                      </button>

                      {/* WhatsApp-like dropdown menu */}
                      {dropdownMessageId === chat.id && (
                        <div className={`absolute w-24 ${isSent ? 'right-0' : 'left-0'} mt-1 bg-[#233138] rounded-md shadow-lg z-10 border border-gray-700`}>
                          <button
                            onClick={() => {
                              setReplyToMessage(chat);
                              setDropdownMessageId(null);
                            }}
                            className="block w-full text-left px-2 py-1 text-xs hover:bg-[#182229]"
                          >
                            Reply
                          </button>
                          {isSent && editingMessageId === chat.id ? (
                            <button
                              onClick={() => handleEdit(chat.id)}
                              className="block w-full text-left px-2 py-1 text-xs hover:bg-[#182229]"
                            >
                              Save
                            </button>
                          ) : (
                            isSent && (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingMessageId(chat.id);
                                    setNewMessage(chat.text);
                                    setDropdownMessageId(null);
                                  }}
                                  className="block w-full text-left px-2 py-1 text-xs hover:bg-[#182229]"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    handleDelete(chat.id);
                                    setDropdownMessageId(null);
                                  }}
                                  className="block w-full text-left px-2 py-1 text-xs text-red-400 hover:bg-[#182229]"
                                >
                                  Delete
                                </button>
                              </>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end mt-1 space-x-1">
                    <span className="text-xs font-thin">
                      {formattedTime}
                    </span>
                    {isSent && (
                      <span className="text-xs">
                        {chat.timestamp?.seconds ? <BiCheckDouble /> : <BiCheck />}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <div ref={messagesEndRef}></div>
        </div>
      </div>

      {/* Reply Preview - Only shows for the current chat */}
      {replyToMessage && (
        <div className="mx-3 mb-2 px-3 py-2 rounded-lg bg-[#24013C] text-white shadow">
          <div className="flex justify-between items-center text-sm">
            <div>
              <span className="font-semibold">Replying to {replyToMessage.user}:</span>{" "}
              <span>{replyToMessage.text}</span>
            </div>
            <button 
              onClick={() => setReplyToMessage(null)} 
              className="ml-3 text-red-400 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex items-center border-2 p-3 mb-2 mx-3 rounded-lg bg-transparent">
        <FaSmile className="text-white mr-3 cursor-pointer" onClick={() => setShowPicker(!showPicker)} />
        <input
          type="text"
          placeholder="Type a message"
          className="bg-transparent w-full outline-none text-sm"
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