const express = require('express');
const router = express.Router();
const groq = require('../utils/groqClient');
const dishes = require('../data/dishes.json');
const Fuse = require('fuse.js');

const fuse = new Fuse(dishes, {
    keys: ['name', 'id'],
    threshold: 0.4,
    includeScore: true
});

// Sri Lanka's 9 provinces mapped to well-known towns within them
const provinceToTowns = {
    'western': ['colombo', 'negombo', 'gampaha', 'kalutara'],
    'central': ['kandy', 'matale', 'nuwara eliya'],
    'southern': ['galle', 'matara', 'hambantota'],
    'northern': ['jaffna', 'mannar', 'kilinochchi', 'vavuniya', 'mullaitivu'],
    'eastern': ['trincomalee', 'batticaloa', 'ampara'],
    'north western': ['kurunegala', 'puttalam', 'chilaw'],
    'north central': ['anuradhapura', 'polonnaruwa'],
    'uva': ['badulla', 'ella', 'monaragala'],
    'sabaragamuwa': ['ratnapura', 'kegalle']
};

// Each province maps to the broad "region" tag style used in dishes.json
const provinceToRegion = {
    'western': 'coastal',
    'central': 'hill country',
    'southern': 'southern coast',
    'northern': 'Jaffna',
    'eastern': 'coastal',
    'north western': 'coastal',
    'north central': 'all',
    'uva': 'hill country',
    'sabaragamuwa': 'all'
};
// To handle the greetings 

const greetings = ['hi', 'hello', 'hey', 'hi there', 'good morning', 'good evening', 'yo', 'hiya'];

function isGreeting(message) {
    const cleaned = message.toLowerCase().trim().replace(/[!.?]/g, '');
    return greetings.includes(cleaned);
}

const gratitude = ['thankyou', 'thanks', 'thank you', 'bye', 'thx', 'ty', 'thanks a lot', 'thank you so much', 'appreciate it'];

function isGratitude(message) {
    const cleaned = message.toLowerCase().trim().replace(/[!.?]/g, '');
    return gratitude.includes(cleaned);
}

// Flatten into a single town -> province lookup for fast matching
const townToProvince = Object.fromEntries(
    Object.entries(provinceToTowns).flatMap(([province, towns]) =>
        towns.map(town => [town, province])
    )
);

function findRelevantDishes(message) {
    const lowerMsg = message.toLowerCase().trim();

    // Too short to meaningfully match anything — skip straight to "not found"
    if (lowerMsg.length < 3) return [];

    // 1a. Try exact substring match first (handles correctly-spelled names in longer sentences)
    const exactMatches = dishes.filter(dish =>
        lowerMsg.includes(dish.name.toLowerCase()) ||
        lowerMsg.includes(dish.id.replace(/-/g, ' '))
    );
    if (exactMatches.length > 0) return exactMatches.slice(0, 3);

    // 1b. Fall back to fuzzy matching only if no exact match, and only accept confident matches
    const fuzzyMatches = fuse.search(message)
        .filter(r => r.score < 0.3)
        .map(r => r.item)
        .slice(0, 3);
    if (fuzzyMatches.length > 0) return fuzzyMatches;

    // 2. Fall back to dietary/category filtering for browse-style questions
    if (lowerMsg.includes('vegan')) {
        return dishes.filter(d => d.dietary_tags.vegan === true).slice(0, 10);
    }
    if (lowerMsg.includes('vegetarian')) {
        return dishes.filter(d => d.dietary_tags.vegetarian === true).slice(0, 10);
    }
    if (lowerMsg.includes('non-veg') || lowerMsg.includes('non veg') || lowerMsg.includes('meat')) {
        return dishes.filter(d => d.category === 'non_vegetarian').slice(0, 10);
    }

    // 3. Region-based browsing (province name mentioned directly)
    const directProvince = Object.keys(provinceToTowns).find(p => lowerMsg.includes(p));
    if (directProvince) {
        const region = provinceToRegion[directProvince];
        return dishes.filter(d => d.region.includes(region) || d.region.includes('all'));
    }

    // 4. Town mentioned -> map to its province -> map to cuisine region
    const mentionedTown = Object.keys(townToProvince).find(town => lowerMsg.includes(town));
    if (mentionedTown) {
        const region = provinceToRegion[townToProvince[mentionedTown]];
        return dishes.filter(d => d.region.includes(region) || d.region.includes('all'));
    }

    // 5. Generic keyword fallback — search name, notes, and ingredients for content words
    const stopWords = ['give', 'some', 'information', 'about', 'tell', 'what', 'which', 'sri', 'lankan', 'me', 'the'];
    const significantWords = lowerMsg.split(/\s+/).filter(w => w.length > 3 && !stopWords.includes(w));

    if (significantWords.length > 0) {
        const keywordMatches = dishes.filter(d => {
            const haystack = `${d.name} ${d.notes} ${d.ingredients.join(' ')}`.toLowerCase();
            return significantWords.some(word => {
                const stem = (word.endsWith('s') && word.length > 4) ? word.slice(0, -1) : word;
                return haystack.includes(word) || haystack.includes(stem);
            });
        }).slice(0, 10);
        if (keywordMatches.length > 0) return keywordMatches;
    }

    // 6. No match at all
    return [];
}

router.post('/', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        if (isGreeting(message)) {
            return res.json({
                reply: "Hi! I'm your Sri Lankan food guide 🍛 Ask me about any dish, dietary restrictions, or what's popular in a specific region.",
                safety: null,
                tags: [],
                ask_the_waiter: [],
                matched: true
            });
        }

        if (isGratitude(message)) {
            return res.json({
                reply: "You're welcome! Enjoy your food adventure in Sri Lanka 🌴 Feel free to ask about any other dish.",
                safety: null,
                tags: [],
                ask_the_waiter: [],
                matched: true
            });
        }

        const matchedDishes = findRelevantDishes(message);

        // No match found — short-circuit, do NOT call Groq
        if (matchedDishes.length === 0) {
            return res.json({
                reply: "I don't have verified information on that dish or area yet. To be safe, I'd recommend asking your server directly about the ingredients — especially about dried fish, dairy, or nuts.",
                safety: "unknown",
                tags: [],
                ask_the_waiter: ["Could you tell me what's in this dish, especially any fish, dairy, or nuts?"],
                matched: false
            });
        }

        const trimmedDishes = matchedDishes.map(d => ({
            name: d.name,
            ingredients: d.ingredients,
            dietary_tags: d.dietary_tags,
            notes: d.notes,
            ask_the_waiter: d.ask_the_waiter
        }));

        // Match found — build a grounded prompt and call Groq
        const systemPrompt = `You are a food guide for tourists in Sri Lanka. You must ONLY use the dish data provided below — never guess or use outside knowledge about ingredients or safety.

Respond ONLY with valid JSON in this exact format, no extra text:
{
  "reply": "<a natural, conversational sentence answering the user's question — never a status keyword>",
  "safety": "<exactly one of: safe, check_with_restaurant, unsafe, unknown>",
  "tags": ["<short ingredient/allergen tags, e.g. contains_fish>"],
  "ask_the_waiter": ["<questions the user could ask restaurant staff>"]
}

Dish data:
${JSON.stringify(trimmedDishes, null, 2)}`;

        const completion = await groq.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3
        });

        const parsed = JSON.parse(completion.choices[0].message.content);

        const validSafetyValues = ['safe', 'check_with_restaurant', 'unsafe', 'unknown'];

        const safeResponse = {
            reply: (typeof parsed.reply === 'string' && !validSafetyValues.includes(parsed.reply.trim()))
                ? parsed.reply
                : "I couldn't generate a clear answer for that — please ask your server directly to be safe.",
            safety: validSafetyValues.includes(parsed.safety) ? parsed.safety : 'unknown',
            tags: Array.isArray(parsed.tags) ? parsed.tags : [],
            ask_the_waiter: Array.isArray(parsed.ask_the_waiter) ? parsed.ask_the_waiter : []
        };

        return res.json({ ...safeResponse, matched: true });

    } catch (err) {
        console.error('Chat route error:', err);
        res.status(500).json({ error: 'Something went wrong processing your request' });
    }
});

module.exports = router;