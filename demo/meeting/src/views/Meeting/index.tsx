// Copyright 2020-2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import {
  useAudioVideo,
  UserActivityProvider,
  VideoTileGrid,
} from 'amazon-chime-sdk-component-library-react';

import { StyledContent, StyledLayout } from './Styled';
import NavigationControl from '../../containers/Navigation/NavigationControl';
import { useNavigation } from '../../providers/NavigationProvider';
import MeetingDetails from '../../containers/MeetingDetails';
import MeetingControls from '../../containers/MeetingControls';
import useMeetingEndRedirect from '../../hooks/useMeetingEndRedirect';
import MeetingMetrics from '../../containers/MeetingMetrics';

const MeetingView = () => {
  useMeetingEndRedirect();
  const { showNavbar, showRoster } = useNavigation();
  const audioVideo = useAudioVideo();

  const urlParams = new URLSearchParams(window.location.search);
  const broadcastOn = urlParams.get('broadcast') === '1';

  React.useEffect(() => {
    if (broadcastOn) {
      audioVideo?.realtimeMuteLocalAudio();
    }
  }, [urlParams, audioVideo, broadcastOn]);

  return (
    <UserActivityProvider>
      {broadcastOn ? (
        <StyledLayout showNav={false} showRoster={false}>
          <StyledContent>
            <VideoTileGrid
              className="videos"
              noRemoteVideoView={<MeetingDetails />}
            />
          </StyledContent>
        </StyledLayout>
      ) : (
        <StyledLayout showNav={showNavbar} showRoster={showRoster}>
          <StyledContent>
            <MeetingMetrics />
            <VideoTileGrid
              className="videos"
              noRemoteVideoView={<MeetingDetails />}
            />
            <MeetingControls />
          </StyledContent>
          <NavigationControl />
        </StyledLayout>
      )}
    </UserActivityProvider>
  );
};

export default MeetingView;
