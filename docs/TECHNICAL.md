# Documentação Técnica - Pokédex App

Este documento apresenta a documentação técnica completa do Pokédex App, uma aplicação Ionic Angular que demonstra boas práticas de desenvolvimento mobile e web. O projeto foi desenvolvido com foco em performance, usabilidade e escalabilidade.

## 1. Arquitetura da Aplicação

### 1.1 Estrutura de Módulos

A aplicação utiliza uma arquitetura modular simples e eficiente, organizada da seguinte forma:

```
src/app/
├── home/               # Página principal com lista de Pokémons
|   └── home-routing.module.ts
|   └── home.module.ts
│   ├── home.page.html
│   ├── home.page.ts
│   └── home.module.ts
├── details/            # Página de detalhes do Pokémon
|   └── details-routing.module.ts
|   └── details.module.ts
│   ├── details.page.html
│   ├── details.page.ts
│   └── details.module.ts
├── favorites/            # Página de Favoritos
|   └── favorites-routing.module.ts
|   └── favorites.module.ts
│   ├── favorites.page.html
│   ├── favorites.page.ts
│   └── favorites.module.ts
├── services/           # Serviços da aplicação
│   └── pokemon.service.ts
|   └── favorites.service.ts
└── app-routing.module.ts
```

Esta estrutura foi escolhida por sua simplicidade e clareza, facilitando a manutenção e o entendimento do código. Cada página possui seu próprio módulo, permitindo carregamento sob demanda (lazy loading) e otimização de performance.

### 1.2 Fluxo de Dados e Gerenciamento de Estado

A aplicação utiliza uma abordagem baseada em serviços para gerenciamento de estado, oferecendo simplicidade sem comprometer a funcionalidade:

**Arquitetura de Dados:**

- **Serviços centralizados**: `PokemonService` e `FavoritesService` concentram toda a lógica de dados
- **RxJS Observables**: Comunicação reativa entre componentes e serviços
- **LocalStorage**: Persistência simples para favoritos e cache
- **Fluxo unidirecional**: Dados fluem dos serviços para os componentes via Observables

**Vantagens desta abordagem:**

- Menor complexidade comparado a soluções como NgRx
- Fácil debugging e manutenção
- Performance adequada para o escopo da aplicação
- Curva de aprendizado menor para novos desenvolvedores

## 2. Fluxo de Dados e Comunicação com a API

### 2.1 Integração com a PokéAPI

A aplicação se comunica com a PokéAPI (https://pokeapi.co/) através do `PokemonService`, que implementa um sistema robusto de requisições HTTP:

```typescript
@Injectable({
  providedIn: "root",
})
export class PokemonService {
  private baseUrl = "https://pokeapi.co/api/v2";
  private localCache: { [key: string]: any } = {};
  private readonly CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 horas

  constructor(private http: HttpClient, private toastController: ToastController) {}

  // Busca lista paginada de Pokémons
  getPokemonList(offset: number = 0, limit: number = 20): Observable<any> {
    const endpoint = `/pokemon?offset=${offset}&limit=${limit}`;

    // Verifica cache primeiro
    const cached = this.getFromCache(endpoint);
    if (cached) {
      return of(cached);
    }

    // Faz requisição HTTP se não estiver em cache
    return this.http.get<any>(`${this.baseUrl}${endpoint}`).pipe(
      map((response) => {
        this.saveToCache(endpoint, response);
        return response;
      }),
      catchError((error) => this.handleError(error))
    );
  }
}
```

### 2.2 Tratamento de Erros e Feedback ao Usuário

O serviço implementa tratamento robusto de erros com feedback visual através de toasts:

```typescript
private async handleError(error: any): Promise<Observable<never>> {
  console.error('Erro na API:', error);

  let message = 'Erro ao carregar dados';
  if (error.status === 0) {
    message = 'Verifique sua conexão com a internet';
  } else if (error.status >= 500) {
    message = 'Servidor temporariamente indisponível';
  }

  const toast = await this.toastController.create({
    message,
    duration: 3000,
    color: 'danger',
    position: 'bottom'
  });

  await toast.present();
  throw error;
}
```

### 2.3 Otimização de Requisições

**Estratégias implementadas:**

- **Batch requests**: Carregamento de múltiplos Pokémons simultaneamente usando `forkJoin`
- **Paginação inteligente**: Carrega apenas 20 itens por vez
- **Lazy loading de detalhes**: Detalhes são carregados apenas quando necessário
- **Fallback de imagens**: Sistema de prioridades para sprites (oficial → normal → placeholder)

## 3. Estratégias de Cache e Persistência Local

### 3.1 Sistema de Cache Híbrido

A aplicação implementa um sistema de cache em duas camadas para otimizar performance e reduzir requisições desnecessárias:

**Cache em Memória:**

```typescript
private localCache: { [key: string]: any } = {};

private getFromCache(endpoint: string): any {
  const cacheKey = this.getCacheKey(endpoint);

  // Verifica cache em memória primeiro (mais rápido)
  if (this.localCache[cacheKey]) {
    return this.localCache[cacheKey];
  }

  // Verifica LocalStorage se não estiver em memória
  const storedItem = localStorage.getItem(cacheKey);
  if (storedItem) {
    try {
      const parsed = JSON.parse(storedItem);
      // Verifica se não expirou
      if (Date.now() - parsed.timestamp < this.CACHE_EXPIRY) {
        this.localCache[cacheKey] = parsed.data;
        return parsed.data;
      }
    } catch (error) {
      localStorage.removeItem(cacheKey);
    }
  }

  return null;
}
```

**Persistência Local:**

```typescript
private saveToCache(endpoint: string, data: any): void {
  const cacheKey = this.getCacheKey(endpoint);

  // Salva em memória para acesso rápido
  this.localCache[cacheKey] = data;

  // Salva no LocalStorage para persistência
  const cacheData = {
    data,
    timestamp: Date.now()
  };

  try {
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    // Se localStorage estiver cheio, limpa cache antigo
    this.clearExpiredCache();
  }
}
```

### 3.2 Gerenciamento de Favoritos

O `FavoritesService` gerencia a persistência de Pokémons favoritos de forma simples e eficiente:

```typescript
@Injectable({
  providedIn: "root",
})
export class FavoritesService {
  private readonly STORAGE_KEY = "pokemon_favorites";
  private favoritesSubject = new BehaviorSubject<any[]>([]);

  constructor() {
    this.loadFavorites();
  }

  // Observable para componentes se inscreverem
  getFavorites(): Observable<any[]> {
    return this.favoritesSubject.asObservable();
  }

  // Adiciona ou remove favorito
  toggleFavorite(pokemon: any): void {
    const favorites = this.favoritesSubject.value;
    const index = favorites.findIndex((fav) => fav.id === pokemon.id);

    if (index > -1) {
      favorites.splice(index, 1);
    } else {
      favorites.push(pokemon);
    }

    this.saveFavorites(favorites);
    this.favoritesSubject.next([...favorites]);
  }
}
```

## 4. Padrões de Componentes Utilizados

### 4.1 Estrutura de Componentes

Todos os componentes seguem um padrão consistente que facilita manutenção e reutilização:

**Template Padrão de Página:**

```typescript
export class HomePage implements OnInit, OnDestroy {
  // Propriedades reativas
  pokemons: any[] = [];
  loading = false;
  error: string | null = null;

  // Controle de paginação
  offset = 0;
  readonly limit = 20;
  hasMore = true;

  // Controle de subscription
  private destroy$ = new Subject<void>();

  constructor(private pokemonService: PokemonService, private router: Router) {}

  ngOnInit() {
    this.loadPokemons();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Métodos privados para organização
  private loadPokemons() {
    // Implementação...
  }
}
```

### 4.2 Padrões de UI/UX

**Cards Responsivos:**

- Layout em grid que se adapta ao tamanho da tela
- Uso consistente de Ionic Grid System
- Imagens com aspect ratio fixo para layout estável

**Feedback Visual:**

- Loading states com skeletos screens
- Toast messages para feedback de ações
- Animações suaves para transições

**Acessibilidade:**

- Textos alternativos em todas as imagens
- Navegação por teclado funcional
- Contraste adequado entre cores

### 4.3 Reutilização e Modularidade

Embora o projeto mantenha simplicidade, alguns padrões de reutilização são aplicados:

- **Serviços compartilhados**: Lógica centralizada em serviços
- **Estilos globais**: Uso do Tailwind CSS para consistência
- **Utilitários**: Funções helper para formatação e validação

## 5. Estratégias de Teste

### 5.1 Configuração de Testes

A aplicação utiliza o ecossistema padrão do Angular para testes:

**Frameworks utilizados:**

- **Jasmine**: Framework de testes comportamentais
- **Karma**: Test runner para execução no navegador
- **Angular Testing Utilities**: TestBed, ComponentFixture, etc.

### 5.2 Testes de Serviços

Exemplo de teste do `PokemonService`:

```typescript
describe("PokemonService", () => {
  let service: PokemonService;
  let httpMock: HttpTestingController;
  let toastController: jasmine.SpyObj<ToastController>;

  beforeEach(() => {
    const toastSpy = jasmine.createSpyObj("ToastController", ["create"]);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PokemonService, { provide: ToastController, useValue: toastSpy }],
    });

    service = TestBed.inject(PokemonService);
    httpMock = TestBed.inject(HttpTestingController);
    toastController = TestBed.inject(ToastController) as jasmine.SpyObj<ToastController>;
  });

  it("deve buscar lista de pokémons com cache", () => {
    const mockResponse = {
      results: [{ name: "bulbasaur", url: "https://pokeapi.co/api/v2/pokemon/1/" }],
    };

    service.getPokemonList().subscribe((response) => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne("https://pokeapi.co/api/v2/pokemon?offset=0&limit=20");
    expect(req.request.method).toBe("GET");
    req.flush(mockResponse);
  });
});
```

### 5.3 Testes de Componentes

```typescript
describe("HomePage", () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;
  let pokemonService: jasmine.SpyObj<PokemonService>;

  beforeEach(async () => {
    const pokemonSpy = jasmine.createSpyObj("PokemonService", ["getPokemonList"]);

    await TestBed.configureTestingModule({
      declarations: [HomePage],
      imports: [IonicModule.forRoot()],
      providers: [{ provide: PokemonService, useValue: pokemonSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    pokemonService = TestBed.inject(PokemonService) as jasmine.SpyObj<PokemonService>;
  });

  it("deve carregar pokémons na inicialização", () => {
    pokemonService.getPokemonList.and.returnValue(of({ results: [] }));

    component.ngOnInit();

    expect(pokemonService.getPokemonList).toHaveBeenCalled();
  });
});
```

### 5.4 Estratégias de Mock

**Mocks de Serviços:**

- Simulação de respostas da API
- Controle de estados de loading e erro
- Teste de comportamentos assíncronos

**Mocks de Componentes Ionic:**

- Simulação de navegação
- Teste de interações de UI
- Verificação de chamadas de métodos

## 6. Guia para Desenvolvedores

### 6.1 Configuração do Ambiente de Desenvolvimento

**Pré-requisitos:**

```bash
# Node.js (versão 18 ou superior)
node --version

# npm ou yarn
npm --version

# Ionic CLI
npm install -g @ionic/cli
```

**Setup inicial:**

```bash
# Clone o repositório
git clone <repository-url>
cd teste-dev-bsn

# Instale as dependências
npm install

# Execute em modo de desenvolvimento
ionic serve
```

### 6.2 Scripts Disponíveis

```json
{
  "scripts": {
    "ng": "ng",
    "start": "ng serve",
    "build": "ng build",
    "watch": "ng build --watch --configuration development",
    "test": "ng test",
    "lint": "ng lint"
  }
}
```

### 6.3 Convenções de Código

**Estrutura de Arquivos:**

- Cada página deve ter seu módulo próprio
- Serviços devem ser injetados como singleton
- Interfaces devem ser definidas em arquivos separados quando reutilizadas

**Nomenclatura:**

- Páginas: `nome.page.ts`
- Serviços: `nome.service.ts`
- Interfaces: `INome` (com I maiúsculo)
- Constantes: `UPPER_SNAKE_CASE`

**Boas Práticas:**

```typescript
// ✅ Correto: Unsubscribe em ngOnDestroy
export class ExampleComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.service
      .getData()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        // Processar dados
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

// ✅ Correto: Tratamento de erro
this.pokemonService
  .getPokemon(id)
  .pipe(
    catchError((error) => {
      console.error("Erro:", error);
      return of(null);
    })
  )
  .subscribe((pokemon) => {
    // Processar resultado
  });
```

### 6.4 Debugging e Troubleshooting

**Ferramentas úteis:**

- **Angular DevTools**: Para inspecionar componentes e performance
- **Ionic DevApp**: Para teste em dispositivos reais
- **Chrome DevTools**: Para debugging e análise de network

**Problemas comuns:**

1. **CORS errors**: Resolvidos automaticamente pelo proxy do Ionic
2. **Memory leaks**: Sempre implementar `OnDestroy` para subscriptions
3. **Performance**: Usar `OnPush` change detection quando apropriado

### 6.5 Deploy e Build

**Desenvolvimento:**

```bash
# Servidor local com hot reload
ionic serve

# Build para produção
ionic build --prod

# Teste da build de produção
npx http-server www/
```

**Capacitor (Mobile):**

```bash
# Adicionar plataforma
ionic capacitor add ios
ionic capacitor add android

# Build e sync
ionic capacitor build ios
ionic capacitor build android

# Abrir no IDE nativo
ionic capacitor open ios
ionic capacitor open android
```

### 6.6 Manutenção e Evolução

**Atualizações regulares:**

```bash
# Verificar versões desatualizadas
npm outdated

# Atualizar Ionic
npm install @ionic/angular@latest

# Atualizar Angular
ng update @angular/core @angular/cli
```

**Monitoramento de qualidade:**

- Executar testes regularmente: `npm test`

Este guia garante que novos desenvolvedores possam contribuir rapidamente e que o projeto mantenha alta qualidade ao longo do tempo.
