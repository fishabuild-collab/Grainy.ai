
import { GoogleGenAI, Type } from "@google/genai";
import { AIRecipe, GrainTexture } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function fetchGrainRecipes(style: string): Promise<AIRecipe[]> {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Act as a high-end editorial graphic designer and print specialist. Generate 3 unique "grain recipes" based on the artistic prompt: "${style}". 
    The style should be minimalist, sophisticated, and focused on monochrome textures (using black, white, and high-contrast logic).
    
    Each recipe needs:
    - name: A sophisticated, artistic name (e.g., "Archival Grit", "Bauhaus Draft").
    - description: A short, evocative description of the aesthetic.
    - settings: Specific numeric values for:
      - intensity (0-1)
      - scale (1-10)
      - roughness (0-1)
      - opacity (0-1)
      - randomness (0-1) - Controls clumping/clustering of grains.
      - seed (any integer)
      - bgColor (hex, strictly #FFFFFF or #000000)
      - grainColor (hex, strictly #FFFFFF or #000000)
      - texture (one of: UNIFORM, GAUSSIAN, SPECKLE, FILM)
      - monochrome: true`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            settings: {
              type: Type.OBJECT,
              properties: {
                intensity: { type: Type.NUMBER },
                scale: { type: Type.NUMBER },
                roughness: { type: Type.NUMBER },
                opacity: { type: Type.NUMBER },
                randomness: { type: Type.NUMBER },
                seed: { type: Type.NUMBER },
                bgColor: { type: Type.STRING },
                grainColor: { type: Type.STRING },
                texture: { type: Type.STRING },
                monochrome: { type: Type.BOOLEAN }
              },
              required: ["intensity", "scale", "roughness", "opacity", "randomness", "seed", "bgColor", "grainColor", "texture", "monochrome"]
            }
          },
          required: ["name", "description", "settings"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return [];
  }
}
