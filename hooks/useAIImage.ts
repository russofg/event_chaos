
// This hook has been deprecated as we moved to a 2D Canvas Visualizer.
// It is kept as a placeholder to avoid breaking imports if referenced elsewhere,
// but functionality is disabled to remove AI dependencies.

import { useState } from 'react';
import { SystemType } from '../types';

export const useAIImage = () => {
  const [systemImages, setSystemImages] = useState<Record<SystemType, string | null>>({
    [SystemType.SOUND]: null,
    [SystemType.LIGHTS]: null,
    [SystemType.VIDEO]: null,
    [SystemType.STAGE]: null,
  });
  
  const [loadingStates, setLoadingStates] = useState<Record<SystemType, boolean>>({
    [SystemType.SOUND]: false,
    [SystemType.LIGHTS]: false,
    [SystemType.VIDEO]: false,
    [SystemType.STAGE]: false,
  });

  const generateImage = async (systemId: SystemType, prompt: string) => {
    console.log("AI Image Generation is disabled in this version.");
    return;
  };

  return { systemImages, loadingStates, generateImage };
};
