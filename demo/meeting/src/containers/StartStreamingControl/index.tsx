// Copyright 2020-2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React, { ChangeEvent, useState } from 'react';
import {
  Camera,
  ControlBarButton,
  FormField,
  Input,
  Modal,
  ModalBody,
  ModalButton,
  ModalButtonGroup,
  ModalHeader
} from 'amazon-chime-sdk-component-library-react';
import { useAppState } from '../../providers/AppStateProvider';
import { startBroadcasting, stopBroadcasting } from '../../utils/api';
import Spinner from '../../components/Spinner';

const StartStreamingControl: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const toggleModal = (): void => setShowModal(!showModal);
  const { meetingId } = useAppState();
  const [rtmp, setRtmp] = useState('');
  const [streamKey, setStreamKey] = useState('');

  const [isLiveStreaming, setIsLiveStreaming] = useState(false);

  const initBroadcasting = () => {
    if (!rtmp.trim() && !streamKey.trim()) return;
    startBroadcasting(meetingId, rtmp.trim(), streamKey.trim()).then(() => {
      setRtmp('');
      setStreamKey('');
      setIsLiveStreaming(true);
    })
  }

  const stopStreaming = () => {
    stopBroadcasting().then(() => {
      setIsLiveStreaming(false);
    })
  }

  return (
    <>
      <ControlBarButton icon={!isLiveStreaming ? <Camera /> : <Spinner/>} onClick={!isLiveStreaming ? toggleModal : stopStreaming} label={!isLiveStreaming ? "Live Streaming" : "Stop streaming"} />
      {showModal && (
        <Modal size="md" onClose={toggleModal} rootId="modal-root">
          <ModalHeader title="Live Streaming" />
          <ModalBody>
            <FormField
              field={Input}
              label="URL"
              infoText="E.g.: rtmps://46a70d8058ee.global-contribute.live-video.net/app/"
              fieldProps={{
                name: 'rtmp',
                placeholder: 'Enter Ingest Endpoint',
              }}
             onChange={(e: ChangeEvent<HTMLInputElement>) => setRtmp(e.target.value)} value={rtmp}/>
            <FormField
              field={Input}
              label="Stream Key"
              infoText="E.g.: sk_us-east-1_sryZBxMc0tKA_JtrSBdQ0s0BQJ6PLRgl79MjsPmbI24"
              fieldProps={{
                name: 'streamKey',
                placeholder: 'Enter Stream Key',
              }}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setStreamKey(e.target.value)} value={streamKey}/>
          </ModalBody>
          <ModalButtonGroup
            primaryButtons={[
              <ModalButton
                onClick={initBroadcasting}
                variant="primary"
                label="Start broadcasting"
                disabled={!rtmp && !streamKey}
                closesModal
              />,
              <ModalButton variant="secondary" label="Cancel" closesModal />
            ]}
          />
        </Modal>
      )}
    </>
  );
};

export default StartStreamingControl;
