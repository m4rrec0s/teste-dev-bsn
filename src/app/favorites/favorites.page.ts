import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { PokemonService } from '../services/pokemon.service';
import { FavoritesService } from '../services/favorites.service';
import { forkJoin, Subscription } from 'rxjs';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-favorites',
  templateUrl: 'favorites.page.html',
  standalone: false,
})
export class FavoritesPage implements OnInit, OnDestroy {
  favorites: any[] = [];
  loading = true;
  noFavorites = false;
  loadingError = false;
  errorMessage = '';
  usingCachedData = false;
  private favoritesSubscription: Subscription | null = null;

  constructor(
    private pokemonService: PokemonService,
    private favoritesService: FavoritesService,
    private router: Router,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.favoritesSubscription = this.favoritesService.favorites$.subscribe(
      (favoriteIds) => {
        if (favoriteIds.length === 0) {
          this.noFavorites = true;
          this.loading = false;
          this.favorites = [];
        } else {
          this.loadFavoritesDetails(favoriteIds);
        }
      }
    );
  }

  ngOnDestroy() {
    if (this.favoritesSubscription) {
      this.favoritesSubscription.unsubscribe();
    }
  }
  loadFavoritesDetails(favoriteIds: number[]) {
    this.loading = true;
    this.noFavorites = false;
    this.loadingError = false;
    this.usingCachedData = false;

    const requests = favoriteIds.map((id) =>
      this.pokemonService.getPokemonDetails(id.toString())
    );

    forkJoin(requests).subscribe({
      next: (details: any[]) => {
        const usingExpiredCache = details.some(
          (pokemon) => pokemon._fromExpiredCache
        );

        if (usingExpiredCache) {
          this.usingCachedData = true;
          this.presentCacheNotification();
        }

        this.favorites = details.map((pokemon: any) => ({
          name: pokemon.name,
          url: this.pokemonService.getPokemonUrl(pokemon.id),
          id: pokemon.id,
          image:
            pokemon.sprites.other['official-artwork'].front_default ||
            pokemon.sprites.front_default ||
            'assets/icon/favicon.png',
          gif: this.pokemonService.getPokemonGif(pokemon),
          types: pokemon.types.map((type: any) => type.type.name),
        }));
        this.loading = false;

        if (this.favorites.length === 0) {
          this.noFavorites = true;
        }
      },
      error: (error) => {
        console.error('Erro ao carregar Pokémon favoritos:', error);
        this.loading = false;
        this.loadingError = true;

        if (error.message && error.message.includes('SSL')) {
          this.errorMessage =
            'Ocorreu um erro de conexão segura (SSL) com a PokeAPI. Seus favoritos estão salvos, mas não foi possível carregar os detalhes neste momento.';
        } else if (error.status === 0) {
          this.errorMessage =
            'Parece que você está sem conexão com a internet. Seus favoritos estão salvos, mas não foi possível carregar os detalhes neste momento.';
        } else {
          this.errorMessage =
            'Não foi possível carregar seus Pokémon favoritos. Por favor, tente novamente mais tarde.';
        }
      },
    });
  }

  goToDetails(pokemonUrl: string) {
    const id = pokemonUrl.split('/').filter(Boolean).pop();
    this.router.navigate(['/details', id]);
  }

  getTypeColor(type: string): string {
    return this.pokemonService.getTypeColor(type);
  }
  toggleFavorite(event: Event, pokemonId: number): void {
    event.stopPropagation();
    this.favoritesService.toggleFavorite(pokemonId);
  }

  isFavorite(pokemonId: number): boolean {
    return this.favoritesService.isFavorite(pokemonId);
  }

  clearAllFavorites(event: Event): void {
    event.preventDefault();
    this.favoritesService.clearFavorites();
    this.favorites = [];
    this.noFavorites = true;
  }

  retryLoading(): void {
    const favoriteIds = this.favoritesService.getFavorites();
    this.loadFavoritesDetails(favoriteIds);
  }

  async presentCacheNotification() {
    const toast = await this.toastController.create({
      message:
        'Exibindo dados salvos anteriormente devido a problemas de conexão',
      color: 'warning',
      duration: 4000,
      position: 'top',
      buttons: [
        {
          text: 'OK',
          role: 'cancel',
        },
      ],
    });
    await toast.present();
  }
}
