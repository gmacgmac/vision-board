// A picture's limit, one number for the page, the server and what an agent is told (D-071).

/** The most a picture may be for the agent's provider to take it. Measured live on Kiro, 2026-10-31: a 4.3 MB PNG is rejected,
 *  a 3.5 MB PNG is seen; the provider's own limit is 5 MB on the base64 size, about 3.75 MB of bytes. */
export const PICTURE_BYTES = 3_500_000;
