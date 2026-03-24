import React from 'react';

const ChatBot: React.FC = () => {
  const [messages, setMessages] = React.useState<string[]>([]);
  const [input, setInput] = React.useState<string>('');

  const handleSendMessage = () => {
    if (input) {
      setMessages([...messages, input]);
      setInput('');
    }
  };

  return (
    <div>
      <div className='chatbot-messages'>
        {messages.map((msg, index) => (
          <div key={index} className='chatbot-message'>
            {msg}
          </div>
        ))}
      </div>
      <input
        type='text'
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder='Type a message...'
      />
      <button onClick={handleSendMessage}>Send</button>
    </div>
  );
};

export default ChatBot;