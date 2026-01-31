import { useCallback } from 'react';
import { CareerData, PermanentUpgrade } from '../types';
import { PERMANENT_UPGRADES } from '../constants';

interface UseUpgradeSystemProps {
  careerData: CareerData;
  onUpgradePurchased: (upgradeId: string, cost: number) => void;
}

export const useUpgradeSystem = ({ careerData, onUpgradePurchased }: UseUpgradeSystemProps) => {
  const canAfford = useCallback((cost: number) => {
    return careerData.careerPoints >= cost;
  }, [careerData.careerPoints]);

  const isUnlocked = useCallback((upgradeId: string) => {
    return careerData.unlockedUpgrades.includes(upgradeId);
  }, [careerData.unlockedUpgrades]);

  const purchaseUpgrade = useCallback((upgrade: PermanentUpgrade) => {
    if (isUnlocked(upgrade.id)) {
      return false; // Already unlocked
    }
    if (!canAfford(upgrade.cost)) {
      return false; // Can't afford
    }
    onUpgradePurchased(upgrade.id, upgrade.cost);
    return true;
  }, [canAfford, isUnlocked, onUpgradePurchased]);

  const getAvailableUpgrades = useCallback(() => {
    return PERMANENT_UPGRADES.map(upgrade => ({
      ...upgrade,
      unlocked: isUnlocked(upgrade.id),
      canAfford: canAfford(upgrade.cost) && !isUnlocked(upgrade.id) // Solo puede comprar si no está desbloqueado
    }));
  }, [canAfford, isUnlocked]);

  return {
    canAfford,
    isUnlocked,
    purchaseUpgrade,
    getAvailableUpgrades
  };
};
