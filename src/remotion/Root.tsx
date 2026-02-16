import React from 'react';
import {Composition} from 'remotion';
import {SimpleVideo} from './SimpleVideo';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="SimpleVideo"
      component={SimpleVideo}
      durationInFrames={10 * 30} // 10 seconds at 30 fps
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{lines: ['Placeholder']}}
    />
  );
};

