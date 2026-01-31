import React from 'react';
import { PermanentUpgrade } from '../types';
import { Zap, Shield, Book, Settings, Lock, Check } from 'lucide-react';

interface UpgradeShopProps {
  upgrades: (PermanentUpgrade & { unlocked: boolean; canAfford: boolean })[];
  careerPoints: number;
  onPurchase: (upgrade: PermanentUpgrade) => void;
  onClose: () => void;
}

export const UpgradeShop: React.FC<UpgradeShopProps> = ({ upgrades, careerPoints, onPurchase, onClose }) => {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'REFLEXES': return <Zap className="w-5 h-5 text-yellow-400" />;
      case 'RESISTANCE': return <Shield className="w-5 h-5 text-blue-400" />;
      case 'KNOWLEDGE': return <Book className="w-5 h-5 text-purple-400" />;
      case 'EFFICIENCY': return <Settings className="w-5 h-5 text-green-400" />;
      default: return <Settings className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-slate-900 border-2 border-slate-600 rounded-xl shadow-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold text-white flex items-center gap-2">
              <Settings className="w-8 h-8 text-cyan-500" />
              MEJORAS PERMANENTES
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Puntos de carrera disponibles: <span className="text-cyan-400 font-bold">{careerPoints}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {upgrades.map(upgrade => (
            <div
              key={upgrade.id}
              className={`p-4 rounded-lg border-2 transition-all ${
                upgrade.unlocked
                  ? 'border-green-500 bg-green-950/20'
                  : upgrade.canAfford
                  ? 'border-cyan-500 bg-cyan-950/20 hover:border-cyan-400'
                  : 'border-slate-700 bg-slate-800/50 opacity-60'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="text-3xl">{upgrade.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getCategoryIcon(upgrade.category)}
                    <h3 className={`font-bold ${upgrade.unlocked ? 'text-green-400' : 'text-white'}`}>
                      {upgrade.name}
                    </h3>
                    {upgrade.unlocked && <Check className="w-4 h-4 text-green-500" />}
                  </div>
                  <p className="text-sm text-slate-300 mb-2">{upgrade.description}</p>
                  <div className="flex items-center justify-between">
                    {!upgrade.unlocked ? (
                      <button
                        onClick={() => onPurchase(upgrade)}
                        disabled={!upgrade.canAfford}
                        className={`px-4 py-2 rounded font-bold text-sm transition-all ${
                          upgrade.canAfford
                            ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                            : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {upgrade.canAfford ? `Comprar (${upgrade.cost} pts)` : `Necesitas ${upgrade.cost} pts`}
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 text-green-400 text-sm">
                        <Check className="w-4 h-4" />
                        <span>Desbloqueado</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
