/**
 * CameraSystem.ts - Echo Shift
 * Modüler Kamera Sistemi
 * 
 * Pürüzsüz, fizik tabanlı (lerp) geçişlere sahip profesyonel kamera sistemi.
 * World Space ve Screen Space ayrımını yönetir.
 * 
 * Kullanım:
 * 1. World Space (Oyun Dünyası): Orblar, Bloklar, Efektler - Kameradan etkilenir
 * 2. Screen Space (UI Katmanı): Skor, Tutorial Mesajları - Kameradan etkilenmez
 */

// ============================================================================
// TYPES
// ============================================================================

export interface CameraState {
    /** Şu anki zoom seviyesi (1.0 = Normal) */
    scale: number;
    /** Hedef zoom seviyesi */
    targetScale: number;
    /** Kameranın odaklandığı X noktası (World) */
    focusX: number;
    /** Kameranın odaklandığı Y noktası (World) */
    focusY: number;
    /** Hedef X odak noktası */
    targetFocusX: number;
    /** Hedef Y odak noktası */
    targetFocusY: number;
    /** Geçiş yumuşaklığı (0.0 - 1.0, düşük = daha yumuşak) */
    smoothing: number;
}

// ============================================================================
// STATE CREATION
// ============================================================================

/**
 * Başlangıç kamera durumunu oluşturur
 */
export function createCameraState(): CameraState {
    return {
        scale: 1.0,
        targetScale: 1.0,
        focusX: 0,
        focusY: 0,
        targetFocusX: 0,
        targetFocusY: 0,
        smoothing: 0.1, // %10 yaklaşım hızı (yumuşak geçiş)
    };
}

// ============================================================================
// CAMERA CONTROL
// ============================================================================

/**
 * Kamerayı belirli bir noktaya ve zoom seviyesine odakla
 * @param state - Mevcut kamera durumu
 * @param scale - Hedef zoom seviyesi (1.0 = normal, 1.5 = %50 büyütme)
 * @param x - Hedef X koordinatı
 * @param y - Hedef Y koordinatı
 * @param instant - true ise anında geçiş yapar (lerp yok)
 */
export function setCameraTarget(
    state: CameraState,
    scale: number,
    x: number,
    y: number,
    instant: boolean = false
): CameraState {
    const newState = { ...state };
    newState.targetScale = scale;
    newState.targetFocusX = x;
    newState.targetFocusY = y;

    if (instant) {
        newState.scale = scale;
        newState.focusX = x;
        newState.focusY = y;
    }

    return newState;
}

/**
 * Kamera yumuşaklık değerini ayarla
 * @param state - Mevcut kamera durumu
 * @param smoothing - Yumuşaklık değeri (0.01 = çok yavaş, 0.2 = hızlı)
 */
export function setSmoothness(state: CameraState, smoothing: number): CameraState {
    return {
        ...state,
        smoothing: Math.max(0.01, Math.min(1.0, smoothing)),
    };
}

// ============================================================================
// UPDATE
// ============================================================================

/**
 * Kamerayı her karede (frame) güncelle - Smooth Interpolation (Lerp)
 * Linear Interpolation: current = current + (target - current) * smoothing
 * Bu, tipik bir Hollywood kamerası gibi "süzülerek" (Ease-out) odaklanma hissi verir.
 */
export function updateCamera(state: CameraState): CameraState {
    const s = state.smoothing;

    // LERP formülü: current = current + (target - current) * smoothing_factor
    const newScale = state.scale + (state.targetScale - state.scale) * s;
    const newFocusX = state.focusX + (state.targetFocusX - state.focusX) * s;
    const newFocusY = state.focusY + (state.targetFocusY - state.focusY) * s;

    return {
        ...state,
        scale: newScale,
        focusX: newFocusX,
        focusY: newFocusY,
    };
}

// ============================================================================
// TRANSFORM APPLICATION
// ============================================================================

/**
 * Canvas Context üzerine kamera transformasyonunu uygula
 * DİKKAT: Bu fonksiyonu çağırdıktan sonra çizilen her şey zoomlanır!
 * ctx.restore() ile kamerayı kaldırmalısın.
 * 
 * İşlem sırası:
 * 1. Ekranın merkezine git
 * 2. Zoom işlemini uygula
 * 3. Odak noktasına geri git (World Coordinate offset)
 * Böylece zoom işlemi (0,0) yerine odak noktasına doğru yapılır.
 */
export function applyCameraTransform(
    ctx: CanvasRenderingContext2D,
    state: CameraState,
    screenWidth: number,
    screenHeight: number
): void {
    // 1. Ekranın merkezine git
    const centerX = screenWidth / 2;
    const centerY = screenHeight / 2;

    ctx.translate(centerX, centerY);

    // 2. Zoom işlemini uygula
    ctx.scale(state.scale, state.scale);

    // 3. Odak noktasına geri git (World Coordinate offset)
    // Böylece zoom işlemi (0,0) yerine odak noktasına doğru yapılır
    ctx.translate(-state.focusX, -state.focusY);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Kameranın hedefine ulaşıp ulaşmadığını kontrol et
 * @param state - Mevcut kamera durumu
 * @param threshold - Kabul edilebilir mesafe (varsayılan 0.01)
 */
export function hasReachedTarget(state: CameraState, threshold: number = 0.01): boolean {
    const scaleDiff = Math.abs(state.scale - state.targetScale);
    const xDiff = Math.abs(state.focusX - state.targetFocusX);
    const yDiff = Math.abs(state.focusY - state.targetFocusY);

    return scaleDiff < threshold && xDiff < threshold && yDiff < threshold;
}

/**
 * Kamerayı sıfırla (normal görünüme dön)
 */
export function resetCamera(state: CameraState, screenWidth: number, screenHeight: number): CameraState {
    return setCameraTarget(
        state,
        1.0,
        screenWidth / 2,
        screenHeight / 2,
        false
    );
}

/**
 * Tutorial SWAP fazı için kamera ayarları
 * Oyuncuya yakınlaşır ve odaklanır
 */
export function setSwapZoomTarget(
    state: CameraState,
    playerY: number,
    screenWidth: number,
    screenHeight: number,
    zoomLevel: number = 1.5
): CameraState {
    const targetY = screenHeight * playerY;
    const centerX = screenWidth / 2;

    return setCameraTarget(state, zoomLevel, centerX, targetY, false);
}

/**
 * Zoom seviyesinin aktif olup olmadığını kontrol et
 */
export function isZoomed(state: CameraState): boolean {
    return state.scale > 1.05 || state.targetScale > 1.05;
}
