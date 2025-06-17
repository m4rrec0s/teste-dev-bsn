import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PokemonService } from '../services/pokemon.service';

@Component({
  selector: 'app-details',
  templateUrl: './details.page.html',
  standalone: false,
})
export class DetailsPage implements OnInit {
  pokemon: any = null;
  pokemonSpecies: any = null;
  loading = true;
  description: string = '';

  constructor(
    private route: ActivatedRoute,
    private pokemonService: PokemonService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadPokemonDetails(id);
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

        this.loading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar espécie do Pokemon:', error);
        this.loading = false;
      },
    });
  }

  getTypeColor(type: string): string {
    return this.pokemonService.getTypeColor(type);
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
}
