import React, { useEffect, useState } from 'react';
import { MessageCircle, ThumbsDown, ThumbsUp, Hash } from 'lucide-react';
import { GameStats } from '../types';

interface SocialFeedProps {
  stats: GameStats;
}

interface Post {
  id: number;
  user: string;
  text: string;
  type: 'GOOD' | 'BAD' | 'NEUTRAL';
}

export const SocialFeed: React.FC<SocialFeedProps> = ({ stats }) => {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      // Chance to generate a post based on interest/chaos
      if (Math.random() > 0.6) {
        addPost();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [stats]);

  const addPost = () => {
    let type: 'GOOD' | 'BAD' | 'NEUTRAL' = 'NEUTRAL';
    let text = "";
    
    // Logic for generating "fake" tweets based on game state
    if (stats.publicInterest < 30 || stats.stress > 80) {
        type = 'BAD';
        const badTexts = [
            "Esto es un desastre #refund",
            "¿Quién maneja el sonido? ¡Sordo!",
            "¡Que devuelvan la entrada!",
            "Aburridooooo 💤",
            "¡Se cortó todo! 😡",
            "La banda está perdida.",
            "Me quiero ir a casa."
        ];
        text = badTexts[Math.floor(Math.random() * badTexts.length)];
    } else if (stats.publicInterest > 75) {
        type = 'GOOD';
        const goodTexts = [
            "¡Increíble show! 🔥",
            "¡El mejor sonido que escuché!",
            "¡LOCURA TOTAL! 🤘",
            "¡Qué luces por dios!",
            "¡No pareeeen!",
            "¡Temazoooo!",
            "#EventChaos2024 es lo más"
        ];
        text = goodTexts[Math.floor(Math.random() * goodTexts.length)];
    } else {
        const neutralTexts = [
            "Esperando el hit...",
            "Está bien, supongo.",
            "¿Alguien vio al bajista?",
            "Suban el volumen un poco.",
            "Lindo escenario."
        ];
        text = neutralTexts[Math.floor(Math.random() * neutralTexts.length)];
    }

    const newPost: Post = {
        id: Date.now(),
        user: `@user${Math.floor(Math.random() * 9999)}`,
        text,
        type
    };

    setPosts(prev => [newPost, ...prev].slice(0, 4)); // Keep last 4
  };

  return (
    <div className="absolute bottom-4 right-4 w-72 z-30 pointer-events-none">
       <div className="bg-black/40 backdrop-blur-md border border-slate-700 rounded-lg p-3 overflow-hidden">
           <div className="flex items-center gap-2 text-[10px] font-bold text-cyan-400 uppercase mb-2 border-b border-white/10 pb-1">
               <Hash className="w-3 h-3" /> Tendencias en Vivo
           </div>
           
           <div className="flex flex-col gap-2">
               {posts.map(post => (
                   <div key={post.id} className="bg-slate-900/80 p-2 rounded border-l-2 text-xs font-mono shadow-sm animate-in slide-in-from-right duration-300"
                        style={{ borderColor: post.type === 'BAD' ? '#ef4444' : post.type === 'GOOD' ? '#10b981' : '#64748b' }}
                   >
                       <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                           <span>{post.user}</span>
                           {post.type === 'BAD' ? <ThumbsDown className="w-3 h-3" /> : post.type === 'GOOD' ? <ThumbsUp className="w-3 h-3" /> : <MessageCircle className="w-3 h-3" />}
                       </div>
                       <div className="text-slate-200 leading-tight">
                           {post.text}
                       </div>
                   </div>
               ))}
               {posts.length === 0 && <div className="text-slate-600 text-[10px] italic text-center">Sin actividad reciente...</div>}
           </div>
       </div>
    </div>
  );
};