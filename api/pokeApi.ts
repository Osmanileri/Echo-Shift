/**
 * PokeAPI Service - Spirit of the Resonance
 * Fetches Pokemon data and transforms it into game-compatible SpiritCharacter format
 */

// Pokemon Spirit Character Type
export interface SpiritCharacter {
    id: number;
    name: string;
    displayName: string;
    types: string[];
    spriteUrl: string;
    stats: {
        speed: number;
        defense: number;
        attack: number;
        hp: number;
        specialAttack: number;
        specialDefense: number;
    };
    weight: number;
    bst: number; // Base Stat Total
    price: number;
    tier: 'common' | 'rare' | 'legendary';
}

// Tier thresholds based on BST
const TIER_THRESHOLDS = {
    legendary: 550,
    rare: 400,
};

// Type to color mapping for elemental aura
export const TYPE_COLORS: Record<string, string> = {
    fire: '#FF4500',
    water: '#00BFFF',
    electric: '#FFD700',
    grass: '#32CD32',
    ice: '#87CEEB',
    fighting: '#C03028',
    poison: '#A040A0',
    ground: '#E0C068',
    flying: '#A890F0',
    psychic: '#F85888',
    bug: '#A8B820',
    rock: '#B8A038',
    ghost: '#705898',
    dragon: '#7038F8',
    dark: '#705848',
    steel: '#B8B8D0',
    fairy: '#EE99AC',
    normal: '#A8A878',
};

// Calculate tier based on BST
export const getTier = (bst: number): SpiritCharacter['tier'] => {
    if (bst >= TIER_THRESHOLDS.legendary) return 'legendary';
    if (bst >= TIER_THRESHOLDS.rare) return 'rare';
    return 'common';
};

// Calculate price based on BST (BST * 10)
export const calculatePrice = (bst: number): number => {
    return bst * 10;
};

// Fetch spirit character data from PokeAPI
export const fetchSpiritData = async (pokemonIdOrName: string | number): Promise<SpiritCharacter> => {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonIdOrName}`);

    if (!response.ok) {
        throw new Error(`Failed to fetch Pokemon: ${pokemonIdOrName}`);
    }

    const data = await response.json();

    // Helper to get stat value by name
    const getStat = (name: string): number => {
        const stat = data.stats.find((s: { stat: { name: string }; base_stat: number }) =>
            s.stat.name === name
        );
        return stat ? stat.base_stat : 0;
    };

    // Calculate BST
    const bst = data.stats.reduce((acc: number, curr: { base_stat: number }) =>
        acc + curr.base_stat, 0
    );

    // Format display name (capitalize first letter)
    const displayName = data.name.charAt(0).toUpperCase() + data.name.slice(1);

    return {
        id: data.id,
        name: data.name,
        displayName,
        types: data.types.map((t: { type: { name: string } }) => t.type.name),
        spriteUrl: data.sprites.front_default || data.sprites.other?.['official-artwork']?.front_default,
        stats: {
            speed: getStat('speed'),
            defense: getStat('defense'),
            attack: getStat('attack'),
            hp: getStat('hp'),
            specialAttack: getStat('special-attack'),
            specialDefense: getStat('special-defense'),
        },
        weight: data.weight / 10, // Convert to kg
        bst,
        price: calculatePrice(bst),
        tier: getTier(bst),
    };
};

// Curated list of 20 starter Pokemon with balanced variety
export const STARTER_POKEMON_IDS = [
    // Common Tier (BST < 400) - 8 Pokemon
    19,   // Rattata (253)
    16,   // Pidgey (251)
    25,   // Pikachu (320)
    133,  // Eevee (325)
    92,   // Gastly (310)
    63,   // Abra (310)
    66,   // Machop (305)
    129,  // Magikarp (200)

    // Rare Tier (BST 400-550) - 8 Pokemon
    94,   // Gengar (500)
    65,   // Alakazam (500)
    68,   // Machamp (505)
    135,  // Jolteon (525)
    131,  // Lapras (535)
    143,  // Snorlax (540)
    123,  // Scyther (500)
    148,  // Dragonair (420)

    // Legendary Tier (BST > 550) - 4 Pokemon
    149,  // Dragonite (600)
    150,  // Mewtwo (680)
    6,    // Charizard (534) - Actually rare but iconic
    9,    // Blastoise (530) - Actually rare but iconic
];

// Fetch all starter spirits
export const fetchAllStarterSpirits = async (): Promise<SpiritCharacter[]> => {
    const promises = STARTER_POKEMON_IDS.map(id => fetchSpiritData(id));
    const results = await Promise.allSettled(promises);

    return results
        .filter((result): result is PromiseFulfilledResult<SpiritCharacter> =>
            result.status === 'fulfilled'
        )
        .map(result => result.value);
};
