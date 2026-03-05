import React from "react";
import { FiSend } from "react-icons/fi";

const ChatPanel = ({ onSend, message, setMessage }) => {
    return (
        <div className="chat-panel">
            <div className="chat-panel-container">
                {/* <button className="chat-panel-button chat-add-file-button">
                    <FiPlus />
                </button> */}

                <input
                    type="text"
                    className="chat-panel-input"
                    placeholder="Escribe un mensaje ..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                />
                <button className="chat-panel-button chat-send-message-button" onClick={onSend}>
                    <FiSend />
                </button>
            </div>
        </div>
    );
};

export default ChatPanel;
