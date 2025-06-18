import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, of, catchError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PokemonService {
  private baseUrl = 'https://pokeapi.co/api/v2';
  private localCache: { [key: string]: any } = {};
  private readonly CACHE_KEY_PREFIX = 'pokemon_cache_';
  private readonly CACHE_EXPIRY = 24 * 60 * 60 * 1000;

  constructor(private http: HttpClient) {}

  private getCacheKey(endpoint: string): string {
    return this.CACHE_KEY_PREFIX + endpoint.replace(/[\/\?=&]/g, '_');
  }

  private getFromCache(endpoint: string): any {
    const cacheKey = this.getCacheKey(endpoint);
    if (this.localCache[cacheKey]) {
      return this.localCache[cacheKey];
    }

    const storedItem = localStorage.getItem(cacheKey);
    if (storedItem) {
      try {
        const parsedItem = JSON.parse(storedItem);
        if (
          parsedItem.timestamp &&
          Date.now() - parsedItem.timestamp < this.CACHE_EXPIRY
        ) {
          this.localCache[cacheKey] = parsedItem.data;
          return parsedItem.data;
        } else {
          console.log('Cache expirado:', endpoint);
        }
      } catch (error) {
        console.error('Erro ao ler cache:', error);
        localStorage.removeItem(cacheKey);
      }
    }
    return null;
  }
  private getExpiredCache(endpoint: string): any {
    const cacheKey = this.getCacheKey(endpoint);
    const storedItem = localStorage.getItem(cacheKey);
    if (storedItem) {
      try {
        const parsedItem = JSON.parse(storedItem);
        console.log('Usando dados expirados do cache como fallback:', endpoint);
        parsedItem.data._fromExpiredCache = true;
        return parsedItem.data;
      } catch (e) {
        console.error('Erro ao ler cache expirado:', e);
      }
    }
    return null;
  }

  private saveToCache(endpoint: string, data: any): void {
    const cacheKey = this.getCacheKey(endpoint);
    this.localCache[cacheKey] = data;
    try {
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          data,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      console.error('Erro ao salvar cache:', error);
    }
  }

  private get<T>(url: string): Observable<T> {
    const cachedData = this.getFromCache(url);
    if (cachedData) {
      console.log('Dados obtidos do cache:', url);
      return of(cachedData);
    }

    return this.http.get<T>(url).pipe(
      map((response) => {
        this.saveToCache(url, response);
        return response;
      }),
      catchError((error) => {
        console.error(`Erro ao acessar ${url}:`, error);
        const expiredData = this.getExpiredCache(url);
        if (expiredData) {
          return of(expiredData);
        }
        throw error;
      })
    );
  }

  getPokemonList(limit: number = 20, offset: number = 0): Observable<any> {
    const url = `${this.baseUrl}/pokemon?limit=${limit}&offset=${offset}`;

    return this.get<any>(url).pipe(
      map((response: any) => {
        const pokemonRequests = response.results.map((pokemon: any) =>
          this.get<any>(pokemon.url)
        );

        return forkJoin(pokemonRequests).pipe(
          map((pokemonDetails: any) =>
            pokemonDetails.map((pokemon: any) => ({
              name: pokemon.name,
              url: `${this.baseUrl}/pokemon/${pokemon.id}`,
              id: pokemon.id,
              image:
                pokemon.sprites.other['official-artwork'].front_default ||
                pokemon.sprites.front_default ||
                'assets/icon/favicon.png',
              gif: this.getPokemonGif(pokemon),
              types: pokemon.types.map((type: any) => type.type.name),
            }))
          )
        );
      })
    );
  }

  getPokemonDetails(id: string): Observable<any> {
    const url = `${this.baseUrl}/pokemon/${id}`;
    return this.get<any>(url);
  }

  getPokemonSpecies(id: string): Observable<any> {
    const url = `${this.baseUrl}/pokemon-species/${id}`;
    return this.get<any>(url);
  }

  getAllTypes(): Observable<any> {
    const url = `${this.baseUrl}/type`;
    return this.get<any>(url).pipe(
      map((res: any) => res.results.map((type: any) => type.name))
    );
  }

  getPokemonByName(name: string): Observable<any> {
    const url = `${this.baseUrl}/pokemon/${name}`;
    return this.get<any>(url);
  }

  getPokemonsByType(type: string): Observable<any> {
    const url = `${this.baseUrl}/type/${type}`;
    return this.get<any>(url).pipe(
      map((res: any) => res.pokemon.map((p: any) => p.pokemon.name))
    );
  }

  getTypeColor(type: string): string {
    const typeColors: { [key: string]: string } = {
      normal: '#A8A878',
      fire: '#F08030',
      water: '#6890F0',
      electric: '#F8D030',
      grass: '#78C850',
      ice: '#98D8D8',
      fighting: '#C03028',
      poison: '#A040A0',
      ground: '#E0C068',
      flying: '#A890F0',
      psychic: '#F85888',
      bug: '#A8B820',
      rock: '#B8A038',
      ghost: '#705898',
      dragon: '#7038F8',
      dark: '#705848',
      steel: '#B8B8D0',
      fairy: '#EE99AC',
    };
    return typeColors[type] || '#68A090';
  }

  getStatName(statName: string): string {
    const statNames: { [key: string]: string } = {
      hp: 'HP',
      attack: 'Ataque',
      defense: 'Defesa',
      'special-attack': 'Ataque Especial',
      'special-defense': 'Defesa Especial',
      speed: 'Velocidade',
    };
    return statNames[statName] || statName;
  }

  getExperienceClass(baseExperience: number): string {
    if (!baseExperience) return '';
    if (baseExperience < 100) return 'text-green-400';
    if (baseExperience < 200) return 'text-yellow-400';
    return 'text-red-400';
  }

  getGenderRate(genderRate: number): string {
    if (genderRate === undefined || genderRate === null) return 'Desconhecido';
    if (genderRate === -1) return 'Sem gênero';
    const femaleChance = (genderRate / 8) * 100;
    const maleChance = 100 - femaleChance;
    return `♂ ${maleChance.toFixed(1)}% ♀ ${femaleChance.toFixed(1)}%`;
  }

  getHabitat(habitat: any): string {
    return habitat?.name || 'Desconhecido';
  }

  getGrowthRate(growthRate: any): string {
    const growthRateNames: { [key: string]: string } = {
      slow: 'Lento',
      medium: 'Médio',
      fast: 'Rápido',
      'medium-slow': 'Médio-Lento',
      'slow-then-very-fast': 'Lento depois Muito Rápido',
      'fast-then-very-slow': 'Rápido depois Muito Lento',
    };
    return growthRateNames[growthRate?.name] || 'Desconhecido';
  }

  getEggGroups(eggGroups: any[]): string[] {
    return (
      eggGroups?.map((group: any) => {
        const eggGroupNames: { [key: string]: string } = {
          monster: 'Monstro',
          water1: 'Água 1',
          water2: 'Água 2',
          water3: 'Água 3',
          bug: 'Inseto',
          flying: 'Voador',
          field: 'Campo',
          fairy: 'Fada',
          grass: 'Grama',
          'human-like': 'Humanoide',
          mineral: 'Mineral',
          amorphous: 'Amorfo',
          ditto: 'Ditto',
          dragon: 'Dragão',
          'no-eggs': 'Sem Ovos',
        };
        return eggGroupNames[group.name] || group.name;
      }) || []
    );
  }

  getCaptureRate(captureRate: number): string {
    if (!captureRate) return 'Desconhecido';
    const percentage = ((captureRate / 255) * 100).toFixed(1);
    return `${percentage}%`;
  }

  getTotalStats(stats: any[]): number {
    if (!stats) return 0;
    return stats.reduce((sum: number, stat: any) => sum + stat.base_stat, 0);
  }

  extractDescription(speciesData: any): string {
    const flavorTextEntries = speciesData.flavor_text_entries;
    let description =
      flavorTextEntries.find((entry: any) => entry.language.name === 'pt')
        ?.flavor_text ||
      flavorTextEntries.find((entry: any) => entry.language.name === 'en')
        ?.flavor_text ||
      'Descrição não disponível';

    return description.replace(/\f/g, ' ').replace(/\n/g, ' ').trim();
  }

  getPokemonUrl(id: number): string {
    return `${this.baseUrl}/pokemon/${id}`;
  }
  getPokemonGif(pokemon: any): string {
    const paths = [
      pokemon?.sprites?.other?.showdown?.front_default,
      pokemon?.sprites?.versions?.['generation-v']?.['black-white']?.animated
        ?.front_default,
    ];

    const gifUrl = paths.find(
      (path) => path && typeof path === 'string' && path.endsWith('.gif')
    );

    return gifUrl || '';
  }
}
