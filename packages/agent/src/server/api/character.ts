import type { Character } from '@elizaos/core';
import { logger, validateCharacterConfig, UUID } from '@elizaos/core';
import { createDatabaseAdapter } from '@elizaos/plugin-sql';
import type { Request, Response } from 'express';
import { Router } from 'express';
import { handleValidationError } from './api-utils';

// Create database adapter from environment variables.
const dbAdapter = createDatabaseAdapter({
    dataDir: process.env.PGLITE_DATA_DIR,
    postgresUrl: process.env.POSTGRES_URL,
});

// Utility function to parse and validate character data.
function getValidatedCharacter(req: Request): Character {
    return validateCharacterConfig(req.body) as Character;
}

// Utility function to check if a character exists.
async function ensureCharacterExists(id: UUID, res: Response): Promise<Character | null> {
    const character = await dbAdapter.getCharacter(id);
    if (!character) {
        res.status(404).json({ error: 'Character not found' });
        return null;
    }
    return character;
}

export function characterRouter(): Router {
    const router = Router();

    // Base route for listing characters and creating new ones.
    router.route('/')
        .get(async (_req: Request, res: Response): Promise<void> => {
            try {
                const characters = await dbAdapter.listCharacters();
                res.json({ characters });
            } catch (error) {
                logger.error('Failed to list characters:', error);
                res.status(500).json({ error: 'Failed to retrieve characters' });
            }
        })
        .post(async (req: Request, res: Response): Promise<void> => {
            try {
                const character = getValidatedCharacter(req);
                const existing = await dbAdapter.getCharacterByName(character.name);
                if (existing) {
                    res.status(409).json({ error: 'Character already exists' });
                    return;
                }
                const id = await dbAdapter.createCharacter(character);
                const newCharacter = await dbAdapter.getCharacter(id);
                res.status(201).json(newCharacter);
            } catch (error) {
                handleValidationError(error, res, 'Failed to create character');
            }
        });

    // Routes for managing a specific character.
    router.route('/:id')
        .get(async (req: Request<{ id: UUID }>, res: Response): Promise<void> => {
            try {
                const character = await dbAdapter.getCharacter(req.params.id);
                if (!character) {
                    res.status(404).json({ error: 'Character not found' });
                    return;
                }
                res.json(character);
            } catch (error) {
                logger.error('Failed to get character:', error);
                res.status(500).json({ error: 'Failed to retrieve character' });
            }
        })
        .put(async (req: Request<{ id: UUID }>, res: Response): Promise<void> => {
            try {
                if (!(await ensureCharacterExists(req.params.id, res))) return;
                const character = getValidatedCharacter(req);
                await dbAdapter.updateCharacter(req.params.id, character);
                const updated = await dbAdapter.getCharacter(req.params.id);
                res.json(updated);
            } catch (error) {
                handleValidationError(error, res, 'Failed to update character');
            }
        })
        .delete(async (req: Request<{ id: UUID }>, res: Response): Promise<void> => {
            try {
                if (!(await ensureCharacterExists(req.params.id, res))) return;
                await dbAdapter.removeCharacter(req.params.id);
                res.status(204).end();
            } catch (error) {
                logger.error('Failed to remove character:', error);
                res.status(500).json({ error: 'Failed to delete character' });
            }
        });

    // Import route that updates an existing character or creates a new one.
    router.route('/import')
        .post(async (req: Request, res: Response): Promise<void> => {
            try {
                const character = getValidatedCharacter(req);
                const existing = await dbAdapter.getCharacterByName(character.name);
                if (existing) {
                    await dbAdapter.updateCharacter(existing.id, character);
                    const updated = await dbAdapter.getCharacter(existing.id);
                    res.json(updated);
                } else {
                    const id = await dbAdapter.createCharacter(character);
                    const newChar = await dbAdapter.getCharacter(id);
                    res.status(201).json(newChar);
                }
            } catch (error) {
                handleValidationError(error, res, 'Failed to import character');
            }
        });

    // Lookup route to find character by name
    router.get('/name/:name', async (req: Request<{ name: string }>, res: Response): Promise<void> => {
        try {
            const character = await dbAdapter.getCharacterByName(req.params.name);
            if (!character) {
                res.status(404).json({ error: 'Character not found' });
                return;
            }
            res.json(character);
        } catch (error) {
            logger.error('Failed to get character by name:', error);
            res.status(500).json({ error: 'Failed to retrieve character' });
        }
    });

    return router;
}
