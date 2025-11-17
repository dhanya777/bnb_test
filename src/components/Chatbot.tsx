import React, { useState, useRef, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { apiService } from '../services/apiService';
import { Report } from '../types';
import Spinner from './Spinner';

interface ChatbotProps {
  currentUser: User;
  selectedReport: Report | null; // Optional: provide context from the currently selected report
}

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

const Chatbot: React.FC<ChatbotProps> = ({ currentUser, selectedReport }) => {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [chatHistory]);

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault(); // Prevent form default submit if called from form
    if (!currentMessage.trim() || loading) return;

    const userMessage = currentMessage;
    setChatHistory((prev) => [...prev, { role: 'user', content: userMessage }]);
    setCurrentMessage('');
    setLoading(true);
    setError(null);

    try {
      const token = await currentUser.getIdToken();
      const payload: { message: string; reportContext?: string } = { message: userMessage };

      // Provide context from the selected report's doctorSummary
      if (selectedReport) {
        payload.reportContext = selectedReport.doctorSummary;
      }

      const response = await apiService.post('/patient/chat', payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const modelResponse = response.data.response;
      setChatHistory((prev) => [...prev, { role: 'model', content: modelResponse }]);
    } catch (err: any) {
      console.error("Chatbot API error:", err);
      setError(`Failed to get response: ${err.response?.data?.error || err.message}`);
      setChatHistory((prev) => [...prev, { role: 'model', content: "I apologize, but I'm having trouble connecting right now. Please try again later." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 max-w-2xl mx-auto my-8 flex flex-col h-[70vh]">
      <h2 className="text-3xl font-semibold text-dark-green mb-4 text-center">AI Health Chatbot</h2>
      {selectedReport && (
        <p className="text-sm text-gray-500 text-center mb-4 italic">
          Context from: {selectedReport.reportType} ({new Date(selectedReport.timestamp).toLocaleDateString()})
        </p>
      )}
      <div className="flex-grow overflow-y-auto space-y-4 p-4 border border-gray-200 rounded-lg bg-gray-50 mb-4 custom-scrollbar">
        {chatHistory.length === 0 ? (
          <div className="text-center text-gray-500 italic mt-8">
            Start a conversation! Ask me about general health, or specific terms from your reports (if a report is selected).
          </div>
        ) : (
          chatHistory.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[70%] p-3 rounded-lg shadow-sm ${
                  msg.role === 'user' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-800'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[70%] p-3 rounded-lg shadow-sm bg-gray-200">
              <Spinner />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}

      <form onSubmit={sendMessage} className="flex space-x-2">
        <input
          type="text"
          value={currentMessage}
          onChange={(e) => setCurrentMessage(e.target.value)}
          placeholder="Ask a health question..."
          className="flex-grow px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
          disabled={loading}
        />
        <button
          type="submit"
          className="bg-primary text-white px-6 py-2 rounded-md shadow-sm hover:bg-dark-green transition-colors disabled:opacity-50 flex items-center justify-center"
          disabled={loading || !currentMessage.trim()}
        >
          {loading ? <Spinner /> : 'Send'}
        </button>
      </form>
    </div>
  );
};

export default Chatbot;