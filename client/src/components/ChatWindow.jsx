import { useState, useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';

function ChatWindow() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim() || loading) return;

        const userMessage = { role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const res = await fetch('http://localhost:5000/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMessage.text })
            });

            const data = await res.json();

            const assistantMessage = {
                role: 'assistant',
                text: data.reply,
                safety: data.safety,
                ask_the_waiter: data.ask_the_waiter
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (err) {
            console.error('Failed to reach backend:', err);
            setMessages(prev => [...prev, {
                role: 'assistant',
                text: "Sorry, I couldn't reach the server. Please try again.",
                safety: 'unknown',
                ask_the_waiter: []
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };


    return (
        <div className="app-shell">
            <div className="chat-header">
                <div className="eyebrow">Tourist dietary guide</div>
                <h1>Sri Lankan Food Guide</h1>
            </div>

            <div className="chat-body">
                {messages.length === 0 && (
                    <p className="chat-empty">Ask me about a Sri Lankan dish — ingredients, dietary safety, or regional specialties.</p>
                )}
                {messages.map((msg, i) => <MessageBubble key={i} message={msg} />)}
                {loading && <p className="chat-typing">Typing…</p>}
                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-bar">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="e.g. Is seeni sambol vegan?"
                />
                <button onClick={sendMessage} disabled={loading}>Send</button>
            </div>
        </div>
    );

}

export default ChatWindow;