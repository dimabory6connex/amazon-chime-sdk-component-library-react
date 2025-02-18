// Copyright 2020-2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';

import MeetingFormSelector from '../../containers/MeetingFormSelector';
import { StyledLayout } from './Styled';
// import { VersionLabel } from '../../utils/VersionLabel';

const Home = () => (
  <>
    <StyledLayout>
      <MeetingFormSelector />
    </StyledLayout>
  </>
);

export default Home;
