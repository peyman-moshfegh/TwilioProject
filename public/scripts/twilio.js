const ws = new WebSocket(location.origin.replace("http", "ws"));

// ws.onopen = () => {
//   ws.send("hello");
// };

ws.onmessage = async (event) => {
  const message = await event.data.text();
  console.log(message);
};

const form = document.getElementById("room-name-form");
const roomNameInput = document.getElementById("room-name-input");
const container = document.getElementById("video-container");

const startRoom = async (event) => {
  // prevent a page reload when a user submits the form
  event.preventDefault();
  // hide the join form
  form.style.visibility = "hidden";
  // retrieve the room name
  const roomName = roomNameInput.value;

  // fetch an Access Token from the join-room route
  const response = await fetch("/join-room", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ roomName: roomName }),
  });
  const { token } = await response.json();

  // join the video room with the token
  const room = await joinVideoRoom(roomName, token);

  // render the local and remote participants' video and audio tracks
  handleConnectedParticipant(room.localParticipant);
  room.participants.forEach(handleConnectedParticipant);
  room.on("participantConnected", handleConnectedParticipant);

  // handle cleanup when a participant disconnects
  room.on("participantDisconnected", handleDisconnectedParticipant);
  window.addEventListener("pagehide", () => room.disconnect());
  window.addEventListener("beforeunload", () => room.disconnect());
};

const handleConnectedParticipant = (participant) => {
  // create a div for this participant's tracks
  const participantDiv = document.createElement("div");
  participantDiv.setAttribute("id", participant.identity);
  container.appendChild(participantDiv);

  // iterate through the participant's published tracks and
  // call `handleTrackPublication` on them
  participant.tracks.forEach((trackPublication) => {
    handleTrackPublication(trackPublication, participant);
  });

  // listen for any new track publications
  participant.on("trackPublished", handleTrackPublication);
};

const handleTrackPublication = (trackPublication, participant) => {
  function displayTrack(track) {
    // append this track to the participant's div and render it on the page
    const participantDiv = document.getElementById(participant.identity);
    // track.attach creates an HTMLVideoElement or HTMLAudioElement
    // (depending on the type of track) and adds the video or audio stream
    participantDiv.append(track.attach());
  }

  // check if the trackPublication contains a `track` attribute. If it does,
  // we are subscribed to this track. If not, we are not subscribed.
  if (trackPublication.track) {
    displayTrack(trackPublication.track);
  }

  // listen for any new subscriptions to this track publication
  trackPublication.on("subscribed", displayTrack);
};

const handleDisconnectedParticipant = (participant) => {
  // stop listening for this participant
  participant.removeAllListeners();
  // remove this participant's div from the page
  const participantDiv = document.getElementById(participant.identity);
  participantDiv.remove();
};

const printNetworkQualityStats = (networkQualityLevel, networkQualityStats) => {
  // Print in console the networkQualityLevel using bars
  console.log(
    {
      1: "▃",
      2: "▃▄",
      3: "▃▄▅",
      4: "▃▄▅▆",
      5: "▃▄▅▆▇",
    }[networkQualityLevel] || ""
  );

  if (networkQualityStats) {
    // Print in console the networkQualityStats, which is non-null only if Network Quality
    // verbosity is 2 (moderate) or greater
    console.log("Network Quality statistics:", networkQualityStats);
  }
};

const joinVideoRoom = async (roomName, token) => {
  // join the video room with the Access Token and the given room name
  const room = await Twilio.Video.connect(token, {
    room: roomName,
    //video: false,
    audio: { name: "microphone" },
    video: { name: "camera" },

    //audio: true,
    //video: { name: "camera", height: 360, frameRate: 4, width: 640 },

    //preferredAudioCodecs: ["Opus"],

    //maxAudioBitrate: 100,
    //maxVideoBitrate: 10000,

    networkQuality: {
      local: 3, // LocalParticipant's Network Quality verbosity [1 - 3]
      remote: 3, // RemoteParticipants' Network Quality verbosity [0 - 3]
    },
  });

  console.log(room);

  // Print the initial Network Quality Level and statistics
  printNetworkQualityStats(
    room.localParticipant.networkQualityLevel,
    room.localParticipant.networkQualityStats
  );

  // Print changes to Network Quality Level and statistics
  room.localParticipant.on(
    "networkQualityLevelChanged",
    printNetworkQualityStats
  );

  return room;
};

// const joinVideoRoom = async (roomName, token) => {
//   // join the video room with the Access Token and the given room name
//   const room = await Twilio.Video.connect(token, {
//     room: roomName,
//     //video: false,
//   });
//   return room;
// };

form.addEventListener("submit", startRoom);
