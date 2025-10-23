export function HealingAnimation() {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-white">
      <div className="relative">
        {/* Animated cherry */}
        <div className="text-6xl animate-bounce">🍒</div>
        
        {/* Sparkles */}
        <div className="absolute -top-2 -right-2 text-2xl animate-ping">✨</div>
        <div className="absolute -bottom-2 -left-2 text-2xl animate-ping delay-150">✨</div>
      </div>
      
      <div className="mt-4 text-center">
        <div className="text-xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
          Healing your vibe...
        </div>
        <div className="text-sm text-white/60 mt-2">
          Let it cook! 🧑‍🍳
        </div>
      </div>
    </div>
  )
}

