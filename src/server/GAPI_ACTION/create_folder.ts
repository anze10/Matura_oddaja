"use server";

import { type Auth, google } from "googleapis";
import * as stream from "stream";
import { GetAccessToken } from "src/server/DATABASE_ACTION/GoogleTokenInteractions";
import { getCurrentSession } from "src/server/LOGIN_LUCIA_ACTION/session";


async function createFolder(
  client: Auth.OAuth2Client,
  customer_name: string,
  order_number: string,
) {

  const service = google.drive({ version: "v3", auth: client });
  const fileMetadata = {
    name: customer_name + "   " + order_number,
    mimeType: "application/vnd.google-apps.folder",
  };
  try {
    const file = await service.files.create({
      requestBody: fileMetadata,
      fields: "id",
    });
    console.log("Folder Id:", file.data.id);
    return file.data.id;
  } catch (err) {
    console.log(err);
    throw err;
  }
}


async function createSpreadsheet(
  client: Auth.OAuth2Client,
  folderId: string | null | undefined,
  customer_name: string,
  order_number: string,
  currentTime: Date,
  name: string,
) {

  const service = google.drive({ version: "v3", auth: client });

  const sheets = google.sheets({ version: "v4", auth: client });

  const fileMetadata = {
    name: "Order " + order_number + "-" + "Device list",
    parents: folderId ? [folderId] : undefined,
    mimeType: "application/vnd.google-apps.spreadsheet",
  };

  try {
    const file = await service.files.create({
      requestBody: fileMetadata,
      media: {},
      fields: "id",
    });
    console.log("Spreadsheet Id:", file.data.id);

    const spreadsheetId = file.data.id;
    const time = currentTime.toISOString().split("T")[0];

    const data = [
      { range: "A3", values: [["Customer Name:"]] },
      { range: "B3", values: [[customer_name]] },
      { range: "A4", values: [["Order No:"]] },
      { range: "B4", values: [[order_number]] },
      { range: "A5", values: [["Date of production:"]] },
      { range: "B5", values: [[time]] },
      { range: "A7", values: [["Fulfilled by:"]] },
      { range: "B7", values: [[name]] },
      { range: "A9", values: [["Device Type"]] },
      { range: "B9", values: [["DevEUI"]] },
      { range: "C9", values: [["AppEUI"]] },
      { range: "D9", values: [["AppKey"]] },
      { range: "E9", values: [["Frequency Region"]] },
      { range: "F9", values: [["Sub Bands"]] },
      { range: "G9", values: [["HW Version"]] },
      { range: "H9", values: [["FW Version"]] },
      { range: "I9", values: [["Custom FW Version"]] },
      { range: "J9", values: [["Send Period"]] },
      { range: "K9", values: [["ACK"]] },
      { range: "L9", values: [["Movement Threshold"]] },
    ];

    const requests = data.map((item) => ({
      range: item.range,
      values: item.values,
    }));


    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: spreadsheetId !== null ? spreadsheetId : undefined,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: requests,
      },
    });


    const boldRightAlignRequests = ["B3", "B4", "B5", "B7"].map((cell) => ({
      repeatCell: {
        range: {
          sheetId: 0,
          startRowIndex: parseInt(cell.substring(1)) - 1,
          endRowIndex: parseInt(cell.substring(1)),
          startColumnIndex: cell.charCodeAt(0) - 65,
          endColumnIndex: cell.charCodeAt(0) - 64,
        },
        cell: {
          userEnteredFormat: {
            textFormat: {
              bold: true,
            },
            horizontalAlignment: "RIGHT",
          },
        },
        fields: "userEnteredFormat(textFormat,horizontalAlignment)",
      },
    }));

    const headerFormattingRequest = {
      repeatCell: {
        range: {
          sheetId: 0,
          startRowIndex: 8,
          startColumnIndex: 0,
          endColumnIndex: 12,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: {
              red: 0.9,
              green: 0.9,
              blue: 0.9,
            },
            horizontalAlignment: "CENTER",
            verticalAlignment: "MIDDLE",
            textFormat: {
              bold: true,
            },
            borders: {
              top: {
                style: "SOLID",
                color: { red: 0.5, green: 0.5, blue: 0.5 },
              },
              bottom: {
                style: "SOLID",
                color: { red: 0.5, green: 0.5, blue: 0.5 },
              },
              left: {
                style: "SOLID",
                color: { red: 0.5, green: 0.5, blue: 0.5 },
              },
              right: {
                style: "SOLID",
                color: { red: 0.5, green: 0.5, blue: 0.5 },
              },
            },
          },
        },
        fields:
          "userEnteredFormat(backgroundColor,borders,textFormat,horizontalAlignment,verticalAlignment)",
      },
    };


    const resizeColumnsRequests = {
      updateDimensionProperties: {
        range: {
          sheetId: 0,
          dimension: "COLUMNS",
          startIndex: 0,
          endIndex: 12,
        },
        properties: {
          pixelSize: 150,
        },
        fields: "pixelSize",
      },
    };


    const mergeCellsRequest = {
      mergeCells: {
        range: {
          sheetId: 0,
          startRowIndex: 0,
          endRowIndex: 2,
          startColumnIndex: 0,
          endColumnIndex: 2,
        },
        mergeType: "MERGE_ALL",
      },
    };
    const imageAlignmentRequest = {
      repeatCell: {
        range: {
          sheetId: 0,
          startRowIndex: 0,
          endRowIndex: 2,
          startColumnIndex: 0,
          endColumnIndex: 2,
        },
        cell: {
          userEnteredFormat: {
            horizontalAlignment: "CENTER",
            verticalAlignment: "MIDDLE",
          },
        },
        fields: "userEnteredFormat(horizontalAlignment,verticalAlignment)",
      },
    };

    const imageRequests = {
      updateCells: {
        range: {
          sheetId: 0,
          startRowIndex: 0,
          endRowIndex: 2,
          startColumnIndex: 0,
          endColumnIndex: 2,
        },
        rows: [
          {
            values: [
              {
                userEnteredValue: {
                  formulaValue: `=IMAGE("https://drive.google.com/uc?id=1t4IRwHIhj4XrNlH7fNiwL4nycX8uFYse";4;30;250)`,
                },
              },
            ],
          },
        ],

        fields: "userEnteredValue",
      },
    };

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId !== null ? spreadsheetId : undefined,
      requestBody: {
        requests: [
          ...boldRightAlignRequests,

          headerFormattingRequest,
          resizeColumnsRequests,
          mergeCellsRequest,
          imageAlignmentRequest,
          imageRequests,
        ],
      },
    });

    return spreadsheetId;
  } catch (err) {
    console.error("Google spreadsheet error", err);
    throw err;
  }
}
async function insertIntoSpreadsheet(
  client: Auth.OAuth2Client,
  spreadsheetId: string,
  newRow: string[],
): Promise<void> {

  const sheets = google.sheets({ version: "v4", auth: client });

  try {

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: "A9:A",
    });

    const rows = response.data.values ?? [];
    const nextRow = rows.length + 9;

    const data = [
      {
        range: `A${nextRow}`,
        values: [newRow],
      },
    ];


    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: spreadsheetId,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: data,
      },
    });

    console.log(`Inserted new row at row ${nextRow}`);


    const resizeColumnsRequests = {
      updateDimensionProperties: {
        range: {
          sheetId: 0,
          dimension: "COLUMNS",
          startIndex: 0,
          endIndex: 12,
        },
        properties: {
          pixelSize: 150,
        },
        fields: "pixelSize",
      },
    };
    const AlignmentRequest = {
      repeatCell: {
        range: {
          sheetId: 0,
          startRowIndex: 9,
          endRowIndex: nextRow,
          startColumnIndex: 0,
          endColumnIndex: 12,
        },
        cell: {
          userEnteredFormat: {
            horizontalAlignment: "CENTER",
            verticalAlignment: "MIDDLE",
          },
        },
        fields: "userEnteredFormat(horizontalAlignment,verticalAlignment)",
      },
    };


    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId,
      requestBody: {
        requests: [resizeColumnsRequests, AlignmentRequest],
      },
    });
  } catch (error) {
    console.error("Error inserting new row into the spreadsheet:", error);
    throw error;
  }
}

async function createSpreadsheetCsv(
  client: Auth.OAuth2Client,
  folderId: string | null | undefined,
  order_number: string,
) {

  const service = google.drive({ version: "v3", auth: client });
  const fileMetadata = {
    name: "Order " + order_number + "-" + "TTN import" + ".csv",
    parents: folderId ? [folderId] : undefined,

    mimeType: "text/csv",
  };

  const media = {
    mimeType: "text/csv",
    body: "id,dev_eui,join_eui,name,frequency_plan_id,lorawan_version,lorawan_phy_version,app_key,brand_id,model_id,hardware_version,firmware_version,band_id\n", // Initial CSV content (headers)
  };

  try {
    const file = await service.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id",
    });
    console.log("Spreadsheet Id:", file.data.id);
    return file.data.id;
  } catch (err) {
    console.error("Google spreadsheet error:", err);
    throw err;
  }
}

async function insertIntoCsvFile(
  client: Auth.OAuth2Client,
  fileId: string,
  newRow: string[],
): Promise<void> {

  const drive = google.drive({ version: "v3", auth: client });

  try {
    const newRowString = newRow.join(",") + "\n";

    const response = await drive.files.get(
      {
        fileId: fileId,
        alt: "media",
      },
      { responseType: "stream" },
    );

    let existingCsvContent = "";
    response.data.on("data", (chunk) => {
      existingCsvContent += chunk;
    });

    await new Promise<void>((resolve, reject) => {
      response.data.on("end", resolve);
      response.data.on("error", reject);
    });
    const updatedCsvContent = existingCsvContent + newRowString;

    const media = {
      mimeType: "text/csv",
      body: stream.Readable.from(updatedCsvContent),
    };

    await drive.files.update({
      fileId: fileId,
      media: media,
    });

    console.log("File successfully updated with new data.");
  } catch (error) {
    console.error("Error during the update:", error);
    throw error;
  }
}

export async function createFolderAndSpreadsheet(
  customer_name: string,
  order_number: string,
) {
  const session = await getCurrentSession();
  if (!session.session?.userId) {
    throw new Error("User ID is undefined");
  }
  const token = await GetAccessToken(session.session.userId);
  const currentTime = new Date();



  const client = new google.auth.OAuth2() as unknown as Auth.OAuth2Client;

  client.setCredentials({
    access_token: token
  });

  if (!token) throw new Error("No access token found");
  const name = session?.user.name;

  try {

    const folderId = await createFolder(client, customer_name, order_number);


    const spreadsheetId = await createSpreadsheet(
      client,
      folderId,
      customer_name,
      order_number,
      currentTime,
      name ?? "Neznano",
    );

    const fileId = await createSpreadsheetCsv(client, folderId, order_number);

    if (!folderId || !spreadsheetId || !fileId) {
      throw new Error("Error creating folder, spreadsheet or csv file");
    }

    return { folderId, spreadsheetId, fileId };
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export async function insert(
  fileId: string,
  newRow: string[],
  spreadsheetId: string,
  nerEXE: string[],
) {
  const session = await getCurrentSession();
  if (!session.session?.userId) {
    throw new Error("User ID is undefined");
  }
  const token = await GetAccessToken(session.session.userId);
  console.log({ access_token: token });
  const client = new google.auth.OAuth2() as unknown as Auth.OAuth2Client;

  client.setCredentials({
    access_token: token,
  });

  if (!token) throw new Error("No access token");


  console.log("Inserting new row into the spreadsheet...");
  try {
    await insertIntoCsvFile(client, fileId, newRow);
    await insertIntoSpreadsheet(client, spreadsheetId, nerEXE);
  } catch (err) {
    console.error(err);
    throw err;
  }
}

