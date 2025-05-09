/* eslint-disable @typescript-eslint/no-unused-vars */
// pages/api/createSpreadsheet.js


import { validateSessionToken } from "src/server/LOGIN_LUCIA_ACTION/validate_session";
import { google } from "googleapis";

import { NextApiRequest, NextApiResponse } from 'next';

export default async function createSpreadsheet(req: NextApiRequest, res: NextApiResponse) {

  const token = req.cookies['lucia_auth_token'];

  if (!token) {
    res.status(401).json({ error: "No access token provided" });
    return;
  }


  let user;
  try {
    user = await validateSessionToken(token);
  } catch (error) {
    if (error instanceof Error) {
      res.status(401).json({ error: "Authentication failed: " + error.message });
    } else {
      res.status(401).json({ error: "Authentication failed" });
    }
    return;
  }


  const client = new google.auth.OAuth2();


  client.setCredentials({
    access_token: token,
  });


  const service = google.sheets({ version: "v4", auth: client });

  try {

    const response = await service.spreadsheets.create({
      requestBody: {
        properties: {
          title: "New Spreadsheet",
        },
      },
      fields: "spreadsheetId",
    });

    res.status(200).json(response.data);
  } catch (err) {
    console.error("Error creating Google Spreadsheet", err);
    res.status(500).json({ error: "Google Spreadsheet creation failed" });
  }
}
