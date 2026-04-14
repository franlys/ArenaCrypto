"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { useAccount } from "wagmi";
import styles from "./ChatRoom.module.css";
import { motion, AnimatePresence } from "framer-motion";

interface ChatRoomProps {
  matchId: string;
}

export default function ChatRoom({ matchId }: ChatRoomProps) {
  const { address } = useAccount();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Fetch existing messages & subscribe to new ones
  useEffect(() => {
    async function fetchMessages() {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("match_id", matchId)
        .order("created_at", { ascending: true });

      if (!error) setMessages(data || []);
      setLoading(false);
    }

    fetchMessages();

    const channel = supabase
      .channel(`chat_${matchId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `match_id=eq.${matchId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  // 2. Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // 3. Send Message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const content = newMessage;
    setNewMessage("");

    const { error } = await supabase.from("chat_messages").insert({
      match_id: matchId,
      sender_id: user.id,
      content: content
    });

    if (error) {
      console.error("Error sending message:", error);
      alert("Error enviando mensaje.");
    }
  };

  return (
    <div className={`${styles.chatWrapper} glass-panel`}>
      <div className={styles.chatHeader}>
        <div className={styles.statusIndicator}></div>
        <span className="font-orbitron">COMUNICACIONES DE COMBATE</span>
      </div>

      <div className={styles.messageFeed} ref={scrollRef}>
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`${styles.message} ${msg.sender_id === address ? styles.ownMsg : ""}`}
            >
              <div className={styles.msgContent}>{msg.content}</div>
              <div className={styles.timestamp}>
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <form className={styles.chatInput} onSubmit={sendMessage}>
        <input
          type="text"
          placeholder="Escribe un mensaje táctico..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button type="submit" className="btn-primary">ENVIAR</button>
      </form>
    </div>
  );
}
