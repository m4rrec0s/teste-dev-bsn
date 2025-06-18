import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ToastController } from '@ionic/angular';
import { PokemonService } from './pokemon.service';

describe('PokemonService', () => {
  let service: PokemonService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    const toastSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastSpy.create.and.returnValue(
      Promise.resolve({
        present: jasmine.createSpy('present'),
        dismiss: jasmine.createSpy('dismiss'),
      } as any)
    );

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        PokemonService,
        { provide: ToastController, useValue: toastSpy },
      ],
    });
    service = TestBed.inject(PokemonService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getPokemonList', () => {
    it('should return list of pokemons', () => {
      const mockListResponse = {
        results: [
          { name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon/1/' },
          { name: 'ivysaur', url: 'https://pokeapi.co/api/v2/pokemon/2/' },
        ],
      };

      const mockPokemon1 = {
        name: 'bulbasaur',
        id: 1,
        sprites: {
          front_default: 'front_default_url',
          other: {
            'official-artwork': {
              front_default: 'official_artwork_url',
            },
          },
        },
        types: [{ type: { name: 'grass' } }, { type: { name: 'poison' } }],
      };

      const mockPokemon2 = {
        name: 'ivysaur',
        id: 2,
        sprites: {
          front_default: 'front_default_url2',
          other: {
            'official-artwork': {
              front_default: 'official_artwork_url2',
            },
          },
        },
        types: [{ type: { name: 'grass' } }, { type: { name: 'poison' } }],
      };
      service.getPokemonList(2, 0).subscribe((result) => {
        result.subscribe((pokemons: any[]) => {
          expect(pokemons.length).toBe(2);
          expect(pokemons[0].name).toBe('bulbasaur');
          expect(pokemons[0].id).toBe(1);
          expect(pokemons[0].types).toContain('grass');
          expect(pokemons[0].types).toContain('poison');
          expect(pokemons[1].name).toBe('ivysaur');
          expect(pokemons[1].id).toBe(2);
        });
      });

      // TESTE: Checkando se as requisições HTTP estão corretas

      const listReq = httpMock.expectOne(
        'https://pokeapi.co/api/v2/pokemon?limit=2&offset=0'
      );
      expect(listReq.request.method).toBe('GET');
      listReq.flush(mockListResponse);

      const pokemon1Req = httpMock.expectOne(
        'https://pokeapi.co/api/v2/pokemon/1/'
      );
      expect(pokemon1Req.request.method).toBe('GET');
      pokemon1Req.flush(mockPokemon1);

      const pokemon2Req = httpMock.expectOne(
        'https://pokeapi.co/api/v2/pokemon/2/'
      );
      expect(pokemon2Req.request.method).toBe('GET');
      pokemon2Req.flush(mockPokemon2);
    });
  });

  describe('getPokemonDetails', () => {
    it('should return pokemon details', () => {
      const mockPokemon = {
        name: 'pikachu',
        id: 25,
        sprites: {
          front_default: 'front_default_url',
          other: {
            'official-artwork': {
              front_default: 'official_artwork_url',
            },
          },
        },
        types: [{ type: { name: 'electric' } }],
        stats: [
          { base_stat: 35, stat: { name: 'hp' } },
          { base_stat: 55, stat: { name: 'attack' } },
        ],
      };

      service.getPokemonDetails('25').subscribe((pokemon) => {
        expect(pokemon.name).toBe('pikachu');
        expect(pokemon.id).toBe(25);
        expect(pokemon.types[0].type.name).toBe('electric');
      });

      const req = httpMock.expectOne('https://pokeapi.co/api/v2/pokemon/25');
      expect(req.request.method).toBe('GET');
      req.flush(mockPokemon);
    });
  });

  describe('getPokemonSpecies', () => {
    it('should return pokemon species', () => {
      const mockSpecies = {
        gender_rate: 1,
        habitat: { name: 'forest' },
        growth_rate: { name: 'medium' },
        egg_groups: [{ name: 'field' }, { name: 'fairy' }],
        capture_rate: 45,
        flavor_text_entries: [
          { language: { name: 'en' }, flavor_text: 'English description' },
          { language: { name: 'pt' }, flavor_text: 'Descrição em português' },
        ],
      };

      service.getPokemonSpecies('25').subscribe((species) => {
        expect(species.gender_rate).toBe(1);
        expect(species.habitat.name).toBe('forest');
        expect(species.egg_groups.length).toBe(2);
      });

      const req = httpMock.expectOne(
        'https://pokeapi.co/api/v2/pokemon-species/25'
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockSpecies);
    });
  });

  describe('Helper methods', () => {
    it('getTypeColor should return the correct color for type', () => {
      expect(service.getTypeColor('fire')).toBe('#F08030');
      expect(service.getTypeColor('water')).toBe('#6890F0');
      expect(service.getTypeColor('unknown_type')).toBe('#68A090');
    });

    it('getStatName should return the translated stat name', () => {
      expect(service.getStatName('hp')).toBe('HP');
      expect(service.getStatName('attack')).toBe('Ataque');
      expect(service.getStatName('defense')).toBe('Defesa');
      expect(service.getStatName('special-attack')).toBe('Ataque Especial');
    });

    it('getGenderRate should return the correct gender distribution', () => {
      expect(service.getGenderRate(-1)).toBe('Sem gênero');
      expect(service.getGenderRate(0)).toBe('♂ 100.0% ♀ 0.0%');
      expect(service.getGenderRate(4)).toBe('♂ 50.0% ♀ 50.0%');
      expect(service.getGenderRate(8)).toBe('♂ 0.0% ♀ 100.0%');
    });

    it('extractDescription should return the correct description', () => {
      const speciesData = {
        flavor_text_entries: [
          { language: { name: 'en' }, flavor_text: 'English description' },
          { language: { name: 'pt' }, flavor_text: 'Descrição em português' },
        ],
      };

      expect(service.extractDescription(speciesData)).toBe(
        'Descrição em português'
      );

      const englishOnlyData = {
        flavor_text_entries: [
          { language: { name: 'en' }, flavor_text: 'English description' },
        ],
      };

      expect(service.extractDescription(englishOnlyData)).toBe(
        'English description'
      );
    });
  });
});
