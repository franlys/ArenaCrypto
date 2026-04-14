import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export interface AIDetectionResult {
  teamName?: string
  killCount: number
  rank: number
  confidence: number
  rawText?: string
}

export async function analyzeSubmissionImage(
  imageBuffer: Buffer,
  mimeType: string
): Promise<AIDetectionResult | { error: string }> {
  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-pro',
      generationConfig: { responseMimeType: 'application/json' }
    })

    const prompt = `
      Eres un experto arbitro internacional de torneos de Gaming (Battle Royale como Warzone, Free Fire, Fortnite). 
      Tu tarea es analizar esta captura de pantalla de resultados finales con precisión quirúrgica.
      
      Extrae los siguientes datos:
      1. El nombre del equipo o jugador.
      2. El número de bajas (Kills/Eliminaciones).
      3. La posición final (Rank/Top).
      
      Retorna estrictamente este JSON:
      {
        "teamName": string,
        "killCount": number,
        "rank": number,
        "confidence": number (0.0 a 1.0)
      }
    `

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType,
        },
      },
    ])

    const response = await result.response
    const text = response.text()
    
    try {
      const parsed = JSON.parse(text)
      return {
        teamName: parsed.teamName,
        killCount: Number(parsed.killCount) || 0,
        rank: Number(parsed.rank) || 0,
        confidence: Number(parsed.confidence) || 0.5,
        rawText: text
      }
    } catch (e) {
      return { error: 'Formato de respuesta de IA inválido' }
    }
  } catch (error: any) {
    return { error: error.message || 'Error desconocido al analizar la imagen' }
  }
}
