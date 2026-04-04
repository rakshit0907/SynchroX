const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
const HF_MODEL   = process.env.HF_MODEL || 'HuggingFaceH4/zephyr-7b-beta';

export interface AIResponse {
  text: string;
  confidenceScore: number;
  model: string;
  processingTimeMs: number;
  tokensUsed: number;
}

export async function generateAIResponse(query: string): Promise<AIResponse> {
  const start = Date.now();

  if (!HF_API_KEY) {
    await new Promise((r) => setTimeout(r, 800));
    const score = 0.5 + Math.random() * 0.5;
    return {
      text: 'Based on your query, here is a comprehensive AI response with actionable insights and recommendations based on current best practices.',
      confidenceScore: Math.round(score * 100) / 100,
      model: 'demo-mode',
      processingTimeMs: Date.now() - start,
      tokensUsed: Math.floor(Math.random() * 200) + 100,
    };
  }

  try {
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${HF_MODEL}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: `User: ${query}\nAssistant:`,
          parameters: { max_new_tokens: 300, temperature: 0.7, return_full_text: false },
        }),
      }
    );

    const data = await response.json();
    const generatedText = Array.isArray(data)
      ? (data[0]?.generated_text || '').trim()
      : (data.generated_text || data.error || 'Unable to generate response').trim();

    const wordCount  = generatedText.split(' ').length;
    const hasNumbers = /\d/.test(generatedText);
    const hasKeywords= ['therefore', 'however', 'analysis', 'recommend', 'based', 'consider'].some(
      (kw) => generatedText.toLowerCase().includes(kw)
    );
    let confidence = 0.6;
    if (wordCount > 50)   confidence += 0.1;
    if (hasNumbers)       confidence += 0.05;
    if (hasKeywords)      confidence += 0.1;
    if (wordCount > 100)  confidence += 0.05;
    confidence = Math.min(confidence + Math.random() * 0.1, 0.98);

    return {
      text: generatedText,
      confidenceScore: Math.round(confidence * 100) / 100,
      model: HF_MODEL,
      processingTimeMs: Date.now() - start,
      tokensUsed: wordCount,
    };
  } catch (error) {
    return {
      text: `Error generating response: ${String(error)}`,
      confidenceScore: 0.1,
      model: HF_MODEL,
      processingTimeMs: Date.now() - start,
      tokensUsed: 0,
    };
  }
}
