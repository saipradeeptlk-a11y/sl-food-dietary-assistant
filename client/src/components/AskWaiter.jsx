function AskWaiterTip({ questions }) {
    if (!questions || questions.length === 0) return null;

    return (
        <div className="waiter-tip">
            <strong>💬 Ask your server</strong>
            <ul>
                {questions.map((q, i) => <li key={i}>{q}</li>)}
            </ul>
        </div>
    );
}

export default AskWaiterTip;