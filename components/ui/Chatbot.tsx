"use client";

import React, { useState, useEffect, useRef } from "react";
import { getBotResponse } from "@/shared/utils/chatLogic";
import { Button } from "./Button";

interface Message {
    id: string;
    text: string;
    sender: "bot" | "user";
    timestamp: Date;
}

export function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        window.dispatchEvent(
            new CustomEvent("nexus-chatbot:state", { detail: { isOpen } })
        );
    }, [isOpen]);

    // Initial greeting when opened for the first time
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([{
                id: Date.now().toString(),
                text: "¡Hola! Soy Nexus AI. Estoy aquí para ayudarte a navegar por el sistema.",
                sender: "bot",
                timestamp: new Date()
            }]);
        }
    }, [isOpen, messages.length]);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isTyping, isOpen]);

    const handleSend = (text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            text: trimmed,
            sender: "user",
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsTyping(true);

        // Simulate small delay for natural feeling
        setTimeout(() => {
            const response = getBotResponse(trimmed);
            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: response.text,
                sender: "bot",
                timestamp: new Date()
            };
            setMessages(prev => [...prev, botMsg]);
            setIsTyping(false);
        }, 600);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            handleSend(input);
        }
    };

    return (
        <div
            className="fixed flex flex-col items-end"
            style={{
                bottom: "var(--safe-floating-bottom)",
                right: "var(--safe-floating-right)",
                zIndex: "var(--layer-chatbot)",
            }}
        >
            {isOpen && (
                <div className="mb-4 flex h-[450px] w-[min(350px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl bg-[var(--color-surface-base)] shadow-2xl border border-[var(--color-border-subtle)] transition-all duration-300">
                    {/* Header */}
                    <div className="flex items-center justify-between bg-[var(--color-brand-strong)] p-4 text-[var(--color-text-inverse)]">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface-base)]/20 p-1">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="font-semibold text-sm">Asistente Nexus</h3>
                                <p className="text-xs text-[var(--color-text-inverse)]/80">Online</p>
                            </div>
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--color-surface-sunken)]">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                                    msg.sender === "user" 
                                    ? "bg-[var(--color-brand-strong)] text-[var(--color-text-onbrand)] rounded-tr-sm" 
                                    : "bg-[var(--color-surface-base)] text-[var(--color-text-primary)] border border-[var(--color-border-subtle)] rounded-tl-sm whitespace-pre-wrap"
                                }`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-[var(--color-surface-base)] border border-[var(--color-border-subtle)] rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1 items-center w-fit shadow-sm">
                                    <div className="w-1.5 h-1.5 bg-[var(--color-text-disabled)] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="w-1.5 h-1.5 bg-[var(--color-text-disabled)] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="w-1.5 h-1.5 bg-[var(--color-text-disabled)] rounded-full animate-bounce"></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] p-3">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Escribe tu consulta..."
                                className="flex-1 bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] text-sm rounded-full px-4 py-2 focus:outline-none focus:border-[var(--color-border-focus)] transition-colors placeholder:text-[var(--color-text-disabled)]"
                            />
                            <Button 
                                variant="primary" 
                                size="sm" 
                                onClick={() => handleSend(input)}
                                disabled={!input.trim()}
                                className="rounded-full !p-2 shrink-0 aspect-square"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 -rotate-45 ml-1 mb-1">
                                    <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                                </svg>
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-brand-strong)] text-[var(--color-text-inverse)] shadow-lg hover:bg-[var(--color-brand-stronger)] hover:scale-105 active:scale-95 transition-all duration-200"
                aria-label="Abrir asistente de chat"
            >
                {isOpen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                    </svg>
                )}
            </button>
        </div>
    );
}
