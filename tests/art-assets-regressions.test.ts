import { describe, expect, it } from 'vitest';
import { CREW_MEMBERS, SCENARIOS } from '../constants';
import { GameState } from '../types';
import {
  ART_ASSETS,
  getCrewPortraitAsset,
  getFxTextureCssVariables,
  getGameplayBackgroundAsset,
  getMenuBackgroundAsset,
  getStageAsset,
  getStageScenarioVisualAsset,
  getScenarioThumbnailAsset,
  getSceneBackgroundAsset
} from '../utils/artAssets';

describe('Art Assets Regressions', () => {
  it('resolves menu/gameplay background assets by viewport layout', () => {
    expect(getMenuBackgroundAsset(false)).toBe(ART_ASSETS.menu.desktop);
    expect(getMenuBackgroundAsset(true)).toBe(ART_ASSETS.menu.mobile);
    expect(getGameplayBackgroundAsset(false)).toBe(ART_ASSETS.gameplay.desktop);
    expect(getGameplayBackgroundAsset(true)).toBe(ART_ASSETS.gameplay.mobile);
  });

  it('resolves scene background by game state', () => {
    expect(getSceneBackgroundAsset(GameState.MENU, false)).toBe(ART_ASSETS.menu.desktop);
    expect(getSceneBackgroundAsset(GameState.MENU, true)).toBe(ART_ASSETS.menu.mobile);
    expect(getSceneBackgroundAsset(GameState.PLAYING, false)).toBe(ART_ASSETS.gameplay.desktop);
    expect(getSceneBackgroundAsset(GameState.PAUSED, true)).toBe(ART_ASSETS.gameplay.mobile);
  });

  it('maps every scenario and crew id to an art asset', () => {
    SCENARIOS.forEach((scenario) => {
      const asset = getScenarioThumbnailAsset(scenario.id);
      expect(asset.startsWith('/assets/aaa/')).toBe(true);
      expect(asset).toMatch(/\.(png|jpe?g|webp|avif)$/);
    });

    CREW_MEMBERS.forEach((crew) => {
      const asset = getCrewPortraitAsset(crew.id);
      expect(asset.startsWith('/assets/aaa/')).toBe(true);
      expect(asset).toMatch(/\.(png|jpe?g|webp|avif)$/);
    });
  });

  it('returns fx texture css variables with url values', () => {
    const vars = getFxTextureCssVariables();

    expect(vars['--aaa-fx-noise-image']).toContain('url(');
    expect(vars['--aaa-fx-scanlines-image']).toContain('url(');
    expect(vars['--aaa-fx-warning-chevron-image']).toContain('url(');
    expect(vars['--aaa-fx-scratches-image']).toContain('url(');
  });

  it('maps stage gameplay art assets for rig elements', () => {
    expect(getStageAsset('trussHorizontal')).toBe(ART_ASSETS.stage.trussHorizontal);
    expect(getStageAsset('trussVertical')).toBe(ART_ASSETS.stage.trussVertical);
    expect(getStageAsset('lineArray')).toBe(ART_ASSETS.stage.lineArray);
    expect(getStageAsset('movingHead')).toBe(ART_ASSETS.stage.movingHead);
    expect(getStageAsset('ledFrame')).toBe(ART_ASSETS.stage.ledFrame);
    expect(getStageScenarioVisualAsset('NOT_A_REAL_SCENARIO')).toBe(ART_ASSETS.scenarios.NORMAL);
  });
});
