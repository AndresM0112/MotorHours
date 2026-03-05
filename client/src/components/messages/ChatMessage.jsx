import React from "react";
import { HiMiniSparkles } from "react-icons/hi2";

const ChatMessage = ({ messages, type }) => {
    const isMe = type === "me";

    return (
        <div className={`chat-message-container ${isMe ? "chat-reversed" : ""}`}>
            <div className="chat-message-person">
                <div className="chat-message-avatar">
                    {!isMe ? (
                        <div className="chat-message-avatar ">
                            <HiMiniSparkles style={{ width: "14px", height: "14px" }} />
                        </div>
                    ) : null}
                </div>
            </div>
            <div className="chat-message-context">
                {messages.map((msg, idx) => (
                    <div className="chat-message-bubble" key={idx}>
                        <span>{msg}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ChatMessage;
