# Implementation Plan

- [x] 1. Type Definitions and Configuration





  - [x] 1.1 Add GlitchShard, GlitchModeState, GlitchConfig interfaces to types.ts


    - Define all required properties as specified in design document
    - Include phase enum type: 'inactive' | 'active' | 'warning' | 'exiting' | 'ghost'
    - _Requirements: 1.1, 2.1, 4.1, 7.1_
  - [x] 1.2 Add GLITCH_CONFIG constants to constants.ts


    - duration: 8000ms, idealConnectorLength: 120px, waveSpeed: 0.05
    - ghostModeDuration: 1500ms, warningThreshold: 0.75, flattenThreshold: 0.80
    - shardMultiplier: 2, minSpawnDistance: 500, spawnClearance: 150
    - colors array for flicker effect
    - _Requirements: 7.1, 6.5, 2.7, 2.6_

- [x] 2. Core Glitch System Implementation






  - [x] 2.1 Create systems/glitchSystem.ts with state management functions

    - createInitialGlitchModeState(): GlitchModeState
    - activateQuantumLock(state, connectorLength): GlitchModeState
    - updateGlitchMode(state, deltaTime): GlitchModeState
    - getPhaseFromProgress(progress): phase type
    - _Requirements: 4.1, 7.1, 7.2, 7.3, 7.4_

  - [x] 2.2 Write property tests for state management

    - **Property 16: Duration Initialization**
    - **Property 17: Phase Transitions**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4**
  - [x] 2.3 Implement Glitch Shard spawning functions

    - createGlitchShard(canvasWidth, canvasHeight): GlitchShard
    - shouldSpawnGlitchShard(distance, hasSpawned): boolean
    - isSpawnPositionSafe(y, obstacles): boolean
    - _Requirements: 2.1, 2.2, 2.3, 2.6, 2.7_

  - [x] 2.4 Write property tests for spawn logic
    - **Property 1: Spawn Position Bounds**
    - **Property 2: Spawn Distance Threshold**
    - **Property 3: Spawn Safety Clearance**
    - **Validates: Requirements 2.2, 2.3, 2.6, 2.7**
  - [x] 2.5 Implement shard movement and removal

    - updateGlitchShard(shard, speed, deltaTime): GlitchShard
    - shouldRemoveShard(shard): boolean
    - _Requirements: 2.4, 2.5_
  - [x] 2.6 Write property tests for shard movement

    - **Property 4: Shard Movement**
    - **Property 5: Shard Removal**
    - **Validates: Requirements 2.4, 2.5**

- [x] 3. Collision Detection






  - [x] 3.1 Implement AABB collision detection

    - checkGlitchShardCollision(playerX, playerY, connectorLength, shard): boolean
    - Handle vertical connector range intersection
    - _Requirements: 3.1_
  - [x] 3.2 Write property tests for collision detection


    - **Property 6: AABB Collision Detection**
    - **Validates: Requirements 3.1**
  - [x] 3.3 Implement collision response


    - Trigger hit stop, screen shake, mode activation
    - Remove shard from active objects
    - _Requirements: 3.2, 3.3, 3.5, 3.6_
  - [x] 3.4 Write property tests for collision response


    - **Property 7: Collision Triggers Mode Activation**
    - **Validates: Requirements 3.5, 3.6, 4.1**

- [x] 4. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Connector Animation System






  - [x] 5.1 Implement elastic easing function

    - elasticOut(t): number - for bounce feel
    - _Requirements: 4.2_

  - [x] 5.2 Implement connector length animation
    - calculateConnectorLength(state, current, target, deltaTime): number
    - finalizeConnectorLength(state, originalLength): number - hard-set on completion
    - _Requirements: 4.2, 4.3, 4.4_
  - [x] 5.3 Write property tests for connector animation


    - **Property 8: Connector Length Round-Trip**
    - **Property 9: Connector Lock During Mode**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

- [x] 6. Wave System Implementation





  - [x] 6.1 Implement sinusoidal wave calculation


    - calculateWaveY(x, offset, amplitude, centerY): number
    - getWaveAmplitudeForPhase(phase, progress): number
    - _Requirements: 5.1, 5.2_

  - [x] 6.2 Write property tests for wave calculation

    - **Property 10: Wave Offset Progression**
    - **Validates: Requirements 5.2**
  - [x] 6.3 Implement wave path shard generation


    - generateWavePathShards(waveOffset, canvasWidth, centerY, amplitude): ShardPosition[]
    - Distribute 10-15 shards along wave path
    - _Requirements: 5.6, 6.4_

- [x] 7. Gameplay Modifications





  - [x] 7.1 Implement obstacle spawn prevention during Quantum Lock


    - Add check in spawn logic to block during active mode
    - _Requirements: 6.1_

  - [x] 7.2 Write property tests for obstacle spawn prevention

    - **Property 12: Obstacle Spawn Prevention**
    - **Validates: Requirements 6.1**
  - [x] 7.3 Implement invulnerability system

    - isInvulnerable(glitchState): boolean
    - Apply during Quantum Lock and Ghost Mode
    - _Requirements: 6.3, 7.6_

  - [x] 7.4 Write property tests for invulnerability
    - **Property 13: Invulnerability During Bonus Modes**
    - **Validates: Requirements 6.3, 7.6**
  - [x] 7.5 Implement shard value multiplier

    - getShardMultiplier(glitchState): number
    - Return 2x during Quantum Lock
    - _Requirements: 6.5_

  - [x] 7.6 Write property tests for shard multiplier
    - **Property 14: Shard Value Multiplier**
    - **Validates: Requirements 6.5**
  - [x] 7.7 Implement speed stabilization

    - shouldStabilizeSpeed(glitchState): boolean
    - _Requirements: 5.7_

  - [x] 7.8 Write property tests for speed stabilization
    - **Property 11: Speed Stabilization**
    - **Validates: Requirements 5.7**
  - [x] 7.9 Implement distance accumulation during mode

    - Ensure distance continues to accumulate
    - _Requirements: 6.6_

  - [x] 7.10 Write property tests for distance accumulation
    - **Property 15: Distance Accumulation**
    - **Validates: Requirements 6.6**

- [x] 8. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Mode Priority System





  - [x] 9.1 Implement Overdrive pause/resume


    - pauseOverdrive(glitchState, overdriveState): { glitchState, overdriveState }
    - resumeOverdrive(glitchState, overdriveState): overdriveState
    - _Requirements: 6.7, 7.8, 10.1_

  - [x] 9.2 Write property tests for Overdrive pause/resume

    - **Property 20: Overdrive Pause/Resume Round-Trip**
    - **Validates: Requirements 6.7, 7.8, 10.1, 10.3**

  - [x] 9.3 Implement Resonance pause/resume

    - pauseResonance(glitchState, resonanceState): { glitchState, resonanceState }
    - resumeResonance(glitchState, resonanceState): resonanceState

    - _Requirements: 10.2, 10.3_
  - [x] 9.4 Write property tests for Resonance pause/resume

    - **Property 21: Resonance Pause/Resume Round-Trip**
    - **Validates: Requirements 10.2, 10.3**
  - [x] 9.5 Implement priority override logic

    - getPriorityMode(glitchState, overdriveState, resonanceState): string
    - _Requirements: 10.4, 10.5_


  - [x] 9.6 Write property tests for priority system
    - **Property 22: Priority Override**
    - **Validates: Requirements 10.4**

- [x] 10. Ghost Mode Implementation





  - [x] 10.1 Implement Ghost Mode activation and duration


    - activateGhostMode(state): GlitchModeState
    - updateGhostMode(state, deltaTime): GlitchModeState
    - _Requirements: 7.4, 7.5_

  - [x] 10.2 Write property tests for Ghost Mode

    - **Property 18: Ghost Mode Duration**
    - **Property 19: State Restoration**
    - **Validates: Requirements 7.4, 7.7**

- [x] 11. Input Buffering System






  - [x] 11.1 Implement input buffer for hit stop

    - bufferInput(input): void
    - flushBufferedInput(): InputState | null
    - _Requirements: 3.2 (hit stop handling)_

- [x] 12. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Visual Effects (Rendering)
  - [x] 13.1 Implement Glitch Shard rendering
    - renderGlitchShard(ctx, shard): void
    - Jitter effect, color flicker, distorted polygon, static noise
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [x] 13.2 Implement Sinus Tunnel rendering
    - renderSinusTunnel(ctx, width, height, offset, amplitude): void
    - Matrix green color, glow effect, guide path
    - _Requirements: 5.3, 5.4, 5.5_
  - [x] 13.3 Implement static noise overlay
    - renderStaticNoise(ctx, width, height, intensity): void
    - Random horizontal lines with decreasing intensity during exit
    - _Requirements: 8.1, 8.6_
  - [x] 13.4 Implement screen flash effects
    - triggerScreenFlash(type: 'enter' | 'exit'): void
    - White flash on enter, fade out vignette on exit
    - _Requirements: 8.3, 8.4_
  - [x] 13.5 Implement connector visual effects

    - Green tint, pulse animation during Quantum Lock
    - Semi-transparent during Ghost Mode
    - _Requirements: 4.5, 4.6, 7.5_

- [x] 14. Audio Integration





  - [x] 14.1 Add glitch sound effects to audioSystem.ts


    - glitchSpawn: distorted beep
    - glitchImpact: heavy bass hit with distortion

    - _Requirements: 9.1, 9.2_
  - [x] 14.2 Implement low-pass filter for background music

    - Apply during Quantum Lock for distorted/bass-heavy version
    - Fade out filter on mode end
    - _Requirements: 9.3, 9.4_

- [x] 15. GameEngine Integration




  - [x] 15.1 Add glitch system state refs to GameEngine.tsx


    - glitchShard ref, glitchModeState ref, hitStopTimer ref
    - inputBuffer ref for hit stop handling
    - _Requirements: All_
  - [x] 15.2 Integrate spawn logic into game loop


    - Check distance threshold, spawn once per level
    - Ensure safe spawn position
    - _Requirements: 2.1, 2.6, 2.7_
  - [x] 15.3 Integrate collision detection into game loop


    - Check collision each frame, trigger mode on hit
    - Apply hit stop and screen shake
    - _Requirements: 3.1, 3.2, 3.3_
  - [x] 15.4 Integrate mode updates into game loop


    - Update wave offset, phase transitions
    - Handle connector animation
    - _Requirements: 5.2, 7.2, 7.3_
  - [x] 15.5 Integrate rendering into draw loop


    - Render shard, tunnel, noise, effects
    - Apply visual modifications during mode
    - _Requirements: 1.1-1.5, 5.3-5.5, 8.1-8.6_
  - [x] 15.6 Integrate with existing systems


    - Pause/resume Overdrive and Resonance
    - Apply shard multiplier
    - Handle invulnerability
    - _Requirements: 6.7, 10.1-10.5_

- [x] 16. Final Checkpoint - Ensure all tests pass


  - Ensure all tests pass, ask the user if questions arise.
