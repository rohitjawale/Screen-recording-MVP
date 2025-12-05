
export enum AppState {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  PROCESSING = 'PROCESSING',
  EDITING = 'EDITING',
}

export interface EditorConfig {
  padding: number;
  inset: number;
  roundness: number;
  shadow: number;
  background: string; // Gradient or solid color string
  aspectRatio: 'original' | '16:9' | '1:1' | '4:3' | '9:16';
  zoom: number;
  autoZoom: boolean; // New feature: Auto-follow cursor simulation
  // Animation Settings
  zoomSpeed: 'slow' | 'default' | 'fast';
}

export type ZoomEventType = 'click' | 'double_click' | 'focus' | 'drag' | 'selection' | 'generic';

export interface ZoomEvent {
  id: string;
  type: ZoomEventType;
  startTime: number; // Seconds
  duration: number; // Seconds
  x: number; // 0-1 (Target X Start)
  y: number; // 0-1 (Target Y Start)
  xEnd?: number; // 0-1 (Target X End - for Drags)
  yEnd?: number; // 0-1 (Target Y End - for Drags)
  scale: number; // Target Zoom Level (e.g., 1.5)
}

export type OverlayType = 'blur' | 'spotlight';

export interface OverlayItem {
  id: string;
  type: OverlayType;
  startTime: number;
  duration: number;
  x: number; // 0-1 Relative to video
  y: number; // 0-1 Relative to video
  width: number; // 0-1 Relative to video
  height: number; // 0-1 Relative to video
}

export interface CropState {
  active: boolean;
  x: number; // 0-1
  y: number; // 0-1
  width: number; // 0-1
  height: number; // 0-1
}

export interface VideoMetadata {
  blob: Blob;
  url: string;
  duration: number;
}

export const DEFAULT_EDITOR_CONFIG: EditorConfig = {
  padding: 60,
  inset: 0,
  roundness: 12,
  shadow: 40,
  background: 'linear-gradient(135deg, #FF9A9E 0%, #FECFEF 99%, #FECFEF 100%)',
  aspectRatio: '16:9',
  zoom: 1,
  autoZoom: false,
  zoomSpeed: 'default',
};

// Pre-defined fancy backgrounds
export const BACKGROUND_PRESETS = [
  'linear-gradient(to bottom right, #4C6EF5, #7048E8)', // Blue/Purple
  'linear-gradient(to bottom right, #FF8A00, #FF5E62)', // Orange/Red
  'linear-gradient(to bottom right, #00b09b, #96c93d)', // Teal/Green
  'linear-gradient(120deg, #f093fb 0%, #f5576c 100%)',  // Pink
  'linear-gradient(to right, #434343 0%, black 100%)',   // Dark
  '#FFFFFF', // White
  '#1E1E1E', // Dark Grey
];
