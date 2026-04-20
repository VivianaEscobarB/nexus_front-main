import Fuse from 'fuse.js';
import { intents, fallbackResponse } from '../data/botKnowledge';

const LOCAL_STORAGE_KEY = 'nexus_bot_unknown_queries';
const MAX_SAVED_QUERIES = 50;

// Configuración de Fuse.js
const fuseOptions = {
    includeScore: true,
    threshold: 0.4, // Tolerancia media a errores
    keys: ['trainingPhrases']
};

const fuse = new Fuse(intents, fuseOptions);

export interface BotResponse {
    text: string;
    isFallback: boolean;
    suggestions?: string[];
}

export function getBotResponse(userInput: string): BotResponse {
    const normalizedInput = userInput.toLowerCase().trim();
    
    if (!normalizedInput) {
        return { text: "Por favor, escribe algo.", isFallback: false };
    }

    const results = fuse.search(normalizedInput);

    if (results.length > 0) {
        const bestMatch = results[0];
        // Score de Fuse: 0 es match perfecto, 1 es nada en comun. Usualmente < 0.4 es confiable
        if (bestMatch.score !== undefined && bestMatch.score <= 0.4) {
            
            if (bestMatch.item.response === "--EXPORT_COMMAND--") {
                const logs = getUnknownQueries();
                return {
                    text: `Exportando consultas no entendidas (${logs.length}):\n\n${logs.join('\n')}`,
                    isFallback: false
                };
            }

            return { text: bestMatch.item.response, isFallback: false };
        } else if (bestMatch.score !== undefined && bestMatch.score > 0.4 && bestMatch.score < 0.6) {
             // Caso dudoso, intentamos sugerir
             return { 
                text: "No estoy completamente seguro. ¿Quizás quisiste preguntar sobre esto?: " + bestMatch.item.trainingPhrases[0] + "?",
                isFallback: true,
                suggestions: [bestMatch.item.trainingPhrases[0]]
            };
        }
    }

    // Guardar query si es fallback
    saveUnknownQuery(userInput);

    return { text: fallbackResponse, isFallback: true };
}

// ------ Persistencia Local (Auto-aprendizaje) ------

export function saveUnknownQuery(query: string): void {
    if (typeof window === 'undefined') return;

    const currentQueries = getUnknownQueries();
    
    // Evitar duplicados exactos
    if (currentQueries.map(q => q.toLowerCase()).includes(query.toLowerCase())) return;

    currentQueries.push(query);

    // Mantener límite
    if (currentQueries.length > MAX_SAVED_QUERIES) {
        currentQueries.shift(); // remover el más viejo
    }

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(currentQueries));
}

export function getUnknownQueries(): string[] {
    if (typeof window === 'undefined') return [];
    
    try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error("Error leyendo unknown queries de localStorage", e);
        return [];
    }
}
