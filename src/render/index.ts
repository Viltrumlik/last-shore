// Public surface of the renderer (DOM / canvas only; never imported by the simulation).
export { Renderer, toolSprite, type RenderOptions } from './renderer';
export { attachMapInput, type MapInputHandlers } from './input';
export { drawPortrait, portraitBuffer } from './portraits';
export { drawEnding, drawTitleArt, endingBuffer, type EndingScene } from './illustrations';
export { PAL, PAL_LIST, TILE, type PalKey } from './palette';
