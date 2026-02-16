import { useCallback } from 'react';
import { CareerData, PermanentUpgrade } from '../types';
import { PERMANENT_UPGRADES } from '../constants';

interface UseUpgradeSystemProps {
  careerData: CareerData;
  onUpgradePurchased: (upgradeId: string, cost: number) => void;
}

export interface AvailableUpgrade extends PermanentUpgrade {
  unlocked: boolean;
  canAfford: boolean;
  requirementsMet: boolean;
  canPurchase: boolean;
  missingRequirements: string[];
  lockReason: string | null;
}

export type PurchaseUpgradeResult =
  | { status: 'SUCCESS' }
  | { status: 'ALREADY_UNLOCKED' }
  | { status: 'INSUFFICIENT_POINTS' }
  | { status: 'MISSING_REQUIREMENTS'; missingRequirements: string[] };

export const useUpgradeSystem = ({ careerData, onUpgradePurchased }: UseUpgradeSystemProps) => {
  const canAfford = useCallback((cost: number) => {
    return careerData.careerPoints >= cost;
  }, [careerData.careerPoints]);

  const isUnlocked = useCallback((upgradeId: string) => {
    return careerData.unlockedUpgrades.includes(upgradeId);
  }, [careerData.unlockedUpgrades]);

  const getMissingRequirements = useCallback((upgrade: PermanentUpgrade) => {
    const requirements = upgrade.requires || [];
    return requirements.filter(requirementId => !careerData.unlockedUpgrades.includes(requirementId));
  }, [careerData.unlockedUpgrades]);

  const getRequirementNames = useCallback((missingRequirements: string[]) => {
    return missingRequirements.map(requirementId => {
      const requirement = PERMANENT_UPGRADES.find(upgrade => upgrade.id === requirementId);
      return requirement?.name || requirementId;
    });
  }, []);

  const purchaseUpgrade = useCallback((upgrade: PermanentUpgrade): PurchaseUpgradeResult => {
    if (isUnlocked(upgrade.id)) {
      return { status: 'ALREADY_UNLOCKED' };
    }

    const missingRequirements = getMissingRequirements(upgrade);
    if (missingRequirements.length > 0) {
      return { status: 'MISSING_REQUIREMENTS', missingRequirements };
    }

    if (!canAfford(upgrade.cost)) {
      return { status: 'INSUFFICIENT_POINTS' };
    }

    onUpgradePurchased(upgrade.id, upgrade.cost);
    return { status: 'SUCCESS' };
  }, [canAfford, getMissingRequirements, isUnlocked, onUpgradePurchased]);

  const getAvailableUpgrades = useCallback(() => {
    return PERMANENT_UPGRADES.map((upgrade): AvailableUpgrade => {
      const unlocked = isUnlocked(upgrade.id);
      const canAffordUpgrade = canAfford(upgrade.cost);
      const missingRequirements = getMissingRequirements(upgrade);
      const requirementsMet = missingRequirements.length === 0;
      const canPurchase = !unlocked && requirementsMet && canAffordUpgrade;

      let lockReason: string | null = null;
      if (!unlocked && !requirementsMet) {
        const missingNames = getRequirementNames(missingRequirements);
        lockReason = `Requiere: ${missingNames.join(', ')}`;
      } else if (!unlocked && !canAffordUpgrade) {
        lockReason = `Necesitas ${upgrade.cost} pts`;
      }

      return {
        ...upgrade,
        unlocked,
        canAfford: canAffordUpgrade,
        requirementsMet,
        canPurchase,
        missingRequirements,
        lockReason
      };
    });
  }, [canAfford, getMissingRequirements, getRequirementNames, isUnlocked]);

  return {
    canAfford,
    isUnlocked,
    purchaseUpgrade,
    getAvailableUpgrades
  };
};
