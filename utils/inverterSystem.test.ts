import { describe, expect, test } from 'vitest';
import { INVERTER_CONFIG } from '../constants';
import { Obstacle } from '../types';
import {
  invertObstaclePolarity,
  shouldInvertPolarity,
  shouldSpawnAsInverter
} from './inverterSystem';

describe('Inverter System', () => {
  test('shouldSpawnAsInverter uses phantom vs base probability', () => {
    // Requires score >= 500
    const isPhantomInvert = shouldSpawnAsInverter(500, true, () => 0.1);
    expect(isPhantomInvert).toBe(true); // 0.1 < 0.20

    const isBaseInvert = shouldSpawnAsInverter(500, false, () => 0.3);
    expect(isBaseInvert).toBe(false); // 0.3 > 0.10

    // Before 500m (score < 500), always returns false
    const isEarlyInvert = shouldSpawnAsInverter(499, true, () => 0.01);
    expect(isEarlyInvert).toBe(false);
  });

  test('shouldInvertPolarity detects inversion threshold', () => {
    const obs: Obstacle = {
      id: 'test-1',
      x: 500,
      y: 0,
      targetY: 0,
      width: 50,
      height: 100,
      lane: 'top',
      polarity: 'white',
      passed: false,
      isInverting: true,
      hasInverted: false,
      invertX: 460,
    };

    expect(shouldInvertPolarity(obs)).toBe(false); // x = 500 > 460

    obs.x = 450;
    expect(shouldInvertPolarity(obs)).toBe(true); // x = 450 <= 460

    obs.hasInverted = true;
    expect(shouldInvertPolarity(obs)).toBe(false); // already inverted
  });

  test('invertObstaclePolarity flips white to black and marks hasInverted', () => {
    const obs: Obstacle = {
      id: 'test-2',
      x: 400,
      y: 0,
      targetY: 0,
      width: 50,
      height: 100,
      lane: 'top',
      polarity: 'white',
      passed: false,
      isInverting: true,
      hasInverted: false,
    };

    invertObstaclePolarity(obs, 123456);

    expect(obs.polarity).toBe('black');
    expect(obs.hasInverted).toBe(true);
    expect(obs.invertTime).toBe(123456);

    // Flip again back to white
    invertObstaclePolarity(obs, 123457);
    expect(obs.polarity).toBe('white');
  });
});
