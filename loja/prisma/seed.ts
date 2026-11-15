/**
 * Seed de DEMONSTRAÇÃO.
 * - Produtos, fornecedores, cupons e combos são marcados com isDemo = true.
 * - Não cria pedidos, clientes, avaliações nem depoimentos fictícios.
 * - Cria o usuário administrador com a senha de SEED_ADMIN_PASSWORD (ou gera uma aleatória e imprime no console).
 *
 * Uso: npm run db:seed
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { hashPassword } from "../src/lib/crypto";

const db = new PrismaClient();

type V = { color?: string; hex?: string; size?: string; price?: number; compareAt?: number; cost?: number; stock: number; supplierSku: string };
type P = {
  slug: string; name: string; subtitle: string; category: string; supplier: string; price: number; compareAt?: number; cost: number;
  weight: number; featured?: boolean; colorLabel?: string; sizeLabel?: string; tags: string[]; description: string;
  specs: [string, string][]; images: [string, string, string?][]; variants: V[]; daysAgo: number;
};

const cats = [
  { slug: "ceramica", name: "Cerâmica", description: "Vasos e bowls de grés com acabamento fosco e esmaltado." },
  { slug: "mesa-posta", name: "Mesa posta", description: "Canecas, pratos, jarras e copos para o dia a dia." },
  { slug: "iluminacao", name: "Iluminação", description: "Luminárias de mesa com luz quente e difusa." },
  { slug: "aromas", name: "Aromas", description: "Velas, difusores e incensos para cada ambiente." },
  { slug: "objetos", name: "Objetos", description: "Bandejas e castiçais que organizam e decoram." },
];

const R = (reais: number) => Math.round(reais * 100);

const products: P[] = [
  {
    slug: "vaso-duna", name: "Vaso Duna", subtitle: "Grés fosco com pintas naturais", category: "ceramica", supplier: "atelie", price: 189, cost: 72, weight: 1800, featured: true, daysAgo: 40,
    tags: ["vaso", "ceramica", "decoracao", "flores"],
    description: "Silhueta de gota com gargalo estreito, moldada em grés e queimada a alta temperatura. O acabamento fosco revela as pintas naturais da argila — cada peça tem um padrão único.\n\nFunciona sozinho como escultura ou com galhos secos e flores de haste longa. Interior impermeabilizado para uso com água.",
    specs: [["Material", "Grés cerâmico"], ["Acabamento", "Fosco, interior esmaltado"], ["Médio", "28 cm de altura · 19 cm de diâmetro"], ["Grande", "36 cm de altura · 24 cm de diâmetro"], ["Cuidados", "Limpar com pano úmido; não vai à lava-louças"], ["Origem", "Produção artesanal — pequenas variações são esperadas"]],
    images: [["vaso-duna-argila-1", "Vaso Duna na cor argila", "Argila"], ["vaso-duna-areia-1", "Vaso Duna na cor areia", "Areia"], ["vaso-duna-grafite-1", "Vaso Duna na cor grafite", "Grafite"], ["vaso-duna-detalhe", "Detalhe do gargalo e da textura do Vaso Duna"], ["vaso-duna-trio", "Três vasos Duna em cores e tamanhos diferentes"]],
    variants: [
      { color: "Argila", hex: "#b5653f", size: "Médio", stock: 14, supplierSku: "ATL-DUN-ARG-M" },
      { color: "Argila", hex: "#b5653f", size: "Grande", price: 259, cost: 98, stock: 6, supplierSku: "ATL-DUN-ARG-G" },
      { color: "Areia", hex: "#d8c7ad", size: "Médio", stock: 18, supplierSku: "ATL-DUN-ARE-M" },
      { color: "Areia", hex: "#d8c7ad", size: "Grande", price: 259, cost: 98, stock: 4, supplierSku: "ATL-DUN-ARE-G" },
      { color: "Grafite", hex: "#3b3a38", size: "Médio", stock: 9, supplierSku: "ATL-DUN-GRA-M" },
      { color: "Grafite", hex: "#3b3a38", size: "Grande", price: 259, cost: 98, stock: 0, supplierSku: "ATL-DUN-GRA-G" },
    ],
  },
  {
    slug: "vaso-seixo", name: "Vaso Seixo", subtitle: "Formato baixo e arredondado", category: "ceramica", supplier: "atelie", price: 149, cost: 55, weight: 1400, daysAgo: 35,
    tags: ["vaso", "ceramica", "mesa", "decoracao"],
    description: "Inspirado nas pedras roladas de rio: corpo largo, baixo e com boca pequena, ideal para um único galho ou flor. Fica bem em aparadores, mesas de centro e prateleiras.",
    specs: [["Material", "Grés cerâmico"], ["Dimensões", "16 cm de altura · 26 cm de diâmetro"], ["Acabamento", "Fosco texturizado"], ["Cuidados", "Limpar com pano úmido"]],
    images: [["vaso-seixo-osso-1", "Vaso Seixo na cor osso", "Osso"], ["vaso-seixo-musgo-1", "Vaso Seixo na cor musgo", "Musgo"], ["vaso-seixo-topo", "Vaso Seixo visto de cima"]],
    variants: [
      { color: "Osso", hex: "#ece4d6", stock: 12, supplierSku: "ATL-SEI-OSS" },
      { color: "Musgo", hex: "#6f7556", stock: 3, supplierSku: "ATL-SEI-MUS" },
    ],
  },
  {
    slug: "bowl-mare", name: "Bowls Maré (par)", subtitle: "Conjunto com 2 bowls de 600 ml", category: "ceramica", supplier: "atelie", price: 119, compareAt: 139, cost: 44, weight: 1200, featured: true, daysAgo: 28,
    tags: ["bowl", "tigela", "ceramica", "mesa", "cafe da manha"],
    description: "Bowls de parede curva e borda fina, no tamanho certo para granola, saladas e caldos. O esmalte cobalto tem brilho acetinado; a versão areia é fosca. Vendidos em par.",
    specs: [["Conteúdo", "2 bowls"], ["Capacidade", "600 ml cada"], ["Dimensões", "8 cm de altura · 15 cm de diâmetro"], ["Uso", "Lava-louças e micro-ondas"]],
    images: [["bowl-mare-cobalto-1", "Par de bowls Maré cobalto", "Cobalto"], ["bowl-mare-areia-1", "Par de bowls Maré areia", "Areia"], ["bowl-mare-topo", "Bowl Maré cobalto visto de cima"]],
    variants: [
      { color: "Cobalto", hex: "#2f4a7a", stock: 20, supplierSku: "ATL-MAR-COB" },
      { color: "Areia", hex: "#d8c7ad", stock: 16, supplierSku: "ATL-MAR-ARE" },
    ],
  },
  {
    slug: "caneca-aurora", name: "Caneca Aurora 350 ml", subtitle: "Grés esmaltado com alça redonda", category: "mesa-posta", supplier: "atelie", price: 69, cost: 22, weight: 420, featured: true, daysAgo: 12,
    tags: ["caneca", "cafe", "cha", "mesa posta", "presente"],
    description: "Caneca de corpo reto e alça em anel, confortável para segurar com a mão inteira. Esmalte acetinado com pintas naturais do grés. Capacidade para um café com leite generoso.",
    specs: [["Capacidade", "350 ml"], ["Dimensões", "10 cm de altura · 8,5 cm de diâmetro"], ["Uso", "Lava-louças e micro-ondas"], ["Material", "Grés esmaltado"]],
    images: [["caneca-aurora-terracota-1", "Caneca Aurora terracota", "Terracota"], ["caneca-aurora-creme-1", "Caneca Aurora creme", "Creme"], ["caneca-aurora-grafite-1", "Caneca Aurora grafite", "Grafite"], ["caneca-aurora-par", "Duas canecas Aurora, terracota e creme"]],
    variants: [
      { color: "Terracota", hex: "#a9502f", stock: 40, supplierSku: "ATL-AUR-TER" },
      { color: "Creme", hex: "#efe3cc", stock: 35, supplierSku: "ATL-AUR-CRE" },
      { color: "Grafite", hex: "#3b3a38", stock: 22, supplierSku: "ATL-AUR-GRA" },
    ],
  },
  {
    slug: "prato-raso-orla", name: "Pratos Rasos Orla (4 un.)", subtitle: "Conjunto com 4 pratos de 27 cm", category: "mesa-posta", supplier: "atelie", price: 229, cost: 88, weight: 3600, daysAgo: 25,
    tags: ["prato", "jantar", "mesa posta", "aparelho"],
    description: "Pratos rasos com aba larga e leve inclinação, que valoriza a comida no centro. Grés de alta resistência com esmalte acetinado. Empilham com estabilidade.",
    specs: [["Conteúdo", "4 pratos rasos"], ["Diâmetro", "27 cm"], ["Uso", "Lava-louças e micro-ondas"], ["Material", "Grés esmaltado"]],
    images: [["prato-orla-osso-1", "Pilha de pratos Orla osso", "Osso"], ["prato-orla-grafite-1", "Pilha de pratos Orla grafite", "Grafite"], ["prato-orla-topo", "Prato Orla com bowl, vista de cima"]],
    variants: [
      { color: "Osso", hex: "#ece4d6", stock: 10, supplierSku: "ATL-ORL-OSS-4" },
      { color: "Grafite", hex: "#3b3a38", stock: 7, supplierSku: "ATL-ORL-GRA-4" },
    ],
  },
  {
    slug: "jarra-brisa", name: "Jarra Brisa 1 L", subtitle: "Vidro borossilicato soprado", category: "mesa-posta", supplier: "global", price: 139, cost: 41, weight: 700, daysAgo: 18,
    tags: ["jarra", "vidro", "agua", "mesa posta"],
    description: "Jarra de vidro borossilicato, leve e resistente a variações de temperatura. O gargalo afunilado facilita servir sem respingos.",
    specs: [["Capacidade", "1 litro"], ["Material", "Vidro borossilicato"], ["Dimensões", "28 cm de altura"], ["Uso", "Lava-louças; suporta líquidos quentes"]],
    images: [["jarra-brisa-1", "Jarra Brisa com água"], ["jarra-brisa-conjunto", "Jarra Brisa com copo Brisa"]],
    variants: [{ stock: 25, supplierSku: "GLB-BRS-JAR-1L" }],
  },
  {
    slug: "copos-brisa", name: "Copos Brisa (4 un.)", subtitle: "Conjunto com 4 copos de 300 ml", category: "mesa-posta", supplier: "global", price: 99, cost: 28, weight: 900, daysAgo: 18,
    tags: ["copo", "vidro", "mesa posta"],
    description: "Copos de parede fina e boca levemente aberta, do mesmo vidro borossilicato da Jarra Brisa. Para água, sucos e drinks.",
    specs: [["Conteúdo", "4 copos"], ["Capacidade", "300 ml cada"], ["Material", "Vidro borossilicato"], ["Uso", "Lava-louças"]],
    images: [["copo-brisa-1", "Dois copos Brisa com água"], ["copo-brisa-topo", "Copo Brisa visto de cima"]],
    variants: [{ stock: 30, supplierSku: "GLB-BRS-COP-4" }],
  },
  {
    slug: "luminaria-farol", name: "Luminária Farol", subtitle: "Luminária de mesa em metal", category: "iluminacao", supplier: "casaluz", price: 489, cost: 205, weight: 2400, featured: true, daysAgo: 30,
    tags: ["luminaria", "abajur", "iluminacao", "metal", "latao"],
    description: "Cúpula em domo e haste fina em metal, com luz direcionada para baixo — boa para leitura e para criar pontos de luz quente. Acabamento escovado em latão ou pintura preta fosca.",
    specs: [["Altura", "42 cm"], ["Cúpula", "30 cm de diâmetro"], ["Lâmpada", "E27 LED até 9 W (não inclusa)"], ["Tensão", "Bivolt"], ["Cabo", "1,8 m com interruptor"]],
    images: [["luminaria-farol-latao-1", "Luminária Farol em latão acesa", "Latão"], ["luminaria-farol-preto-1", "Luminária Farol preta acesa", "Preto"], ["luminaria-farol-detalhe", "Detalhe interno da cúpula da Luminária Farol"]],
    variants: [
      { color: "Latão", hex: "#c9a46a", stock: 8, supplierSku: "CSL-FAR-LAT" },
      { color: "Preto", hex: "#1e1d1c", stock: 11, supplierSku: "CSL-FAR-PRE" },
    ],
  },
  {
    slug: "luminaria-lua", name: "Luminária Lua", subtitle: "Globo de vidro opalino e base de madeira", category: "iluminacao", supplier: "casaluz", price: 389, compareAt: 449, cost: 160, weight: 1900, daysAgo: 22,
    tags: ["luminaria", "abajur", "iluminacao", "vidro", "quarto"],
    description: "Globo de vidro opalino que difunde a luz por igual, sem ofuscar. Base torneada em madeira maciça. Ideal para criados-mudos e cantos de leitura.",
    specs: [["Altura", "30 cm"], ["Globo", "20 cm de diâmetro"], ["Lâmpada", "E14 LED até 5 W (não inclusa)"], ["Tensão", "Bivolt"], ["Base", "Madeira maciça com verniz fosco"]],
    images: [["luminaria-lua-1", "Luminária Lua acesa"], ["luminaria-lua-detalhe", "Detalhe da base de madeira da Luminária Lua"]],
    variants: [{ stock: 9, supplierSku: "CSL-LUA-OPA" }],
  },
  {
    slug: "vela-atelie", name: "Vela Ateliê 220 g", subtitle: "Cera vegetal em pote de cerâmica", category: "aromas", supplier: "atelie", price: 89, cost: 29, weight: 520, featured: true, colorLabel: "Aroma", daysAgo: 8,
    tags: ["vela", "aroma", "perfumada", "presente"],
    description: "Vela de cera vegetal com pavio de algodão, em pote de cerâmica reaproveitável. Queima limpa por cerca de 45 horas.\n\nFigo: notas verdes e frutadas. Cedro: amadeirado seco. Alecrim: herbal e fresco.",
    specs: [["Peso", "220 g"], ["Queima", "≈ 45 horas"], ["Cera", "Vegetal (soja e coco)"], ["Pote", "Cerâmica, reutilizável"], ["Segurança", "Não deixe a vela acesa sem supervisão"]],
    images: [["vela-atelie-figo-1", "Vela Ateliê aroma figo acesa", "Figo"], ["vela-atelie-cedro-1", "Vela Ateliê aroma cedro acesa", "Cedro"], ["vela-atelie-alecrim-1", "Vela Ateliê aroma alecrim acesa", "Alecrim"], ["vela-atelie-trio", "Três velas Ateliê"]],
    variants: [
      { color: "Figo", hex: "#efe8dc", stock: 30, supplierSku: "ATL-VEL-FIG" },
      { color: "Cedro", hex: "#3c3a37", stock: 26, supplierSku: "ATL-VEL-CED" },
      { color: "Alecrim", hex: "#7c8264", stock: 2, supplierSku: "ATL-VEL-ALE" },
    ],
  },
  {
    slug: "difusor-sereno", name: "Difusor Sereno 250 ml", subtitle: "Varetas de fibra e frasco de vidro", category: "aromas", supplier: "atelie", price: 129, cost: 43, weight: 650, colorLabel: "Aroma", daysAgo: 6,
    tags: ["difusor", "aroma", "ambiente", "presente"],
    description: "Difusor de varetas com fragrância de longa duração. Vire as varetas a cada semana para intensificar o perfume. Dura cerca de 60 dias.",
    specs: [["Volume", "250 ml"], ["Duração", "≈ 60 dias"], ["Varetas", "7 varetas de fibra"], ["Frasco", "Vidro, reutilizável"]],
    images: [["difusor-sereno-figo-1", "Difusor Sereno aroma figo", "Figo"], ["difusor-sereno-cedro-1", "Difusor Sereno aroma cedro em frasco âmbar", "Cedro"]],
    variants: [
      { color: "Figo", hex: "#efe8dc", stock: 18, supplierSku: "ATL-DIF-FIG" },
      { color: "Cedro", hex: "#8a5a2b", stock: 15, supplierSku: "ATL-DIF-CED" },
    ],
  },
  {
    slug: "bandeja-pedra", name: "Bandeja Pedra Oval", subtitle: "Pedra natural com borda elevada", category: "objetos", supplier: "casaluz", price: 179, cost: 70, weight: 2200, colorLabel: "Pedra", daysAgo: 15,
    tags: ["bandeja", "travertino", "marmore", "organizacao", "lavabo"],
    description: "Bandeja oval esculpida em pedra natural, para organizar perfumes, joias, velas ou chaves. Os veios e poros variam de peça para peça.",
    specs: [["Dimensões", "30 × 20 cm · 2,5 cm de altura"], ["Material", "Travertino ou mármore Nero"], ["Cuidados", "Evite produtos ácidos; limpe com pano seco"]],
    images: [["bandeja-travertino-1", "Bandeja Pedra Oval em travertino", "Travertino"], ["bandeja-marmore-1", "Bandeja Pedra Oval em mármore Nero", "Mármore Nero"], ["bandeja-travertino-cena", "Bandeja de travertino com vela e porta-incenso"]],
    variants: [
      { color: "Travertino", hex: "#d9c9ad", stock: 12, supplierSku: "CSL-BAN-TRV" },
      { color: "Mármore Nero", hex: "#2a2928", price: 199, cost: 82, stock: 5, supplierSku: "CSL-BAN-NER" },
    ],
  },
  {
    slug: "porta-incenso-ilha", name: "Porta-incenso Ilha", subtitle: "Disco de cerâmica com 1 vareta de brinde", category: "aromas", supplier: "atelie", price: 49, cost: 14, weight: 300, daysAgo: 10,
    tags: ["incenso", "ceramica", "aroma"],
    description: "Disco de cerâmica com orifício central que segura a vareta e recolhe as cinzas. Pequeno, discreto e fácil de limpar.",
    specs: [["Diâmetro", "10 cm"], ["Material", "Grés fosco"], ["Inclui", "1 vareta de incenso de palo santo"]],
    images: [["porta-incenso-ilha-grafite-1", "Porta-incenso Ilha grafite com incenso", "Grafite"], ["porta-incenso-ilha-osso-1", "Porta-incenso Ilha osso com incenso", "Osso"]],
    variants: [
      { color: "Grafite", hex: "#3b3a38", stock: 45, supplierSku: "ATL-ILH-GRA" },
      { color: "Osso", hex: "#ece4d6", stock: 38, supplierSku: "ATL-ILH-OSS" },
    ],
  },
  {
    slug: "castical-prumo", name: "Castiçais Prumo (par)", subtitle: "Latão maciço, 14 e 22 cm", category: "objetos", supplier: "casaluz", price: 169, cost: 58, weight: 900, daysAgo: 4,
    tags: ["castical", "latao", "vela", "mesa posta"],
    description: "Par de castiçais em latão maciço torneado, em duas alturas para compor a mesa. Acompanham 2 velas palito de cera vegetal.",
    specs: [["Alturas", "14 cm e 22 cm"], ["Material", "Latão maciço"], ["Inclui", "2 velas palito"], ["Cuidados", "Polir com flanela seca"]],
    images: [["castical-prumo-1", "Par de castiçais Prumo em latão com velas"], ["castical-prumo-detalhe", "Detalhe do castiçal Prumo"]],
    variants: [{ stock: 14, supplierSku: "CSL-PRU-PAR" }],
  },
];

async function main() {
  console.log("Seed de demonstração…");

  // Usuário administrador
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@mosaik.example").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || randomBytes(9).toString("base64url") + "9a";
  const existingAdmin = await db.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await db.user.create({ data: { email: adminEmail, name: "Administrador", role: "ADMIN", passwordHash: await hashPassword(adminPassword) } });
    console.log(`  Admin criado: ${adminEmail} / senha: ${process.env.SEED_ADMIN_PASSWORD ? "(definida em SEED_ADMIN_PASSWORD)" : adminPassword}`);
  } else console.log(`  Admin já existe: ${adminEmail}`);

  for (const [i, c] of cats.entries()) {
    await db.category.upsert({ where: { slug: c.slug }, create: { ...c, position: i }, update: { name: c.name, description: c.description, position: i } });
  }

  const suppliers = {
    atelie: await upsertSupplier("Ateliê Cerâmico Parceiro (demonstração)", { integration: "MANUAL", processingDays: 3, shippingDaysMin: 4, shippingDaysMax: 9, email: "pedidos@atelie-parceiro.example", contactName: "Contato a definir", notes: "Fornecedor fictício para demonstração. Substitua pelos dados reais." }),
    casaluz: await upsertSupplier("Distribuidor Casa & Luz (demonstração)", { integration: "CSV", processingDays: 2, shippingDaysMin: 3, shippingDaysMax: 8, email: "comercial@casaeluz.example", notes: "Fornecedor fictício. Estoque e custo podem ser atualizados por planilha CSV." }),
    global: await upsertSupplier("Importador Global (demonstração — CJdropshipping)", { integration: "CJ", processingDays: 3, shippingDaysMin: 10, shippingDaysMax: 20, notes: "Exemplo de fornecedor via plataforma. A integração com a API da CJ ainda não está ativa (veja docs/INTEGRACOES.md)." }),
  };

  const catIds = Object.fromEntries((await db.category.findMany()).map((c) => [c.slug, c.id]));

  for (const p of products) {
    const data = {
      name: p.name, subtitle: p.subtitle, description: p.description, status: "ACTIVE" as const, isDemo: true, featured: !!p.featured,
      categoryId: catIds[p.category], supplierId: suppliers[p.supplier as keyof typeof suppliers], priceCents: R(p.price),
      compareAtCents: p.compareAt ? R(p.compareAt) : null, costCents: R(p.cost), weightGrams: p.weight, tags: p.tags,
      colorLabel: p.colorLabel ?? "Cor", sizeLabel: p.sizeLabel ?? "Tamanho",
      specs: p.specs.map(([label, value]) => ({ label, value })) as Prisma.InputJsonValue,
      seoDescription: `${p.name} — ${p.subtitle}. Frete grátis acima de R$ 299 e parcelamento sem juros.`.slice(0, 160),
      createdAt: new Date(Date.now() - p.daysAgo * 86400_000),
    };
    const prod = await db.product.upsert({ where: { slug: p.slug }, create: { slug: p.slug, ...data }, update: data });
    await db.productImage.deleteMany({ where: { productId: prod.id } });
    await db.productImage.createMany({ data: p.images.map(([file, alt, colorKey], position) => ({ productId: prod.id, url: `/products/${file}.jpg`, alt, colorKey: colorKey ?? null, position })) });
    for (const [position, v] of p.variants.entries()) {
      const sku = `MK-${v.supplierSku}`;
      const vData = {
        productId: prod.id, color: v.color ?? null, colorHex: v.hex ?? null, size: v.size ?? null,
        priceCents: v.price ? R(v.price) : null, compareAtCents: v.compareAt ? R(v.compareAt) : null, costCents: v.cost ? R(v.cost) : null,
        stock: v.stock, supplierSku: v.supplierSku, position, active: true,
      };
      await db.productVariant.upsert({ where: { sku }, create: { sku, ...vData }, update: vData });
    }
  }

  // Frete (valores de referência — ajuste conforme contrato com transportadoras)
  const shipping = [
    { name: "Econômica", carrier: "Correios PAC", description: "Entrega padrão com rastreamento", baseCents: 1990, perKgCents: 450, freeOverCents: 29900, extraDaysMin: 1, extraDaysMax: 3, position: 0, regionMultiplier: { SE: 1, S: 1.15, CO: 1.25, NE: 1.45, N: 1.75 } },
    { name: "Expressa", carrier: "Correios SEDEX", description: "Prioridade no transporte", baseCents: 3490, perKgCents: 800, freeOverCents: null, extraDaysMin: -1, extraDaysMax: -2, position: 1, regionMultiplier: { SE: 1, S: 1.2, CO: 1.35, NE: 1.6, N: 1.9 } },
  ];
  for (const s of shipping) {
    const existing = await db.shippingMethod.findFirst({ where: { name: s.name } });
    if (existing) await db.shippingMethod.update({ where: { id: existing.id }, data: s });
    else await db.shippingMethod.create({ data: s });
  }

  // Cupons de demonstração
  const coupons = [
    { code: "BEMVINDO10", description: "10% na primeira compra acima de R$ 150 (demonstração)", type: "PERCENT" as const, value: 10, minSubtotalCents: 15000, perCustomerLimit: 1 },
    { code: "FRETEGRATIS", description: "Frete grátis acima de R$ 150 (demonstração)", type: "FREE_SHIPPING" as const, value: 0, minSubtotalCents: 15000 },
    { code: "MOSAIK30", description: "R$ 30 off acima de R$ 250 (demonstração)", type: "FIXED" as const, value: 3000, minSubtotalCents: 25000, maxUses: 200 },
  ];
  for (const c of coupons) await db.coupon.upsert({ where: { code: c.code }, create: { ...c, isDemo: true }, update: c });

  // Combos
  const bySlug = Object.fromEntries((await db.product.findMany({ select: { id: true, slug: true } })).map((p) => [p.slug, p.id]));
  const bundles = [
    { slug: "ritual-da-noite", name: "Ritual da noite", description: "Vela, porta-incenso e bandeja de pedra.", discountPct: 10, items: ["vela-atelie", "porta-incenso-ilha", "bandeja-pedra"] },
    { slug: "cafe-da-manha", name: "Café da manhã", description: "Caneca, bowls e pratos Orla.", discountPct: 10, items: ["caneca-aurora", "bowl-mare", "prato-raso-orla"] },
    { slug: "agua-a-mesa", name: "Água à mesa", description: "Jarra e copos Brisa.", discountPct: 8, items: ["jarra-brisa", "copos-brisa"] },
  ];
  for (const b of bundles) {
    const bundle = await db.bundle.upsert({ where: { slug: b.slug }, create: { slug: b.slug, name: b.name, description: b.description, discountPct: b.discountPct }, update: { name: b.name, description: b.description, discountPct: b.discountPct } });
    await db.bundleItem.deleteMany({ where: { bundleId: bundle.id } });
    await db.bundleItem.createMany({ data: b.items.map((s) => ({ bundleId: bundle.id, productId: bySlug[s] })) });
  }

  console.log(`  ${products.length} produtos, ${cats.length} categorias, 3 fornecedores, ${coupons.length} cupons e ${bundles.length} combos de demonstração.`);
}

async function upsertSupplier(name: string, data: Omit<Prisma.SupplierCreateInput, "name">) {
  const found = await db.supplier.findFirst({ where: { name } });
  if (found) return (await db.supplier.update({ where: { id: found.id }, data: { ...data, isDemo: true } })).id;
  return (await db.supplier.create({ data: { name, ...data, isDemo: true } })).id;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
