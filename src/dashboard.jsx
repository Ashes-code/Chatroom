import React, { useState, useEffect } from "react";
import ChatList from "./chatList";
import WholeChats from "./chats";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import "./App.css";
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error }) {
  return (
    <div className="p-4 text-red-500">
      <p>Something went wrong:</p>
      <pre>{error.message}</pre>
    </div>
  );
}


const Dashboard = () => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [user, setUser] = useState(null);
  const [showModal, setShowModal] = useState(true); // Modal visibility state
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user); // Store the logged-in user
      
      // Hide modal 2 seconds after auth check
      setTimeout(() => setShowModal(false), 2000);
    });

    return () => unsubscribe();
  }, [auth]);

  return (
    <div className="bg-gradient-to-b from-[#24013C] via-[#24013C] to-[#000000] flex items-center justify-center h-screen w-screen overflow-hidden">
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-[#24013C] text-white p-4 rounded-lg shadow-lg text-center">
            <p className="text-lg font-semibold">Welcome to the Chatroom...</p>
          </div>
        </div>
      )}

      <div className="flex w-screen h-screen">
        {/* Chat List - Always visible on large screens */}
        <div className={`w-full md:w-1/3 lg:w-1/3 ${selectedChat ? "hidden md:block" : "block"}`}>
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <ChatList setSelectedChat={setSelectedChat} />
          </ErrorBoundary>
        </div>

        {/* Whole Chat Section - Show only if user is logged in */}
        <div className={`w-full md:w-2/3 lg:w-2/3 ${selectedChat ? "block" : "hidden md:block"} background`}>
          {user ? (
            <div className="h-full flex items-center justify-center text-white">
              {selectedChat ? (
                <WholeChats selectedChat={selectedChat} setSelectedChat={setSelectedChat} />
              ) : (
                <div className="flex flex-col items-center">
                  <p className="text-white text-2xl font-bold">Select a chat to see your conversations</p>
                  <p className="text-white text-sm italic">Brought to you by chatroom!</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full bg-white p-3 text-white text-lg">
              Please Log in to view your conversations.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
