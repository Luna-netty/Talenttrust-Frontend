import { describe, it, expect, beforeEach } from 'vitest';
import {
  CommandItem,
  rankCommands,
  parseDynamicCommands,
  getRecentCommands,
  saveRecentCommand,
} from '@/lib/commands';

// Known-valid Stellar account address (checksum verified by validateAddress).
const VALID_ADDRESS = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7';

describe('commands library', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('parseDynamicCommands', () => {
    it('parses numeric query as escrow lookup', () => {
      const parsed = parseDynamicCommands('42');
      expect(parsed).toHaveLength(1);
      expect(parsed[0].title).toBe('Go to escrow #42');
      expect(parsed[0].href).toBe('/contracts/42');
    });

    it('parses hash numeric query as escrow lookup', () => {
      const parsed = parseDynamicCommands('#101');
      expect(parsed).toHaveLength(1);
      expect(parsed[0].title).toBe('Go to escrow #101');
      expect(parsed[0].href).toBe('/contracts/101');
    });

    it('offers reputation lookup for a valid Stellar account address', () => {
      const parsed = parseDynamicCommands(VALID_ADDRESS);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].title).toContain('Look up reputation for');
      expect(parsed[0].href).toBe(`/reputation?address=${encodeURIComponent(VALID_ADDRESS)}`);
    });

    it('does not offer reputation lookup for a wrong-checksum 56-char address', () => {
      // Same as VALID_ADDRESS with the last character changed: correct shape, bad checksum.
      const bad = VALID_ADDRESS.slice(0, 55) + (VALID_ADDRESS.endsWith('N') ? 'M' : 'N');
      expect(bad).toHaveLength(56);
      expect(parseDynamicCommands(bad)).toEqual([]);
    });

    it('does not offer reputation lookup for invalid base32 characters', () => {
      const bad = 'G' + '1'.repeat(55);
      expect(parseDynamicCommands(bad)).toEqual([]);
    });

    it('accepts lowercase input and uses the normalized address in href', () => {
      const parsed = parseDynamicCommands(VALID_ADDRESS.toLowerCase());
      expect(parsed).toHaveLength(1);
      expect(parsed[0].href).toBe(`/reputation?address=${encodeURIComponent(VALID_ADDRESS)}`);
    });

    it('accepts valid addresses padded with whitespace and zero-width characters', () => {
      const padded = `  \u200b${VALID_ADDRESS}\u200d \ufeff `;
      const parsed = parseDynamicCommands(padded);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].href).toBe(`/reputation?address=${encodeURIComponent(VALID_ADDRESS)}`);
    });

    it('returns empty array for non-matching query', () => {
      expect(parseDynamicCommands('hello world')).toEqual([]);
    });
  });

  describe('rankCommands', () => {
    const testCommands: CommandItem[] = [
      { id: '1', title: 'Home', subtitle: '/', category: 'Navigation' },
      { id: '2', title: 'Escrows Dashboard', subtitle: '/contracts', category: 'Navigation' },
      { id: '3', title: 'Reputation Lookup', subtitle: '/reputation', category: 'Navigation' },
      { id: '4', title: 'Documentation', subtitle: '/docs', category: 'Navigation' },
    ];

    it('returns all items when query is empty', () => {
      const ranked = rankCommands('', testCommands);
      expect(ranked).toHaveLength(4);
    });

    it('ranks exact and prefix matches higher than substrings', () => {
      const ranked = rankCommands('rep', testCommands);
      expect(ranked[0].id).toBe('3'); // Reputation Lookup
    });

    it('ranks word-start matches appropriately', () => {
      const ranked = rankCommands('dash', testCommands);
      expect(ranked[0].id).toBe('2'); // Escrows Dashboard
    });

    it('filters out non-matching commands', () => {
      const ranked = rankCommands('xyz123', testCommands);
      expect(ranked).toHaveLength(0);
    });
  });

  describe('recent commands persistence', () => {
    const cmd1: CommandItem = { id: 'c1', title: 'Cmd 1', category: 'Navigation', href: '/1' };
    const cmd2: CommandItem = { id: 'c2', title: 'Cmd 2', category: 'Navigation', href: '/2' };

    it('persists and retrieves recent commands', () => {
      saveRecentCommand(cmd1);
      saveRecentCommand(cmd2);

      const recent = getRecentCommands();
      expect(recent).toHaveLength(2);
      expect(recent[0].id).toBe('c2'); // Most recent first
      expect(recent[1].id).toBe('c1');
    });

    it('safely handles corrupted localStorage data', () => {
      localStorage.setItem('tt_recent_commands', 'invalid-json{{');
      expect(getRecentCommands()).toEqual([]);
    });
  });
});
