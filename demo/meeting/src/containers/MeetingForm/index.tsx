// Copyright 2020-2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React, {
  ChangeEvent,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useHistory } from 'react-router-dom';

import {
  Flex,
  FormField,
  Heading,
  Input,
  Modal,
  ModalBody,
  ModalHeader,
  PrimaryButton,
  SecondaryButton,
  useMeetingManager,
} from 'amazon-chime-sdk-component-library-react';

import styled from 'styled-components';
import { getErrorContext } from '../../providers/ErrorProvider';
import routes from '../../constants/routes';
import Card from '../../components/Card';
import Spinner from '../../components/Spinner';
import DevicePermissionPrompt from '../DevicePermissionPrompt';
import {
  createGetAttendeeCallback,
  deleteMeeting,
  fetchMeeting,
  getAllMeetings,
} from '../../utils/api';
import { useAppState } from '../../providers/AppStateProvider';

const RemoveMeetingLink = styled.a`
  color: #9e3319;
  text-decoration: none;
`;

const MeetingForm: React.FC = () => {
  const meetingManager = useMeetingManager();
  const {
    setAppMeetingInfo,
    region: appRegion,
    meetingId: appMeetingId,
  } = useAppState();
  const [meetingId, setMeetingId] = useState(appMeetingId);
  // const [_, setMeetingErr] = useState(false);
  const [name, setName] = useState('');
  const [nameErr, setNameErr] = useState(false);
  const [region] = useState(appRegion);
  const [isLoading, setIsLoading] = useState(false);
  const { errorMessage, updateErrorMessage } = useContext(getErrorContext());
  const history = useHistory();
  // new features
  const [meetings, setMeetings] = useState<Array<any>>([]);
  const getMeetings = useCallback(async () => {
    const data = await getAllMeetings();
    // eslint-disable-next-line no-shadow
    const meetings = [];
    // eslint-disable-next-line no-shadow,guard-for-in,no-restricted-syntax
    for (const meetingId in data) {
      const meeting = {
        name: meetingId,
        meetingInfo: data[meetingId],
      };
      meetings.push(meeting);
    }
    console.error('Data:', meetings);
    setMeetings(meetings);
  }, []);
  const [newMeetingId, setNewMeetingId] = useState('');
  const [newMeetingErr, setNewMeetingErr] = useState(false);

  // todo use queryHook
  useEffect(() => {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const meeting = urlParams.get('meeting') || '';
    setMeetingId(meeting);
    getMeetings();
  }, [getMeetings]);

  const copy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(
      function() {
        console.log('Async: Copying to clipboard was successful!');
      },
      function(err) {
        console.error('Async: Could not copy text: ', err);
      }
    );
  }, []);

  const handleRemoveMeeting = useCallback(
    async (index: any) => {
      setIsLoading(true);
      try {
        await deleteMeeting(meetings[index].name);
        await getMeetings();
      } catch (error) {
        updateErrorMessage(error.message);
      } finally {
        setIsLoading(false);
      }
    },
    [getMeetings, meetings, updateErrorMessage]
  );

  const handleJoinToSelectedMeeting = useCallback(async (item: any) => {
    setMeetingId(item.name);
  }, []);

  const handleCreateNewMeeting = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const id = newMeetingId.trim().toLocaleLowerCase();

      if (!id) {
        setNewMeetingErr(true);
        return;
      }

      setIsLoading(true);
      try {
        await fetchMeeting(id, '', region);
        await getMeetings();
      } catch (error) {
        updateErrorMessage(error.message);
      } finally {
        setIsLoading(false);
        setNewMeetingId('');
        // setNewRegion(appRegion)
      }
    },
    [getMeetings, newMeetingId, region, updateErrorMessage]
  );

  const handleJoinMeeting = async (e: React.FormEvent) => {
    e.preventDefault();

    const id = meetingId.trim().toLocaleLowerCase();
    const attendeeName = name.trim();

    if (!id || !attendeeName) {
      if (!attendeeName) {
        setNameErr(true);
      }

      // if (!id) {
      //   setMeetingErr(true);
      // }

      return;
    }

    setIsLoading(true);
    meetingManager.getAttendee = createGetAttendeeCallback(id);

    try {
      const { JoinInfo } = await fetchMeeting(id, attendeeName, region);

      await meetingManager.join({
        meetingInfo: JoinInfo.Meeting,
        attendeeInfo: JoinInfo.Attendee,
      });

      setAppMeetingInfo(id, attendeeName, region);
      history.push(routes.DEVICE);
    } catch (error) {
      updateErrorMessage(error.message);
    }
  };

  const closeError = (): void => {
    updateErrorMessage('');
    setMeetingId('');
    setName('');
    setIsLoading(false);
  };
  return (
    <>
      {!meetingId && (
        <>
          <form>
            <Heading tag="h3" level={4} css="margin-bottom: 1rem">
              New meeting
            </Heading>

            <FormField
              field={Input}
              label="New Meeting Id"
              value={newMeetingId}
              infoText="Anyone with access to the meeting ID can join"
              fieldProps={{
                name: 'newMeetingId',
                placeholder: 'Enter Meeting Id',
              }}
              errorText="Please enter a valid meeting ID"
              error={newMeetingErr}
              onChange={(e: ChangeEvent<HTMLInputElement>): void => {
                setNewMeetingId(e.target.value);
                if (newMeetingErr) {
                  setNewMeetingErr(false);
                }
              }}
            />

            <Flex
              container
              layout="fill-space-centered"
              style={{ marginTop: '2.5rem' }}
            >
              {isLoading ? (
                <Spinner />
              ) : (
                <PrimaryButton
                  label="Create new"
                  onClick={handleCreateNewMeeting}
                />
              )}
            </Flex>
          </form>
          <Flex>
            <Heading tag="h3" level={4} css="margin-bottom: 1rem">
              All meetings
            </Heading>
            {meetings.length < 1 ? (
              <p>
                <em>No meetings created yet.</em>
              </p>
            ) : (
              meetings.map((item: any, index: any) => {
                const { name } = item;
                return (
                  <Flex
                    key={`${name}-${index}`}
                    container
                    justifyContent="space-between"
                    alignItems="baseline"
                  >
                    <div>
                      <RemoveMeetingLink
                        href=""
                        title="Remove meeting"
                        onClick={e => {
                          e.preventDefault();
                          handleRemoveMeeting(index);
                        }}
                      >
                        &#10006;
                      </RemoveMeetingLink>
                      &nbsp;{name}
                    </div>
                    <div>
                      <PrimaryButton
                        label="Join"
                        onClick={e => {
                          e.preventDefault();
                          handleJoinToSelectedMeeting(item);
                        }}
                      />
                      &nbsp;
                      <SecondaryButton
                        label="Copy 🔗"
                        onClick={e => {
                          e.preventDefault();
                          const link = `${window.location.protocol}//${window.location.hostname}:${window.location.port}?meeting=${name}`;
                          copy(link);
                        }}
                      />
                    </div>
                  </Flex>
                );
              })
            )}
          </Flex>
          <hr />
        </>
      )}

      {meetingId && (
        <form>
          <Heading tag="h1" level={4} css="margin-bottom: 1rem">
            Join a meeting "{meetingId}"
          </Heading>
          <FormField
            field={Input}
            label="Name"
            value={name}
            fieldProps={{
              name: 'name',
              placeholder: 'Enter Your Name',
            }}
            errorText="Please enter a valid name"
            error={nameErr}
            onChange={(e: ChangeEvent<HTMLInputElement>): void => {
              setName(e.target.value);
              if (nameErr) {
                setNameErr(false);
              }
            }}
          />
          <Flex
            container
            layout="fill-space-centered"
            style={{ marginTop: '2.5rem' }}
          >
            {isLoading ? (
              <Spinner />
            ) : (
              <PrimaryButton label="Continue" onClick={handleJoinMeeting} />
            )}
          </Flex>
          {errorMessage && (
            <Modal size="md" onClose={closeError}>
              <ModalHeader title={`Meeting ID: ${meetingId}`} />
              <ModalBody>
                <Card
                  title="Unable to join meeting"
                  description="There was an issue finding that meeting. The meeting may have already ended, or your authorization may have expired."
                  smallText={errorMessage}
                />
              </ModalBody>
            </Modal>
          )}
          <DevicePermissionPrompt />
        </form>
      )}
    </>
  );
};

export default MeetingForm;
