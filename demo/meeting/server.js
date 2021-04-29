// Copyright 2020-2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable */
const compression = require('compression');
const fs = require('fs');
const url = require('url');
const uuid = require('uuid/v4');
const AWS = require('aws-sdk');
const { spawn, exec } = require('child_process');
/* eslint-enable */

const hostname = '127.0.0.1';
const port = 8080;
const protocol = 'http';
const options = {};

const chime = new AWS.Chime({ region: 'us-east-1' });
const alternateEndpoint = process.env.ENDPOINT;
if (alternateEndpoint) {
  console.log(`Using endpoint: ${alternateEndpoint}`);
  chime.createMeeting({ ClientRequestToken: uuid() }, () => {});
  AWS.NodeHttpClient.sslAgent.options.rejectUnauthorized = false;
  chime.endpoint = new AWS.Endpoint(alternateEndpoint);
} else {
  chime.endpoint = new AWS.Endpoint(
    'https://service.chime.aws.amazon.com/console'
  );
}

const meetingCache = {};
const attendeeCache = {};

const log = message => {
  console.log(`${new Date().toISOString()} ${message}`);
};

const app = process.env.npm_config_app || 'meeting';

const server = require(protocol).createServer(
  options,
  async (request, response) => {
    log(`${request.method} ${request.url} BEGIN`);
    compression({})(request, response, () => {});
    try {
      if (
        request.method === 'GET' &&
        (request.url === '/' ||
          request.url === '/v2/' ||
          request.url.startsWith('/?'))
      ) {
        response.statusCode = 200;
        response.setHeader('Content-Type', 'text/html');
        response.end(fs.readFileSync(`dist/${app}.html`));
      } else if (
        request.method === 'POST' &&
        request.url.startsWith('/join?')
      ) {
        const { query } = url.parse(request.url, true);
        const { title } = query;
        const { name } = query;
        const region = query.region || 'us-east-1';

        if (!meetingCache[title]) {
          meetingCache[title] = await chime
            .createMeeting({
              ClientRequestToken: uuid(),
              MediaRegion: region,
            })
            .promise();

          meetingCache[title].PlaybackURL = query.playbackURL;

          attendeeCache[title] = {};
        }
        const joinInfo = {
          JoinInfo: {
            Title: title,
            Meeting: meetingCache[title].Meeting,
            PlaybackURL: meetingCache[title].PlaybackURL,
            Attendee: (
              await chime
                .createAttendee({
                  MeetingId: meetingCache[title].Meeting.MeetingId,
                  ExternalUserId: uuid(),
                })
                .promise()
            ).Attendee,
          },
        };
        name &&
          (attendeeCache[title][joinInfo.JoinInfo.Attendee.AttendeeId] = name);
        response.statusCode = 201;
        response.setHeader('Content-Type', 'application/json');
        response.write(JSON.stringify(joinInfo), 'utf8');
        response.end();
        log(JSON.stringify(joinInfo, null, 2));
      } else if (
        request.method === 'GET' &&
        request.url.startsWith('/attendee?')
      ) {
        const { query } = url.parse(request.url, true);
        const attendeeInfo = {
          AttendeeInfo: {
            AttendeeId: query.attendee,
            Name: attendeeCache[query.title][query.attendee],
          },
        };
        response.statusCode = 200;
        response.setHeader('Content-Type', 'application/json');
        response.write(JSON.stringify(attendeeInfo), 'utf8');
        response.end();
        log(JSON.stringify(attendeeInfo, null, 2));
      } else if (
        request.method === 'POST' &&
        request.url.startsWith('/meeting?')
      ) {
        const { query } = url.parse(request.url, true);
        const { title } = query;
        if (!meetingCache[title]) {
          meetingCache[title] = await chime
            .createMeeting({
              ClientRequestToken: uuid(),
              // NotificationsConfiguration: {
              //   SqsQueueArn: 'Paste your arn here',
              //   SnsTopicArn: 'Paste your arn here'
              // }
            })
            .promise();
          attendeeCache[title] = {};
        }
        const joinInfo = {
          JoinInfo: {
            Title: title,
            Meeting: meetingCache[title].Meeting,
          },
        };
        response.statusCode = 201;
        response.setHeader('Content-Type', 'application/json');
        response.write(JSON.stringify(joinInfo), 'utf8');
        response.end();
        log(JSON.stringify(joinInfo, null, 2));
      } else if (request.method === 'POST' && request.url.startsWith('/end?')) {
        const { query } = url.parse(request.url, true);
        const { title } = query;
        await chime
          .deleteMeeting({
            MeetingId: meetingCache[title].Meeting.MeetingId,
          })
          .promise();
        response.statusCode = 200;
        response.end();
      } else if (
        request.method === 'GET' &&
        request.url.startsWith('/meetings')
      ) {
        response.statusCode = 200;
        response.setHeader('Content-Type', 'application/json');
        response.write(JSON.stringify(meetingCache), 'utf8');
        response.end();
      } else if (
        request.method === 'DELETE' &&
        request.url.startsWith('/meeting?')
      ) {
        const { query } = url.parse(request.url, true);
        const title = query.name;
        await chime
          .deleteMeeting({
            MeetingId: meetingCache[title].Meeting.MeetingId,
          })
          .promise();

        delete meetingCache[title];

        response.statusCode = 200;
        response.end();
      } else if (
        request.method === 'POST' &&
        request.url.startsWith('/broadcasting?')
      ) {
        const { query } = url.parse(request.url, true);

        const dockerContainerName = 'bcast';
        const dockerContainerLabel = 'meetingbcast:latest';

        if (query.stop !== undefined) {
          exec(`docker kill ${dockerContainerName}`);
        } else {
          const { meetingId, rtmp, streamKey } = query;

          console.log(
            'MEETING_URL',
            `${protocol}://${hostname}:${port}/?broadcast=1&meetingId=${meetingId}`
          );
          console.log('RTMP_URL', `${rtmp}${streamKey}`);

          const docker = spawn('docker', [
            'run',
            '--rm',
            '--network=host',
            '--shm-size=2g',
            '--env',
            `MEETING_URL=${protocol}://${hostname}:${port}/?broadcast=1&meetingId=${meetingId}`,
            '--env',
            `RTMP_URL=${rtmp}${streamKey}`,
            `--name=${dockerContainerName}`,
            dockerContainerLabel,
          ]);

          docker.stdout.on('data', data => {
            console.log(`stdout: ${data}`);
          });

          docker.stderr.on('data', data => {
            console.error(`stderr: ${data}`);
          });

          docker.on('close', code => {
            console.log(`child process exited with code ${code}`);
          });
        }

        response.statusCode = 202;
        response.end();
      } else if (request.method === 'POST' && request.url.startsWith('/logs')) {
        console.log('Writing logs to cloudwatch');
        response.end('Writing logs to cloudwatch');
      } else {
        response.statusCode = 404;
        response.setHeader('Content-Type', 'text/plain');
        response.end('404 Not Found');
      }
    } catch (err) {
      log(`server caught error: ${err}`);
      response.statusCode = 403;
      response.setHeader('Content-Type', 'application/json');
      response.write(JSON.stringify({ error: err.message }), 'utf8');
      response.end();
    }
    log(`${request.method} ${request.url} END`);
  }
);

server.listen(port, hostname, () => {
  log(`server running at ${protocol}://${hostname}:${port}/`);
});
