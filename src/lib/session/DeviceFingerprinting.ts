/**
 * Enhanced Device Fingerprinting
 * 
 * This file provides comprehensive device fingerprinting capabilities
 * integrated with the session security system.
 */

export interface ClientDeviceInfo {
  // Basic info
  userAgent: string;
  platform: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  
  // Screen info
  screenResolution: string;
  colorDepth: number;
  pixelRatio: number;
  availableScreenSize: string;
  
  // Time and locale
  timezone: string;
  language: string;
  languages: string[];
  
  // Hardware capabilities
  hardwareConcurrency: number;
  maxTouchPoints: number;
  deviceMemory?: number;
  
  // Network info
  connectionType?: string;
  effectiveType?: string;
  
  // Advanced fingerprinting
  canvasFingerprint?: string;
  webglVendor?: string;
  webglRenderer?: string;
  webglVersion?: string;
  audioContextFingerprint?: string;
  availableFonts?: string[];
  
  // Capabilities
  touchSupport: boolean;
  webglSupport: boolean;
  canvasSupport: boolean;
  audioContextSupport: boolean;
}

/**
 * Device fingerprinting collector
 * Collects comprehensive device information for security purposes
 */
export class DeviceFingerprinting {
  
  /**
   * Collect all available device information
   */
  static async collectDeviceInfo(): Promise<ClientDeviceInfo> {
    const deviceInfo: ClientDeviceInfo = {
      // Basic browser info
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      browser: this.detectBrowser(),
      browserVersion: this.detectBrowserVersion(),
      os: this.detectOS(),
      osVersion: this.detectOSVersion(),
      deviceType: this.detectDeviceType(),
      
      // Screen information
      screenResolution: `${screen.width}x${screen.height}`,
      colorDepth: screen.colorDepth,
      pixelRatio: window.devicePixelRatio || 1,
      availableScreenSize: `${screen.availWidth}x${screen.availHeight}`,
      
      // Time and locale
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      languages: [...navigator.languages],
      
      // Hardware capabilities
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
      maxTouchPoints: navigator.maxTouchPoints || 0,
      deviceMemory: (navigator as any).deviceMemory,
      
      // Network information
      connectionType: this.getConnectionType(),
      effectiveType: this.getEffectiveConnectionType(),
      
      // Advanced fingerprinting
      canvasFingerprint: await this.generateCanvasFingerprint(),
      webglVendor: this.getWebGLVendor(),
      webglRenderer: this.getWebGLRenderer(),
      webglVersion: this.getWebGLVersion(),
      audioContextFingerprint: await this.generateAudioContextFingerprint(),
      availableFonts: await this.detectAvailableFonts(),
      
      // Capabilities
      touchSupport: 'ontouchstart' in window,
      webglSupport: this.hasWebGLSupport(),
      canvasSupport: this.hasCanvasSupport(),
      audioContextSupport: this.hasAudioContextSupport()
    };
    
    return deviceInfo;
  }
  
  /**
   * Detect browser type
   */
  private static detectBrowser(): string {
    const userAgent = navigator.userAgent;
    
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      return 'Chrome';
    } else if (userAgent.includes('Firefox')) {
      return 'Firefox';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      return 'Safari';
    } else if (userAgent.includes('Edg')) {
      return 'Edge';
    } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
      return 'Opera';
    }
    
    return 'Unknown';
  }
  
  /**
   * Detect browser version
   */
  private static detectBrowserVersion(): string {
    const userAgent = navigator.userAgent;
    
    if (userAgent.includes('Chrome')) {
      const match = userAgent.match(/Chrome\/(\d+\.\d+)/);
      return match ? match[1] : 'Unknown';
    } else if (userAgent.includes('Firefox')) {
      const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
      return match ? match[1] : 'Unknown';
    } else if (userAgent.includes('Safari')) {
      const match = userAgent.match(/Version\/(\d+\.\d+)/);
      return match ? match[1] : 'Unknown';
    } else if (userAgent.includes('Edg')) {
      const match = userAgent.match(/Edg\/(\d+\.\d+)/);
      return match ? match[1] : 'Unknown';
    }
    
    return 'Unknown';
  }
  
  /**
   * Detect operating system
   */
  private static detectOS(): string {
    const userAgent = navigator.userAgent;
    
    if (userAgent.includes('Windows')) {
      return 'Windows';
    } else if (userAgent.includes('Mac OS')) {
      return 'macOS';
    } else if (userAgent.includes('Linux')) {
      return 'Linux';
    } else if (userAgent.includes('Android')) {
      return 'Android';
    } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      return 'iOS';
    }
    
    return 'Unknown';
  }
  
  /**
   * Detect operating system version
   */
  private static detectOSVersion(): string {
    const userAgent = navigator.userAgent;
    
    if (userAgent.includes('Windows NT')) {
      const match = userAgent.match(/Windows NT (\d+\.\d+)/);
      return match ? match[1] : 'Unknown';
    } else if (userAgent.includes('Mac OS X')) {
      const match = userAgent.match(/Mac OS X (\d+[._]\d+)/);
      return match ? match[1].replace('_', '.') : 'Unknown';
    } else if (userAgent.includes('Android')) {
      const match = userAgent.match(/Android (\d+\.\d+)/);
      return match ? match[1] : 'Unknown';
    } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      const match = userAgent.match(/OS (\d+[._]\d+)/);
      return match ? match[1].replace('_', '.') : 'Unknown';
    }
    
    return 'Unknown';
  }
  
  /**
   * Detect device type
   */
  private static detectDeviceType(): 'desktop' | 'mobile' | 'tablet' {
    const userAgent = navigator.userAgent;
    
    if (/iPad|Tablet/.test(userAgent)) {
      return 'tablet';
    } else if (/Mobile|Android|iPhone/.test(userAgent)) {
      return 'mobile';
    }
    
    return 'desktop';
  }
  
  /**
   * Get connection type
   */
  private static getConnectionType(): string {
    const connection = (navigator as any).connection;
    return connection?.type || 'unknown';
  }
  
  /**
   * Get effective connection type
   */
  private static getEffectiveConnectionType(): string {
    const connection = (navigator as any).connection;
    return connection?.effectiveType || 'unknown';
  }
  
  /**
   * Generate canvas fingerprint
   */
  private static async generateCanvasFingerprint(): Promise<string> {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return 'canvas_not_supported';
      
      // Draw text with various fonts and styles
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprinting test', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.font = '18px Arial';
      ctx.fillText('Device fingerprinting test', 4, 45);
      
      // Add some geometric shapes
      ctx.beginPath();
      ctx.arc(50, 50, 25, 0, 2 * Math.PI);
      ctx.stroke();
      
      return canvas.toDataURL();
    } catch (error) {
      return 'canvas_error';
    }
  }
  
  /**
   * Get WebGL vendor
   */
  private static getWebGLVendor(): string {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (!gl) return 'webgl_not_supported';
      
      const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        return (gl as any).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'unknown';
      }
      
      return 'debug_info_not_available';
    } catch (error) {
      return 'webgl_error';
    }
  }
  
  /**
   * Get WebGL renderer
   */
  private static getWebGLRenderer(): string {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (!gl) return 'webgl_not_supported';
      
      const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        return (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'unknown';
      }
      
      return 'debug_info_not_available';
    } catch (error) {
      return 'webgl_error';
    }
  }
  
  /**
   * Get WebGL version
   */
  private static getWebGLVersion(): string {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (!gl) return 'webgl_not_supported';
      
      return (gl as any).getParameter((gl as any).VERSION) || 'unknown';
    } catch (error) {
      return 'webgl_error';
    }
  }
  
  /**
   * Generate audio context fingerprint
   */
  private static async generateAudioContextFingerprint(): Promise<string> {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const oscillator = audioContext.createOscillator();
      const analyser = audioContext.createAnalyser();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(analyser);
      analyser.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      
      oscillator.start();
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);
      
      oscillator.stop();
      audioContext.close();
      
      return Array.from(dataArray).join(',');
    } catch (error) {
      return 'audio_context_error';
    }
  }
  
  /**
   * Detect available fonts
   */
  private static async detectAvailableFonts(): Promise<string[]> {
    const testFonts = [
      'Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Verdana',
      'Georgia', 'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS',
      'Trebuchet MS', 'Arial Black', 'Impact', 'Tahoma', 'Calibri'
    ];
    
    const availableFonts: string[] = [];
    
    for (const font of testFonts) {
      if (this.isFontAvailable(font)) {
        availableFonts.push(font);
      }
    }
    
    return availableFonts;
  }
  
  /**
   * Check if a font is available
   */
  private static isFontAvailable(font: string): boolean {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return false;
    
    // Test with the font
    ctx.font = `12px ${font}, monospace`;
    const widthWithFont = ctx.measureText('test').width;
    
    // Test with fallback font
    ctx.font = '12px monospace';
    const widthWithFallback = ctx.measureText('test').width;
    
    return widthWithFont !== widthWithFallback;
  }
  
  /**
   * Check WebGL support
   */
  private static hasWebGLSupport(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Check canvas support
   */
  private static hasCanvasSupport(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('2d'));
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Check audio context support
   */
  private static hasAudioContextSupport(): boolean {
    try {
      return !!(window.AudioContext || (window as any).webkitAudioContext);
    } catch (error) {
      return false;
    }
  }
}

/**
 * Utility function to collect device info and send to server
 */
export async function collectAndSendDeviceInfo(): Promise<ClientDeviceInfo> {
  const deviceInfo = await DeviceFingerprinting.collectDeviceInfo();
  
  // Log for debugging (remove in production)
  console.log('🔍 Device fingerprinting collected:', {
    fingerprint: deviceInfo.userAgent.substring(0, 50) + '...',
    capabilities: {
      webgl: deviceInfo.webglSupport,
      canvas: deviceInfo.canvasSupport,
      audio: deviceInfo.audioContextSupport,
      touch: deviceInfo.touchSupport
    },
    hardware: {
      cores: deviceInfo.hardwareConcurrency,
      memory: deviceInfo.deviceMemory,
      touchPoints: deviceInfo.maxTouchPoints
    }
  });
  
  return deviceInfo;
}
