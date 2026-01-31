
import React from 'react';
import { Button } from './Button';
import { ShopItem } from '../types';
import { SHOP_ITEMS } from '../constants';
import { DollarSign, ShoppingCart, Zap, Shield, Plug, Coffee, ChevronRight, Briefcase } from 'lucide-react';

interface ShopProps {
  currentBudget: number;
  inventory: string[];
  onBuy: (item: ShopItem) => void;
  onStart: () => void;
}

export const Shop: React.FC<ShopProps> = ({ currentBudget, inventory, onBuy, onStart }) => {
  const getIcon = (iconName: string) => {
      switch(iconName) {
          case 'Zap': return <Zap className="w-6 h-6 text-amber-400" />;
          case 'Shield': return <Shield className="w-6 h-6 text-cyan-400" />;
          case 'Plug': return <Plug className="w-6 h-6 text-emerald-400" />;
          case 'Coffee': return <Coffee className="w-6 h-6 text-rose-400" />;
          default: return <Briefcase className="w-6 h-6 text-slate-400" />;
      }
  };

  return (
    <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center p-8 relative overflow-hidden">
        {/* Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

        <div className="z-10 w-full max-w-5xl bg-slate-900/90 border border-slate-700 rounded-xl shadow-2xl flex flex-col md:flex-row overflow-hidden h-[80vh]">
            
            {/* Left: Inventory / Stats */}
            <div className="w-full md:w-80 bg-slate-950 p-6 border-r border-slate-800 flex flex-col gap-6">
                <div>
                    <h2 className="text-xl font-bold text-emerald-500 flex items-center gap-2 mb-1">
                        <Briefcase /> BACKSTAGE
                    </h2>
                    <p className="text-xs text-slate-400 font-mono">PREPARACIÓN DEL EVENTO</p>
                </div>

                <div className="bg-slate-900 p-4 rounded border border-slate-800">
                    <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Presupuesto Disponible</div>
                    <div className="text-3xl font-mono text-emerald-400 font-bold flex items-center">
                        <DollarSign className="w-6 h-6" /> {currentBudget.toLocaleString()}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="text-xs text-slate-500 uppercase tracking-widest mb-2">Inventario Actual</div>
                    {inventory.length === 0 ? (
                        <div className="text-slate-600 text-sm italic p-2">Mochila vacía...</div>
                    ) : (
                        <div className="space-y-2">
                            {inventory.map(itemId => {
                                const item = SHOP_ITEMS.find(i => i.id === itemId);
                                if (!item) return null;
                                return (
                                    <div key={itemId} className="flex items-center gap-2 bg-slate-800/50 p-2 rounded border border-slate-700">
                                        <div className="scale-75">{getIcon(item.icon)}</div>
                                        <div className="text-xs text-slate-300 font-bold">{item.name}</div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                <Button variant="primary" onClick={onStart} className="w-full py-4 text-lg">
                    <div className="flex items-center gap-2">
                        COMENZAR SHOW <ChevronRight />
                    </div>
                </Button>
            </div>

            {/* Right: Shop Items */}
            <div className="flex-1 p-8 overflow-y-auto">
                <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                    <ShoppingCart className="text-emerald-500" /> CATÁLOGO DE PROVEEDORES
                </h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {SHOP_ITEMS.map(item => {
                        const canAfford = currentBudget >= item.cost;
                        const isOwned = inventory.includes(item.id);

                        return (
                            <div key={item.id} className={`p-4 rounded-lg border-2 transition-all relative group
                                ${isOwned 
                                    ? 'border-emerald-900 bg-emerald-950/20 opacity-75' 
                                    : canAfford 
                                        ? 'border-slate-700 bg-slate-800 hover:border-emerald-500 hover:bg-slate-700' 
                                        : 'border-slate-800 bg-slate-900 opacity-50 cursor-not-allowed'}
                            `}>
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded bg-slate-950 border border-slate-700 ${isOwned ? 'text-emerald-500' : 'text-slate-300'}`}>
                                            {getIcon(item.icon)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white text-sm">{item.name}</h3>
                                            <div className="text-[10px] text-emerald-400 font-mono flex items-center">
                                                {item.effect.replace('_', ' ')} +{item.value * 100}%
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        {isOwned ? (
                                            <span className="text-xs font-bold text-emerald-500 bg-emerald-950 px-2 py-1 rounded">COMPRADO</span>
                                        ) : (
                                            <span className={`font-mono font-bold ${canAfford ? 'text-emerald-400' : 'text-red-400'}`}>
                                                ${item.cost}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                
                                <p className="text-xs text-slate-400 mb-4 h-8">{item.description}</p>
                                
                                {!isOwned && (
                                    <Button 
                                        variant={canAfford ? 'success' : 'neutral'} 
                                        onClick={() => canAfford && onBuy(item)}
                                        disabled={!canAfford}
                                        className="w-full py-2 text-xs"
                                    >
                                        {canAfford ? 'COMPRAR' : 'FONDOS INSUFICIENTES'}
                                    </Button>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

        </div>
    </div>
  );
};
