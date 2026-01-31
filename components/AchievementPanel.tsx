import React from 'react';
import { Achievement } from '../types';
import { Trophy, Lock, Check } from 'lucide-react';

interface AchievementPanelProps {
  achievements: Achievement[];
  unlockedIds: string[];
  onClose: () => void;
}

export const AchievementPanel: React.FC<AchievementPanelProps> = ({ achievements, unlockedIds, onClose }) => {
  const categoryColors = {
    PERFORMANCE: 'text-blue-400',
    ECONOMY: 'text-green-400',
    SPEED: 'text-yellow-400',
    PERFECTION: 'text-purple-400',
    SPECIAL: 'text-pink-400'
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-slate-900 border-2 border-slate-600 rounded-xl shadow-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-8 h-8 text-yellow-500" />
            LOGROS
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {achievements.map(achievement => {
            const isUnlocked = unlockedIds.includes(achievement.id);
            return (
              <div
                key={achievement.id}
                className={`p-4 rounded-lg border-2 transition-all ${
                  isUnlocked
                    ? 'border-yellow-500 bg-yellow-950/20'
                    : 'border-slate-700 bg-slate-800/50 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`text-3xl ${isUnlocked ? '' : 'grayscale'}`}>
                    {achievement.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-bold ${isUnlocked ? 'text-white' : 'text-slate-500'}`}>
                        {achievement.title}
                      </h3>
                      {isUnlocked && <Check className="w-4 h-4 text-green-500" />}
                      {!isUnlocked && <Lock className="w-4 h-4 text-slate-600" />}
                    </div>
                    <p className={`text-sm ${isUnlocked ? 'text-slate-300' : 'text-slate-600'}`}>
                      {achievement.description}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-xs font-mono ${categoryColors[achievement.category]}`}>
                        {achievement.category}
                      </span>
                      <span className="text-xs text-slate-400">
                        +{achievement.rewardPoints} pts
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 text-center text-slate-400 text-sm">
          {unlockedIds.length} / {achievements.length} logros desbloqueados
        </div>
      </div>
    </div>
  );
};
