import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PokemonService } from '../services/pokemon.service';
import { FavoritesService } from '../services/favorites.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-details',
  templateUrl: './details.page.html',
  standalone: false,
})
export class DetailsPage implements OnInit, OnDestroy {
  pokemon: any = null;
  pokemonSpecies: any = null;
  loading = true;
  description: string = '';
  isFavorited: boolean = false;
  private favoritesSubscription: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private pokemonService: PokemonService,
    private favoritesService: FavoritesService
  ) {}
  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadPokemonDetails(id);

      this.favoritesSubscription = this.favoritesService.favorites$.subscribe(
        (favorites) => {
          this.isFavorited = id ? favorites.includes(Number(id)) : false;
        }
      );
    }
  }

  ngOnDestroy() {
    if (this.favoritesSubscription) {
      this.favoritesSubscription.unsubscribe();
    }
  }
  loadPokemonDetails(id: string) {
    this.loading = true;

    this.pokemonService.getPokemonDetails(id).subscribe({
      next: (data: any) => {
        this.pokemon = {
          ...data,
          gif: this.pokemonService.getPokemonGif(data),
        };

        // Verifica se os dados vieram do cache expirado
        if (data._fromExpiredCache) {
          this.pokemon._fromExpiredCache = true;
        }

        this.loadPokemonSpecies(id);
      },
      error: (error) => {
        console.error('Erro ao carregar Pokemon:', error);
        this.loading = false;
      },
    });
  }
  loadPokemonSpecies(id: string) {
    this.pokemonService.getPokemonSpecies(id).subscribe({
      next: (speciesData: any) => {
        this.pokemonSpecies = speciesData;
        this.description = this.pokemonService.extractDescription(speciesData);

        // Verifica se os dados vieram do cache expirado
        if (speciesData._fromExpiredCache) {
          this.pokemonSpecies._fromExpiredCache = true;
        }

        this.loading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar espécie do Pokemon:', error);
        this.loading = false;
      },
    });
  }
  getTypeColor(typeName: string): string {
    return this.pokemonService.getTypeColor(typeName);
  }

  getStatName(statName: string): string {
    return this.pokemonService.getStatName(statName);
  }

  getExperienceClass(): string {
    return this.pokemonService.getExperienceClass(
      this.pokemon?.base_experience
    );
  }

  getGenderRate(): string {
    return this.pokemonService.getGenderRate(this.pokemonSpecies?.gender_rate);
  }

  getHabitat(): string {
    return this.pokemonService.getHabitat(this.pokemonSpecies?.habitat);
  }

  getGrowthRate(): string {
    return this.pokemonService.getGrowthRate(this.pokemonSpecies?.growth_rate);
  }

  getEggGroups(): string[] {
    return this.pokemonService.getEggGroups(this.pokemonSpecies?.egg_groups);
  }

  getCaptureRate(): string {
    return this.pokemonService.getCaptureRate(
      this.pokemonSpecies?.capture_rate
    );
  }

  getTotalStats(): number {
    return this.pokemonService.getTotalStats(this.pokemon?.stats);
  }

  goBack() {
    window.history.back();
  }

  toggleFavorite(event: Event): void {
    if (this.pokemon && this.pokemon.id) {
      this.favoritesService.toggleFavorite(this.pokemon.id);
    }
  }
  isFavorite(): boolean {
    return this.isFavorited;
  }

  reloadPokemonData() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      // Definimos o estado de carregamento
      this.loading = true;

      // Reiniciamos os estados para evitar exibir dados antigos
      this.pokemon = null;
      this.pokemonSpecies = null;

      // Carregamos os dados novamente
      this.loadPokemonDetails(id);
    }
  }
}
