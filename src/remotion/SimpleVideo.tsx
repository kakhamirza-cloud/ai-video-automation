import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';

type SimpleVideoProps = {
  lines: string[];
};

export const SimpleVideo: React.FC<SimpleVideoProps> = ({lines}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const seconds = frame / fps;
  const index = Math.min(lines.length - 1, Math.floor(seconds / 3)); // 1 line per 3s

  const localFrame = frame % (3 * fps);
  const opacity = interpolate(localFrame, [0, fps], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: '#020617',
        color: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        display: 'flex',
        fontSize: 60,
        fontFamily: 'system-ui, sans-serif',
        textAlign: 'center',
        padding: '0 80px',
      }}
    >
      <div style={{opacity}}>{lines[index]}</div>
    </div>
  );
};

