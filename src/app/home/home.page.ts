import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  pokemons: any[] = [];
  offset = 0;
  limit = 20;
  loading = false;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.loadPokemons();
  }

  loadPokemons() {
    this.loading = true;
    this.http
      .get(
        `https://pokeapi.co/api/v2/pokemon?limit=${this.limit}&offset=${this.offset}`
      )
      .subscribe((data: any) => {
        const pokemonRequests = data.results.map((pokemon: any) =>
          this.http.get(pokemon.url)
        );

        forkJoin(pokemonRequests).subscribe((pokemonDetails: any) => {
          const pokemonsWithImages = pokemonDetails.map((pokemon: any) => ({
            name: pokemon.name,
            url: `https://pokeapi.co/api/v2/pokemon/${pokemon.id}`,
            id: pokemon.id,
            image:
              pokemon.sprites.other['official-artwork'].front_default ||
              pokemon.sprites.front_default ||
              'assets/icon/favicon.png',
          }));

          this.pokemons = this.pokemons.concat(pokemonsWithImages);
          this.offset += this.limit;
          this.loading = false;
        });
      });
  }

  goToDetails(pokemonUrl: string) {
    const id = pokemonUrl.split('/').filter(Boolean).pop();
    this.router.navigate(['/details', id]);
  }
}
