import React, { useEffect, useRef, useState } from "react";
import ChatMessage from "./ChatMessage";
import ChatPanel from "./ChatPanel";
import { HiMiniSparkles } from "react-icons/hi2";
import "./chat.css";

const ChatComponent = () => {
    const [messages, setMessages] = useState([
        {
            messages: [
                "Hola, ¿qué tipo de trazos necesito para iniciar un proyecto de movimiento de tierras?",
            ],
            type: "me",
        },
        {
            messages: [
                "Para un proyecto de movimiento de tierras, normalmente se requieren las siguientes máquinas:",
                "- Excavadoras: para remover tierra y rocas.",
                "- Bulldozers: para nivelar el terreno.",
                "- Retroexcavadoras: útiles para zanjas y excavaciones más pequeñas.",
                "- Cargadores frontales: para cargar material en camiones.",
                "- Compactadores: para estabilizar el suelo después del relleno.",
            ],
            type: "ai",
        },
        {
            messages: ["¿Y para una planta de asfalto en sitio, qué equipos necesito?"],
            type: "me",
        },
        {
            messages: [
                "Para una planta de asfalto en sitio necesitarás:",
                "- Planta dosificadora de asfalto (batch o continua).",
                "- Silo de almacenamiento.",
                "- Camiones cisterna para el bitumen.",
                "- Rodillos compactadores.",
                "- Extendedoras de asfalto.",
                "- Un sistema de control y monitoreo para la mezcla.",
            ],
            type: "ai",
        },
        {
            messages: [
                "¿Me puedes recomendar alguna marca de confianza para la planta dosificadora?",
            ],
            type: "me",
        },
        {
            messages: [
                "Claro, algunas marcas reconocidas en plantas de asfalto son:",
                "- Ammann",
                "- Astec",
                "- Marini",
                "- Lintec & Linnhoff",
                "- Ciber (marca de Wirtgen Group)",
                "Dependerá de tu presupuesto, capacidad requerida y si prefieres plantas móviles o estacionarias.",
            ],
            type: "ai",
        },
    ]);
    const bottomRef = useRef(null);

    const [currentMessage, setCurrentMessage] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    const handleSend = () => {
        if (!currentMessage.trim()) return;

        const newMsg = {
            messages: [currentMessage],
            type: "me",
        };

        setMessages([...messages, newMsg]);
        setCurrentMessage("");
    };

    const handleOpen = () => {
        setIsClosing(false);
        setIsOpen(true);
    };

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsOpen(false);
        }, 300); // misma duración que la transición
    };

    return (
        <div className="chat-container">
            {!isOpen && (
                <button className="chat-toggle-btn" onClick={handleOpen}>
                    <HiMiniSparkles />
                </button>
            )}

            {isOpen && (
                <div
                    className={`chat-wrapper animated ${isClosing ? "fade-out" : "fade-in"} ${
                        isOpen ? "is-open" : ""
                    }`}
                >
                    <div className="chat-header">
                        <span>IA Chat</span>

                        <button className="close-btn" onClick={handleClose}>
                            ✖
                        </button>
                    </div>
                    <div className="chat-board">
                        {messages.map((msg, idx) => (
                            <ChatMessage key={idx} {...msg} />
                        ))}

                        <div ref={bottomRef} />
                    </div>

                    <ChatPanel
                        onSend={handleSend}
                        message={currentMessage}
                        setMessage={setCurrentMessage}
                    />
                </div>
            )}
        </div>
    );
};

export default ChatComponent;
