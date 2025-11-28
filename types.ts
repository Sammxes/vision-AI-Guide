
export enum TTSVoice {
  Zephyr = 'Zephyr',
  Puck = 'Puck',
  Charon = 'Charon',
  Kore = 'Kore',
  Fenrir = 'Fenrir',
}

export enum VisualPaneMode {
  Hidden = 'hidden',
  Camera = 'camera',
}

export interface WebSearchArgs {
  query?: string;
  destination?: string;
}

export interface OnlineShoppingSearchArgs {
  item: string;
}

export interface FindNearbyPlacesArgs {
  query: string;
}

export interface ToolCall {
  name: string;
  args: Record<string, any>;
  id: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface ChatMessage {
  type: 'user' | 'ai' | 'tool_call';
  text: string;
  timestamp: string;
  toolCall?: ToolCall;
  groundingSources?: GroundingSource[];
}

export interface Base64Media {
  data: string;
  mimeType: string;
}

export interface BoundingBox {
  yMin: number;
  xMin: number;
  yMax: number;
  xMax: number;
}

export interface DetectedObject {
  name: string;
  description: string;
  boundingBox: BoundingBox;
}

export interface DetectedFace {
  boundingBox: BoundingBox;
}

export interface AnalysisResult {
  sceneDescription: string;
  spatialAnalysis: string;
  detectedObjects: DetectedObject[];
  detectedFaces: DetectedFace[];
}

export interface UseWebcamReturn {
  stream: MediaStream | null;
  isEnabled: boolean;
  facingMode: 'user' | 'environment';
  hasMultipleCameras: boolean;
  hasTorch: boolean;
  isTorchOn: boolean;
  enableWebcam: (mode?: 'user' | 'environment') => Promise<void>;
  disableWebcam: () => void;
  toggleCamera: () => void;
  toggleTorch: () => Promise<void>;
  error: string | null;
}

export interface UseGeolocationReturn {
  location: { latitude: number; longitude: number } | null;
  status: 'idle' | 'pending' | 'granted' | 'denied' | 'unsupported';
  error: string | null;
  requestLocation: () => Promise<{ latitude: number; longitude: number } | null>;
}
