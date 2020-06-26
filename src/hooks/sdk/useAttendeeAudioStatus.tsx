import { useState, useEffect } from 'react';

import { useAudioVideo } from '../../providers/AudioVideoProvider';

export function useAttendeeAudioStatus(attendeeId: string) {
  const audioVideo = useAudioVideo();
  const [muted, setMuted] = useState(false);
  const [signalStrength, setSignalStrength] = useState(0);

  useEffect(() => {
    if (!audioVideo) {
      return;
    }

    const callback = (
      _: string,
      __: number | null,
      muted: boolean | null,
      signalStrength: number | null
    ): void => {
      if (muted !== null) {
        setMuted(muted);
      }
      if (signalStrength !== null) {
        setSignalStrength(Math.round(signalStrength * 100));
      }
    };

    audioVideo.realtimeSubscribeToVolumeIndicator(attendeeId, callback);

    return () => audioVideo.realtimeUnsubscribeFromVolumeIndicator(attendeeId);
  }, [audioVideo, attendeeId]);

  return {
    muted,
    signalStrength
  };
}

export default useAttendeeAudioStatus;