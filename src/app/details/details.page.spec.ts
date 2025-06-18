import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, NavController } from '@ionic/angular';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, BehaviorSubject } from 'rxjs';

import { DetailsPage } from './details.page';
import { PokemonService } from '../services/pokemon.service';
import { FavoritesService } from '../services/favorites.service';

describe('DetailsPage', () => {
  let component: DetailsPage;
  let fixture: ComponentFixture<DetailsPage>;
  let pokemonServiceSpy: jasmine.SpyObj<PokemonService>;
  let favoritesServiceSpy: jasmine.SpyObj<FavoritesService>;

  const favoritesMock = new BehaviorSubject<number[]>([]);

  const mockPokemon = {
    id: 25,
    name: 'pikachu',
    sprites: {
      front_default: 'pikachu.png',
      other: {
        'official-artwork': {
          front_default: 'pikachu_official.png',
        },
      },
    },
    types: [{ type: { name: 'electric' } }],
    height: 4,
    weight: 60,
    base_experience: 112,
    stats: [
      { base_stat: 35, stat: { name: 'hp' } },
      { base_stat: 55, stat: { name: 'attack' } },
      { base_stat: 40, stat: { name: 'defense' } },
    ],
    abilities: [
      { ability: { name: 'static' }, is_hidden: false },
      { ability: { name: 'lightning-rod' }, is_hidden: true },
    ],
  };

  const mockSpecies = {
    flavor_text_entries: [
      { language: { name: 'en' }, flavor_text: 'English description' },
      { language: { name: 'pt' }, flavor_text: 'Descrição em português' },
    ],
    gender_rate: 4,
    habitat: { name: 'forest' },
    growth_rate: { name: 'medium' },
    egg_groups: [{ name: 'field' }, { name: 'fairy' }],
    capture_rate: 45,
  };
  beforeEach(() => {
    const pokemonSpy = jasmine.createSpyObj('PokemonService', [
      'getPokemonDetails',
      'getPokemonSpecies',
      'getTypeColor',
      'getStatName',
      'getExperienceClass',
      'getGenderRate',
      'getHabitat',
      'getGrowthRate',
      'getEggGroups',
      'getCaptureRate',
      'getTotalStats',
      'extractDescription',
      'getPokemonGif',
    ]);

    const favoritesSpy = jasmine.createSpyObj('FavoritesService', [
      'toggleFavorite',
      'isFavorite',
    ]);
    favoritesSpy.favorites$ = favoritesMock.asObservable();

    // TESTE: NavController
    const navSpy = jasmine.createSpyObj('NavController', ['back']);

    // TESTE: ActivatedRoute
    const activatedRoute = {
      snapshot: {
        paramMap: {
          get: jasmine.createSpy('get').and.returnValue('25'),
        },
      },
    };
    TestBed.configureTestingModule({
      declarations: [DetailsPage],
      imports: [IonicModule.forRoot(), HttpClientTestingModule],
      providers: [
        { provide: PokemonService, useValue: pokemonSpy },
        { provide: FavoritesService, useValue: favoritesSpy },
        { provide: ActivatedRoute, useValue: activatedRoute },
        { provide: NavController, useValue: navSpy },
        {
          provide: Router,
          useValue: jasmine.createSpyObj('Router', [
            'navigate',
            'navigateByUrl',
          ]),
        },
      ],
    });

    fixture = TestBed.createComponent(DetailsPage);
    component = fixture.componentInstance;
    pokemonServiceSpy = TestBed.inject(
      PokemonService
    ) as jasmine.SpyObj<PokemonService>;
    favoritesServiceSpy = TestBed.inject(
      FavoritesService
    ) as jasmine.SpyObj<FavoritesService>;

    pokemonServiceSpy.getPokemonDetails.and.returnValue(of(mockPokemon));
    pokemonServiceSpy.getPokemonSpecies.and.returnValue(of(mockSpecies));
    pokemonServiceSpy.getTypeColor.and.returnValue('#F8D030');
    pokemonServiceSpy.getStatName.and.callFake((name: string) => {
      const map: Record<string, string> = {
        hp: 'HP',
        attack: 'Ataque',
        defense: 'Defesa',
      };
      return map[name] || name;
    });

    pokemonServiceSpy.getExperienceClass.and.returnValue('text-yellow-400');
    pokemonServiceSpy.getGenderRate.and.returnValue('♂ 50.0% ♀ 50.0%');
    pokemonServiceSpy.getHabitat.and.returnValue('Floresta');
    pokemonServiceSpy.getGrowthRate.and.returnValue('Médio');
    pokemonServiceSpy.getEggGroups.and.returnValue(['Campo', 'Fada']);
    pokemonServiceSpy.getCaptureRate.and.returnValue('17.6%');
    pokemonServiceSpy.getTotalStats.and.returnValue(130);
    pokemonServiceSpy.extractDescription.and.returnValue(
      'Descrição em português'
    );
    pokemonServiceSpy.getPokemonGif.and.returnValue('pikachu.gif');
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load pokemon details on init', () => {
    fixture.detectChanges();

    expect(pokemonServiceSpy.getPokemonDetails).toHaveBeenCalledWith('25');
    expect(pokemonServiceSpy.getPokemonSpecies).toHaveBeenCalledWith('25');

    expect(component.pokemon).toBeTruthy();
    expect(component.pokemon.name).toBe('pikachu');
    expect(component.pokemon.id).toBe(25);
    expect(component.pokemonSpecies).toBeTruthy();
    expect(component.description).toBe('Descrição em português');
    expect(component.loading).toBeFalse();
  });

  it('should call helper methods from PokemonService', () => {
    fixture.detectChanges();

    // TESTE: Verificando se os métodos do serviço são chamados corretamente

    component.getTypeColor('electric');
    expect(pokemonServiceSpy.getTypeColor).toHaveBeenCalledWith('electric');

    component.getStatName('hp');
    expect(pokemonServiceSpy.getStatName).toHaveBeenCalledWith('hp');

    component.getExperienceClass();
    expect(pokemonServiceSpy.getExperienceClass).toHaveBeenCalled();

    component.getGenderRate();
    expect(pokemonServiceSpy.getGenderRate).toHaveBeenCalled();

    component.getHabitat();
    expect(pokemonServiceSpy.getHabitat).toHaveBeenCalled();

    component.getGrowthRate();
    expect(pokemonServiceSpy.getGrowthRate).toHaveBeenCalled();

    component.getEggGroups();
    expect(pokemonServiceSpy.getEggGroups).toHaveBeenCalled();

    component.getCaptureRate();
    expect(pokemonServiceSpy.getCaptureRate).toHaveBeenCalled();

    component.getTotalStats();
    expect(pokemonServiceSpy.getTotalStats).toHaveBeenCalled();
  });

  it('should toggle favorite when toggleFavorite is called', () => {
    fixture.detectChanges();

    const event = jasmine.createSpyObj('Event', [
      'preventDefault',
      'stopPropagation',
    ]);
    component.toggleFavorite(event);

    expect(favoritesServiceSpy.toggleFavorite).toHaveBeenCalledWith(25);
  });

  it('should update isFavorited when favorites change', () => {
    fixture.detectChanges();
    expect(component.isFavorited).toBeFalse();

    // TESTE: Adicionando Pokémon aos favoritos

    favoritesMock.next([25]);
    expect(component.isFavorited).toBeTrue();

    favoritesMock.next([]);
    expect(component.isFavorited).toBeFalse();
  });
  it('should reload pokemon data when reloadPokemonData is called', () => {
    fixture.detectChanges();

    pokemonServiceSpy.getPokemonDetails.calls.reset();
    pokemonServiceSpy.getPokemonSpecies.calls.reset();
    component.reloadPokemonData();

    expect(pokemonServiceSpy.getPokemonDetails).toHaveBeenCalledWith('25');
  });
  it('should call window.history.back when goBack is called', () => {
    fixture.detectChanges();

    spyOn(window.history, 'back');
    component.goBack();
    expect(window.history.back).toHaveBeenCalled();
  });
});
