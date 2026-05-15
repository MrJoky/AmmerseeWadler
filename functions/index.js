import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

const racemapToken = defineSecret("RACEMAP_API_TOKEN");

export const racemapCurrent = onRequest({ secrets: [racemapToken], cors: true }, async (request, response) => {
  const eventId = request.query.eventId;
  if (!eventId || Array.isArray(eventId)) {
    response.status(400).json({ error: "eventId fehlt" });
    return;
  }

  const racemapResponse = await fetch(`https://racemap.com/api/data/v1/${encodeURIComponent(eventId)}/current`, {
    headers: {
      Authorization: `Bearer ${racemapToken.value()}`
    }
  });

  response.status(racemapResponse.status);
  response.set("cache-control", "public, max-age=10");
  response.json(await racemapResponse.json());
});
