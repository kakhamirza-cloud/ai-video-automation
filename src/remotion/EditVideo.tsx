import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {OffthreadVideo} from 'remotion';

export type EditVideoProps = {
  videoUrl: string;
  lines: string[];
  /** Set by server from ffprobe; used by calculateMetadata in Root. */
  durationInFrames?: number;
};

/**
 * Renders an existing video (e.g. from Seed Dance 2) with caption overlays.
 * Used by POST /render-edit: upload Seed Dance video → add captions → save to Cloudinary.
 */
export const EditVideo: React.FC<EditVideoProps> = ({
  videoUrl,
  lines,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const seconds = frame / fps;
  const index = Math.min(lines.length - 1, Math.floor(seconds / 3)); // 1 line per 3s
  const localFrame = frame % (3 * fps);
  const opacity = interpolate(localFrame, [0, fps], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <>
      <OffthreadVideo
        src={videoUrl}
        style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover'}}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          justifyContent: 'center',
          alignItems: 'center',
          display: 'flex',
          padding: '0 80px',
        }}
      >
        <div
          style={{
            opacity,
            color: 'white',
            fontSize: 60,
            fontFamily: 'system-ui, sans-serif',
            textAlign: 'center',
            textShadow: '0 2px 8px rgba(0,0,0,0.8)',
          }}
        >
          {lines[index] ?? ''}
        </div>
      </div>
    </>
  );
};
