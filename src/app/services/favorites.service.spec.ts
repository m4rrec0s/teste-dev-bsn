import { TestBed } from '@angular/core/testing';
import { FavoritesService } from './favorites.service';

describe('FavoritesService', () => {
  let service: FavoritesService;

  beforeEach(() => {
    // Limpar localStorage antes de cada teste
    localStorage.clear();

    TestBed.configureTestingModule({});
    service = TestBed.inject(FavoritesService);
  });

  afterEach(() => {
    // Limpar localStorage após cada teste
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('favorites management', () => {
    it('should start with empty favorites', () => {
      expect(service.getFavorites().length).toBe(0);
    });

    it('should add a pokemon to favorites when toggling a new id', () => {
      const pokemonId = 25; // Pikachu
      service.toggleFavorite(pokemonId);

      expect(service.getFavorites().length).toBe(1);
      expect(service.getFavorites()).toContain(pokemonId);
      expect(service.isFavorite(pokemonId)).toBeTrue();
    });

    it('should remove a pokemon from favorites when toggling an existing id', () => {
      const pokemonId = 25; // Pikachu

      // Primeiro adiciona
      service.toggleFavorite(pokemonId);
      expect(service.isFavorite(pokemonId)).toBeTrue();

      // Depois remove
      service.toggleFavorite(pokemonId);
      expect(service.isFavorite(pokemonId)).toBeFalse();
      expect(service.getFavorites().length).toBe(0);
    });

    it('should handle multiple favorites', () => {
      service.toggleFavorite(1); // Bulbasaur
      service.toggleFavorite(4); // Charmander
      service.toggleFavorite(7); // Squirtle

      expect(service.getFavorites().length).toBe(3);
      expect(service.isFavorite(1)).toBeTrue();
      expect(service.isFavorite(4)).toBeTrue();
      expect(service.isFavorite(7)).toBeTrue();
      expect(service.isFavorite(25)).toBeFalse(); // Pikachu não está na lista
    });

    it('should clear all favorites', () => {
      service.toggleFavorite(1);
      service.toggleFavorite(4);
      expect(service.getFavorites().length).toBe(2);

      service.clearFavorites();
      expect(service.getFavorites().length).toBe(0);
    });
  });

  describe('localStorage integration', () => {
    it('should save favorites to localStorage', () => {
      service.toggleFavorite(25);

      // Verificar se foi salvo no localStorage
      const storedData = localStorage.getItem('pokemon_favorites');
      expect(storedData).toBeTruthy();

      const parsedData = JSON.parse(storedData || '[]');
      expect(parsedData).toContain(25);
    });

    it('should load favorites from localStorage on initialization', () => {
      // Limpar o serviço existente
      localStorage.clear();

      // Simular dados previamente salvos
      localStorage.setItem('pokemon_favorites', JSON.stringify([1, 4, 7]));

      // Criar uma nova instância do serviço que deve carregar os dados
      const newService = new FavoritesService();

      expect(newService.getFavorites().length).toBe(3);
      expect(newService.isFavorite(1)).toBeTrue();
      expect(newService.isFavorite(4)).toBeTrue();
      expect(newService.isFavorite(7)).toBeTrue();
    });
  });

  describe('observable behavior', () => {
    it('should emit updated favorites list through observable', (done) => {
      let emissionCount = 0;

      service.favorites$.subscribe((favorites) => {
        emissionCount++;

        // Primeira emissão é a lista vazia inicial
        if (emissionCount === 1) {
          expect(favorites.length).toBe(0);
        }

        // Segunda emissão após adicionar um favorito
        if (emissionCount === 2) {
          expect(favorites.length).toBe(1);
          expect(favorites).toContain(25);
        }

        // Terceira emissão após adicionar outro favorito
        if (emissionCount === 3) {
          expect(favorites.length).toBe(2);
          expect(favorites).toContain(25);
          expect(favorites).toContain(1);
          done();
        }
      });

      service.toggleFavorite(25);
      service.toggleFavorite(1);
    });
  });
});
