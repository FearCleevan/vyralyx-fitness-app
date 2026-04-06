/**
 * PoseSkeleton.tsx
 *
 * SVG overlay that renders the MoveNet pose skeleton on top of the camera
 * preview.
 *
 * Layout: absolutely-positioned, same dimensions as the camera view.
 * Coordinates from poseDetection are normalised [0,1]; we scale them to the
 * actual view dimensions before drawing.
 *
 * Colour coding:
 *   - Bright purple  → high-confidence joints (score ≥ 0.6)
 *   - Dimmer purple  → medium-confidence joints (0.3–0.6)
 *   - Orange / red   → form-issue joints (future: passed via highlightedJoints)
 */

import React, { useMemo } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Line, G } from 'react-native-svg';
import type { Pose, KeypointName } from '@/types';
import { Colors } from '@/constants/colors';

// ─── Skeleton connections ─────────────────────────────────────────────────────

/** Pairs of keypoint names that should be connected by a line */
const CONNECTIONS: [KeypointName, KeypointName][] = [
  // Head
  ['left_eye',      'nose'],
  ['right_eye',     'nose'],
  ['left_eye',      'left_ear'],
  ['right_eye',     'right_ear'],
  // Torso
  ['left_shoulder',  'right_shoulder'],
  ['left_shoulder',  'left_hip'],
  ['right_shoulder', 'right_hip'],
  ['left_hip',       'right_hip'],
  // Arms
  ['left_shoulder',  'left_elbow'],
  ['left_elbow',     'left_wrist'],
  ['right_shoulder', 'right_elbow'],
  ['right_elbow',    'right_wrist'],
  // Legs
  ['left_hip',       'left_knee'],
  ['left_knee',      'left_ankle'],
  ['right_hip',      'right_knee'],
  ['right_knee',     'right_ankle'],
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface PoseSkeletonProps {
  pose: Pose | null;
  viewWidth: number;
  viewHeight: number;
  /** Optional set of joint names to highlight in warning orange */
  highlightedJoints?: Set<KeypointName>;
  style?: ViewStyle;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PoseSkeleton({
  pose,
  viewWidth,
  viewHeight,
  highlightedJoints,
  style,
}: PoseSkeletonProps) {
  const keypointMap = useMemo(() => {
    if (!pose) return new Map<KeypointName, { x: number; y: number; score: number }>();
    const map = new Map<KeypointName, { x: number; y: number; score: number }>();
    for (const kp of pose.keypoints) {
      map.set(kp.name, {
        x: kp.x * viewWidth,
        y: kp.y * viewHeight,
        score: kp.score,
      });
    }
    return map;
  }, [pose, viewWidth, viewHeight]);

  if (!pose) return null;

  const MIN_SCORE = 0.3;

  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Svg width={viewWidth} height={viewHeight}>
        {/* ── Limb connections ───────────────────────────────────────────── */}
        <G>
          {CONNECTIONS.map(([nameA, nameB]) => {
            const a = keypointMap.get(nameA);
            const b = keypointMap.get(nameB);
            if (!a || !b) return null;
            if (a.score < MIN_SCORE || b.score < MIN_SCORE) return null;

            const isHighlighted =
              highlightedJoints?.has(nameA) || highlightedJoints?.has(nameB);
            const opacity = Math.min(a.score, b.score);

            return (
              <Line
                key={`${nameA}-${nameB}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={isHighlighted ? Colors.warning : Colors.primaryLight}
                strokeWidth={isHighlighted ? 3 : 2}
                strokeOpacity={opacity}
                strokeLinecap="round"
              />
            );
          })}
        </G>

        {/* ── Keypoint dots ──────────────────────────────────────────────── */}
        <G>
          {pose.keypoints.map((kp) => {
            if (kp.score < MIN_SCORE) return null;
            const x = kp.x * viewWidth;
            const y = kp.y * viewHeight;
            const isHighlighted = highlightedJoints?.has(kp.name);

            return (
              <Circle
                key={kp.name}
                cx={x}
                cy={y}
                r={isHighlighted ? 7 : 5}
                fill={
                  isHighlighted
                    ? Colors.warning
                    : kp.score >= 0.6
                    ? Colors.primary
                    : Colors.primaryLight
                }
                fillOpacity={kp.score}
                stroke={Colors.bg}
                strokeWidth={1}
              />
            );
          })}
        </G>
      </Svg>
    </View>
  );
}
