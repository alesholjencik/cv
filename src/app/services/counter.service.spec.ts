import { TestBed } from '@angular/core/testing';
import { Preferences } from '@capacitor/preferences';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SavedCounter } from '../models/saved-counter';
import { CounterService } from './counter.service';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

describe('CounterService', () => {
  let service: CounterService;

  const getMock = vi.mocked(Preferences.get);
  const setMock = vi.mocked(Preferences.set);
  const removeMock = vi.mocked(Preferences.remove);

  const first: SavedCounter = {
    id: 'first',
    name: 'První',
    value: 1,
    createdAt: '2026-09-17T08:00:00.000Z',
  };

  const second: SavedCounter = {
    id: 'second',
    name: 'Druhé',
    value: 2,
    createdAt: '2026-09-17T09:00:00.000Z',
  };

  beforeEach(() => {
    // Vynulujeme počty volání mocků z předchozího testu.
    vi.clearAllMocks();

    // Výchozí stav: v Preferences zatím není uložená historie.
    getMock.mockResolvedValue({ value: null });

    // Zápis i odstranění ve výchozím stavu úspěšně skončí.
    setMock.mockResolvedValue(undefined);
    removeMock.mockResolvedValue(undefined);

    // Pro každý test vytvoříme nové prostředí Angular dependency injection.
    TestBed.configureTestingModule({
      providers: [CounterService],
    });

    // Z testovacího injectoru získáme čerstvou instanci služby.
    service = TestBed.inject(CounterService);
  });

  it('should initialize only once', async () => {
    // Dvě volání bez čekání simulují souběžné požadavky na inicializaci.
    await Promise.all([service.initialize(), service.initialize()]);

    // Další volání proběhne až po dokončení první inicializace.
    await service.initialize();

    // Všechna volání musí sdílet jedinou operaci načtení Preferences.
    expect(getMock).toHaveBeenCalledTimes(1);

    // Služba dokončila inicializaci a při value: null má prázdnou historii.
    expect(service.initialized()).toBe(true);
    expect(service.counters()).toEqual([]);
  });

  // Scénář 1: Načtení uložených dat
  it('should load stored counters upon initialization', async () => {
    getMock.mockResolvedValue({
      value: JSON.stringify([first, second]),
    });

    await service.initialize();

    expect(getMock).toHaveBeenCalledWith({ key: 'saved-counters' });
    expect(service.counters()).toEqual([first, second]);
    expect(service.initialized()).toBe(true);
  });

  // Scénář 2: Přidání záznamu
  it('should prepend a new counter and persist to storage', async () => {
    getMock.mockResolvedValue({
      value: JSON.stringify([second]),
    });

    await service.add(first);

    // Záznam se vloží na začátek
    expect(service.counters()).toEqual([first, second]);

    // Ověření správného klíče i JSON hodnoty pro Preferences.set()
    expect(setMock).toHaveBeenCalledWith({
      key: 'saved-counters',
      value: JSON.stringify([first, second]),
    });
  });

  // Scénář 3: Odstranění jednoho záznamu
  it('should remove a single counter by id and persist updated list', async () => {
    getMock.mockResolvedValue({
      value: JSON.stringify([first, second]),
    });

    await service.remove('first');

    expect(service.counters()).toEqual([second]);
    expect(setMock).toHaveBeenCalledWith({
      key: 'saved-counters',
      value: JSON.stringify([second]),
    });
  });

  // Scénář 4: Vymazání historie
  it('should clear all counters and remove storage key', async () => {
    getMock.mockResolvedValue({
      value: JSON.stringify([first, second]),
    });

    await service.clear();

    expect(service.counters()).toEqual([]);
    expect(removeMock).toHaveBeenCalledWith({ key: 'saved-counters' });
  });

  // Scénář 5a: Poškozená uložená hodnota – syntakticky neplatný JSON
  it('should recover from syntactically invalid JSON', async () => {
    getMock.mockResolvedValue({
      value: 'this is not a valid JSON',
    });

    const errorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    await service.initialize();

    expect(service.counters()).toEqual([]);
    expect(service.initialized()).toBe(true);
    expect(errorSpy).toHaveBeenCalledWith(
      'Historii počítadel se nepodařilo načíst.',
      expect.any(Error),
    );

    errorSpy.mockRestore();
  });

  // Scénář 5b: Poškozená uložená hodnota – platný JSON, ale nejedná se o pole
  it('should recover from non-array JSON value', async () => {
    getMock.mockResolvedValue({
      value: JSON.stringify({ name: 'test' }),
    });

    const errorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    await service.initialize();

    expect(service.counters()).toEqual([]);
    expect(service.initialized()).toBe(true);
    expect(errorSpy).toHaveBeenCalledWith(
      'Historii počítadel se nepodařilo načíst.',
      expect.any(Error),
    );

    errorSpy.mockRestore();
  });
});