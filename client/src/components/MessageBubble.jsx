import SafetyBadge from './SafetyBadge';
import AskWaiterTip from './AskWaiter';

function MessageBubble({ message }) {
    const isUser = message.role === 'user';

    return (
        <div className={`bubble-row ${isUser ? 'user' : 'assistant'}`}>
            <div className={`bubble ${isUser ? 'user' : 'assistant'}`}>
                <p>{message.text}</p>
                {!isUser && message.safety && <SafetyBadge safety={message.safety} />}
                {!isUser && message.ask_the_waiter && <AskWaiterTip questions={message.ask_the_waiter} />}
            </div>
        </div>
    );
}
export default MessageBubble;