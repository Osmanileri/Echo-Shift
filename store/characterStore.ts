/**
 * Character Store - Spirit of the Resonance
 * Manages Pokemon spirit character selection, ownership, and caching
 * Uses Zustand with persist middleware for localStorage
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SpiritCharacter, fetchAllStarterSpirits } from '../api/pokeApi';

interface CharacterState {
    // Active equipped character (null = default orbs)
    activeCharacter: SpiritCharacter | null;

    // IDs of purchased characters
    ownedCharacterIds: number[];

    // Cached character data (to avoid re-fetching)
    characterCache: Record<number, SpiritCharacter>;

    // Loading state for API calls
    isLoading: boolean;

    // Error state
    error: string | null;

    // Actions
    setActiveCharacter: (char: SpiritCharacter | null) => void;
    purchaseCharacter: (char: SpiritCharacter, spendGems: (amount: number) => boolean) => boolean;
    cacheCharacter: (char: SpiritCharacter) => void;
    cacheMultipleCharacters: (chars: SpiritCharacter[]) => void;
    loadStarterSpirits: () => Promise<void>;
    isCharacterOwned: (charId: number) => boolean;
    getOwnedCharacters: () => SpiritCharacter[];
    clearError: () => void;
}

export const useCharacterStore = create<CharacterState>()(
    persist(
        (set, get) => ({
            activeCharacter: null,
            ownedCharacterIds: [],
            characterCache: {},
            isLoading: false,
            error: null,

            setActiveCharacter: (char) => set({ activeCharacter: char }),

            purchaseCharacter: (char, spendGems) => {
                const { ownedCharacterIds } = get();

                // Already owned
                if (ownedCharacterIds.includes(char.id)) {
                    return true;
                }

                // Try to spend gems
                const success = spendGems(char.price);

                if (success) {
                    set({
                        ownedCharacterIds: [...ownedCharacterIds, char.id],
                    });
                    // Also cache the character data
                    get().cacheCharacter(char);
                    return true;
                }

                return false;
            },

            cacheCharacter: (char) => {
                set((state) => ({
                    characterCache: {
                        ...state.characterCache,
                        [char.id]: char,
                    },
                }));
            },

            cacheMultipleCharacters: (chars) => {
                set((state) => ({
                    characterCache: {
                        ...state.characterCache,
                        ...Object.fromEntries(chars.map(c => [c.id, c])),
                    },
                }));
            },

            loadStarterSpirits: async () => {
                const { characterCache } = get();

                // Check if we already have cached data
                if (Object.keys(characterCache).length >= 20) {
                    return;
                }

                set({ isLoading: true, error: null });

                try {
                    const spirits = await fetchAllStarterSpirits();
                    get().cacheMultipleCharacters(spirits);
                    set({ isLoading: false });
                } catch (error) {
                    set({
                        isLoading: false,
                        error: error instanceof Error ? error.message : 'Failed to load spirits'
                    });
                }
            },

            isCharacterOwned: (charId) => {
                return get().ownedCharacterIds.includes(charId);
            },

            getOwnedCharacters: () => {
                const { ownedCharacterIds, characterCache } = get();
                return ownedCharacterIds
                    .map(id => characterCache[id])
                    .filter((char): char is SpiritCharacter => char !== undefined);
            },

            clearError: () => set({ error: null }),
        }),
        {
            name: 'echo-shift-spirits',
            // Only persist essential data, not loading states
            partialize: (state) => ({
                activeCharacter: state.activeCharacter,
                ownedCharacterIds: state.ownedCharacterIds,
                characterCache: state.characterCache,
            }),
        }
    )
);
