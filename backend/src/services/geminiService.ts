import { GoogleGenAI, Type } from '@google/genai';
import { GeminiExtractedData } from '../types';

// Ensure GEMINI_API_KEY is loaded from environment variables
if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set in environment variables.");
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const model = 'gemini-2.5-flash'; // Using gemini-2.5-flash for general purpose tasks

const EXTRACTION_PROMPT = `
You are a highly specialized medical AI assistant. Your task is to meticulously extract specific data points from the provided medical report.
Output the data strictly as a JSON object, adhering to the specified schema.
Infer the 'reportType' (e.g., 'CBC', 'Lipid Panel', 'CT Coronary Angiography', 'Discharge Summary', 'Outpatient Bill') and 'hospital' name from the document.
For 'extractedValues', identify common lab tests or key metrics, their numeric or string value, unit, and reference range. Mark 'isAbnormal' as true if the value falls outside the reference range or is explicitly noted as abnormal.
Identify all 'diagnosis' entries, 'medications' mentioned, and any explicit 'abnormalities' or significant findings.
Generate two summaries: 'patientSummary' (simple, non-medical language for a layperson) and 'doctorSummary' (clinically detailed and concise for a medical professional).
Finally, extract the most relevant 'timestamp' (date) from the report, preferably the "Report Date" or "Order Date" in YYYY-MM-DD format. If only a year is available, use YYYY-01-01.

Crucially, ensure the output is valid JSON and nothing else. If a field cannot be found, return an empty array or an empty string/object as appropriate.
`;

const GEMINI_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    reportType: { type: Type.STRING, description: 'Type of the medical report (e.g., CBC, CT Scan, Discharge Summary).' },
    hospital: { type: Type.STRING, description: 'Name of the hospital or clinic that issued the report.' },
    extractedValues: {
      type: Type.OBJECT,
      description: 'Key-value pairs of extracted lab values or metrics.',
      additionalProperties: {
        type: Type.OBJECT,
        properties: {
          value: { type: Type.STRING, description: 'The extracted value (numeric or string).' },
          unit: { type: Type.STRING, description: 'The unit of the value (e.g., mg/dL, /µL).' },
          ref: { type: Type.STRING, description: 'The reference range for the value.' },
          isAbnormal: { type: Type.BOOLEAN, description: 'True if the value is abnormal, false otherwise.' },
        },
        required: ['value'],
      },
    },
    diagnosis: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'List of diagnoses mentioned in the report.',
    },
    medications: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'List of medications prescribed or mentioned.',
    },
    abnormalities: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'List of significant abnormalities or findings.',
    },
    patientSummary: { type: Type.STRING, description: 'Summary of the report for a non-medical user.' },
    doctorSummary: { type: Type.STRING, description: 'Detailed summary for a medical professional.' },
    timestamp: { type: Type.STRING, description: 'Date of the report in YYYY-MM-DD format.' },
  },
  required: ['extractedValues', 'diagnosis', 'medications', 'abnormalities', 'patientSummary', 'doctorSummary', 'timestamp'],
  propertyOrdering: [
    "reportType", "hospital", "extractedValues", "diagnosis", "medications", "abnormalities",
    "patientSummary", "doctorSummary", "timestamp"
  ]
};


export async function extractMedicalData(fileUrl: string, mimeType: string): Promise<GeminiExtractedData> {
  const contents: any[] = [{ text: EXTRACTION_PROMPT }];

  if (mimeType.startsWith('image/')) {
    // For images, provide inlineData
    // NOTE: Gemini Flash Image supports direct image data.
    // If using 'gemini-2.5-flash', it might require the image to be publicly accessible or base64 encoded.
    // Assuming for a prototype, image URLs are public for simplicity or we'd need to fetch and base64.
    // For this implementation, the `generateContent` method of `gemini-2.5-flash` with a GCS URL should work for both.
    contents.push({
      fileData: {
        mimeType: mimeType,
        fileUri: fileUrl,
      },
    });
  } else if (mimeType === 'application/pdf') {
    // For PDF, provide fileData with the URI
    contents.push({
      fileData: {
        mimeType: mimeType,
        fileUri: fileUrl,
      },
    });
  } else {
    throw new Error(`Unsupported MIME type: ${mimeType}`);
  }

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: [{ parts: contents }],
      config: {
        responseMimeType: "application/json",
        responseSchema: GEMINI_RESPONSE_SCHEMA,
        temperature: 0.2, // Lower temperature for more factual extraction
        // Set thinkingBudget if using Gemini 2.5 series with maxOutputTokens to reserve tokens for output
        // For gemini-2.5-flash, if response is often truncated, consider:
        // thinkingConfig: { thinkingBudget: 100 },
        // maxOutputTokens: 1000,
      },
    });

    let jsonStr = response.text.trim();
    // Gemini might sometimes wrap JSON in markdown code blocks, try to parse robustly.
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.substring(7, jsonStr.lastIndexOf('```')).trim();
    }
    const extractedData: GeminiExtractedData = JSON.parse(jsonStr);

    // Validate timestamp format and ensure numeric values are numbers
    if (extractedData.timestamp && !/^\d{4}-\d{2}-\d{2}$/.test(extractedData.timestamp)) {
      console.warn(`Invalid timestamp format received: ${extractedData.timestamp}. Attempting to reformat.`);
      // Simple reformatting if it's just a year or day/month/year
      const date = new Date(extractedData.timestamp);
      if (!isNaN(date.getTime())) {
        extractedData.timestamp = date.toISOString().split('T')[0];
      } else {
        extractedData.timestamp = 'Unknown'; // Fallback
      }
    }
    for (const key in extractedData.extractedValues) {
      if (typeof extractedData.extractedValues[key].value === 'string' && !isNaN(parseFloat(extractedData.extractedValues[key].value as string))) {
        extractedData.extractedValues[key].value = parseFloat(extractedData.extractedValues[key].value as string);
      }
    }

    return extractedData;
  } catch (error) {
    console.error("Error calling Gemini API for extraction:", error);
    throw new Error(`Gemini API extraction failed: ${(error as any).message}`);
  }
}

const CHAT_SYSTEM_INSTRUCTION = `
You are a helpful and knowledgeable health assistant named UPHR-Vault AI.
Your primary role is to answer health-related questions.
When provided with patient report context, prioritize using that information to answer specific questions about the patient's data or explain medical terminology found within it.
If the question is general or no specific report context is given, answer as a general health AI.
Always aim to be clear, concise, and empathetic. Do not give medical advice or diagnoses. Encourage users to consult with a doctor for specific health concerns.
`;

export async function getChatResponse(userMessage: string, reportContext?: string): Promise<string> {
  const contents = [
    { text: CHAT_SYSTEM_INSTRUCTION },
  ];

  if (reportContext) {
    contents.push({ text: `Here is the patient's medical report summary for context: "${reportContext}"` });
  }

  contents.push({ text: `User query: ${userMessage}` });

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: [{ parts: contents }],
      config: {
        temperature: 0.7, // Higher temperature for more conversational responses
        maxOutputTokens: 500, // Limit response length
      },
    });

    return response.text.trim();
  } catch (error) {
    console.error("Error calling Gemini API for chat:", error);
    throw new Error(`Gemini Chat API failed: ${(error as any).message}`);
  }
}