# Design Document: Echo Constructs System

## Overview

Echo Constructs, oyuncunun geçici olarak farklı fizik ve input kurallarına sahip "araçlara" dönüşmesini sağlayan sistemdir. Jetpack Joyride'ın "araç = zırh" mekaniğinden ilham alınarak, her Construct farklı oynanış sunar ve "Second Chance" mekanizması ile ekstra hayat sağlar.

Bu sistem **Strategy Pattern** kullanarak implement edilecektir. Her Construct kendi fizik stratejisine sahip olacak ve ConstructSystem manager sınıfı geçişleri yönetecektir.

## Architecture

### Dosya Yapısı

```
systems/
├── constructs/
│   ├── ConstructSystem.ts      # Manager sınıfı
│   ├── PhysicsStrategy.ts      # Interface tanımı
│   ├── StandardPhysics.ts      # Base form fiziği
│   ├── TitanPhysics.ts         # Titan Resonance
│   ├── PhasePhysics.ts         # Phase Cycle
│   └── BlinkPhysics.ts         # Blink Node
├── GlitchTokenSpawner.ts       # Token spawn sistemi
└── SecondChanceSystem.ts       # Hasar ve ölümsüzlük

types.ts (extensions)
store/gameStore.ts (extensions)
```

## Components and Interfaces

### 1. Core Types

```typescript
// types.ts
export type ConstructType = 'NONE' | 'TITAN' | 'PHASE' | 'BLINK';
export type CollisionResult = 'DAMAGE' | 'DESTROY' | 'IGNORE';

// Input State - Blink Node için touchY kritik
export interface InputState {
  isPressed: boolean;
  y: number;              // Dokunulan Y koordinatı (Blink ghost için)
  isTapFrame: boolean;    // Bu karede mi basıldı? (Titan stomp için)
  isReleaseFrame: boolean; // Bu karede mi bırakıldı? (Blink teleport için)
}

export interface PhysicsStrategy {
  type: ConstructType;
  
  // Ana güncelleme - InputState objesi alır
  update(player: PlayerEntity, deltaTime: number, input: InputState): void;
  
  // Çarpışma kararı - Strategy belirler
  resolveCollision(isFromAbove: boolean): CollisionResult;
  
  getHitbox(player: PlayerEntity): Rect;
  getSpeedMultiplier(): number;
  getGravityMultiplier(): number;
}

export interface PlayerEntity {
  x: number;
  y: number;
  velocity: number;
  width: number;
  height: number;
}
```

### 2. Physics Configurations

```typescript
// Titan: 2.5x gravity, stomp ability, DESTROY on stomp collision
export const TITAN_CONFIG = {
  gravityMultiplier: 2.5,
  stompVelocity: 25,
  hitboxScale: 1.2,
  resolveCollision: (isFromAbove: boolean) => isFromAbove ? 'DESTROY' : 'DAMAGE'
};

// Phase: 1.2x speed, gravity flip, always DAMAGE
export const PHASE_CONFIG = {
  speedMultiplier: 1.2,
  transitionDuration: 200,
  resolveCollision: () => 'DAMAGE'
};

// Blink: teleport with cooldown, IGNORE during teleport frame
export const BLINK_CONFIG = {
  teleportCooldown: 200,
  ghostOpacity: 0.5,
  resolveCollision: (isTeleporting: boolean) => isTeleporting ? 'IGNORE' : 'DAMAGE'
};

// Standard: always DAMAGE
export const STANDARD_CONFIG = {
  resolveCollision: () => 'DAMAGE'
};
```

### 3. ConstructSystem Manager

```typescript
export interface ConstructSystemState {
  activeConstruct: ConstructType;
  isInvulnerable: boolean;
  invulnerabilityEndTime: number;
  currentStrategy: PhysicsStrategy;
}

export interface SecondChanceConfig {
  invincibilityDuration: number;  // 2000ms
  smartBombRadius: number;        // 500px - engel temizleme yarıçapı
  enableSmartBomb: boolean;       // true
}

function transformTo(state: ConstructSystemState, type: ConstructType, time: number): ConstructSystemState;

// Second Chance + Smart Bomb
function takeDamage(
  state: ConstructSystemState, 
  time: number,
  obstacles: Obstacle[],
  playerX: number,
  config: SecondChanceConfig
): { 
  newState: ConstructSystemState; 
  gameOver: boolean;
  obstaclesToDestroy: string[];  // Smart Bomb ile silinecek engel ID'leri
};

function isInvulnerable(state: ConstructSystemState, time: number): boolean;

// Smart Bomb: Yarıçap içindeki engelleri bul
function getObstaclesInRadius(
  obstacles: Obstacle[], 
  centerX: number, 
  radius: number
): Obstacle[];
```

## Data Models

### Construct Configurations

```typescript
export const CONSTRUCTS: Record<ConstructType, ConstructConfig> = {
  NONE: { id: 'NONE', name: 'Base Form', unlockCost: 0, gravityMultiplier: 1.0, speedMultiplier: 1.0 },
  TITAN: { id: 'TITAN', name: 'Titan Resonance', unlockCost: 0, gravityMultiplier: 2.5, speedMultiplier: 1.0 },
  PHASE: { id: 'PHASE', name: 'Phase Cycle', unlockCost: 500, gravityMultiplier: 0, speedMultiplier: 1.2 },
  BLINK: { id: 'BLINK', name: 'Blink Node', unlockCost: 1000, gravityMultiplier: 0, speedMultiplier: 1.0 }
};
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system.*

### Property 1: Token Spawn Score Threshold
*For any* game state with score < 500, the token spawn probability SHALL be 0.
**Validates: Requirements 1.1**

### Property 2: Token Safe Position
*For any* spawned Glitch Token, its position SHALL NOT overlap with any active obstacle.
**Validates: Requirements 1.2**

### Property 3: Construct Selection from Unlocked Pool
*For any* Construct selection, the selected Construct SHALL be from unlockedConstructs.
**Validates: Requirements 1.4, 8.5**

### Property 4: No Token Spawn During Active Construct
*For any* game state where activeConstruct !== 'NONE', token spawn probability SHALL be 0.
**Validates: Requirements 1.6**

### Property 5: Transformation Invincibility
*For any* transformation, player SHALL be invulnerable for 2000ms.
**Validates: Requirements 2.1, 6.3**

### Property 6: Physics Strategy Consistency
*For any* activeConstruct value, PhysicsStrategy.type SHALL equal activeConstruct.
**Validates: Requirements 2.3, 2.4, 2.5**

### Property 7: Titan Gravity Multiplier
*For any* physics update while Titan is active, gravity SHALL equal base * 2.5.
**Validates: Requirements 3.1**

### Property 8: Titan Stomp Velocity
*For any* tap while Titan is active, velocity SHALL be set to STOMP_VELOCITY.
**Validates: Requirements 3.2**

### Property 9: Titan Stomp Destroys Obstacles
*For any* stomp collision from above, obstacle SHALL be destroyed.
**Validates: Requirements 3.3**

### Property 10: Phase Cycle Position Lock
*For any* update while Phase is active, Y SHALL be floorY or ceilingY.
**Validates: Requirements 4.1**

### Property 11: Phase Cycle Gravity Flip
*For any* tap while Phase is active, gravityDirection SHALL toggle.
**Validates: Requirements 4.2**

### Property 12: Phase Cycle Speed Multiplier
*For any* speed calculation while Phase is active, speed SHALL equal base * 1.2.
**Validates: Requirements 4.6**

### Property 13: Blink Node Static Y
*For any* update while Blink is active (not teleporting), velocity SHALL be 0.
**Validates: Requirements 5.1**

### Property 14: Blink Node Teleport
*For any* release while Blink is active, player Y SHALL equal ghost Y.
**Validates: Requirements 5.3**

### Property 15: Second Chance State Transition
*For any* damage while Construct is active, activeConstruct SHALL become 'NONE'.
**Validates: Requirements 6.1, 6.2, 6.3**

### Property 18: Smart Bomb Obstacle Clearing
*For any* Second Chance trigger, all obstacles within smartBombRadius (500px) of player SHALL be destroyed.
**Validates: Requirements 6.1 (Safe Exit)**

### Property 19: Collision Resolution by Strategy
*For any* collision event, the CollisionResult SHALL be determined by the active PhysicsStrategy.resolveCollision().
**Validates: Requirements 3.3, 3.4, 4.4, 5.4, 5.5**

### Property 20: Input State Touch Y Accuracy
*For any* Blink Node drag event, the ghost Y position SHALL equal InputState.y.
**Validates: Requirements 5.2**

### Property 16: Construct State Not Persisted
*For any* serialization, activeConstruct SHALL NOT be included.
**Validates: Requirements 7.4**

### Property 17: Unlock Persistence
*For any* unlock event, unlockedConstructs SHALL be persisted.
**Validates: Requirements 8.2, 8.3, 8.4**

## Error Handling

| Error Condition | Handling Strategy |
|-----------------|-------------------|
| Invalid ConstructType | Default to 'NONE' |
| Empty unlockedConstructs | Prevent token spawn |
| NaN velocity | Reset to 0 |
| Player out of bounds | Clamp to canvas |

## Testing Strategy

- **Test Runner**: Vitest
- **Property-Based Testing**: fast-check
- **Minimum Iterations**: 100 per property test
- **Format**: `**Feature: echo-constructs, Property {N}: {text}**`

