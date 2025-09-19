import { CallClient } from "@azure/communication-calling";
import { Features } from "@azure/communication-calling";
import { AzureCommunicationTokenCredential } from '@azure/communication-common';
import { CommunicationIdentityClient } from "@azure/communication-identity";


let call;
let callAgent;

//environment variables
const userAccess = 'process.env.USER_ACCESS_TOKEN';
const identity = new CommunicationIdentityClient('azure-connection-string');

// Least-privilege: join-only calling
const { user, token } = await identity.createUserAndToken(["voip.join"]);

//document elements
const meetingLinkInput = document.getElementById('teams-link-input');
const meetingIdInput = document.getElementById('teams-meetingId-input');
const meetingPasscodeInput = document.getElementById('teams-passcode-input');
const hangUpButton = document.getElementById('hang-up-button');
const teamsMeetingJoinButton = document.getElementById('join-meeting-button');
const callStateElement = document.getElementById('call-state');
const recordingStateElement = document.getElementById('recording-state');

async function init() {
    const callClient = new CallClient();
    const tokenCredential = new AzureCommunicationTokenCredential(token);
    callAgent = await callClient.createCallAgent(tokenCredential, {displayName: user.displayName});
    teamsMeetingJoinButton.disabled = false;
}
init();

hangUpButton.addEventListener("click", async () => {
    // end the current call
    await call.hangUp();
  
    // toggle button states
    hangUpButton.disabled = true;
    teamsMeetingJoinButton.disabled = false;
    callStateElement.innerText = '-';
  });

teamsMeetingJoinButton.addEventListener("click", () => {    
    // join with meeting link
    call = callAgent.join({meetingLink: meetingLinkInput.value}, {});

   //(or) to join with meetingId and passcode use the below code snippet.
   //call = callAgent.join({meetingId: meetingIdInput.value, passcode: meetingPasscodeInput.value}, {});
    
    call.on('stateChanged', () => {
        callStateElement.innerText = call.state;
    })

    call.api(Features.Recording).on('isRecordingActiveChanged', () => {
        if (call.api(Features.Recording).isRecordingActive) {
            recordingStateElement.innerText = "This call is being recorded";
        }
        else {
            recordingStateElement.innerText = "";
        }
    });
    // toggle button states
    hangUpButton.disabled = false;
    teamsMeetingJoinButton.disabled = true;
});