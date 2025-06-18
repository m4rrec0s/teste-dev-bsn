import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FavoritesService {
  private readonly STORAGE_KEY = 'pokemon_favorites';
  private favoritesSubject = new BehaviorSubject<number[]>([]);
  public favorites$: Observable<number[]> =
    this.favoritesSubject.asObservable();

  constructor() {
    this.loadFavorites();
  }

  private loadFavorites(): void {
    const storedFavorites = localStorage.getItem(this.STORAGE_KEY);
    if (storedFavorites) {
      try {
        const favorites = JSON.parse(storedFavorites);
        this.favoritesSubject.next(favorites);
      } catch (error) {
        console.error('Erro ao carregar favoritos:', error);
        this.favoritesSubject.next([]);
      }
    } else {
      this.favoritesSubject.next([]);
    }
  }

  private saveFavorites(favorites: number[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(favorites));
    this.favoritesSubject.next(favorites);
  }

  toggleFavorite(pokemonId: number): void {
    const currentFavorites = this.favoritesSubject.value;
    const index = currentFavorites.indexOf(pokemonId);

    if (index >= 0) {
      currentFavorites.splice(index, 1);
    } else {
      currentFavorites.push(pokemonId);
    }

    this.saveFavorites([...currentFavorites]);
  }

  isFavorite(pokemonId: number): boolean {
    return this.favoritesSubject.value.includes(pokemonId);
  }

  getFavorites(): number[] {
    return this.favoritesSubject.value;
  }

  clearFavorites(): void {
    this.saveFavorites([]);
  }
}
