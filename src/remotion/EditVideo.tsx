import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig, OffthreadVideo, Audio} from 'remotion';

export type EditVideoProps = {
  videoUrl: string;
  lines: string[];
  /** Set by server from ffprobe; used by calculateMetadata in Root. */
  durationInFrames?: number;
  /** Optional: background music URL (e.g. MP3). */
  musicUrl?: string;
  /** Optional: voiceover audio URL. */
  voiceoverUrl?: string;
  /** Optional: logo image URL (shown top-right). */
  logoUrl?: string;
  /** Optional: brand color for caption text (e.g. #FF5500). */
  primaryColor?: string;
};

/**
 * Renders an existing video (e.g. from Seed Dance 2) with caption overlays.
 * Optional: music, voiceover, logo, brand color. All optional; omit and flow is unchanged.
 */
export const EditVideo: React.FC<EditVideoProps> = ({
  videoUrl,
  lines,
  musicUrl,
  voiceoverUrl,
  logoUrl,
  primaryColor,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const seconds = frame / fps;
  const index = Math.min(lines.length - 1, Math.floor(seconds / 3)); // 1 line per 3s
  const localFrame = frame % (3 * fps);
  const opacity = interpolate(localFrame, [0, fps], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const captionColor = primaryColor && /^#[0-9A-Fa-f]{3,8}$/.test(primaryColor) ? primaryColor : 'white';

  return (
    <>
      <OffthreadVideo
        src={videoUrl}
        style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover'}}
      />
      {musicUrl && <Audio src={musicUrl} volume={0.25} />}
      {voiceoverUrl && <Audio src={voiceoverUrl} volume={1} />}
      {logoUrl && (
        <div
          style={{
            position: 'absolute',
            top: 48,
            right: 48,
            width: 120,
            height: 120,
            objectFit: 'contain',
            zIndex: 2,
          }}
        >
          <img src={logoUrl} alt="" style={{width: '100%', height: '100%', objectFit: 'contain'}} />
        </div>
      )}
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
            color: captionColor,
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
