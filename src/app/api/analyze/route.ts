import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import * as XLSX from 'xlsx';

// Configuration
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_ROWS_TO_ANALYZE = 1000;
const SUPPORTED_EXTENSIONS = ['.csv', '.xlsx', '.xls', '.txt'];

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
    // Handle CSV or TXT files by reading as a Buffer
    const fileContentBuffer = await fs.readFile(filePath);
    // XLSX.read can parse CSV/TXT from a buffer directly.
    // It will try to infer the delimiter for text files.
    const workbook = XLSX.read(fileContentBuffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]; // Get the first sheet
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('dataset') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    // Basic file validation
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit.` }, { status: 413 });
    }

    const fileExt = path.extname(file.name).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(fileExt)) {
      return NextResponse.json({ error: `Unsupported file type: ${fileExt}. Supported types are: ${SUPPORTED_EXTENSIONS.join(', ')}` }, { status: 415 });
    }

    // Save file to a temporary location
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const tempDir = os.tmpdir();
    const filePath = path.join(tempDir, file.name);
    await fs.writeFile(filePath, buffer);

    let jsonData: Record<string, unknown>[];
    try {
      jsonData = await parseFile(filePath, fileExt);
    } catch (parseError: unknown) {
      console.error('File parsing error:', parseError);
      return NextResponse.json({ error: `Failed to parse file: ${parseError instanceof Error ? parseError.message : String(parseError)}` }, { status: 422 });
    } finally {
      // Clean up the temporary file
      await fs.unlink(filePath).catch(e => console.error("Failed to delete temp file:", e));
    }

    if (jsonData.length === 0) {
      return NextResponse.json({ error: 'Parsed file contains no data.' }, { status: 422 });
    }

    // Limit rows for AI analysis if necessary
    const dataToAnalyze = jsonData.slice(0, MAX_ROWS_TO_ANALYZE);

    // Dynamic column extraction
    const columns = Object.keys(jsonData[0] || {});

    // Prepare prompt for Gemini API
    const prompt = `Analyze the following dataset from a digital marketing agency.
    Provide:
    1. A concise summary (around 100-150 words) of the key findings and overall performance.
    2. A list of 3-5 key performance indicators (KPIs) relevant to marketing data (e.g., "Total Revenue: $X", "New Users: Y", "Conversion Rate: Z%").
    3. Configurations for 3-4 interactive charts (line, bar, pie, scatter) that visualize important aspects of the data. For each chart, specify:
       - 'type': 'line', 'bar', 'pie', or 'scatter'
       - 'x': The column name for the X-axis.
       - 'y': The column name for the Y-axis.
       - 'title': A descriptive title for the chart.
       - 'insight': A brief (1-2 sentence) insight derived from the chart.
    
    Ensure the output is a JSON object with 'summary', 'kpis', and 'charts' properties.
    The 'charts' array should contain objects with 'type', 'x', 'y', 'title', and 'insight'.
    
    Dataset (first ${dataToAnalyze.length} rows):
    ${JSON.stringify(dataToAnalyze, null, 2)}
    `;

    // Call Gemini API
    // THIS IS THE CRUCIAL CHANGE: Load API key from environment variables
    const apiKey = process.env.GEMINI_API_KEY; 

    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API Key not configured in environment variables.' }, { status: 500 });
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`; // Using latest flash model

    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            summary: { type: "STRING" },
            kpis: { type: "ARRAY", items: { type: "STRING" } },
            charts: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  type: { type: "STRING", enum: ["line", "bar", "pie", "scatter"] },
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

    let result;
    let delay = 1000; // Initial delay of 1 second
    const maxRetries = 3;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.status === 429) { // Too Many Requests
          console.warn(`Rate limit hit. Retrying in ${delay / 1000} seconds...`);
          await new Promise(res => setTimeout(res, delay));
          delay *= 2; // Exponential backoff
          continue; // Retry the request
        }

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`API call failed with status ${response.status}: ${errorBody}`);
        }

        result = await response.json();
        break; // Success, exit loop
      } catch (fetchError) {
        console.error(`Attempt ${i + 1} failed:`, fetchError);
        if (i === maxRetries - 1) throw fetchError; // Re-throw if last retry
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
        error: 'Data analysis failed. Please check the file format and content.',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
