/**
 * Epic Mission Engine - Professional Text Processing
 * Transforms raw API responses into atmospheric Echo Shift narrative
 * 
 * Features:
 * - Detects boring/empty API responses
 * - Processes text into Echo Shift archive format
 * - Provides rich fallback facts based on number ranges
 * - Year mode for historical dates (200-2025)
 */

// Patterns that indicate boring/empty API responses
const BORING_PATTERNS = [
    'is a number',
    'is a boring',
    'is unremarkable',
    'is an uninteresting',
    'is the number',
    'is an odd number',
    'is an even number',
    'is a positive',
    'is a natural',
];

// Archive type categories based on number ranges
type ArchiveCategory = 'HISTORICAL' | 'SCIENTIFIC' | 'COSMIC' | 'CYBER' | 'EXPLORATION';

/**
 * Determine the archive category based on the number
 */
function getArchiveCategory(num: number): ArchiveCategory {
    if (num <= 2025) return 'HISTORICAL';
    if (num <= 3000) return 'SCIENTIFIC';
    if (num <= 4000) return 'COSMIC';
    if (num <= 4500) return 'CYBER';
    return 'EXPLORATION';
}

/**
 * Get category label in Turkish
 */
function getCategoryLabel(category: ArchiveCategory): string {
    switch (category) {
        case 'HISTORICAL': return 'TARİHSEL KAYIT';
        case 'SCIENTIFIC': return 'BİLİMSEL VERİ';
        case 'COSMIC': return 'KOZMİK SİNYAL';
        case 'CYBER': return 'SİBER ARŞİV';
        case 'EXPLORATION': return 'KEŞİF GÜNLÜĞÜ';
    }
}

/**
 * Historical facts library for year mode (200-2025)
 */
const HISTORICAL_FACTS: { range: [number, number]; facts: string[] }[] = [
    {
        range: [200, 500],
        facts: [
            'Roma İmparatorluğu\'nun ihtişamının zirvesinde olduğu dönem.',
            'Antik uygarlıkların gizli bilgilerini kaydettiği yıllar.',
            'Büyük filozofların evrenin sırlarını çözdüğü çağ.',
        ],
    },
    {
        range: [501, 1000],
        facts: [
            'Karanlık Çağ\'ın ortasında umudun ışıldadığı yıllar.',
            'Vikinglerin denizlerin hakimi olduğu efsanevi dönem.',
            'Doğu ve Batı medeniyetlerinin kesiştiği kritik zaman.',
        ],
    },
    {
        range: [1001, 1500],
        facts: [
            'Rönesans\'ın ilk kıvılcımlarının parladığı yüzyıl.',
            'Büyük kaşiflerin ufuklara yelken açtığı çağ.',
            'Bilimin ve sanatın yeniden doğduğu muhteşem dönem.',
        ],
    },
    {
        range: [1501, 1800],
        facts: [
            'Bilimsel devrimin insanlığı dönüştürdüğü yıllar.',
            'Keşfedilmemiş kıtaların haritaya eklendiği efsanevi zaman.',
            'Aydınlanma Çağı\'nın karanlığı yok ettiği dönem.',
        ],
    },
    {
        range: [1801, 1900],
        facts: [
            'Endüstri Devrimi\'nin dünyayı köklü şekilde değiştirdiği yıllar.',
            'Elektriğin keşfiyle yeni bir çağın başladığı zaman.',
            'İmparatorlukların yükselişinin ve düşüşünün yaşandığı dönem.',
        ],
    },
    {
        range: [1901, 2000],
        facts: [
            'İnsanlığın uzaya ilk adımını attığı muhteşem yüzyıl.',
            'Dijital çağın temellerinin atıldığı köşe taşı.',
            'Dünya savaşlarının ardından barışın inşa edildiği zaman.',
        ],
    },
    {
        range: [2001, 2025],
        facts: [
            'Yapay zekanın insanlıkla buluştuğu kritik eşik.',
            'Dijital devrimlerin günlük hayatı dönüştürdüğü çağ.',
            'İnsanlığın Mars\'a gözlerini diktiği heyecan verici dönem.',
        ],
    },
];

/**
 * Scientific/Cosmic facts for larger numbers (2026-5000)
 */
const SCIENTIFIC_FACTS = [
    'metre; bir nötron yıldızının manyetik alanının sınırındaki mesafe.',
    'birim; evrensel sabitin kritik bir hesaplama noktası.',
    'metre; okyanus tabanındaki hidrotermal bacaların derinliği.',
    'birim; bir kuantum sisteminin kararlı hale geldiği eşik.',
    'metre; yeryüzünün en derin mağara sistemlerinin sınırı.',
    'km; bir uzay istasyonunun yörünge yarıçapının bir kesiti.',
    'birim; Echo Shift evreninin çekirdek frekansındaki kritik değer.',
    'metre; Mariana Çukuru\'nun yanında bile gizemli kalan derinlik.',
];

const COSMIC_FACTS = [
    'ışık yılı uzaklıktaki bir galaksiden gelen sinyalin yankısı.',
    'birim; karanlık maddenin izinin tespit edildiği eşik.',
    'metre; uzay-zaman dokusunun büküldüğü kritik mesafe.',
    'saniye; süpernova patlamasının ilk ışığının yolculuğu.',
    'birim; evrenin genişleme hızının bir kesiti.',
];

const CYBER_FACTS = [
    'birim; sistemin çekirdek frekansındaki kritik eşik.',
    'cycle; veri akışının maksimum bant genişliğine ulaştığı an.',
    'bit; şifresi henüz çözülmemiş antik bir algoritmadan kalma iz.',
    'birim; Echo Shift matrisinin temel katalizör değeri.',
    'teraflop; yapay zekanın bilinç eşiğine yaklaştığı hesaplama gücü.',
];

const EXPLORATION_FACTS = [
    'metre; henüz keşfedilmemiş okyanusların karanlık sınırı.',
    'km; yeryüzündeki en uzak noktadan bile ötedeki mesafe.',
    'birim; evrenin henüz haritalanmamış bölgelerinin başlangıcı.',
    'metre; Echo Shift evreninin çözümlenmemiş sinyallerinin kaynağı.',
    'birim; insanlığın bir sonraki büyük keşfine giden yolun ölçüsü.',
];

/**
 * Get a random item from an array
 */
function getRandomItem<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * Generate fallback epic fact based on number
 */
function generateFallbackEpicFact(num: number): string {
    const category = getArchiveCategory(num);
    const label = getCategoryLabel(category);

    if (category === 'HISTORICAL') {
        // Find matching historical period
        const period = HISTORICAL_FACTS.find(
            p => num >= p.range[0] && num <= p.range[1]
        );
        const fact = period ? getRandomItem(period.facts) : 'İnsanlık tarihinin önemli bir kesit noktası.';
        return `${label} #${num}: MS ${num} — ${fact}`;
    }

    let facts: string[];
    switch (category) {
        case 'SCIENTIFIC':
            facts = SCIENTIFIC_FACTS;
            break;
        case 'COSMIC':
            facts = COSMIC_FACTS;
            break;
        case 'CYBER':
            facts = CYBER_FACTS;
            break;
        case 'EXPLORATION':
            facts = EXPLORATION_FACTS;
            break;
    }

    return `${label} #${num}: ${num} ${getRandomItem(facts)}`;
}

/**
 * Check if API text is boring or empty
 */
function isBoringText(text: string): boolean {
    const lowerText = text.toLowerCase();
    return (
        BORING_PATTERNS.some(pattern => lowerText.includes(pattern)) ||
        text.length < 20
    );
}

/**
 * Clean and process API text into professional archive format
 */
function processApiText(num: number, rawText: string): string {
    const category = getArchiveCategory(num);
    const label = getCategoryLabel(category);

    // Remove common boring prefixes
    let processed = rawText
        .replace(new RegExp(`^${num} is `, 'i'), '')
        .replace(/^the year that /i, '')
        .replace(/^the number of /i, 'Sayısı: ')
        .replace(/^the /i, '')
        .trim();

    // Capitalize first letter
    processed = processed.charAt(0).toUpperCase() + processed.slice(1);

    // Ensure it ends with proper punctuation
    if (!processed.endsWith('.') && !processed.endsWith('!') && !processed.endsWith('?')) {
        processed += '.';
    }

    return `${label} #${num}: ${processed}`;
}

/**
 * Main function to process mission text
 * Transforms raw API response into professional Echo Shift narrative
 */
export function processEpicMissionText(number: number, rawText: string): string {
    // Check if text is boring or empty
    if (isBoringText(rawText)) {
        return generateFallbackEpicFact(number);
    }

    return processApiText(number, rawText);
}

/**
 * Get the appropriate API type based on number
 * Numbers <= 2025 use 'year' endpoint for historical facts
 * Numbers > 2025 use 'trivia' endpoint
 */
export function getApiType(number: number): 'year' | 'trivia' {
    return number <= 2025 ? 'year' : 'trivia';
}

/**
 * Export for direct fallback generation (when API fails completely)
 */
export { generateFallbackEpicFact };
