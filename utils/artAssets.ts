import { GameState } from '../types';

const ASSET_ROOT = '/assets/aaa';

export const ART_ASSETS = {
  menu: {
    desktop: `${ASSET_ROOT}/menu_bg_desktop_v1.jpg`,
    mobile: `${ASSET_ROOT}/menu_bg_mobile_v1.jpg`
  },
  gameplay: {
    desktop: `${ASSET_ROOT}/gameplay_bg_desktop_clean_v1.jpg`,
    mobile: `${ASSET_ROOT}/gameplay_bg_mobile_clean_v1.jpg`
  },
  scenarios: {
    TUTORIAL: `${ASSET_ROOT}/scenario_tutorial_thumb_v1.jpg`,
    NORMAL: `${ASSET_ROOT}/scenario_corporativo_thumb_v1.jpg`,
    ROCKSTAR: `${ASSET_ROOT}/scenario_banda_diva_thumb_v1.jpg`,
    FESTIVAL: `${ASSET_ROOT}/scenario_festival_thumb_v1.jpg`,
    EXTREME: `${ASSET_ROOT}/scenario_extremo_thumb_v1.jpg`,
    ARENA: `${ASSET_ROOT}/scenario_arena_thumb_v1.jpg`,
    WORLD_TOUR: `${ASSET_ROOT}/scenario_world_tour_thumb_v1.jpg`,
    BLACKOUT_PROTOCOL: `${ASSET_ROOT}/scenario_blackout_protocol_thumb_v1.jpg`
  } as Record<string, string>,
  crew: {
    VETERAN: `${ASSET_ROOT}/crew_carlos_v1.png`,
    BUDGET: `${ASSET_ROOT}/crew_maria_v1.png`,
    AUTO: `${ASSET_ROOT}/crew_roberto_v1.png`,
    CALM: `${ASSET_ROOT}/crew_ana_v1.png`
  } as Record<string, string>,
  stage: {
    trussHorizontal: `${ASSET_ROOT}/stage/truss_horizontal_v1.svg`,
    trussVertical: `${ASSET_ROOT}/stage/truss_vertical_v1.svg`,
    lineArray: `${ASSET_ROOT}/stage/line_array_stack_v1.svg`,
    movingHead: `${ASSET_ROOT}/stage/moving_head_fixture_v1.svg`,
    ledFrame: `${ASSET_ROOT}/stage/led_wall_frame_v1.svg`
  },
  fx: {
    noise: `${ASSET_ROOT}/fx_hud_noise_tile_v1.jpg`,
    scanlines: `${ASSET_ROOT}/fx_scanlines_tile_v1.jpg`,
    warningChevrons: `${ASSET_ROOT}/fx_warning_chevrons_tile_v1.jpg`,
    scratches: `${ASSET_ROOT}/fx_glass_micro_scratches_tile_v1.jpg`
  }
} as const;

export const getMenuBackgroundAsset = (isMobile: boolean) =>
  isMobile ? ART_ASSETS.menu.mobile : ART_ASSETS.menu.desktop;

export const getGameplayBackgroundAsset = (isMobile: boolean) =>
  isMobile ? ART_ASSETS.gameplay.mobile : ART_ASSETS.gameplay.desktop;

export const getSceneBackgroundAsset = (gameState: GameState, isMobile: boolean) =>
  gameState === GameState.MENU
    ? getMenuBackgroundAsset(isMobile)
    : getGameplayBackgroundAsset(isMobile);

export const getScenarioThumbnailAsset = (scenarioId: string) =>
  ART_ASSETS.scenarios[scenarioId] || ART_ASSETS.scenarios.NORMAL;

export const getCrewPortraitAsset = (crewId: string) =>
  ART_ASSETS.crew[crewId] || ART_ASSETS.crew.VETERAN;

export const getStageAsset = <T extends keyof typeof ART_ASSETS.stage>(asset: T) =>
  ART_ASSETS.stage[asset];

export const getStageScenarioVisualAsset = (scenarioId: string) =>
  getScenarioThumbnailAsset(scenarioId);

export const getFxTextureCssVariables = () => ({
  ['--aaa-fx-noise-image' as string]: `url('${ART_ASSETS.fx.noise}')`,
  ['--aaa-fx-scanlines-image' as string]: `url('${ART_ASSETS.fx.scanlines}')`,
  ['--aaa-fx-warning-chevron-image' as string]: `url('${ART_ASSETS.fx.warningChevrons}')`,
  ['--aaa-fx-scratches-image' as string]: `url('${ART_ASSETS.fx.scratches}')`
}) as Record<string, string>;
