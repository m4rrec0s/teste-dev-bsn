import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule, NavController, ToastController } from '@ionic/angular';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';

import { FavoritesPage } from './favorites.page';
import { PokemonService } from '../services/pokemon.service';
import { FavoritesService } from '../services/favorites.service';

describe('FavoritesPage', () => {
  let component: FavoritesPage;
  let fixture: ComponentFixture<FavoritesPage>;
  let pokemonServiceSpy: jasmine.SpyObj<PokemonService>;
  let favoritesServiceSpy: jasmine.SpyObj<FavoritesService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let toastControllerSpy: jasmine.SpyObj<ToastController>;

  const favoritesMock = new BehaviorSubject<number[]>([]);
  beforeEach(() => {
    const pokemonSpy = jasmine.createSpyObj('PokemonService', [
      'getPokemonDetails',
      'getTypeColor',
      'getPokemonUrl',
      'getPokemonGif',
    ]);

    const mockPokemon1 = {
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
    };

    const mockPokemon2 = {
      id: 1,
      name: 'bulbasaur',
      sprites: {
        front_default: 'bulbasaur.png',
        other: {
          'official-artwork': {
            front_default: 'bulbasaur_official.png',
          },
        },
      },
      types: [{ type: { name: 'grass' } }, { type: { name: 'poison' } }],
    };

    pokemonSpy.getPokemonDetails.and.callFake((id: string) => {
      if (id === '25') return of(mockPokemon1);
      if (id === '1') return of(mockPokemon2);
      return of({});
    });
    pokemonSpy.getTypeColor.and.returnValue('#F8D030');
    pokemonSpy.getPokemonUrl.and.callFake(
      (id: string) => `https://pokeapi.co/api/v2/pokemon/${id}/`
    );
    pokemonSpy.getPokemonGif.and.returnValue('pikachu.gif');

    const favoritesSpy = jasmine.createSpyObj('FavoritesService', [
      'toggleFavorite',
      'isFavorite',
      'getFavorites',
      'clearFavorites',
    ]);
    favoritesSpy.favorites$ = favoritesMock.asObservable();
    favoritesSpy.getFavorites.and.returnValue([]);
    const router = jasmine.createSpyObj('Router', [
      'navigate',
      'navigateByUrl',
    ]);
    const navSpy = jasmine.createSpyObj('NavController', ['navigateForward']);

    const toastSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastSpy.create.and.returnValue(
      Promise.resolve({
        present: jasmine.createSpy('present'),
        dismiss: jasmine.createSpy('dismiss'),
      } as any)
    );
    TestBed.configureTestingModule({
      declarations: [FavoritesPage],
      imports: [IonicModule.forRoot(), HttpClientTestingModule],
      providers: [
        { provide: PokemonService, useValue: pokemonSpy },
        { provide: FavoritesService, useValue: favoritesSpy },
        { provide: Router, useValue: router },
        { provide: NavController, useValue: navSpy },
        { provide: ToastController, useValue: toastSpy },
      ],
    });

    fixture = TestBed.createComponent(FavoritesPage);
    component = fixture.componentInstance;
    pokemonServiceSpy = TestBed.inject(
      PokemonService
    ) as jasmine.SpyObj<PokemonService>;
    favoritesServiceSpy = TestBed.inject(
      FavoritesService
    ) as jasmine.SpyObj<FavoritesService>;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    toastControllerSpy = TestBed.inject(
      ToastController
    ) as jasmine.SpyObj<ToastController>;

    pokemonServiceSpy.getPokemonUrl.and.callFake(
      (id) => `https://pokeapi.co/api/v2/pokemon/${id}/`
    );
    pokemonServiceSpy.getPokemonGif.and.returnValue('pikachu.gif');
    favoritesSpy.getFavorites.and.returnValue([]);
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should show no favorites message when favorites list is empty', () => {
    favoritesMock.next([]);
    fixture.detectChanges();

    expect(component.noFavorites).toBeTrue();
    expect(component.loading).toBeFalse();
  });
  it('should load favorite pokemons when there are favorites', () => {
    const mockPokemon1 = {
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
    };

    pokemonServiceSpy.getPokemonDetails.and.returnValue(of(mockPokemon1));

    favoritesMock.next([25, 1]);
    fixture.detectChanges();

    expect(pokemonServiceSpy.getPokemonDetails).toHaveBeenCalled();
  });

  it('should navigate to details when goToDetails is called', () => {
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

  it('should clear all favorites when clearAllFavorites is called', () => {
    fixture.detectChanges();

    const event = jasmine.createSpyObj('Event', ['preventDefault']);
    component.clearAllFavorites(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(favoritesServiceSpy.clearFavorites).toHaveBeenCalled();
    expect(component.noFavorites).toBeTrue();
  });
  it('should retry loading when retryLoading is called', () => {
    favoritesMock.next([25]);
    favoritesServiceSpy.getFavorites.and.returnValue([25]);
    fixture.detectChanges();

    // SITUATION: Simulando um erro de carregamento

    component.loadingError = true;
    component.errorMessage = 'Erro de teste';

    component.retryLoading();

    expect(component.loadingError).toBeFalse();
    expect(pokemonServiceSpy.getPokemonDetails).toHaveBeenCalled();
  });

  it('should show cache notification when using expired cache', async () => {
    const mockPokemon = {
      id: 25,
      name: 'pikachu',
      _fromExpiredCache: true,
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

    pokemonServiceSpy.getPokemonDetails.and.returnValue(of(mockPokemon));
    favoritesMock.next([25]);

    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.usingCachedData).toBeTrue();
    expect(toastControllerSpy.create).toHaveBeenCalled();
  });
});
