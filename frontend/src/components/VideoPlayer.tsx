import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { Channel } from '../types';

interface VideoPlayerProps {
  channel: Channel;
}

function VideoPlayer({ channel }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    if (Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hls = new Hls({
        autoStartLoad: true,
        liveDurationInfinity: true,
      });

      hlsRef.current = hls;
      hls.loadSource(channel.url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, function(event, data) {
        const now = new Date().getTime();

        const fragments = data.levels[0].details?.fragments;
        if(!fragments || !fragments.length) {
          console.error("Could not parse manifest details or fragments are missing.");
          return;
        }
        const lastFragment = fragments[fragments.length - 1];
        if(!lastFragment.programDateTime) {
          console.warn("No programDateTime found in fragment. Can't sync video playback.");
          return;
        }
        const timeDiff = (now - lastFragment.programDateTime) / 1000;          
        
        hls.config.liveSyncDuration = 40 - timeDiff;
        //hls.startLoad(timeDiff);

        video.play();
      });

      hls.on(Hls.Events.FRAG_CHANGED, (event, data) => {

        const now = new Date().getTime();
        const newFrag = data.frag;

        if(!newFrag.programDateTime) return;
        const timeDiff = (now - newFrag.programDateTime) / 1000;
        const videoDiff = newFrag.end - video.currentTime;
        const delay = timeDiff + videoDiff;
        
        const targetDelay = 40;
        const tolerance = 1;
        const maxDeviation = 5;

        const deviation = delay - targetDelay;

        if (Math.abs(deviation) > maxDeviation) {
          video.currentTime += deviation;
          video.playbackRate = 1.0;
          console.warn("Significant deviation detected. Adjusting current time.");
        } else if (Math.abs(deviation) > tolerance) {
          const adjustmentFactor = 0.08;
          const speedAdjustment = 1 + adjustmentFactor * deviation;
          video.playbackRate = speedAdjustment;
        } else {
          video.playbackRate = 1.0;
        }
      });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [channel.url]);

  const handleVideoClick = (event: React.MouseEvent<HTMLVideoElement>) => {
    if (videoRef.current?.muted) {
      event.preventDefault();

      videoRef.current.muted = false;
      videoRef.current.play();
    }
  };

  return (
    <div className="relative bg-gray-800 rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        className="w-full aspect-video bg-black"
        muted
        autoPlay
        playsInline
        controls
        onClick={handleVideoClick}
      />
    </div>
  );
}

export default VideoPlayer;