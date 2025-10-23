import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { useChatStore } from './store/chatStore'
import ChatView from './components/ChatView'
import PreviewPane from './components/PreviewPane'
import { SelfHealingPreview } from './components/SelfHealingPreview'
import InputBar from './components/InputBar'

export default function App() {
  const {
    messages,
    isLoading,
    viewMode,
    currentCode,
    isModelInitialized,
    addMessage,
    updateLastMessage,
    setLoading,
    setViewMode,
    setCurrentCode,
    setModelInitialized,
  } = useChatStore()

  const [useSelfHealing, setUseSelfHealing] = useState(true)
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'online' | 'offline'>('checking')

  const handleFixComplete = (fixedCode: string, attempts: any[]) => {
    setCurrentCode(fixedCode)
    if (attempts.length > 0) {
      console.log(`✨ Code fixed after ${attempts.length} attempts!`)
    }
  }
  // Initialize model on app start
  useEffect(() => {
    const initializeModel = async () => {
      try {
        console.log('Initializing model...')
        const response = await invoke<string>('initialize_model')
        setModelInitialized(true)
        console.log('Model initialized successfully')
        
        // Check Ollama status based on response
        if (response.includes('ready') || response.includes('model ready')) {
          setOllamaStatus('online')
        } else {
          setOllamaStatus('offline')
        }
      } catch (error) {
        console.error('Failed to initialize model:', error)
        setOllamaStatus('offline')
      }
    }

    if (!isModelInitialized) {
      initializeModel()
    }
  }, [isModelInitialized, setModelInitialized])

  // Set up event listeners for streaming
  useEffect(() => {
    const setupEventListeners = async () => {
      // Listen for streaming tokens
      const unlistenToken = await listen<string>('vibe-token', (event) => {
        updateLastMessage(event.payload)
      })

      // Listen for completion
      const unlistenComplete = await listen<string>('vibe-complete', () => {
        console.log('Generation completed')
        setLoading(false)
      })

      // Listen for errors
      const unlistenError = await listen<string>('vibe-error', (event) => {
        console.error('Generation error:', event.payload)
        setLoading(false)
      })

      return () => {
        unlistenToken()
        unlistenComplete()
        unlistenError()
      }
    }

    setupEventListeners()
  }, [updateLastMessage, setLoading])

  const handleSendMessage = async (message: string) => {
    // Add user message
    addMessage({
      role: 'user',
      content: message,
    })

    setLoading(true)

    try {
      // Add assistant message placeholder
      addMessage({
        role: 'assistant',
        content: '',
      })

      // Call the streaming generation command
      await invoke('generate_vibe_stream', {
        prompt: message,
        history: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
      })

      // Wait a bit for streaming to complete, then check if we have valid code
      setTimeout(() => {
        if (currentCode && currentCode.includes('<!DOCTYPE html>') && currentCode.includes('</html>')) {
          setViewMode('preview')
        } else {
          console.log('No valid code generated, staying in code view')
        }
      }, 1000)
    } catch (error) {
      console.error('Error generating vibe:', error)
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img 
            src="/icons/vibecherry-logo.png" 
            alt="Vibe Cherry Logo" 
            className="w-10 h-10"
          />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            Vibe Cherry
          </h1>
        </div>

        {/* Center: Code/Preview Toggle */}
        <div className="flex bg-white/5 rounded-lg p-1">
          <button
            onClick={() => setViewMode('code')}
            className={`px-4 py-2 rounded-md transition-all ${
              viewMode === 'code'
                ? 'bg-white/10 text-white'
                : 'text-white/50 hover:text-white/70'
            }`}
          >
            Code
          </button>
          <button
            onClick={() => setViewMode('preview')}
            className={`px-4 py-2 rounded-md transition-all ${
              viewMode === 'preview'
                ? 'bg-white/10 text-white'
                : 'text-white/50 hover:text-white/70'
            }`}
            disabled={!currentCode}
          >
            Preview
          </button>
        </div>
        
        {/* Right: Ollama Status + Self-Healing Controls */}
        <div className="flex items-center gap-4">
          {/* Ollama Status Indicator */}
          <div className="flex items-center gap-1">
            <div 
              className={`w-2 h-2 rounded-full ${
                ollamaStatus === 'online' ? 'bg-green-400' : 
                ollamaStatus === 'offline' ? 'bg-red-400' : 
                'bg-yellow-400'
              }`}
            />
            <span className="text-xs text-white/70">
              {ollamaStatus === 'online' ? 'Ollama' : 
               ollamaStatus === 'offline' ? 'Ollama Offline' : 
               'Checking...'}
            </span>
          </div>
          
          {/* Self-Healing Toggle */}
          <button
            onClick={() => setUseSelfHealing(!useSelfHealing)}
            className={`px-3 py-2 rounded-lg text-sm transition-all ${
              useSelfHealing
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-white/5 text-white/50 hover:text-white/70'
            }`}
          >
            {useSelfHealing ? '🔧 Healing ON' : '🔧 Healing OFF'}
          </button>
          
          {/* Manual Fix Button */}
          {currentCode && (!currentCode.includes('<!DOCTYPE html>') || !currentCode.includes('</html>')) && (
            <button
              onClick={() => {
                // Trigger self-healing manually
                console.log('Manual fix triggered')
              }}
              className="px-3 py-2 rounded-lg text-sm bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30 transition-all"
            >
              🔧 Fix Code
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex">
        {/* Chat View */}
        <div
          className={`flex-1 flex flex-col ${
            viewMode === 'preview' && currentCode ? 'hidden md:flex md:w-1/2' : 'w-full'
          }`}
        >
          <ChatView messages={messages} isLoading={isLoading} />
          <InputBar onSendMessage={handleSendMessage} isLoading={isLoading} />
        </div>

        {/* Preview Pane */}
        {viewMode === 'preview' && currentCode && (
          <div className="flex-1 bg-white">
            {useSelfHealing ? (
              <SelfHealingPreview
                initialCode={currentCode}
                originalPrompt={messages[messages.length - 2]?.content || ''}
                onFixComplete={handleFixComplete}
              />
            ) : (
              <PreviewPane code={currentCode} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
