import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PokemonService } from '../services/pokemon.service';
import { switchMap, forkJoin } from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  standalone: false,
})
export class HomePage implements OnInit {
  pokemons: any[] = [];
  offset = 0;
  limit = 20;
  loading = false;
  loadingMore = false;
  types: string[] = [];
  selectedType: string = '';
  searchName: string = '';
  searchError: string = '';
  noResults: boolean = false;

  constructor(private pokemonService: PokemonService, private router: Router) {}

  ngOnInit() {
    this.loadTypes();
    this.loadPokemons();
  }

  loadTypes() {
    this.pokemonService.getAllTypes().subscribe((types: string[]) => {
      this.types = types;
    });
  }
  loadPokemons() {
    this.searchError = '';
    this.noResults = false;

    if (this.pokemons.length > 0) {
      this.loadingMore = true;
    } else {
      this.loading = true;
    }

    this.pokemonService
      .getPokemonList(this.limit, this.offset)
      .pipe(switchMap((pokemonObservable) => pokemonObservable))
      .subscribe({
        next: (pokemonsWithImages: any) => {
          this.pokemons = this.pokemons.concat(pokemonsWithImages);
          this.offset += this.limit;
          this.loading = false;
          this.loadingMore = false;
        },
        error: (error) => {
          this.loading = false;
          this.loadingMore = false;
          this.noResults = true;
          this.searchError =
            'Não foi possível carregar os Pokémon. Por favor, tente novamente mais tarde.';
          console.error('Erro ao carregar lista de Pokémon:', error);
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
  onTypeChange() {
    this.searchError = '';
    this.noResults = false;
    this.pokemons = [];
    this.offset = 0;
    this.loadingMore = false;

    if (this.selectedType) {
      this.loading = true;
      this.pokemonService.getPokemonsByType(this.selectedType).subscribe({
        next: (names: string[]) => {
          if (names.length === 0) {
            this.noResults = true;
            this.searchError = `Não foi possível encontrar Pokémon do tipo "${this.selectedType}".`;
            this.loading = false;
            return;
          }

          const requests = names
            .slice(0, this.limit)
            .map((name) => this.pokemonService.getPokemonByName(name));

          forkJoin(requests).subscribe({
            next: (details: any[]) => {
              this.pokemons = details.map((pokemon: any) => ({
                name: pokemon.name,
                url: this.pokemonService.getPokemonUrl(pokemon.id),
                id: pokemon.id,
                image:
                  pokemon.sprites.other['official-artwork'].front_default ||
                  pokemon.sprites.front_default ||
                  'assets/icon/favicon.png',
                types: pokemon.types.map((type: any) => type.type.name),
              }));
              this.loading = false;
            },
            error: (error) => {
              this.loading = false;
              this.loadingMore = false;
              this.noResults = true;
              this.searchError = `Ocorreu um erro ao buscar Pokémon do tipo "${this.selectedType}".`;
              console.error('Erro ao buscar detalhes dos Pokémon:', error);
            },
          });
        },
        error: (error) => {
          this.loading = false;
          this.loadingMore = false;
          this.noResults = true;
          this.searchError = `Ocorreu um erro ao buscar Pokémon do tipo "${this.selectedType}".`;
          console.error('Erro ao buscar Pokémon por tipo:', error);
        },
      });
    } else {
      this.loadPokemons();
    }
  }
  onSearch() {
    this.searchError = '';
    this.noResults = false;
    this.loadingMore = false;
    if (!this.searchName) {
      this.pokemons = [];
      this.offset = 0;
      this.loadPokemons();
      return;
    }

    this.loading = true;
    this.pokemonService
      .getPokemonByName(this.searchName.toLowerCase())
      .subscribe({
        next: (pokemon: any) => {
          this.pokemons = [
            {
              name: pokemon.name,
              url: this.pokemonService.getPokemonUrl(pokemon.id),
              id: pokemon.id,
              image:
                pokemon.sprites.other['official-artwork'].front_default ||
                pokemon.sprites.front_default ||
                'assets/icon/favicon.png',
              types: pokemon.types.map((type: any) => type.type.name),
            },
          ];
          this.loading = false;
        },
        error: (error) => {
          this.pokemons = [];
          this.loading = false;
          this.loadingMore = false;
          this.noResults = true;
          this.searchError = `Não foi possível encontrar o Pokémon "${this.searchName}". Verifique o nome e tente novamente.`;
          console.error('Erro ao buscar Pokémon:', error);
        },
      });
  }
}
