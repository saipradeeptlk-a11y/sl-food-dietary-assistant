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

// Flatten into a single town -> province lookup for fast matching
const townToProvince = Object.fromEntries(
    Object.entries(provinceToTowns).flatMap(([province, towns]) =>
        towns.map(town => [town, province])
    )
);

function findRelevantDishes(message) {
    const lowerMsg = message.toLowerCase();

    // 1a. Try exact substring match first (handles correctly-spelled names in longer sentences)
    const exactMatches = dishes.filter(dish =>
        lowerMsg.includes(dish.name.toLowerCase()) ||
        lowerMsg.includes(dish.id.replace(/-/g, ' '))
    );
    if (exactMatches.length > 0) return exactMatches.slice(0, 3);

    // 1b. Fall back to fuzzy matching only if no exact match (catches typos)
    const fuzzyMatches = fuse.search(message).map(r => r.item).slice(0, 3);
    if (fuzzyMatches.length > 0) return fuzzyMatches;

    // 2. Fall back to dietary/category filtering for browse-style questions
    if (lowerMsg.includes('vegan')) {
        return dishes.filter(d => d.dietary_tags.vegan === true).slice(0, 10);// top 10 only 
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

    // 5. No match at all
    return [];
}

router.post('/', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
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
{"reply": string, "safety": "safe"|"check_with_restaurant"|"unsafe"|"unknown", "tags": string[], "ask_the_waiter": string[]}

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

        return res.json({ ...parsed, matched: true });

    } catch (err) {
        console.error('Chat route error:', err);
        res.status(500).json({ error: 'Something went wrong processing your request' });
    }
});

module.exports = router;