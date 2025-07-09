import OpenAI from 'openai';
import { CacheService } from '@/lib/redis';

export interface ReviewAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  summary: string;
  keyPoints: string[];
  isFakeDetected: boolean;
  fakeConfidence?: number;
  trustScore: number;
}

export interface TrustScoreFactors {
  vendorRating: number;
  salesVolume: number;
  reviewQuality: number;
  responseTime: number;
  timeInBusiness: number;
  overallScore: number;
  explanation: string;
}

export interface ProductTranslation {
  originalTitle: string;
  translatedTitle: string;
  originalDescription?: string;
  translatedDescription?: string;
  simplifiedDescription: string;
  keyFeatures: string[];
}

class OpenAIService {
  private openai: OpenAI;
  private cache: CacheService;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.cache = CacheService.getInstance();
  }

  /**
   * Analizar reviews con IA para detectar patrones y sentimientos
   */
  async analyzeReviews(reviews: string[]): Promise<ReviewAnalysis> {
    const cacheKey = `ai:reviews:${Buffer.from(reviews.join('|')).toString('base64').substring(0, 32)}`;
    
    // Verificar caché
    const cached = await this.cache.get<ReviewAnalysis>(cacheKey);
    if (cached) {
      console.log('[AI] Using cached review analysis');
      return cached;
    }

    try {
      const reviewsText = reviews.slice(0, 20).join('\n---\n'); // Limitar para no exceder tokens

      const prompt = `
Analiza estas reviews de un producto de e-commerce y proporciona un análisis detallado:

REVIEWS:
${reviewsText}

Por favor analiza y responde en el siguiente formato JSON:
{
  "sentiment": "positive|negative|neutral",
  "confidence": 0.95,
  "summary": "Resumen de 2-3 líneas de las opiniones principales",
  "keyPoints": ["punto 1", "punto 2", "punto 3"],
  "isFakeDetected": false,
  "fakeConfidence": 0.1,
  "trustScore": 8.5
}

Criterios de análisis:
- Sentiment: Determina el sentimiento general
- Confidence: Qué tan seguro estás del análisis (0-1)
- Summary: Resumen conciso y útil para el comprador
- KeyPoints: 3-5 puntos clave que mencionen los usuarios
- IsFakeDetected: Si detectas patrones sospechosos de reviews falsas
- FakeConfidence: Probabilidad de que sean falsas (0-1)
- TrustScore: Puntuación de confianza basada en calidad de reviews (0-10)

Responde SOLO con el JSON, sin explicaciones adicionales.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Eres un experto analista de reviews de e-commerce especializado en detectar patrones de confianza y sentimientos. Respondes siempre en JSON válido.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const analysis = JSON.parse(content) as ReviewAnalysis;
      
      // Validar y ajustar valores
      analysis.confidence = Math.max(0, Math.min(1, analysis.confidence));
      analysis.trustScore = Math.max(0, Math.min(10, analysis.trustScore));
      
      // Cachear resultado por 24 horas
      await this.cache.set(cacheKey, analysis, 86400);
      
      console.log('[AI] Review analysis completed:', { 
        sentiment: analysis.sentiment, 
        trustScore: analysis.trustScore,
        isFake: analysis.isFakeDetected 
      });
      
      return analysis;

    } catch (error) {
      console.error('[AI] Error analyzing reviews:', error);
      
      // Fallback básico
      return {
        sentiment: 'neutral',
        confidence: 0.5,
        summary: 'No se pudo analizar las reviews automáticamente.',
        keyPoints: ['Análisis no disponible'],
        isFakeDetected: false,
        trustScore: 5.0
      };
    }
  }

  /**
   * Calcular Trust Score inteligente basado en múltiples factores
   */
  async calculateTrustScore(data: {
    vendorRating: number;
    totalSales: number;
    reviewsCount: number;
    responseTime?: string;
    yearsInBusiness?: number;
    recentReviews: string[];
  }): Promise<TrustScoreFactors> {
    const cacheKey = `ai:trust:${JSON.stringify(data).substring(0, 50)}`;
    
    const cached = await this.cache.get<TrustScoreFactors>(cacheKey);
    if (cached) {
      console.log('[AI] Using cached trust score');
      return cached;
    }

    try {
      // Analizar reviews primero
      const reviewAnalysis = await this.analyzeReviews(data.recentReviews);

      const prompt = `
Calcula un Trust Score inteligente para este vendedor de e-commerce:

DATOS DEL VENDEDOR:
- Rating: ${data.vendorRating}/5
- Ventas totales: ${data.totalSales}
- Número de reviews: ${data.reviewsCount}
- Tiempo de respuesta: ${data.responseTime || 'No disponible'}
- Años en el negocio: ${data.yearsInBusiness || 'No disponible'}

ANÁLISIS DE REVIEWS:
- Sentimiento: ${reviewAnalysis.sentiment}
- Confianza del análisis: ${reviewAnalysis.confidence}
- Reviews falsas detectadas: ${reviewAnalysis.isFakeDetected}
- Trust Score de reviews: ${reviewAnalysis.trustScore}

Proporciona un análisis en formato JSON:
{
  "vendorRating": 8.5,
  "salesVolume": 9.0,
  "reviewQuality": 7.5,
  "responseTime": 8.0,
  "timeInBusiness": 6.0,
  "overallScore": 8.2,
  "explanation": "Explicación de 2-3 líneas del score"
}

Criterios de puntuación (0-10):
- VendorRating: Basado en rating y número de reviews
- SalesVolume: Más ventas = más confiable (pero ojo a patrones anómalos)
- ReviewQuality: Calidad y autenticidad de reviews
- ResponseTime: Qué tan rápido responde el vendedor
- TimeInBusiness: Experiencia y estabilidad
- OverallScore: Promedio ponderado inteligente

Responde SOLO con el JSON.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Eres un experto en análisis de confianza de vendedores de e-commerce. Usas algoritmos inteligentes para detectar patrones de confiabilidad.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 400
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const trustScore = JSON.parse(content) as TrustScoreFactors;
      
      // Validar valores
      Object.keys(trustScore).forEach(key => {
        if (key !== 'explanation' && typeof trustScore[key as keyof TrustScoreFactors] === 'number') {
          const value = trustScore[key as keyof TrustScoreFactors] as number;
          (trustScore as any)[key] = Math.max(0, Math.min(10, value));
        }
      });
      
      // Cachear por 6 horas
      await this.cache.set(cacheKey, trustScore, 21600);
      
      console.log('[AI] Trust score calculated:', trustScore.overallScore);
      
      return trustScore;

    } catch (error) {
      console.error('[AI] Error calculating trust score:', error);
      
      // Fallback básico
      const basicScore = Math.min(10, (data.vendorRating * 2 + (Math.log(data.totalSales + 1) / 2)));
      
      return {
        vendorRating: data.vendorRating * 2,
        salesVolume: Math.min(10, Math.log(data.totalSales + 1) * 2),
        reviewQuality: 5.0,
        responseTime: 5.0,
        timeInBusiness: 5.0,
        overallScore: basicScore,
        explanation: 'Score calculado con algoritmo básico debido a error en IA.'
      };
    }
  }

  /**
   * Traducir y simplificar descripciones de productos
   */
  async translateAndSimplify(text: string, targetLanguage: string = 'es'): Promise<ProductTranslation> {
    const cacheKey = `ai:translate:${Buffer.from(text).toString('base64').substring(0, 32)}`;
    
    const cached = await this.cache.get<ProductTranslation>(cacheKey);
    if (cached) {
      console.log('[AI] Using cached translation');
      return cached;
    }

    try {
      const prompt = `
Traduce y simplifica esta descripción de producto de e-commerce:

TEXTO ORIGINAL:
${text}

Proporciona el resultado en formato JSON:
{
  "originalTitle": "título original",
  "translatedTitle": "título traducido y mejorado",
  "translatedDescription": "descripción traducida completa",
  "simplifiedDescription": "descripción simple y clara de 2-3 líneas",
  "keyFeatures": ["característica 1", "característica 2", "característica 3"]
}

Instrucciones:
- Traduce al español de forma natural y clara
- Simplifica términos técnicos complejos
- Elimina jerga de marketing excesiva
- Extrae 3-5 características principales
- Haz el texto más confiable y profesional

Responde SOLO con el JSON.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Eres un experto traductor y simplificador de contenido de e-commerce. Tu objetivo es hacer las descripciones más claras y confiables para compradores latinos.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 600
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const translation = JSON.parse(content) as ProductTranslation;
      
      // Cachear por 7 días
      await this.cache.set(cacheKey, translation, 604800);
      
      console.log('[AI] Translation completed');
      
      return translation;

    } catch (error) {
      console.error('[AI] Error translating:', error);
      
      // Fallback básico
      return {
        originalTitle: text,
        translatedTitle: text,
        translatedDescription: text,
        simplifiedDescription: 'Descripción no disponible para traducción automática.',
        keyFeatures: ['Información no disponible']
      };
    }
  }

  /**
   * Analizar si un producto o vendedor es sospechoso
   */
  async detectSuspiciousActivity(data: {
    vendorName: string;
    productTitle: string;
    price: number;
    reviews: string[];
    vendorRating: number;
    totalSales: number;
  }): Promise<{
    isSuspicious: boolean;
    confidence: number;
    reasons: string[];
    recommendation: 'safe' | 'caution' | 'avoid';
  }> {
    try {
      const prompt = `
Analiza si este vendedor/producto presenta señales sospechosas:

VENDEDOR: ${data.vendorName}
PRODUCTO: ${data.productTitle}
PRECIO: $${data.price}
RATING: ${data.vendorRating}/5
VENTAS: ${data.totalSales}

REVIEWS RECIENTES:
${data.reviews.slice(0, 10).join('\n---\n')}

Analiza patrones sospechosos y responde en JSON:
{
  "isSuspicious": false,
  "confidence": 0.85,
  "reasons": ["razón 1", "razón 2"],
  "recommendation": "safe|caution|avoid"
}

Busca señales como:
- Reviews muy similares o genéricas
- Precios irrealmente bajos
- Patrones anómalos en ventas vs rating
- Nombres de vendedor sospechosos
- Descripciones con errores típicos de scam

Responde SOLO con el JSON.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Eres un detector experto de actividades sospechosas en e-commerce. Tu objetivo es proteger a los compradores de estafas y vendedores fraudulentos.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 300
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const analysis = JSON.parse(content);
      console.log('[AI] Suspicious activity analysis completed');
      
      return analysis;

    } catch (error) {
      console.error('[AI] Error detecting suspicious activity:', error);
      
      // Fallback conservador
      return {
        isSuspicious: false,
        confidence: 0.5,
        reasons: ['Análisis no disponible'],
        recommendation: 'caution'
      };
    }
  }
}

// Singleton
let openaiService: OpenAIService | null = null;

export function getOpenAIService(): OpenAIService {
  if (!openaiService) {
    openaiService = new OpenAIService();
  }
  return openaiService;
}

export { OpenAIService };