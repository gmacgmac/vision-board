// Words: http. The refusals every call can meet: the path, method, body, caller and origin.
// Keys: board.http.<name>. Plain code: no imports but other words files and types.

// ---- app.ts
export const thePageAnswersGETOnly = 'The page answers GET only.';
export const thereIsNoSuchPage = 'There is no such page. Open / for the board.';

// ---- body.ts
export const theBodyIsOverThe = (sizeWords: string): string => `The body is over the ${sizeWords} limit. Split the items across several calls.`;
export const sendTheBodyAsApplication = 'Send the body as application/json (charset utf-8 if you name one).';
export const theBodyIsNotValid = 'The body is not valid JSON. Send one JSON object.';

// ---- caller-folder.ts
export const projectHeaderMustBeAbsolute = 'The VB-Project header must be the absolute path of the folder you work in, percent-encoded the way encodeURI does it (`/Users/example/my%20project`).';
export const thisBoardNowHasYour = (displayName: string, displayName2: string): string => `This board now has your folder open (${displayName}). Your secret is from ${displayName2} — call join again.`;

// ---- callers.ts
export const onlyAnAgentCanDo = 'Only an agent can do this, with the secret join gave it. The person acts on the board itself.';
export const thisNeedsYourAgentSecret = 'This needs your agent secret, sent as Authorization: Bearer <secret>. If you have none, call join, then request_grant for each container you need.';
export const theServerDoesNotKnow = 'The server does not know this secret. Call join again, then request_grant for each container you need; the person must approve again.';
export const onlyAChatSessionS = 'Only a chat session\'s gate hook calls this, with its run token. The person answers approvals on the board.';
export const thisNeedsTheChatSession = 'This needs the chat session\'s run token, sent as Authorization: Bearer <token>.';
export const theBoardPageHasAn = 'The board page has an old session (the board restarted): reload the page. An agent sends its secret from join instead.';

// ---- dispatch.ts
export const noOperationHasThisPath = 'No operation has this path. The operations are in openapi.json; start with list_boards (GET /api/boards).';
export const thisPathAnswersOnly = (allow: string): string => `This path answers ${allow} only.`;

// ---- engine.ts
export const theChipNamesNothingOn = 'The chip names nothing on the board.';

// ---- operations.ts
export const theInThePath = (PATH_WORDS: string): string => `The ${PATH_WORDS} in the path`;
export const theQueryParameter = (name: string): string => `The query parameter \`${name}\``;
export const theInThePathIs = (PATH_WORDS: string): string => `The ${PATH_WORDS} in the path is not valid percent-encoding.`;
export const itTakesNoQueryParameters = 'It takes no query parameters.';
export const unknownQueryParameter = (name: string, takes: string): string => `Unknown query parameter \`${name}\`. ${takes}`;
export const theQueryParameterIsGiven = (name: string): string => `The query parameter \`${name}\` is given more than once; give it once.`;
export const onlyThePersonCanDo = 'Only the person can do this, on the board; send a propose or reply item instead.';
export const onlyAnAgentCanDoThis = 'Only an agent can do this. The person acts on the board itself.';
export const thisNeedsAnAgentThe = 'This needs an agent: the host passes the agent that is calling.';

// ---- guard.ts
export const thisServerAnswersOnlyOn = 'This server answers only on 127.0.0.1 or localhost, at its own port.';
export const writesAreAcceptedOnlyFrom = 'Writes are accepted only from the board page on this server.';

// ---- handlers.ts
export const noOperationHasThisPath2 = 'No operation has this path.';

// ---- images.ts
export const getAndHeadOnly = 'GET and HEAD only.';

// ---- problem.ts
export const somethingWentWrongOnThe = 'Something went wrong on the server. Try again; if it keeps failing, tell the person.';


// ---- caller-folder.ts
export const theBoardHasSwitchedTo = (displayName: string, displayName2: string): string => `The board has switched to ${displayName}. Your work is in ${displayName2}. Ask the person to open it again; don't join here.`;

// ---- engine.ts
export const theBoardHasNo = (kind: string): string => `The board has no ${kind}.`;

// ---- operations.ts
export const itTakes = (map: string): string => `It takes: ${map}.`;

// ---- tools.ts
export const theInputDoesNotFit = (name: string): string => `The input does not fit ${name}. Fix the fields listed in errors and call it again.`;
