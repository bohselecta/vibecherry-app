import { create } from 'zustand'

export type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  code?: string
  timestamp: number
}

export type ViewMode = 'code' | 'preview'

interface ChatStore {
  messages: Message[]
  isLoading: boolean
  viewMode: ViewMode
  currentCode: string
  isModelInitialized: boolean
  
  // Actions
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void
  updateLastMessage: (content: string) => void
  setLoading: (loading: boolean) => void
  setViewMode: (mode: ViewMode) => void
  setCurrentCode: (code: string) => void
  setModelInitialized: (initialized: boolean) => void
  clearMessages: () => void
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isLoading: false,
  viewMode: 'code',
  currentCode: '',
  isModelInitialized: false,
  
  addMessage: (message) => {
    const newMessage: Message = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    }
    
    set((state) => ({
      messages: [...state.messages, newMessage],
    }))
  },
  
  updateLastMessage: (content) => {
    set((state) => {
      const messages = [...state.messages]
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1]
        if (lastMessage.role === 'assistant') {
          // Append the new content to existing content
          lastMessage.content += content
          
          // Extract code from content if it exists
          const codeMatch = lastMessage.content.match(/```html\n([\s\S]*?)```/)
          if (codeMatch) {
            const extractedCode = codeMatch[1].trim()
            // Only set code if it's valid HTML
            if (extractedCode.includes('<!DOCTYPE html>') && extractedCode.includes('</html>')) {
              lastMessage.code = extractedCode
              get().setCurrentCode(extractedCode)
            }
          }
        }
      }
      return { messages }
    })
  },
  
  setLoading: (loading) => set({ isLoading: loading }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setCurrentCode: (code) => set({ currentCode: code }),
  setModelInitialized: (initialized) => set({ isModelInitialized: initialized }),
  clearMessages: () => set({ messages: [], currentCode: '', viewMode: 'code' }),
}))
