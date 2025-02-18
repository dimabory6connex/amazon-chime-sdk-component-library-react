// Copyright 2020-2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import routes from '../constants/routes';

export const BASE_URL = routes.HOME;

interface MeetingResponse {
  JoinInfo: {
    Attendee: any;
    Meeting: any;
  };
}

export async function getAllMeetings(): Promise<any> {
  const url = `${BASE_URL}meetings`;
  const response = await fetch(url, {
    method: 'GET',
    // body: JSON.stringify(body),
    headers: {
      'Content-type': 'application/json; charset=UTF-8',
      Accept: 'application/json',
    },
  });
  const result = await response.json();
  if (!response.ok) {
    return Promise.reject(result);
  }
  return result;
}

export async function fetchMeeting(
  meetingId: string,
  name: string,
  region: string
): Promise<MeetingResponse> {
  const response = await fetch(
    `${BASE_URL}join?title=${encodeURIComponent(
      meetingId
    )}&name=${encodeURIComponent(name)}${
      region ? `&region=${encodeURIComponent(region)}` : ''
    }`,
    {
      method: 'POST',
    }
  );
  const data = await response.json();

  if (data.error) {
    throw new Error(`Server error: ${data.error}`);
  }

  return data;
}

export function deleteMeeting(name: string): Promise<any> {
  return fetch(
    `${BASE_URL}meeting?name=${encodeURIComponent(name)}`,
    {
      method: 'DELETE',
    }
  );
}

export function createGetAttendeeCallback(meetingId: string) {
  return async (chimeAttendeeId: string, externalUserId?: string) => {
    const attendeeUrl = `${BASE_URL}attendee?title=${encodeURIComponent(
      meetingId
    )}&attendee=${encodeURIComponent(chimeAttendeeId)}`;
    const res = await fetch(attendeeUrl, {
      method: 'GET',
    });

    if (!res.ok) {
      throw new Error('Invalid server response');
    }

    const data = await res.json();

    return {
      name: data.AttendeeInfo.Name,
    };
  };
}

export async function endMeeting(meetingId: string) {
  const res = await fetch(
    `${BASE_URL}end?title=${encodeURIComponent(meetingId)}`,
    {
      method: 'POST',
    }
  );

  if (!res.ok) {
    throw new Error('Server error ending meeting');
  }
}
