/**
 * poseDetection.ts
 *
 * Wraps TensorFlow.js + MoveNet (Lightning) for real-time pose detection.
 *
 * Architecture:
 *   1. Call `initPoseDetector()` once when the camera session mounts.
 *   2. Pass base64 JPEG frames from expo-camera to `detectPose()`.
 *   3. Receive an array of 17 Keypoints back, ready for rep counting & form analysis.
 *
 * Model choice: MoveNet Lightning — ~3 MB, runs ~50 ms / frame on mid-range phones.
 * Swap to 'Thunder' for higher accuracy at the cost of ~120 ms / frame.
 */

import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import * as poseDetection from '@tensorflow-models/pose-detection';
import { decodeJpeg } from '@tensorflow/tfjs-react-native';
import type { Keypoint, Pose, KeypointName } from '@/types';

// ─── Internal state ───────────────────────────────────────────────────────────

let detector: poseDetection.PoseDetector | null = null;
let isReady = false;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise TF backend and load the MoveNet Lightning model.
 * Must be called before `detectPose`. Safe to call multiple times — subsequent
 * calls are no-ops if the detector is already loaded.
 */
export async function initPoseDetector(): Promise<void> {
  if (isReady) return;

  try {
    // Wait for the TF React Native backend to be ready
    await tf.ready();

    detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        enableSmoothing: true, // temporal smoothing across frames
      }
    );

    isReady = true;
    console.log('[PoseDetection] MoveNet Lightning ready');
  } catch (err) {
    console.error('[PoseDetection] Failed to initialise detector:', err);
    throw err;
  }
}

/**
 * Run pose inference on a single JPEG frame.
 *
 * @param base64Jpeg  Raw base64-encoded JPEG string from expo-camera
 * @param frameWidth  Width of the captured frame in pixels
 * @param frameHeight Height of the captured frame in pixels
 * @returns           Detected pose, or null if confidence is too low / error
 */
export async function detectPose(
  base64Jpeg: string,
  frameWidth: number,
  frameHeight: number
): Promise<Pose | null> {
  if (!detector || !isReady) return null;

  let imageTensor: tf.Tensor3D | null = null;

  try {
    // Decode JPEG → Uint8Array → tensor
    const raw = Buffer.from(base64Jpeg, 'base64');
    imageTensor = decodeJpeg(raw) as tf.Tensor3D;

    const poses = await detector.estimatePoses(imageTensor, {
      maxPoses: 1,
      flipHorizontal: false,
    });

    if (!poses.length) return null;

    const raw_pose = poses[0];
    const poseScore = raw_pose.score ?? 0;

    // Discard low-confidence detections
    if (poseScore < 0.2) return null;

    // Normalise keypoint coordinates to [0, 1] range
    const keypoints: Keypoint[] = raw_pose.keypoints.map((kp) => ({
      name: kp.name as KeypointName,
      x: kp.x / frameWidth,
      y: kp.y / frameHeight,
      score: kp.score ?? 0,
    }));

    return { keypoints, score: poseScore };
  } catch (err) {
    console.warn('[PoseDetection] Inference error:', err);
    return null;
  } finally {
    imageTensor?.dispose();
  }
}

/**
 * Release model resources. Call when leaving the camera session.
 */
export function disposePoseDetector(): void {
  detector?.dispose();
  detector = null;
  isReady = false;
}

/**
 * Whether the model is loaded and ready for inference.
 */
export function isPoseDetectorReady(): boolean {
  return isReady;
}

// ─── Geometry helpers (exported for use in repCounter / formAnalyzer) ─────────

/**
 * Return the angle (in degrees) at vertex B in the triangle A–B–C.
 * All inputs are normalised [0,1] coordinates.
 */
export function angleBetween(
  A: { x: number; y: number },
  B: { x: number; y: number },
  C: { x: number; y: number }
): number {
  const BAx = A.x - B.x;
  const BAy = A.y - B.y;
  const BCx = C.x - B.x;
  const BCy = C.y - B.y;

  const dot = BAx * BCx + BAy * BCy;
  const magBA = Math.sqrt(BAx ** 2 + BAy ** 2);
  const magBC = Math.sqrt(BCx ** 2 + BCy ** 2);

  if (magBA === 0 || magBC === 0) return 0;

  const cosAngle = Math.max(-1, Math.min(1, dot / (magBA * magBC)));
  return (Math.acos(cosAngle) * 180) / Math.PI;
}

/**
 * Look up a single keypoint by name from a Pose, returning null if its
 * confidence score is below the given threshold.
 */
export function getKeypoint(
  pose: Pose,
  name: KeypointName,
  minScore = 0.3
): { x: number; y: number } | null {
  const kp = pose.keypoints.find((k) => k.name === name);
  if (!kp || kp.score < minScore) return null;
  return { x: kp.x, y: kp.y };
}
