import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule, NavController } from '@ionic/angular';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, of } from 'rxjs';

import { HomePage } from './home.page';
import { PokemonService } from '../services/pokemon.service';
import { FavoritesService } from '../services/favorites.service';
import { Router } from '@angular/router';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;
  let pokemonServiceSpy: jasmine.SpyObj<PokemonService>;
  let favoritesServiceSpy: jasmine.SpyObj<FavoritesService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const favoritesMock = new BehaviorSubject<number[]>([]);

  beforeEach(async () => {
    const pokemonSpy = jasmine.createSpyObj('PokemonService', [
      'getPokemonList',
      'getAllTypes',
      'getPokemonsByType',
      'getPokemonByName',
      'getTypeColor',
      'getPokemonUrl',
    ]);

    const favoritesSpy = jasmine.createSpyObj('FavoritesService', [
      'toggleFavorite',
      'isFavorite',
      'getFavorites',
    ]);
    favoritesSpy.favorites$ = favoritesMock.asObservable();
    favoritesSpy.getFavorites.and.returnValue([]);

    const router = jasmine.createSpyObj('Router', [
      'navigate',
      'navigateByUrl',
    ]);
    const navSpy = jasmine.createSpyObj('NavController', [
      'navigateForward',
      'back',
    ]);

    await TestBed.configureTestingModule({
      declarations: [HomePage],
      imports: [IonicModule.forRoot(), HttpClientTestingModule, FormsModule],
      providers: [
        { provide: PokemonService, useValue: pokemonSpy },
        { provide: FavoritesService, useValue: favoritesSpy },
        { provide: Router, useValue: router },
        { provide: NavController, useValue: navSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    pokemonServiceSpy = TestBed.inject(
      PokemonService
    ) as jasmine.SpyObj<PokemonService>;
    favoritesServiceSpy = TestBed.inject(
      FavoritesService
    ) as jasmine.SpyObj<FavoritesService>;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    pokemonServiceSpy.getAllTypes.and.returnValue(
      of(['water', 'fire', 'grass'])
    );
    pokemonServiceSpy.getTypeColor.and.returnValue('#6890F0');

    const mockPokemons = [
      {
        name: 'bulbasaur',
        url: 'https://pokeapi.co/api/v2/pokemon/1/',
        id: 1,
        image: 'bulbasaur.png',
        types: ['grass', 'poison'],
      },
      {
        name: 'charmander',
        url: 'https://pokeapi.co/api/v2/pokemon/4/',
        id: 4,
        image: 'charmander.png',
        types: ['fire'],
      },
    ];

    pokemonServiceSpy.getPokemonList.and.returnValue(of(mockPokemons));
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load types and pokemons on init', () => {
    fixture.detectChanges();

    expect(pokemonServiceSpy.getAllTypes).toHaveBeenCalled();
    expect(pokemonServiceSpy.getPokemonList).toHaveBeenCalledWith(20, 0);

    expect(component.types.length).toBe(3);
    expect(component.types).toContain('water');
    expect(component.types).toContain('fire');
    expect(component.types).toContain('grass');
  });

  it('should navigate to details when pokemon is clicked', () => {
    fixture.detectChanges();

    component.goToDetails('https://pokeapi.co/api/v2/pokemon/25/');

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/details', '25']);
  });

  it('should toggle favorite when toggleFavorite is called', () => {
    fixture.detectChanges();

    const event = jasmine.createSpyObj('Event', ['stopPropagation']);
    component.toggleFavorite(event, 25);

    expect(event.stopPropagation).toHaveBeenCalled();
    expect(favoritesServiceSpy.toggleFavorite).toHaveBeenCalledWith(25);
  });

  it('should check if pokemon is favorite', () => {
    favoritesServiceSpy.isFavorite.and.returnValue(true);
    fixture.detectChanges();

    expect(component.isFavorite(25)).toBeTrue();
    expect(favoritesServiceSpy.isFavorite).toHaveBeenCalledWith(25);
  });

  it('should update favoriteCount when favorites change', () => {
    fixture.detectChanges();
    expect(component.favoriteCount).toBe(0);

    // SIMULATION: adicionando favoritos
    favoritesMock.next([1, 4]);
    expect(component.favoriteCount).toBe(2);
  });

  it('should search pokemon by name (simple test)', () => {
    const mockPokemon = {
      name: 'pikachu',
      id: 25,
      sprites: {
        front_default: 'pikachu.png',
        other: {
          'official-artwork': {
            front_default: 'pikachu_official.png',
          },
        },
      },
      types: [{ type: { name: 'electric' } }],
    };

    // TESTE: Verificando se o serviço é chamado corretamente

    pokemonServiceSpy.getPokemonByName.and.returnValue(of(mockPokemon));
    pokemonServiceSpy.getPokemonUrl.and.returnValue(
      'https://pokeapi.co/api/v2/pokemon/25/'
    );

    fixture.detectChanges();

    component.searchName = 'pikachu';
    component.onSearch();

    expect(pokemonServiceSpy.getPokemonByName).toHaveBeenCalledWith('pikachu');
  });

  it('should filter pokemon by type (simple test)', () => {
    const mockTypeNames = ['bulbasaur', 'ivysaur'];
    pokemonServiceSpy.getPokemonsByType.and.returnValue(of(mockTypeNames));

    fixture.detectChanges();

    component.selectedType = 'grass';
    component.onTypeChange();

    expect(pokemonServiceSpy.getPokemonsByType).toHaveBeenCalledWith('grass');
  });
});
