import React from 'react';
import {Composition} from 'remotion';
import {SimpleVideo} from './SimpleVideo';
import {EditVideo, type EditVideoProps} from './EditVideo';

const FPS = 30;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="SimpleVideo"
        component={SimpleVideo}
        durationInFrames={10 * FPS}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{lines: ['Placeholder']}}
      />
      <Composition<EditVideoProps>
        id="EditVideo"
        component={EditVideo}
        durationInFrames={60 * FPS}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{
          videoUrl: '',
          lines: ['Placeholder'],
          durationInFrames: 60 * FPS,
        }}
        calculateMetadata={({props}) => ({
          durationInFrames:
            typeof props.durationInFrames === 'number' && props.durationInFrames > 0
              ? props.durationInFrames
              : 60 * FPS,
        })}
      />
    </>
  );
};

