/** Municipios vigentes de las 24 entidades que usa la app (23 estados + DC). */
export type VenezuelaMunicipality = {
  name: string
  seat: string
}

function m(name: string, seat: string): VenezuelaMunicipality {
  return { name, seat }
}

export const VENEZUELA_MUNICIPALITY_COUNTS = {
  Amazonas: 7,
  Anzoátegui: 21,
  Apure: 7,
  Aragua: 18,
  Barinas: 12,
  Bolívar: 11,
  Carabobo: 14,
  Cojedes: 9,
  "Delta Amacuro": 4,
  "Distrito Capital": 1,
  Falcón: 25,
  Guárico: 15,
  Lara: 9,
  "La Guaira": 1,
  Mérida: 23,
  Miranda: 21,
  Monagas: 13,
  "Nueva Esparta": 11,
  Portuguesa: 14,
  Sucre: 15,
  Táchira: 29,
  Trujillo: 20,
  Yaracuy: 14,
  Zulia: 21,
} as const

export const VENEZUELA_MUNICIPALITY_TOTAL = 335

export const VENEZUELA_MUNICIPALITIES: Record<string, readonly VenezuelaMunicipality[]> = {
  Amazonas: [
    m("Alto Orinoco", "La Esmeralda"),
    m("Atabapo", "San Fernando de Atabapo"),
    m("Atures", "Puerto Ayacucho"),
    m("Autana", "Isla Ratón"),
    m("Manapiare", "San Juan de Manapiare"),
    m("Maroa", "Maroa"),
    m("Río Negro", "San Carlos de Río Negro"),
  ],
  Anzoátegui: [
    m("Anaco", "Anaco"),
    m("Aragua", "Aragua de Barcelona"),
    m("Bolívar", "Barcelona"),
    m("Bruzual", "Clarines"),
    m("Cajigal", "Onoto"),
    m("Carvajal", "Valle de Guanape"),
    m("Diego Bautista Urbaneja", "Lechería"),
    m("Freites", "Cantaura"),
    m("Guanipa", "San José de Guanipa"),
    m("Guanta", "Guanta"),
    m("Independencia", "Soledad"),
    m("Libertad", "San Mateo"),
    m("Miranda", "Pariaguán"),
    m("Monagas", "Mapire"),
    m("Peñalver", "Puerto Píritu"),
    m("Píritu", "Píritu"),
    m("San Juan de Capistrano", "Boca de Uchire"),
    m("Santa Ana", "Santa Ana"),
    m("Simón Rodríguez", "El Tigre"),
    m("Sir Arthur McGregor", "El Chaparro"),
    m("Sotillo", "Puerto La Cruz"),
  ],
  Apure: [
    m("Achaguas", "Achaguas"),
    m("Biruaca", "Biruaca"),
    m("Muñoz", "Bruzual"),
    m("Pedro Camejo", "San Juan de Payara"),
    m("Páez", "Guasdualito"),
    m("Rómulo Gallegos", "Elorza"),
    m("San Fernando", "San Fernando de Apure"),
  ],
  Aragua: [
    m("Bolívar", "San Mateo"),
    m("Camatagua", "Camatagua"),
    m("Francisco Linares Alcántara", "Santa Rita"),
    m("Girardot", "Maracay"),
    m("José Ángel Lamas", "Santa Cruz de Aragua"),
    m("José Félix Ribas", "La Victoria"),
    m("José Rafael Revenga", "El Consejo"),
    m("Libertador", "Palo Negro"),
    m("Mario Briceño Iragorry", "El Limón"),
    m("Ocumare de la Costa de Oro", "Ocumare de la Costa"),
    m("San Casimiro", "San Casimiro"),
    m("San Sebastián", "San Sebastián de los Reyes"),
    m("Santiago Mariño", "Turmero"),
    m("Santos Michelena", "Las Tejerías"),
    m("Sucre", "Cagua"),
    m("Tovar", "Colonia Tovar"),
    m("Urdaneta", "Barbacoas"),
    m("Zamora", "Villa de Cura"),
  ],
  Barinas: [
    m("Alberto Arvelo Torrealba", "Sabaneta"),
    m("Andrés Eloy Blanco", "El Cantón"),
    m("Antonio José de Sucre", "Socopó"),
    m("Arismendi", "Arismendi"),
    m("Barinas", "Barinas"),
    m("Bolívar", "Barinitas"),
    m("Cruz Paredes", "Barrancas"),
    m("Ezequiel Zamora", "Santa Bárbara"),
    m("Obispos", "Obispos"),
    m("Pedraza", "Ciudad Bolivia"),
    m("Rojas", "Libertad"),
    m("Sosa", "Ciudad de Nutrias"),
  ],
  Bolívar: [
    m("Angostura", "Ciudad Piar"),
    m("Angostura del Orinoco", "Ciudad Bolívar"),
    m("Caroní", "Ciudad Guayana"),
    m("Cedeño", "Caicara del Orinoco"),
    m("El Callao", "El Callao"),
    m("Gran Sabana", "Santa Elena de Uairén"),
    m("Padre Pedro Chien", "El Palmar"),
    m("Piar", "Upata"),
    m("Roscio", "Guasipati"),
    m("Sifontes", "El Dorado"),
    m("Sucre", "Maripa"),
  ],
  Carabobo: [
    m("Bejuma", "Bejuma"),
    m("Carlos Arvelo", "Güigüe"),
    m("Diego Ibarra", "Mariara"),
    m("Guacara", "Guacara"),
    m("Juan José Mora", "Morón"),
    m("Libertador", "Tocuyito"),
    m("Los Guayos", "Los Guayos"),
    m("Miranda", "Miranda"),
    m("Montalbán", "Montalbán"),
    m("Naguanagua", "Naguanagua"),
    m("Puerto Cabello", "Puerto Cabello"),
    m("San Diego", "San Diego"),
    m("San Joaquín", "San Joaquín"),
    m("Valencia", "Valencia"),
  ],
  Cojedes: [
    m("Anzoátegui", "Cojedes"),
    m("Girardot", "El Baúl"),
    m("Lima Blanco", "Macapo"),
    m("Pao de San Juan Bautista", "El Pao"),
    m("Ricaurte", "Libertad"),
    m("Rómulo Gallegos", "Las Vegas"),
    m("San Carlos", "San Carlos"),
    m("Tinaco", "Tinaco"),
    m("Tinaquillo", "Tinaquillo"),
  ],
  "Delta Amacuro": [
    m("Antonio Díaz", "Curiapo"),
    m("Casacoima", "Sierra Imataca"),
    m("Pedernales", "Pedernales"),
    m("Tucupita", "Tucupita"),
  ],
  "Distrito Capital": [m("Libertador", "Caracas")],
  Falcón: [
    m("Acosta", "San Juan de los Cayos"),
    m("Bolívar", "San Luis"),
    m("Buchivacoa", "Capatárida"),
    m("Carirubana", "Punto Fijo"),
    m("Colina", "La Vela de Coro"),
    m("Dabajuro", "Dabajuro"),
    m("Democracia", "Pedregal"),
    m("Federación", "Churuguara"),
    m("Falcón", "Pueblo Nuevo"),
    m("Iturriza", "Chichiriviche"),
    m("Jacura", "Jacura"),
    m("Los Taques", "Santa Cruz de Los Taques"),
    m("Manaure", "Yaracal"),
    m("Mauroa", "Mene de Mauroa"),
    m("Miranda", "Santa Ana de Coro"),
    m("Palmasola", "Palmasola"),
    m("Petit", "Cabure"),
    m("Píritu", "Píritu"),
    m("San Francisco", "Mirimire"),
    m("Silva", "Tucacas"),
    m("Sucre", "La Cruz de Taratara"),
    m("Tocópero", "Tocópero"),
    m("Unión", "Santa Cruz de Bucaral"),
    m("Urumaco", "Urumaco"),
    m("Zamora", "Puerto Cumarebo"),
  ],
  Guárico: [
    m("Camaguán", "Camaguán"),
    m("Chaguaramas", "Chaguaramas"),
    m("El Socorro", "El Socorro"),
    m("Francisco de Miranda", "Calabozo"),
    m("José Félix Ribas", "Tucupido"),
    m("José Tadeo Monagas", "Altagracia de Orituco"),
    m("Juan Germán Roscio", "San Juan de los Morros"),
    m("Juan José Rondón", "Las Mercedes"),
    m("Julián Mellado", "El Sombrero"),
    m("Leonardo Infante", "Valle de La Pascua"),
    m("Ortiz", "Ortiz"),
    m("San Gerónimo de Guayabal", "Guayabal"),
    m("San José de Guaribe", "San José de Guaribe"),
    m("Santa María de Ipire", "Santa María de Ipire"),
    m("Zaraza", "Zaraza"),
  ],
  Lara: [
    m("Andrés Eloy Blanco", "Sanare"),
    m("Crespo", "Duaca"),
    m("Iribarren", "Barquisimeto"),
    m("Jiménez", "Quíbor"),
    m("Morán", "El Tocuyo"),
    m("Palavecino", "Cabudare"),
    m("Simón Planas", "Sarare"),
    m("Torres", "Carora"),
    m("Urdaneta", "Siquisique"),
  ],
  "La Guaira": [m("Vargas", "La Guaira")],
  Mérida: [
    m("Alberto Adriani", "El Vigía"),
    m("Andrés Bello", "La Azulita"),
    m("Antonio Pinto Salinas", "Santa Cruz de Mora"),
    m("Aricagua", "Aricagua"),
    m("Arzobispo Chacón", "Canaguá"),
    m("Campo Elías", "Ejido"),
    m("Caracciolo Parra Olmedo", "Tucaní"),
    m("Cardenal Quintero", "Santo Domingo"),
    m("Guaraque", "Guaraque"),
    m("Julio César Salas", "Arapuey"),
    m("Justo Briceño", "Torondoy"),
    m("Libertador", "Mérida"),
    m("Miranda", "Timotes"),
    m("Obispo Ramos de Lora", "Santa Elena de Arenales"),
    m("Padre Noguera", "Santa María de Caparo"),
    m("Pueblo Llano", "Pueblo Llano"),
    m("Rangel", "Mucuchíes"),
    m("Rivas Dávila", "Bailadores"),
    m("Santos Marquina", "Tabay"),
    m("Sucre", "Lagunillas"),
    m("Tovar", "Tovar"),
    m("Tulio Febres Cordero", "Nueva Bolivia"),
    m("Zea", "Zea"),
  ],
  Miranda: [
    m("Acevedo", "Caucagua"),
    m("Andrés Bello", "San José de Barlovento"),
    m("Baruta", "Baruta"),
    m("Bolívar", "San Francisco de Yare"),
    m("Brión", "Higuerote"),
    m("Buroz", "Mamporal"),
    m("Carrizal", "Carrizal"),
    m("Chacao", "Chacao"),
    m("Cristóbal Rojas", "Charallave"),
    m("El Hatillo", "El Hatillo"),
    m("Guaicaipuro", "Los Teques"),
    m("Gual", "Cúpira"),
    m("Independencia", "Santa Teresa del Tuy"),
    m("Lander", "Ocumare del Tuy"),
    m("Los Salias", "San Antonio de los Altos"),
    m("Paz Castillo", "Santa Lucía"),
    m("Plaza", "Guarenas"),
    m("Páez", "Río Chico"),
    m("Sucre", "Petare"),
    m("Urdaneta", "Cúa"),
    m("Zamora", "Guatire"),
  ],
  Monagas: [
    m("Acosta", "San Antonio de Capayacuar"),
    m("Aguasay", "Aguasay"),
    m("Bolívar", "Caripito"),
    m("Caripe", "Caripe"),
    m("Cedeño", "Caicara de Maturín"),
    m("Libertador", "Temblador"),
    m("Maturín", "Maturín"),
    m("Piar", "Aragua de Maturín"),
    m("Punceres", "Quiriquire"),
    m("Santa Bárbara", "Santa Bárbara"),
    m("Sotillo", "Barrancas del Orinoco"),
    m("Uracoa", "Uracoa"),
    m("Zamora", "Punta de Mata"),
  ],
  "Nueva Esparta": [
    m("Antolín del Campo", "La Plaza de Paraguachí"),
    m("Antonio Díaz", "San Juan Bautista"),
    m("Arismendi", "La Asunción"),
    m("García", "El Valle"),
    m("Gómez", "Santa Ana"),
    m("Macanao", "Boca de Río"),
    m("Maneiro", "Pampatar"),
    m("Marcano", "Juan Griego"),
    m("Mariño", "Porlamar"),
    m("Tubores", "Punta de Piedras"),
    m("Villalba", "San Pedro de Coche"),
  ],
  Portuguesa: [
    m("Agua Blanca", "Agua Blanca"),
    m("Araure", "Araure"),
    m("Esteller", "Píritu"),
    m("Guanare", "Guanare"),
    m("Guanarito", "Guanarito"),
    m("José Vicente de Unda", "Chabasquén"),
    m("Ospino", "Ospino"),
    m("Papelón", "Papelón"),
    m("Páez", "Acarigua"),
    m("San Genaro de Boconoíto", "Boconoíto"),
    m("San Rafael de Onoto", "San Rafael de Onoto"),
    m("Santa Rosalía", "El Playón"),
    m("Sucre", "Biscucuy"),
    m("Turén", "Villa Bruzual"),
  ],
  Sucre: [
    m("Andrés Eloy Blanco", "Casanay"),
    m("Andrés Mata", "San José de Aerocuar"),
    m("Arismendi", "Río Caribe"),
    m("Benítez", "El Pilar"),
    m("Bermúdez", "Carúpano"),
    m("Bolívar", "Marigüitar"),
    m("Cajigal", "Yaguaraparo"),
    m("Cruz Salmerón Acosta", "Araya"),
    m("Libertador", "Tunapuy"),
    m("Mariño", "Irapa"),
    m("Mejía", "San Antonio del Golfo"),
    m("Montes", "Cumanacoa"),
    m("Ribero", "Cariaco"),
    m("Sucre", "Cumaná"),
    m("Valdez", "Güiria"),
  ],
  Táchira: [
    m("Andrés Bello", "Cordero"),
    m("Antonio Rómulo Costa", "Las Mesas"),
    m("Ayacucho", "Colón"),
    m("Bolívar", "San Antonio del Táchira"),
    m("Cárdenas", "Táriba"),
    m("Córdoba", "Santa Ana de Táchira"),
    m("Fernández Feo", "San Rafael del Piñal"),
    m("Francisco de Miranda", "San José de Bolívar"),
    m("García de Hevia", "La Fría"),
    m("Guásimos", "Palmira"),
    m("Independencia", "Capacho Nuevo"),
    m("Jáuregui", "La Grita"),
    m("José María Vargas", "El Cobre"),
    m("Junín", "Rubio"),
    m("Libertad", "Capacho Viejo"),
    m("Libertador", "Abejales"),
    m("Lobatera", "Lobatera"),
    m("Michelena", "Michelena"),
    m("Panamericano", "Coloncito"),
    m("Pedro María Ureña", "Ureña"),
    m("Rafael Urdaneta", "Delicias"),
    m("Samuel Darío Maldonado", "La Tendida"),
    m("San Cristóbal", "San Cristóbal"),
    m("San Judas Tadeo", "Umuquena"),
    m("Seboruco", "Seboruco"),
    m("Simón Rodríguez", "San Simón"),
    m("Sucre", "Queniquea"),
    m("Torbes", "San Josecito"),
    m("Uribante", "Pregonero"),
  ],
  Trujillo: [
    m("Andrés Bello", "Santa Isabel"),
    m("Boconó", "Boconó"),
    m("Bolívar", "Sabana Grande"),
    m("Candelaria", "Chejendé"),
    m("Carache", "Carache"),
    m("Escuque", "Escuque"),
    m("José Felipe Márquez Cañizales", "El Paradero"),
    m("Juan Vicente Campo Elías", "Campo Elías"),
    m("La Ceiba", "Santa Apolonia"),
    m("Miranda", "El Dividive"),
    m("Monte Carmelo", "Monte Carmelo"),
    m("Motatán", "Motatán"),
    m("Pampán", "Pampán"),
    m("Pampanito", "Pampanito"),
    m("Rafael Rangel", "Betijoque"),
    m("San Rafael de Carvajal", "Carvajal"),
    m("Sucre", "Sabana de Mendoza"),
    m("Trujillo", "Trujillo"),
    m("Urdaneta", "La Quebrada"),
    m("Valera", "Valera"),
  ],
  Yaracuy: [
    m("Arístides Bastidas", "San Pablo"),
    m("Bolívar", "Aroa"),
    m("Bruzual", "Chivacoa"),
    m("Cocorote", "Cocorote"),
    m("Independencia", "Independencia"),
    m("José Antonio Páez", "Sabana de Parra"),
    m("La Trinidad", "Boraure"),
    m("Manuel Monge", "Yumare"),
    m("Nirgua", "Nirgua"),
    m("Peña", "Yaritagua"),
    m("San Felipe", "San Felipe"),
    m("Sucre", "Guama"),
    m("Urachiche", "Urachiche"),
    m("Veroes", "Farriar"),
  ],
  Zulia: [
    m("Almirante Padilla", "El Toro"),
    m("Baralt", "San Timoteo"),
    m("Cabimas", "Cabimas"),
    m("Catatumbo", "Encontrados"),
    m("Colón", "San Carlos del Zulia"),
    m("Francisco Javier Pulgar", "Pueblo Nuevo-El Chivo"),
    m("Guajira", "Sinamaica"),
    m("Jesús Enrique Lossada", "La Concepción"),
    m("Jesús María Semprún", "Casigua El Cubo"),
    m("La Cañada de Urdaneta", "Concepción"),
    m("Lagunillas", "Ciudad Ojeda"),
    m("Machiques de Perijá", "Machiques"),
    m("Mara", "San Rafael del Moján"),
    m("Maracaibo", "Maracaibo"),
    m("Miranda", "Los Puertos de Altagracia"),
    m("Rosario de Perijá", "La Villa del Rosario"),
    m("San Francisco", "San Francisco"),
    m("Santa Rita", "Santa Rita"),
    m("Simón Bolívar", "Tía Juana"),
    m("Sucre", "Bobures"),
    m("Valmore Rodríguez", "Bachaquero"),
  ],
}

const EXTRA_ALIASES: Record<string, Record<string, string>> = {
  "Distrito Capital": {
    caracas: "Libertador",
  },
  "La Guaira": {
    vargas: "Vargas",
    "la guaira": "Vargas",
  },
  Bolívar: {
    "ciudad bolivar": "Angostura del Orinoco",
    "puerto ordaz": "Caroní",
    "san felix": "Caroní",
  },
  Miranda: {
    petare: "Sucre",
    "los teques": "Guaicaipuro",
  },
}

export function stripGeoAccents(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "")
}

function lookupKey(value: string): string {
  return stripGeoAccents(value).toLowerCase().trim()
}

const MUNICIPALITY_LOOKUPS = new Map<string, Map<string, string>>()

for (const [state, list] of Object.entries(VENEZUELA_MUNICIPALITIES)) {
  const map = new Map<string, string>()
  for (const item of list) {
    map.set(lookupKey(item.name), item.name)
    map.set(lookupKey(item.seat), item.name)
  }
  const extras = EXTRA_ALIASES[state]
  if (extras) {
    for (const [alias, officialName] of Object.entries(extras)) {
      map.set(lookupKey(alias), officialName)
    }
  }
  MUNICIPALITY_LOOKUPS.set(state, map)
}

export function municipalitiesForState(state: string): readonly VenezuelaMunicipality[] {
  const list = VENEZUELA_MUNICIPALITIES[state]
  if (!list) return []
  return [...list].sort((a, b) => a.name.localeCompare(b.name, "es"))
}

export function singleMunicipalityName(state: string): string | null {
  const list = VENEZUELA_MUNICIPALITIES[state]
  return list?.length === 1 ? (list[0]?.name ?? null) : null
}

export function normalizeMunicipality(state: string, value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  return MUNICIPALITY_LOOKUPS.get(state)?.get(lookupKey(trimmed)) ?? null
}

export function isValidVenezuelaMunicipality(state: string, name: string): boolean {
  return normalizeMunicipality(state, name) !== null
}

export function municipalityPickerLabel(item: VenezuelaMunicipality): string {
  return item.name === item.seat ? item.name : `${item.name} · ${item.seat}`
}

export function municipalitySearchText(item: VenezuelaMunicipality): string {
  return `${item.name} ${item.seat}`
}
