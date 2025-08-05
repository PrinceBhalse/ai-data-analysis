import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import * as XLSX from 'xlsx';

// Configuration
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_ROWS_TO_ANALYZE = 1000;
const SUPPORTED_EXTENSIONS = ['.csv', '.xlsx', '.xls', '.txt'];

// The config is for the old Next.js Pages Router. For the new App Router, this is not needed.
// export const config = {
//   api: {
//     bodyParser: false,
//     responseLimit: '10mb',
//   },
// };

/**
 * Parses a file (Excel, CSV, or TXT) into a JSON array of records.
 * @param filePath The path to the file on the temporary file system.
 * @param fileExt The file extension (e.g., '.csv', '.xlsx').
 * @returns A promise that resolves to an array of JavaScript objects.
 */
async function parseFile(filePath: string, fileExt: string): Promise<Record<string, unknown>[]> {
  if (fileExt.match(/\.xls[x]?/i)) {
    // Handle Excel files (XLS, XLSX)
    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]; // Get the first sheet
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);
  } else {
    // Handle CSV or TXT files
    // Read as a Buffer for robust parsing by XLSX.read
    const fileContentBuffer = await fs.readFile(filePath);
    // XLSX.read can parse CSV/TXT from a buffer directly
    const workbook = XLSX.read(fileContentBuffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]; // Get the first sheet
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);
  }
}

export async function POST(req: NextRequest) {
  try {
    // Validate content type to ensure it's a file upload
    const contentType = req.headers.get('content-type');
    if (!contentType?.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Content-Type must be multipart/form-data' },
        { status: 400 }
      );
    }

    // Process form data to extract the file
    const formData = await req.formData();
    const file = formData.get('dataset') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file received' },
        { status: 400 }
      );
    }

    // Validate file size against the defined maximum
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
        { status: 400 }
      );
    }

    // Validate file extension against supported types
    const fileExt = path.extname(file.name).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(fileExt)) {
      return NextResponse.json(
        { error: `Unsupported file extension. Supported: ${SUPPORTED_EXTENSIONS.join(', ')}` },
        { status: 400 }
      );
    }

    // Save the incoming file to a temporary location
    const buffer = await file.arrayBuffer();
    const tmpPath = path.join(os.tmpdir(), `upload_${Date.now()}${fileExt}`);
    await fs.writeFile(tmpPath, Buffer.from(buffer));

    let jsonData: Record<string, unknown>[];
    try {
      // Parse the file using the updated parseFile function
      jsonData = await parseFile(tmpPath, fileExt);
    } catch (error) {
      console.error('File parsing error:', error);
      return NextResponse.json(
        { error: 'Failed to parse file. Please ensure it is a valid CSV, Excel, or TXT format.' },
        { status: 400 }
      );
    } finally {
      // Clean up the temporary file, ignoring potential errors during cleanup
      try { await fs.unlink(tmpPath); } catch (cleanupError) {
        console.warn('Failed to delete temporary file:', cleanupError);
      }
    }

    // Validate if any data was parsed
    if (!jsonData.length) {
      return NextResponse.json(
        { error: 'No parsable data found in the file. It might be empty or malformed.' },
        { status: 400 }
      );
    }

    // Limit the data sent to the LLM to avoid exceeding token limits and improve performance
    const analysisDataForLLM = jsonData.slice(0, MAX_ROWS_TO_ANALYZE);
    const columns = Object.keys(analysisDataForLLM[0] || {});

    // Construct the prompt for the LLM, providing context and sample data
    const safePrompt = `
Analyze this dataset with ${jsonData.length} rows (showing first ${analysisDataForLLM.length} for analysis) and columns: ${columns.join(', ')}.

Provide:
1. Summary: A 2-3 sentence overview of the dataset.
2. KPIs: 3-5 key performance indicators or important metrics derived from the data.
3. Charts: Recommended visualizations as a JSON array of objects, each with:
    "type": "bar|line|pie|scatter",
    "x": "column_name", // The column for the x-axis
    "y": "column_name", // The column for the y-axis
    "title": "string", // A descriptive title for the chart
    "insight": "string" // A brief insight derived from the chart

Sample data (first 5 rows):
${JSON.stringify(analysisDataForLLM.slice(0, 5), null, 2)}

Respond with valid JSON only.`;

    // --- Gemini API Call ---
    let chatHistory = [];
    chatHistory.push({ role: "user", parts: [{ text: safePrompt }] });

    const payload = {
      contents: chatHistory,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            summary: { type: "STRING" },
            kpis: {
              type: "ARRAY",
              items: { type: "STRING" }
            },
            charts: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  type: { type: "STRING", enum: ["bar", "line", "pie", "scatter"] },
                  x: { type: "STRING" },
                  y: { type: "STRING" },
                  title: { type: "STRING" },
                  insight: { type: "STRING" }
                },
                required: ["type", "x", "y", "title", "insight"]
              }
            }
          },
          required: ["summary", "kpis", "charts"]
        }
      }
    };

    // IMPORTANT: API keys should be loaded from environment variables, not hardcoded.
    // For Next.js, you typically use a .env.local file in your project root.
    // Example: GEMINI_API_KEY="YOUR_API_KEY_HERE"
    const apiKey = process.env.GEMINI_API_KEY || "";
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured. Please set GEMINI_API_KEY environment variable.' },
        { status: 500 }
      );
    }

    // --- UPDATED GEMINI MODEL NAME ---
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

    let response;
    let result;
    const MAX_RETRIES = 5;
    let retries = 0;
    let delay = 1000; // 1 second

    while (retries < MAX_RETRIES) {
      try {
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.status === 429) { // Too Many Requests
          retries++;
          await new Promise(res => setTimeout(res, delay));
          delay *= 2; // Exponential backoff
          continue;
        }

        result = await response.json();
        break; // Success, break out of retry loop

      } catch (fetchError) {
        console.error('Fetch error during Gemini API call:', fetchError);
        retries++;
        await new Promise(res => setTimeout(res, delay));
        delay *= 2;
      }
    }

    if (!result || !result.candidates || result.candidates.length === 0 ||
        !result.candidates[0].content || !result.candidates[0].content.parts ||
        result.candidates[0].content.parts.length === 0) {
      throw new Error('Invalid or empty response from Gemini API.');
    }

    const jsonText = result.candidates[0].content.parts[0].text;
    let parsedResult;
    try {
      parsedResult = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse JSON from Gemini API response:', jsonText, parseError);
      throw new Error('Failed to parse AI response as JSON.');
    }

    if (!parsedResult.summary || !Array.isArray(parsedResult.charts)) {
      throw new Error('Invalid AI response structure: Missing summary or charts array from Gemini.');
    }

    return NextResponse.json({
      success: true,
      summary: parsedResult.summary,
      kpis: parsedResult.kpis || [],
      charts: parsedResult.charts,
      columns,
      totalRows: jsonData.length,
      rawData: jsonData // Include the full parsed data
    });

  } catch (error) {
    // Centralized error handling
    console.error('API Route Error:', error);
    return NextResponse.json(
      {
        error: 'Data analysis failed due to an internal server error.',
        details: error instanceof Error ? error.message : 'An unknown error occurred.'
      },
      { status: 500 }
    );
  }
}
