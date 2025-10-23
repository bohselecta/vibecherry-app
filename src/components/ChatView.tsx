import { useRef, useEffect } from 'react'
import { type Message } from '../store/chatStore'

interface ChatViewProps {
  messages: Message[]
  isLoading: boolean
}

export default function ChatView({ messages, isLoading }: ChatViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
      {messages.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <img 
            src="/icons/vibecherry-logo.png" 
            alt="Vibe Cherry Logo" 
            className="w-20 h-20 mb-4"
          />
          <h2 className="text-2xl font-bold text-white mb-2">
            What vibe are we coding today?
          </h2>
          <p className="text-white/60 max-w-md">
            Describe any web app and I'll create it instantly.
            <br />
            Try: "A pomodoro timer with chill vibes"
          </p>
        </div>
      )}

      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              message.role === 'user'
                ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                : 'bg-white/10 text-white backdrop-blur'
            }`}
          >
            <div className="whitespace-pre-wrap">{message.content}</div>
            {message.code && (
              <div className="mt-3 p-3 bg-black/20 rounded-lg">
                <div className="text-xs text-white/60 mb-2">Generated Code:</div>
                <pre className="text-xs text-green-400 overflow-x-auto">
                  <code>{message.code}</code>
                </pre>
              </div>
            )}
          </div>
        </div>
      ))}

      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-white/10 backdrop-blur rounded-2xl px-4 py-3 text-white">
            <div className="flex gap-1">
              <div
                className="w-2 h-2 bg-white rounded-full animate-bounce"
                style={{ animationDelay: '0ms' }}
              ></div>
              <div
                className="w-2 h-2 bg-white rounded-full animate-bounce"
                style={{ animationDelay: '150ms' }}
              ></div>
              <div
                className="w-2 h-2 bg-white rounded-full animate-bounce"
                style={{ animationDelay: '300ms' }}
              ></div>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  )
}
