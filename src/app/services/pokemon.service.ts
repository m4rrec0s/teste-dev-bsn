import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, of, catchError } from 'rxjs';
import { ToastController } from '@ionic/angular';

@Injectable({
  providedIn: 'root',
})
export class PokemonService {
  private baseUrl = 'https://pokeapi.co/api/v2';
  private localCache: { [key: string]: any } = {};
  private readonly CACHE_KEY_PREFIX = 'pokemon_cache_';
  private readonly CACHE_EXPIRY = 24 * 60 * 60 * 1000;

  constructor(
    private http: HttpClient,
    private toastController: ToastController
  ) {}

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
          console.warn(
            `Cache expirado para ${endpoint}, removendo do localStorage`
          );
          localStorage.removeItem(cacheKey);
          delete this.localCache[cacheKey];
          return this.getExpiredCache(endpoint);
        }
      } catch (error) {
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
        parsedItem.data._fromExpiredCache = true;

        const isPokemon =
          endpoint.includes('/pokemon/') && !endpoint.includes('/pokemon/?');
        const isSpecies = endpoint.includes('/pokemon-species/');

        let message = `Usando dados salvos offline (conexão indisponível)`;

        if (isPokemon) {
          message = `Usando dados salvos offline para o Pokémon (conexão indisponível)`;
        } else if (isSpecies) {
          message = `Usando dados salvos offline para as informações da espécie (conexão indisponível)`;
        }

        this.showToast(message, 'warning');

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

    const cacheItem = {
      data,
      timestamp: Date.now(),
    };

    try {
      const itemJson = JSON.stringify(cacheItem);
      const itemSize = itemJson.length * 2;

      if (itemSize > 2 * 1024 * 1024) {
        console.warn(
          `Item muito grande para o localStorage (${Math.round(
            itemSize / 1024
          )}KB): ${endpoint}`
        );
        this.showToast(
          `Item muito grande para salvar em cache (${Math.round(
            itemSize / 1024
          )}KB)`,
          'warning'
        );
        return;
      }

      localStorage.setItem(cacheKey, itemJson);
    } catch (error) {
      console.error('Erro ao salvar cache:', error);

      if (
        error instanceof DOMException &&
        (error.name === 'QuotaExceededError' ||
          error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
      ) {
        const cleaned = this.cleanupStorage();

        if (cleaned) {
          try {
            localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
          } catch (retryError) {
            console.error(
              'Ainda não foi possível salvar o cache após limpeza:',
              retryError
            );

            this.clearAllPokemonCache();
            this.showToast(
              'Não foi possível salvar no cache devido a limitações de armazenamento. O cache foi limpo.',
              'danger'
            );
          }
        } else {
          this.clearAllPokemonCache();
          this.showToast(
            'Armazenamento local cheio. O cache foi limpo para permitir novos dados.',
            'warning'
          );
        }
      }
    }
  }
  private async showToast(
    message: string,
    color: string = 'warning',
    duration: number = 3000
  ) {
    const toast = await this.toastController.create({
      message,
      duration,
      position: 'bottom',
      color,
      buttons: [{ text: 'Fechar', role: 'cancel' }],
    });
    await toast.present();
  }

  private clearAllPokemonCache(): void {
    console.warn('Limpando todo o cache de Pokémon como último recurso');
    let countRemoved = 0;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.CACHE_KEY_PREFIX)) {
        localStorage.removeItem(key);
        countRemoved++;
      }
    }
    this.localCache = {};

    if (countRemoved > 0) {
      this.showToast(
        `Cache de Pokémon limpo (${countRemoved} itens removidos) para liberar espaço`,
        'warning'
      );
    }
  }
  private get<T>(url: string): Observable<T> {
    // Para chamadas de detalhes de Pokémon ou espécies, não queremos usar o cache imediatamente
    const isPokemonDetail =
      url.includes('/pokemon/') && !url.includes('/pokemon/?');
    const isSpeciesDetail = url.includes('/pokemon-species/');
    const isDetailRequest = isPokemonDetail || isSpeciesDetail;

    // Se não for uma requisição de detalhes, verificamos o cache primeiro
    if (!isDetailRequest) {
      const cachedData = this.getFromCache(url);
      if (cachedData) {
        return of(cachedData);
      }
    } else {
      // Para requisições de detalhes, ainda recuperamos do cache para uso em caso de falha
      this.getFromCache(url);
    }

    return this.http.get<T>(url).pipe(
      map((response) => {
        if (isPokemonDetail) {
          const sanitizedData = this.sanitizePokemonData(response);
          this.saveToCache(url, sanitizedData);
          return response; // Retorna os dados completos
        } else {
          this.saveToCache(url, response);
          return response;
        }
      }),
      catchError((error) => {
        console.error(`Erro ao acessar ${url}:`, error);
        const expiredData = this.getExpiredCache(url);
        if (expiredData) {
          return of(expiredData as unknown as T);
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
            pokemonDetails.map((pokemon: any) => {
              // Extrai os tipos como array de strings
              const types =
                pokemon.types?.map((typeObj: any) =>
                  typeof typeObj.type === 'object' ? typeObj.type.name : typeObj
                ) || [];

              return {
                name: pokemon.name,
                url: `${this.baseUrl}/pokemon/${pokemon.id}`,
                id: pokemon.id,
                image:
                  pokemon.sprites?.other?.['official-artwork']?.front_default ||
                  pokemon.sprites?.front_default ||
                  'assets/icon/favicon.png',
                gif: this.getPokemonGif(pokemon),
                types: types,
              };
            })
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
    if (!pokemon) return '';

    if (pokemon.sprites?.animated_gif) {
      return pokemon.sprites.animated_gif;
    }

    const paths = [
      pokemon?.sprites?.other?.showdown?.front_default,
      pokemon?.sprites?.versions?.['generation-v']?.['black-white']?.animated
        ?.front_default,
    ];

    const validPaths = paths.filter((path) => path && typeof path === 'string');

    const gifUrl = validPaths.find((path) => path.endsWith('.gif'));

    return gifUrl || '';
  }
  private cleanupStorage(): boolean {
    try {
      const cacheKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.CACHE_KEY_PREFIX)) {
          const item = localStorage.getItem(key);
          if (item) {
            try {
              const parsedItem = JSON.parse(item);
              cacheKeys.push({
                key,
                timestamp: parsedItem.timestamp || 0,
                size: item.length,
              });
            } catch (e) {
              localStorage.removeItem(key);
            }
          }
        }
      }

      if (cacheKeys.length > 15) {
        cacheKeys.sort((a, b) => a.timestamp - b.timestamp);
        for (let i = 0; i < 8; i++) {
          if (cacheKeys[i]) {
            localStorage.removeItem(cacheKeys[i].key);
            const cacheKeyMemory = cacheKeys[i].key;
            if (this.localCache[cacheKeyMemory]) {
              delete this.localCache[cacheKeyMemory];
            }
          }
        }
        return true;
      }
      return false;
    } catch (e) {
      console.error('Erro ao limpar cache:', e);
      return false;
    }
  }
  private sanitizePokemonData(data: any): any {
    if (!data) return data;

    const sanitized: any = {
      id: data.id,
      name: data.name,
      height: data.height,
      weight: data.weight,
      base_experience: data.base_experience,
      types:
        data.types?.map((type: any) => ({
          type: { name: type.type.name },
        })) || [],
      abilities:
        data.abilities?.map((ability: any) => ({
          is_hidden: ability.is_hidden,
          ability: { name: ability.ability.name },
        })) || [],
      sprites: {
        front_default: data.sprites?.front_default,
      },
    };

    if (data.sprites?.other?.['official-artwork']?.front_default) {
      sanitized.sprites.other = {
        'official-artwork': {
          front_default: data.sprites.other['official-artwork'].front_default,
        },
      };
    }

    const gifPath = this.getPokemonGif(data);
    if (gifPath) {
      sanitized.sprites.animated_gif = gifPath;
    }

    if (data._fromExpiredCache) {
      sanitized._fromExpiredCache = true;
    }

    return sanitized;
  }
}
