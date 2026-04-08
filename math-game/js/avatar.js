/**
 * Avatar Management System
 */
const AvatarManager = {
    parts: {
        faceForm: ['round', 'oval', 'square', 'heart'],
        eyesForm: ['normal', 'large', 'cool', 'happy', 'wink', 'sleepy', 'surprised', 'angry', 'star-eyes', 'sparkle'],
        hairType: ['none', 'buzz', 'short', 'medium', 'long', 'very-long', 'spiky', 'curly', 'wavy', 'ponytail', 'pigtails', 'mohawk', 'slicked', 'undercut', 'afro', 'mullet'],
        noseType: ['small', 'medium', 'round'],
        lipsType: ['normal', 'smile', 'wide', 'kiss', 'tongue-out', 'vampire', 'mustache', 'duck-face'],
        accessory: ['none', 'glasses', 'sunglasses', 'cap', 'beanie', 'crown', 'bow', 'headphones', 'star', 'heart-glasses', 'monocle', 'bandana', 'antenna'],
        outfit: ['tshirt', 'hoodie', 'dress', 'suit', 'tank-top', 'sweater', 'polo']
    },
    
    colors: {
        face: [
            // Very light / pale
            '#FFF5EE', '#FFF0F5', '#FFEFD5', '#FFF8DC', 
            // Light
            '#FFE4C4', '#FFDBAC', '#FFDAB9', '#FFE4E1',
            // Medium
            '#F1C27D', '#E0AC69', '#D2B48C', '#C68642',
            // Darker
            '#8D5524', '#6B4423', '#5C4033', '#3D2314'
        ],
        eyes: ['#333333', '#2B5329', '#243763', '#634721', '#4B2C20', '#1E90FF', '#228B22', '#8B4513', '#9370DB', '#20B2AA'],
        hair: [
            // Solid colors
            '#FFFFFF',  // White
            '#F5F5F5',  // Silver
            '#000000',  // Black
            '#4B2C20',  // Dark brown
            '#8B4513',  // Brown
            '#D2B48C',  // Light brown / Blonde
            '#FFD700',  // Golden
            '#FF6B6B',  // Red/Pink
            '#9A3324',  // Auburn
            '#5E5E5E',  // Gray
            '#6B5B95',  // Purple
            '#88B04B',  // Green
            '#45B8AC',  // Teal
            '#5B5EA6',  // Blue
            // Gradients (represented as special values)
            'gradient-rainbow',
            'gradient-sunset',
            'gradient-ocean',
            'gradient-pink',
            'gradient-fire'
        ],
        outfit: [
            '#667eea',  // Purple-blue (default)
            '#ff6b6b',  // Red
            '#4ecdc4',  // Teal
            '#45b7d1',  // Sky blue
            '#96ceb4',  // Mint
            '#ffeaa7',  // Yellow
            '#dfe6e9',  // Light gray
            '#2d3436',  // Dark gray
            '#e17055',  // Orange
            '#a29bfe',  // Lavender
            '#fd79a8',  // Pink
            '#00b894',  // Green
            '#6c5ce7',  // Indigo
            '#ffffff',  // White
            '#1a1a2e',  // Navy
            '#f8b500'   // Gold
        ]
    },

    // Gradient definitions
    gradients: {
        'gradient-rainbow': ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#9B59B6'],
        'gradient-sunset': ['#FF6B6B', '#FFA07A', '#FFD700'],
        'gradient-ocean': ['#667eea', '#764ba2', '#66a6ff'],
        'gradient-pink': ['#ff9a9e', '#fecfef', '#fecfef'],
        'gradient-fire': ['#FF4500', '#FF6347', '#FFD700']
    },

    // Shop items definition
    shopItems: [
        { id: 'outfit-tanjiro',  type: 'outfit',    name: 'Tanjiro Outfit',    price: 50,  icon: '⚔️' },
        { id: 'outfit-shinobu',  type: 'outfit',    name: 'Shinobu Outfit',    price: 20,  icon: '🦋' },
        { id: 'acc-katana-tanjiro', type: 'accessory', name: 'Tanjiro Katana', price: 50,  icon: '🗡️' },
        { id: 'acc-katana-shinobu', type: 'accessory', name: 'Shinobu Katana', price: 100, icon: '🗡️' },
        { id: 'outfit-nahida',   type: 'outfit',    name: 'Nahida Outfit',     price: 10,  icon: '🌿' },
        { id: 'acc-nahida-magic', type: 'accessory', name: 'Nahida Magic',     price: 90,  icon: '✨' },
        { id: 'outfit-muzan',    type: 'outfit',    name: 'Muzan Outfit',      price: 500, icon: '🌙' },
        { id: 'acc-muzan-magic',  type: 'accessory', name: 'Muzan Magic',     price: 300, icon: '🩸' },
    ],

    purchasedItems: [],
    SHOP_STORAGE_KEY: 'mathGameShopPurchases',

    current: {
        faceForm: 'round',
        faceColor: '#FFDBAC',
        eyesForm: 'normal',
        eyesColor: '#333333',
        hairType: 'short',
        hairColor: '#4B2C20',
        noseType: 'small',
        lipsType: 'normal',
        accessory: 'none',
        outfit: 'tshirt',
        outfitColor: '#667eea'
    },

    init() {
        this.loadShopPurchases();
        this.load();
        this.renderAll();
        this.setupEditor();
    },

    loadShopPurchases() {
        const saved = localStorage.getItem(this.SHOP_STORAGE_KEY);
        this.purchasedItems = saved ? JSON.parse(saved) : [];
    },

    saveShopPurchases() {
        localStorage.setItem(this.SHOP_STORAGE_KEY, JSON.stringify(this.purchasedItems));
    },

    isItemPurchased(itemId) {
        return this.purchasedItems.includes(itemId);
    },

    buyItem(itemId) {
        const item = this.shopItems.find(i => i.id === itemId);
        if (!item || this.isItemPurchased(itemId)) return false;
        if (typeof PrizeManager === 'undefined' || !PrizeManager.prize) return false;
        if (PrizeManager.prize.currentCoins < item.price) return false;

        PrizeManager.prize.currentCoins -= item.price;
        PrizeManager.prize.spentCoins = (PrizeManager.prize.spentCoins || 0) + item.price;
        PrizeManager.save();
        PrizeManager.updateUI();

        this.purchasedItems.push(itemId);
        this.saveShopPurchases();
        return true;
    },

    equipItem(itemId) {
        const item = this.shopItems.find(i => i.id === itemId);
        if (!item || !this.isItemPurchased(itemId)) return;
        if (item.type === 'outfit') {
            this.current.outfit = itemId;
        } else {
            this.current.accessory = itemId;
        }
        this.save();
        this.renderAll();
    },

    load() {
        const saved = localStorage.getItem('math-game-avatar');
        if (saved) {
            const parsed = JSON.parse(saved);
            this.current = { ...this.current, ...parsed };
        }
    },

    save() {
        localStorage.setItem('math-game-avatar', JSON.stringify(this.current));
        this.renderAll();
    },

    reset() {
        localStorage.removeItem('math-game-avatar');
        this.current = {
            faceForm: 'round',
            faceColor: '#FFDAB9',
            eyesForm: 'normal',
            eyesColor: '#5D4E37',
            hairType: 'short',
            hairColor: '#4B2C20',
            noseType: 'small',
            lipsType: 'normal',
            accessory: 'none',
            outfit: 'tshirt',
            outfitColor: '#667eea'
        };
        this.renderAll();
    },

    getSVG(size = 100, isAnimated = false) {
        const gradientDefs = this.getGradientDefs();
        
        return `
            <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100" class="avatar-svg ${isAnimated ? 'animated' : ''}">
                <defs>${gradientDefs}</defs>
                <!-- Legs -->
                <g class="avatar-legs">
                    <path d="M42 90 L40 98" stroke="#333" stroke-width="3" stroke-linecap="round" class="leg-l" />
                    <path d="M58 90 L60 98" stroke="#333" stroke-width="3" stroke-linecap="round" class="leg-r" />
                </g>
                
                <!-- Body/Outfit -->
                ${this.drawOutfit()}
                
                <!-- Arms -->
                <g class="avatar-arms">
                    <path d="M35 80 L25 90" stroke="${this.current.faceColor}" stroke-width="4" stroke-linecap="round" class="arm-l" />
                    <path d="M65 80 L75 90" stroke="${this.current.faceColor}" stroke-width="4" stroke-linecap="round" class="arm-r" />
                </g>
                
                <!-- Head (Big) -->
                <g class="avatar-head">
                    ${this.drawFace()}
                    ${this.drawHair()}
                    ${this.drawEyes()}
                    ${this.drawNose()}
                    ${this.drawLips()}
                    ${this.drawAccessory()}
                </g>
            </svg>
        `;
    },

    getGradientDefs() {
        let defs = '';
        for (const [name, colors] of Object.entries(this.gradients)) {
            const stops = colors.map((c, i) => 
                `<stop offset="${(i / (colors.length - 1)) * 100}%" stop-color="${c}"/>`
            ).join('');
            defs += `<linearGradient id="${name}" x1="0%" y1="0%" x2="100%" y2="100%">${stops}</linearGradient>`;
        }
        return defs;
    },

    getHairFill() {
        const color = this.current.hairColor;
        if (color.startsWith('gradient-')) {
            return `url(#${color})`;
        }
        return color;
    },

    drawFace() {
        let path = '';
        const color = this.current.faceColor;
        switch(this.current.faceForm) {
            case 'oval': path = 'M50 15 C30 15 25 35 25 50 C25 65 30 80 50 80 C70 80 75 65 75 50 C75 35 70 15 50 15'; break;
            case 'square': path = 'M30 20 H70 V75 H30 Z'; break;
            case 'heart': path = 'M50 80 L25 55 C20 40 35 15 50 35 C65 15 80 40 75 55 Z'; break;
            default: path = 'M50 15 C30 15 20 30 20 50 C20 70 30 80 50 80 C70 80 80 70 80 50 C80 30 70 15 50 15'; // round
        }
        return `<path d="${path}" fill="${color}" stroke="#333" stroke-width="1" />`;
    },

    drawEyes() {
        const color = this.current.eyesColor;
        let eyes = '';
        switch(this.current.eyesForm) {
            case 'large': 
                eyes = `<circle cx="40" cy="45" r="5" fill="white" stroke="#333"/><circle cx="40" cy="45" r="2.5" fill="${color}"/>
                        <circle cx="60" cy="45" r="5" fill="white" stroke="#333"/><circle cx="60" cy="45" r="2.5" fill="${color}"/>`;
                break;
            case 'cool':
                eyes = `<path d="M33 45 L47 45" stroke="${color}" stroke-width="3" /><path d="M53 45 L67 45" stroke="${color}" stroke-width="3" />`;
                break;
            case 'happy':
                eyes = `<path d="M35 48 Q40 40 45 48" fill="none" stroke="${color}" stroke-width="2" />
                        <path d="M55 48 Q60 40 65 48" fill="none" stroke="${color}" stroke-width="2" />`;
                break;
            case 'wink':
                eyes = `<circle cx="40" cy="45" r="3" fill="${color}" />
                        <path d="M55 45 L65 45" stroke="${color}" stroke-width="2" stroke-linecap="round" />`;
                break;
            case 'sleepy':
                eyes = `<path d="M35 45 L45 47" stroke="${color}" stroke-width="2" stroke-linecap="round" />
                        <path d="M55 47 L65 45" stroke="${color}" stroke-width="2" stroke-linecap="round" />`;
                break;
            case 'surprised':
                eyes = `<circle cx="40" cy="45" r="6" fill="white" stroke="#333"/>
                        <circle cx="40" cy="45" r="3" fill="${color}"/>
                        <circle cx="60" cy="45" r="6" fill="white" stroke="#333"/>
                        <circle cx="60" cy="45" r="3" fill="${color}"/>`;
                break;
            case 'angry':
                eyes = `<path d="M35 42 L45 46" stroke="${color}" stroke-width="2" stroke-linecap="round" />
                        <circle cx="40" cy="48" r="2" fill="${color}" />
                        <path d="M55 46 L65 42" stroke="${color}" stroke-width="2" stroke-linecap="round" />
                        <circle cx="60" cy="48" r="2" fill="${color}" />`;
                break;
            case 'star-eyes':
                eyes = `<path d="M40 40 L41 44 L45 44 L42 47 L43 51 L40 48 L37 51 L38 47 L35 44 L39 44 Z" fill="${color}" />
                        <path d="M60 40 L61 44 L65 44 L62 47 L63 51 L60 48 L57 51 L58 47 L55 44 L59 44 Z" fill="${color}" />`;
                break;
            case 'sparkle':
                eyes = `<circle cx="40" cy="45" r="4" fill="white" stroke="#333"/>
                        <circle cx="40" cy="44" r="2" fill="${color}"/>
                        <circle cx="42" cy="43" r="1" fill="white"/>
                        <circle cx="60" cy="45" r="4" fill="white" stroke="#333"/>
                        <circle cx="60" cy="44" r="2" fill="${color}"/>
                        <circle cx="62" cy="43" r="1" fill="white"/>`;
                break;
            default:
                eyes = `<circle cx="40" cy="45" r="3" fill="${color}" /><circle cx="60" cy="45" r="3" fill="${color}" />`;
        }
        return eyes;
    },

    drawHair() {
        const fill = this.getHairFill();
        switch(this.current.hairType) {
            case 'buzz':
                return `<path d="M22 48 Q22 18 50 18 Q78 18 78 48 L75 42 Q50 32 25 42 Z" fill="${fill}" opacity="0.8" />`;
            case 'short': 
                return `<path d="M20 50 Q20 15 50 15 Q80 15 80 50 L75 40 Q50 30 25 40 Z" fill="${fill}" />`;
            case 'medium': 
                return `<path d="M20 50 Q20 10 50 10 Q80 10 80 50 L75 40 Q50 25 25 40 Z" fill="${fill}" />
                        <path d="M20 50 V60 Q20 65 25 60 V50" fill="${fill}" />
                        <path d="M80 50 V60 Q80 65 75 60 V50" fill="${fill}" />`;
            case 'long': 
                return `<path d="M20 50 Q20 10 50 10 Q80 10 80 50 V75 H70 V45 Q50 35 30 45 V75 H20 Z" fill="${fill}" />`;
            case 'very-long': 
                return `<path d="M15 50 Q15 5 50 5 Q85 5 85 50 V95 Q85 100 80 95 V50 Q50 35 20 50 V95 Q15 100 15 95 Z" fill="${fill}" />
                        <path d="M25 95 Q30 100 35 95 V70 Q30 65 25 70 Z" fill="${fill}" />
                        <path d="M65 95 Q70 100 75 95 V70 Q70 65 65 70 Z" fill="${fill}" />`;
            case 'spiky': 
                return `<path d="M20 50 L25 30 L35 15 L50 5 L65 15 L75 30 L80 50 L70 45 L50 35 L30 45 Z" fill="${fill}" />`;
            case 'curly': 
                return `<g fill="${fill}">
                    ${[...Array(8)].map((_,i) => `<circle cx="${22+i*8}" cy="${18+Math.sin(i)*4}" r="7"/>`).join('')}
                    ${[...Array(6)].map((_,i) => `<circle cx="${26+i*10}" cy="${28+Math.cos(i)*3}" r="6"/>`).join('')}
                </g>`;
            case 'wavy': 
                return `<path d="M20 50 Q20 10 50 10 Q80 10 80 50" fill="${fill}" />
                        <path d="M20 50 Q15 55 20 60 Q25 65 20 70 Q15 75 20 80" stroke="${fill}" stroke-width="8" fill="none" />
                        <path d="M80 50 Q85 55 80 60 Q75 65 80 70 Q85 75 80 80" stroke="${fill}" stroke-width="8" fill="none" />`;
            case 'ponytail': 
                return `<path d="M20 50 Q20 15 50 15 Q80 15 80 50 L75 40 Q50 30 25 40 Z" fill="${fill}" />
                        <ellipse cx="85" cy="35" rx="8" ry="15" fill="${fill}" />
                        <path d="M80 35 Q82 35 85 35" stroke="${fill}" stroke-width="6" />`;
            case 'pigtails': 
                return `<path d="M20 50 Q20 15 50 15 Q80 15 80 50 L75 40 Q50 30 25 40 Z" fill="${fill}" />
                        <ellipse cx="15" cy="50" rx="8" ry="12" fill="${fill}" />
                        <ellipse cx="85" cy="50" rx="8" ry="12" fill="${fill}" />`;
            case 'mohawk': 
                return `<path d="M40 50 L42 35 L45 20 L50 5 L55 20 L58 35 L60 50 Z" fill="${fill}" />
                        <path d="M45 50 L48 30 L50 15 L52 30 L55 50 Z" fill="${fill}" opacity="0.7" />`;
            case 'slicked':
                return `<path d="M20 50 Q20 15 50 15 Q80 15 80 50 L75 35 Q50 28 25 35 Z" fill="${fill}" />
                        <path d="M80 40 Q90 30 95 45" stroke="${fill}" stroke-width="4" fill="none" />`;
            case 'undercut':
                return `<path d="M30 50 Q30 20 50 20 Q70 20 70 50 L65 38 Q50 30 35 38 Z" fill="${fill}" />
                        <path d="M20 50 Q20 40 30 40" stroke="${fill}" stroke-width="2" opacity="0.4" />
                        <path d="M80 50 Q80 40 70 40" stroke="${fill}" stroke-width="2" opacity="0.4" />`;
            case 'afro':
                return `<g fill="${fill}">
                    <circle cx="50" cy="30" r="30" />
                    ${[...Array(12)].map((_,i) => {
                        const angle = (i / 12) * Math.PI * 2;
                        const x = 50 + Math.cos(angle) * 28;
                        const y = 30 + Math.sin(angle) * 28;
                        return `<circle cx="${x}" cy="${y}" r="8"/>`;
                    }).join('')}
                </g>`;
            case 'mullet':
                return `<path d="M20 50 Q20 15 50 15 Q80 15 80 50 L75 40 Q50 30 25 40 Z" fill="${fill}" />
                        <path d="M25 50 V80 Q25 85 30 80 V55" fill="${fill}" />
                        <path d="M75 50 V80 Q75 85 70 80 V55" fill="${fill}" />
                        <path d="M35 75 Q50 90 65 75" stroke="${fill}" stroke-width="6" fill="none" />`;
            default: 
                return '';
        }
    },

    drawNose() {
        switch(this.current.noseType) {
            case 'medium': return `<path d="M48 55 L52 55 L50 62 Z" fill="rgba(0,0,0,0.1)" />`;
            case 'round': return `<circle cx="50" cy="58" r="2" fill="rgba(0,0,0,0.1)" />`;
            default: return `<path d="M50 55 V60" stroke="rgba(0,0,0,0.2)" stroke-width="1" />`;
        }
    },

    drawLips() {
        switch(this.current.lipsType) {
            case 'smile': 
                return `<path d="M40 68 Q50 75 60 68" fill="none" stroke="#e63946" stroke-width="2" />`;
            case 'wide': 
                return `<ellipse cx="50" cy="70" rx="10" ry="3" fill="#e63946" opacity="0.6" />`;
            case 'kiss':
                // Puckered kiss lips
                return `<g>
                    <ellipse cx="50" cy="69" rx="5" ry="4" fill="#e63946" />
                    <ellipse cx="50" cy="69" rx="3" ry="2" fill="#ff8fa3" />
                </g>`;
            case 'tongue-out':
                // Silly tongue sticking out
                return `<g>
                    <path d="M40 68 Q50 72 60 68" fill="none" stroke="#e63946" stroke-width="2" />
                    <ellipse cx="50" cy="74" rx="4" ry="5" fill="#ff6b6b" />
                    <path d="M48 76 Q50 78 52 76" stroke="#e63946" stroke-width="0.5" fill="none" />
                </g>`;
            case 'vampire':
                // Smile with fangs
                return `<g>
                    <path d="M40 68 Q50 75 60 68" fill="none" stroke="#e63946" stroke-width="2" />
                    <path d="M42 68 L44 73 L46 68" fill="white" stroke="#ddd" stroke-width="0.5" />
                    <path d="M54 68 L56 73 L58 68" fill="white" stroke="#ddd" stroke-width="0.5" />
                </g>`;
            case 'mustache':
                // Lips with a curly mustache
                return `<g>
                    <path d="M43 70 H57" stroke="#e63946" stroke-width="1.5" />
                    <path d="M35 64 Q40 60 50 64 Q60 60 65 64" stroke="#4a3728" stroke-width="2" fill="none" />
                    <circle cx="35" cy="64" r="2" fill="#4a3728" />
                    <circle cx="65" cy="64" r="2" fill="#4a3728" />
                </g>`;
            case 'duck-face':
                // Exaggerated duck lips
                return `<g>
                    <ellipse cx="50" cy="70" rx="8" ry="5" fill="#ff8fa3" />
                    <path d="M43 68 Q50 66 57 68" stroke="#e63946" stroke-width="1" fill="none" />
                    <path d="M43 72 Q50 74 57 72" stroke="#e63946" stroke-width="1" fill="none" />
                </g>`;
            default: 
                return `<path d="M43 70 H57" stroke="#e63946" stroke-width="1.5" />`;
        }
    },

    drawOutfit() {
        const color = this.current.outfitColor;
        const darkerColor = this.darkenColor(color, 20);
        
        switch(this.current.outfit) {
            case 'hoodie':
                return `<g class="avatar-body">
                    <rect x="32" y="75" width="36" height="18" rx="5" fill="${color}" />
                    <path d="M38 75 L42 70 H58 L62 75" fill="${color}" />
                    <ellipse cx="50" cy="78" rx="4" ry="3" fill="${darkerColor}" />
                    <path d="M32 80 L28 88" stroke="${color}" stroke-width="4" />
                    <path d="M68 80 L72 88" stroke="${color}" stroke-width="4" />
                </g>`;
            case 'dress':
                return `<g class="avatar-body">
                    <path d="M38 75 L32 93 H68 L62 75 Z" fill="${color}" />
                    <path d="M38 75 H62" stroke="${darkerColor}" stroke-width="2" />
                    <ellipse cx="50" cy="80" rx="8" ry="2" fill="${darkerColor}" opacity="0.3" />
                </g>`;
            case 'suit':
                return `<g class="avatar-body">
                    <rect x="33" y="75" width="34" height="18" rx="3" fill="${color}" />
                    <path d="M50 75 V93" stroke="${darkerColor}" stroke-width="1" />
                    <path d="M45 75 L50 82 L55 75" fill="white" />
                    <rect x="48" y="82" width="4" height="3" fill="${darkerColor}" />
                    <path d="M33 75 L40 78 L33 85" fill="${darkerColor}" />
                    <path d="M67 75 L60 78 L67 85" fill="${darkerColor}" />
                </g>`;
            case 'tank-top':
                return `<g class="avatar-body">
                    <rect x="38" y="75" width="24" height="18" rx="3" fill="${color}" />
                    <path d="M38 75 L42 72 H58 L62 75" fill="${color}" />
                </g>`;
            case 'sweater':
                return `<g class="avatar-body">
                    <rect x="32" y="75" width="36" height="18" rx="5" fill="${color}" />
                    <path d="M32 88 H68" stroke="${darkerColor}" stroke-width="3" />
                    <path d="M32 82 H68" stroke="${darkerColor}" stroke-width="1" opacity="0.3" />
                    <path d="M32 85 H68" stroke="${darkerColor}" stroke-width="1" opacity="0.3" />
                    <path d="M32 80 L28 90" stroke="${color}" stroke-width="5" />
                    <path d="M68 80 L72 90" stroke="${color}" stroke-width="5" />
                </g>`;
            case 'polo':
                return `<g class="avatar-body">
                    <rect x="35" y="75" width="30" height="18" rx="4" fill="${color}" />
                    <path d="M45 75 V82" stroke="${darkerColor}" stroke-width="1" />
                    <path d="M55 75 V82" stroke="${darkerColor}" stroke-width="1" />
                    <circle cx="50" cy="78" r="1.5" fill="${darkerColor}" />
                    <circle cx="50" cy="82" r="1.5" fill="${darkerColor}" />
                    <path d="M40 75 L38 72 H45 V75" fill="${color}" stroke="${darkerColor}" stroke-width="0.5" />
                    <path d="M60 75 L62 72 H55 V75" fill="${color}" stroke="${darkerColor}" stroke-width="0.5" />
                </g>`;
            default: break;
        }

        // Shop outfits
        switch(this.current.outfit) {
            case 'outfit-tanjiro':
                return `<g class="avatar-body">
                    <rect x="33" y="75" width="34" height="18" rx="4" fill="#2a5e3f"/>
                    <rect x="33" y="75" width="8" height="18" fill="#1a1a1a" opacity="0.5"/>
                    <rect x="43" y="75" width="8" height="18" fill="#1a1a1a" opacity="0.5"/>
                    <rect x="53" y="75" width="8" height="18" fill="#1a1a1a" opacity="0.5"/>
                    <path d="M33 80 L27 87" stroke="#2a5e3f" stroke-width="4"/>
                    <path d="M67 80 L73 87" stroke="#2a5e3f" stroke-width="4"/>
                    <path d="M42 75 L50 82 L58 75" fill="none" stroke="#8B0000" stroke-width="1.5"/>
                </g>`;
            case 'outfit-shinobu':
                return `<g class="avatar-body">
                    <rect x="33" y="75" width="34" height="18" rx="4" fill="#6b3fa0"/>
                    <path d="M33 80 L27 87" stroke="#6b3fa0" stroke-width="4"/>
                    <path d="M67 80 L73 87" stroke="#6b3fa0" stroke-width="4"/>
                    <path d="M42 75 L50 82 L58 75" fill="none" stroke="#ff69b4" stroke-width="1.5"/>
                    <path d="M40 85 Q44 82 48 85 Q52 82 56 85 Q60 82 64 85" fill="none" stroke="#da70d6" stroke-width="1" opacity="0.7"/>
                    <ellipse cx="44" cy="80" rx="3" ry="2" fill="none" stroke="#ff69b4" stroke-width="0.8" opacity="0.5"/>
                    <ellipse cx="56" cy="80" rx="3" ry="2" fill="none" stroke="#ff69b4" stroke-width="0.8" opacity="0.5"/>
                </g>`;
            case 'outfit-nahida':
                return `<g class="avatar-body">
                    <!-- Cape / cloak behind -->
                    <path d="M36 76 L30 93 H70 L64 76 Z" fill="#3d8c52" opacity="0.6"/>
                    <!-- Main white top -->
                    <rect x="38" y="75" width="24" height="10" rx="3" fill="#f5f0e0"/>
                    <!-- Green collar / neckline -->
                    <path d="M42 75 Q50 73 58 75" stroke="#3d8c52" stroke-width="2" fill="none"/>
                    <!-- Gem at center -->
                    <path d="M50 77 L52 79 L50 81 L48 79 Z" fill="#7cfc00"/>
                    <path d="M50 77 L52 79 L50 81 L48 79 Z" fill="none" stroke="#2e7d32" stroke-width="0.5"/>
                    <!-- Leafy skirt -->
                    <path d="M36 85 L38 93 L43 88 L48 93 L50 89 L52 93 L57 88 L62 93 L64 85 Z" fill="#4caf50"/>
                    <path d="M38 85 L40 93 L44 89 L48 93 L50 90 L52 93 L56 89 L60 93 L62 85" fill="none" stroke="#2e7d32" stroke-width="0.7"/>
                    <!-- Puffy sleeves -->
                    <ellipse cx="33" cy="79" rx="5" ry="4" fill="#f5f0e0" stroke="#3d8c52" stroke-width="0.8"/>
                    <ellipse cx="67" cy="79" rx="5" ry="4" fill="#f5f0e0" stroke="#3d8c52" stroke-width="0.8"/>
                </g>`;
            case 'outfit-muzan':
                return `<g class="avatar-body">
                    <rect x="33" y="75" width="34" height="18" rx="3" fill="#f8f8ff"/>
                    <path d="M50 75 V93" stroke="#ddd" stroke-width="1"/>
                    <path d="M45 75 L50 82 L55 75" fill="#1a1a2e"/>
                    <rect x="48" y="82" width="4" height="3" fill="#8B0000"/>
                    <path d="M33 75 L40 78 L33 85" fill="#e8e8f0"/>
                    <path d="M67 75 L60 78 L67 85" fill="#e8e8f0"/>
                    <path d="M33 80 L27 87" stroke="#f8f8ff" stroke-width="4"/>
                    <path d="M67 80 L73 87" stroke="#f8f8ff" stroke-width="4"/>
                </g>`;
            default: // tshirt
                return `<g class="avatar-body">
                    <rect x="35" y="75" width="30" height="18" rx="5" fill="${color}" />
                    <path d="M35 80 L28 85 L30 90 L35 85" fill="${color}" />
                    <path d="M65 80 L72 85 L70 90 L65 85" fill="${color}" />
                </g>`;
        }
    },

    darkenColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max((num >> 16) - amt, 0);
        const G = Math.max((num >> 8 & 0x00FF) - amt, 0);
        const B = Math.max((num & 0x0000FF) - amt, 0);
        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    },

    drawAccessory() {
        switch(this.current.accessory) {
            case 'glasses':
                return `<g stroke="#333" stroke-width="1.5" fill="none">
                    <circle cx="38" cy="44" r="8" fill="rgba(200,230,255,0.3)" />
                    <circle cx="62" cy="44" r="8" fill="rgba(200,230,255,0.3)" />
                    <path d="M46 44 H54" />
                    <path d="M30 44 H25" /><path d="M70 44 H75" />
                </g>`;
            case 'sunglasses':
                return `<g fill="#1a1a2e">
                    <path d="M28 40 H48 V52 Q38 55 28 52 Z" />
                    <path d="M52 40 H72 V52 Q62 55 52 52 Z" />
                    <path d="M48 46 H52" stroke="#1a1a2e" stroke-width="2" />
                    <path d="M28 44 L20 42" stroke="#1a1a2e" stroke-width="2" />
                    <path d="M72 44 L80 42" stroke="#1a1a2e" stroke-width="2" />
                </g>`;
            case 'cap':
                return `<g>
                    <path d="M18 35 Q18 10 50 10 Q82 10 82 35 H18 Z" fill="#ff4757" />
                    <path d="M82 35 L98 40 L82 45 Z" fill="#ff4757" />
                    <ellipse cx="50" cy="35" rx="35" ry="5" fill="#d63031" />
                </g>`;
            case 'beanie':
                return `<g>
                    <path d="M20 40 Q20 5 50 5 Q80 5 80 40 H20 Z" fill="#6c5ce7" />
                    <ellipse cx="50" cy="40" rx="32" ry="5" fill="#5f27cd" />
                    <circle cx="50" cy="5" r="5" fill="#a29bfe" />
                </g>`;
            case 'crown':
                return `<g fill="#ffd700" stroke="#daa520" stroke-width="1">
                    <path d="M25 35 L30 15 L40 28 L50 8 L60 28 L70 15 L75 35 Z" />
                    <circle cx="30" cy="15" r="3" fill="#ff6b6b" />
                    <circle cx="50" cy="8" r="4" fill="#74b9ff" />
                    <circle cx="70" cy="15" r="3" fill="#55efc4" />
                </g>`;
            case 'bow':
                return `<g fill="#ff6b81">
                    <ellipse cx="75" cy="25" rx="8" ry="6" />
                    <ellipse cx="85" cy="20" rx="6" ry="4" />
                    <ellipse cx="85" cy="30" rx="6" ry="4" />
                    <circle cx="80" cy="25" r="3" fill="#d63031" />
                </g>`;
            case 'headphones':
                return `<g>
                    <path d="M20 50 Q20 20 50 20 Q80 20 80 50" stroke="#333" stroke-width="4" fill="none" />
                    <ellipse cx="18" cy="55" rx="6" ry="10" fill="#333" />
                    <ellipse cx="82" cy="55" rx="6" ry="10" fill="#333" />
                    <ellipse cx="18" cy="55" rx="4" ry="7" fill="#666" />
                    <ellipse cx="82" cy="55" rx="4" ry="7" fill="#666" />
                </g>`;
            case 'star':
                return `<g fill="#ffd700" stroke="#daa520" stroke-width="0.5">
                    <path d="M50 2 L54 15 L68 15 L57 23 L61 37 L50 28 L39 37 L43 23 L32 15 L46 15 Z" />
                </g>`;
            case 'heart-glasses':
                return `<g fill="#ff6b6b" stroke="#d63031" stroke-width="1">
                    <path d="M38 44 L32 38 Q28 32 34 32 Q38 32 38 36 Q38 32 42 32 Q48 32 44 38 Z" />
                    <path d="M62 44 L56 38 Q52 32 58 32 Q62 32 62 36 Q62 32 66 32 Q72 32 68 38 Z" />
                    <path d="M44 40 H56" stroke="#d63031" stroke-width="2" />
                    <path d="M26 38 L20 36" stroke="#d63031" stroke-width="2" />
                    <path d="M74 38 L80 36" stroke="#d63031" stroke-width="2" />
                </g>`;
            case 'monocle':
                // Fancy monocle on one eye
                return `<g>
                    <circle cx="62" cy="44" r="9" fill="rgba(200,230,255,0.2)" stroke="#c9a227" stroke-width="2" />
                    <path d="M71 44 L78 50" stroke="#c9a227" stroke-width="1.5" />
                    <circle cx="78" cy="50" r="1" fill="#c9a227" />
                    <path d="M78 51 Q80 65 75 80" stroke="#c9a227" stroke-width="1" fill="none" />
                </g>`;
            case 'bandana':
                // Pirate/biker bandana
                return `<g>
                    <path d="M15 38 Q50 28 85 38 L80 45 Q50 35 20 45 Z" fill="#e74c3c" />
                    <path d="M15 38 L10 50 Q8 55 12 52 L18 42" fill="#e74c3c" />
                    <path d="M85 38 L90 50 Q92 55 88 52 L82 42" fill="#e74c3c" />
                    <circle cx="30" cy="38" r="2" fill="white" opacity="0.5" />
                    <circle cx="50" cy="35" r="2" fill="white" opacity="0.5" />
                    <circle cx="70" cy="38" r="2" fill="white" opacity="0.5" />
                </g>`;
            case 'antenna':
                // Alien/robot antenna headband
                return `<g>
                    <path d="M25 35 Q50 30 75 35" stroke="#333" stroke-width="3" fill="none" />
                    <path d="M35 33 Q32 15 35 8" stroke="#333" stroke-width="2" fill="none" />
                    <path d="M65 33 Q68 15 65 8" stroke="#333" stroke-width="2" fill="none" />
                    <circle cx="35" cy="6" r="5" fill="#4ecdc4">
                        <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="65" cy="6" r="5" fill="#ff6b6b">
                        <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" repeatCount="indefinite" />
                    </circle>
                </g>`;
            default: break;
        }

        // Shop accessories
        switch(this.current.accessory) {
            case 'acc-katana-tanjiro':
                return `<g transform="translate(75,90) rotate(30)">
                    <rect x="-1.5" y="-40" width="3" height="35" rx="0.5" fill="#333"/>
                    <rect x="-1" y="-42" width="2" height="3" fill="#C0C0C0"/>
                    <rect x="-3" y="-5" width="6" height="3" rx="1" fill="#C0C0C0"/>
                    <rect x="-2" y="-2" width="4" height="8" rx="1" fill="#8B0000"/>
                    <path d="M-1.5 -2 L-1.5 6 M1.5 -2 L1.5 6" stroke="#222" stroke-width="0.5" opacity="0.4"/>
                </g>`;
            case 'acc-katana-shinobu':
                return `<g transform="translate(25,90) rotate(-30)">
                    <rect x="-1.5" y="-40" width="3" height="35" rx="0.5" fill="#9b59b6"/>
                    <rect x="-1" y="-42" width="2" height="3" fill="#C0C0C0"/>
                    <rect x="-3" y="-5" width="6" height="3" rx="1" fill="#C0C0C0"/>
                    <rect x="-2" y="-2" width="4" height="8" rx="1" fill="#ff69b4"/>
                    <path d="M-1.5 -2 L-1.5 6 M1.5 -2 L1.5 6" stroke="#7b3fa0" stroke-width="0.5" opacity="0.4"/>
                    <circle cx="0" cy="-20" r="2" fill="#da70d6" opacity="0.4"/>
                    <circle cx="0" cy="-32" r="2" fill="#da70d6" opacity="0.4"/>
                </g>`;
            case 'acc-nahida-magic':
                return `<g>
                    <circle cx="50" cy="12" r="8" fill="none" stroke="#7cfc00" stroke-width="1.5" opacity="0.7">
                        <animate attributeName="r" values="7;9;7" dur="2s" repeatCount="indefinite"/>
                    </circle>
                    <circle cx="50" cy="12" r="4" fill="#7cfc00" opacity="0.3">
                        <animate attributeName="opacity" values="0.2;0.5;0.2" dur="1.5s" repeatCount="indefinite"/>
                    </circle>
                    <circle cx="25" cy="35" r="3" fill="#7cfc00" opacity="0.4">
                        <animate attributeName="opacity" values="0.2;0.6;0.2" dur="2s" repeatCount="indefinite"/>
                    </circle>
                    <circle cx="75" cy="35" r="3" fill="#7cfc00" opacity="0.4">
                        <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite"/>
                    </circle>
                    <path d="M30 20 Q50 5 70 20" fill="none" stroke="#7cfc00" stroke-width="1" opacity="0.5">
                        <animate attributeName="opacity" values="0.3;0.7;0.3" dur="3s" repeatCount="indefinite"/>
                    </path>
                </g>`;
            case 'acc-muzan-magic':
                return `<g>
                    <circle cx="20" cy="40" r="4" fill="#8B0000" opacity="0.6">
                        <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.5s" repeatCount="indefinite"/>
                    </circle>
                    <circle cx="80" cy="40" r="4" fill="#8B0000" opacity="0.6">
                        <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1.5s" repeatCount="indefinite"/>
                    </circle>
                    <path d="M15 55 Q20 50 25 55 Q20 60 15 55" fill="#8B0000" opacity="0.4">
                        <animate attributeName="opacity" values="0.2;0.6;0.2" dur="2s" repeatCount="indefinite"/>
                    </path>
                    <path d="M75 55 Q80 50 85 55 Q80 60 75 55" fill="#8B0000" opacity="0.4">
                        <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite"/>
                    </path>
                    <path d="M10 70 Q15 65 20 70" fill="none" stroke="#8B0000" stroke-width="2" opacity="0.5">
                        <animate attributeName="opacity" values="0.3;0.7;0.3" dur="2.5s" repeatCount="indefinite"/>
                    </path>
                    <path d="M80 70 Q85 65 90 70" fill="none" stroke="#8B0000" stroke-width="2" opacity="0.5">
                        <animate attributeName="opacity" values="0.7;0.3;0.7" dur="2.5s" repeatCount="indefinite"/>
                    </path>
                </g>`;
            default:
                return '';
        }
    },

    renderAll() {
        const containers = document.querySelectorAll('.avatar-display');
        containers.forEach(c => {
            const size = c.dataset.size || 100;
            c.innerHTML = this.getSVG(size);
        });
    },

    setupEditor() {
        // We'll call this when the editor modal is opened
    },

    openEditor() {
        const modal = document.getElementById('avatar-modal');
        if (!modal) return;
        
        modal.style.display = 'flex';
        this.renderEditor();
    },

    renderEditor() {
        const container = document.getElementById('avatar-editor-controls');
        if (!container) return;

        const activeTab = container.dataset.activeTab || 'editor';

        let html = `
            <div class="avatar-preview-large avatar-display" data-size="150">
                ${this.getSVG(150)}
            </div>
            <div class="avatar-tabs">
                <button class="avatar-tab ${activeTab === 'editor' ? 'active' : ''}" data-tab="editor">Avatar</button>
                <button class="avatar-tab ${activeTab === 'shop' ? 'active' : ''}" data-tab="shop">Shop</button>
            </div>
        `;

        if (activeTab === 'shop') {
            html += this.renderShop();
            container.innerHTML = html;
            this.setupShopListeners(container);
            return;
        }

        html += `<div class="editor-groups">`;

        // Face Form
        html += this.createOptionGroup('Face Form', 'faceForm', this.parts.faceForm);
        // Face Color with visual preview
        html += this.createColorGroup('Skin Tone', 'faceColor', this.colors.face);
        // Eyes Form
        html += this.createOptionGroup('Eyes', 'eyesForm', this.parts.eyesForm);
        // Eyes Color
        html += this.createColorGroup('Eyes Color', 'eyesColor', this.colors.eyes);
        // Hair Type
        html += this.createOptionGroup('Hair Style', 'hairType', this.parts.hairType);
        // Hair Color (with gradients)
        html += this.createHairColorGroup();
        // Nose
        html += this.createOptionGroup('Nose', 'noseType', this.parts.noseType);
        // Lips
        html += this.createOptionGroup('Lips', 'lipsType', this.parts.lipsType);
        // Outfit (include purchased shop outfits)
        const outfitOptions = [...this.parts.outfit, ...this.shopItems.filter(i => i.type === 'outfit' && this.isItemPurchased(i.id)).map(i => i.id)];
        html += this.createOptionGroup('Outfit', 'outfit', outfitOptions);
        // Outfit Color (hide for shop outfits)
        if (!this.current.outfit.startsWith('outfit-')) {
            html += this.createColorGroup('Outfit Color', 'outfitColor', this.colors.outfit);
        }
        // Accessory (include purchased shop accessories)
        const accOptions = [...this.parts.accessory, ...this.shopItems.filter(i => i.type === 'accessory' && this.isItemPurchased(i.id)).map(i => i.id)];
        html += this.createOptionGroup('Accessory', 'accessory', accOptions);

        html += `</div>`;
        container.innerHTML = html;

        // Add event listeners
        container.querySelectorAll('select').forEach(el => {
            el.addEventListener('change', (e) => {
                this.current[e.target.dataset.prop] = e.target.value;
                this.save();
                this.renderEditor();
            });
        });

        container.querySelectorAll('.color-dot').forEach(el => {
            el.addEventListener('click', (e) => {
                this.current[e.target.dataset.prop] = e.target.dataset.color;
                this.save();
                this.renderEditor();
            });
        });

        this.setupTabListeners(container);
    },

    setupTabListeners(container) {
        container.querySelectorAll('.avatar-tab').forEach(btn => {
            btn.addEventListener('click', (e) => {
                container.dataset.activeTab = e.target.dataset.tab;
                this.renderEditor();
            });
        });
    },

    renderShop() {
        const coins = (typeof PrizeManager !== 'undefined' && PrizeManager.prize) ? PrizeManager.prize.currentCoins : 0;
        const totalEarned = this.getTotalEarned();

        let html = `
            <div class="shop-balance">
                <div class="shop-balance-current">
                    ${typeof PrizeManager !== 'undefined' ? PrizeManager.getCoinSvg('shop-coin-icon') : ''}
                    <span>${coins} coins</span>
                </div>
                <div class="shop-balance-total">Total earned: ${totalEarned}</div>
            </div>
            <div class="shop-items">
        `;

        this.shopItems.forEach(item => {
            const owned = this.isItemPurchased(item.id);
            const equipped = this.current.outfit === item.id || this.current.accessory === item.id;
            const canAfford = coins >= item.price;
            const typeLabel = item.type === 'outfit' ? 'Outfit' : 'Accessory';

            let btnHtml;
            if (equipped) {
                btnHtml = `<button class="shop-item-btn equipped" disabled>Wearing</button>`;
            } else if (owned) {
                btnHtml = `<button class="shop-item-btn equip" data-item-id="${item.id}">Equip</button>`;
            } else if (canAfford) {
                btnHtml = `<button class="shop-item-btn buy" data-item-id="${item.id}">Buy</button>`;
            } else {
                btnHtml = `<button class="shop-item-btn cant-afford" disabled>${item.price} coins</button>`;
            }

            html += `
                <div class="shop-item ${owned ? 'owned' : ''} ${equipped ? 'equipped' : ''}">
                    <div class="shop-item-icon">${item.icon}</div>
                    <div class="shop-item-info">
                        <div class="shop-item-name">${item.name}</div>
                        <div class="shop-item-meta">${typeLabel} · ${item.price} coins</div>
                    </div>
                    ${btnHtml}
                </div>
            `;
        });

        html += `</div>`;
        return html;
    },

    getTotalEarned() {
        if (typeof PrizeManager === 'undefined' || !PrizeManager.prize) return 0;
        return (PrizeManager.prize.currentCoins || 0) + (PrizeManager.prize.spentCoins || 0);
    },

    setupShopListeners(container) {
        this.setupTabListeners(container);

        container.querySelectorAll('.shop-item-btn.buy').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = e.target.dataset.itemId;
                if (this.buyItem(itemId)) {
                    this.equipItem(itemId);
                    this.renderEditor();
                }
            });
        });

        container.querySelectorAll('.shop-item-btn.equip').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = e.target.dataset.itemId;
                this.equipItem(itemId);
                this.renderEditor();
            });
        });
    },

    createOptionGroup(label, prop, options) {
        const displayNames = {
            // Hair types
            'none': '❌ None',
            'buzz': '👨 Buzz Cut',
            'short': '✂️ Short',
            'medium': '📏 Medium',
            'long': '📐 Long',
            'very-long': '🦱 Very Long',
            'spiky': '⚡ Spiky',
            'curly': '🌀 Curly',
            'wavy': '🌊 Wavy',
            'ponytail': '🎀 Ponytail',
            'pigtails': '🎀 Pigtails',
            'mohawk': '🎸 Mohawk',
            'slicked': '💼 Slicked Back',
            'undercut': '💇 Undercut',
            'afro': '🌟 Afro',
            'mullet': '🎤 Mullet',
            // Face forms
            'round': '⭕ Round',
            'oval': '🥚 Oval',
            'square': '⬜ Square',
            'heart': '💜 Heart',
            // Eyes
            'normal': '👁️ Normal',
            'large': '👀 Large',
            'cool': '😎 Cool',
            'happy': '😊 Happy',
            'wink': '😉 Wink',
            'sleepy': '😪 Sleepy',
            'surprised': '😲 Surprised',
            'angry': '😠 Angry',
            'star-eyes': '🤩 Star Eyes',
            'sparkle': '✨ Sparkle',
            // Nose
            'small': 'Small',
            // Lips
            'smile': '😊 Smile',
            'wide': 'Wide',
            'kiss': '💋 Kiss',
            'tongue-out': '😛 Tongue Out',
            'vampire': '🧛 Vampire',
            'mustache': '🥸 Mustache',
            'duck-face': '🦆 Duck Face',
            // Accessories
            'glasses': '👓 Glasses',
            'sunglasses': '🕶️ Sunglasses',
            'cap': '🧢 Cap',
            'beanie': '🎿 Beanie',
            'crown': '👑 Crown',
            'bow': '🎀 Bow',
            'headphones': '🎧 Headphones',
            'star': '⭐ Star',
            'heart-glasses': '💕 Heart Glasses',
            'monocle': '🧐 Monocle',
            'bandana': '🏴‍☠️ Bandana',
            'antenna': '👽 Antenna',
            // Outfits
            'tshirt': '👕 T-Shirt',
            'hoodie': '🧥 Hoodie',
            'dress': '👗 Dress',
            'suit': '🤵 Suit',
            'tank-top': '🎽 Tank Top',
            'sweater': '🧶 Sweater',
            'polo': '👔 Polo',
            // Shop items
            'outfit-tanjiro': '⚔️ Tanjiro',
            'outfit-shinobu': '🦋 Shinobu',
            'outfit-nahida': '🌿 Nahida',
            'outfit-muzan': '🌙 Muzan',
            'acc-katana-tanjiro': '⚔️ Tanjiro Katana',
            'acc-katana-shinobu': '🗡️ Shinobu Katana',
            'acc-nahida-magic': '✨ Nahida Magic',
            'acc-muzan-magic': '🩸 Muzan Magic'
        };
        
        return `
            <div class="editor-group">
                <label>${label}</label>
                <select data-prop="${prop}">
                    ${options.map(opt => `<option value="${opt}" ${this.current[prop] === opt ? 'selected' : ''}>${displayNames[opt] || opt}</option>`).join('')}
                </select>
            </div>
        `;
    },

    createColorGroup(label, prop, colors) {
        return `
            <div class="editor-group">
                <label>${label}</label>
                <div class="color-picker">
                    ${colors.map(c => `
                        <div class="color-dot ${this.current[prop] === c ? 'active' : ''}" 
                             style="background: ${c}; ${c === '#FFFFFF' || c === '#ffffff' ? 'border: 1px solid #ccc;' : ''}" 
                             data-prop="${prop}" 
                             data-color="${c}"></div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    createHairColorGroup() {
        const solidColors = this.colors.hair.filter(c => !c.startsWith('gradient-'));
        const gradientColors = this.colors.hair.filter(c => c.startsWith('gradient-'));
        
        const gradientStyles = {
            'gradient-rainbow': 'linear-gradient(90deg, #FF6B6B, #FFD93D, #6BCB77, #4D96FF, #9B59B6)',
            'gradient-sunset': 'linear-gradient(90deg, #FF6B6B, #FFA07A, #FFD700)',
            'gradient-ocean': 'linear-gradient(90deg, #667eea, #764ba2, #66a6ff)',
            'gradient-pink': 'linear-gradient(90deg, #ff9a9e, #fecfef)',
            'gradient-fire': 'linear-gradient(90deg, #FF4500, #FF6347, #FFD700)'
        };
        
        const gradientNames = {
            'gradient-rainbow': '🌈',
            'gradient-sunset': '🌅',
            'gradient-ocean': '🌊',
            'gradient-pink': '💗',
            'gradient-fire': '🔥'
        };

        return `
            <div class="editor-group">
                <label>Hair Color</label>
                <div class="color-picker">
                    ${solidColors.map(c => `
                        <div class="color-dot ${this.current.hairColor === c ? 'active' : ''}" 
                             style="background: ${c}; ${c === '#FFFFFF' ? 'border: 1px solid #ccc;' : ''}" 
                             data-prop="hairColor" 
                             data-color="${c}"></div>
                    `).join('')}
                </div>
                <label style="margin-top: 8px; font-size: 12px;">Gradient Colors</label>
                <div class="color-picker">
                    ${gradientColors.map(c => `
                        <div class="color-dot gradient-dot ${this.current.hairColor === c ? 'active' : ''}" 
                             style="background: ${gradientStyles[c]}" 
                             data-prop="hairColor" 
                             data-color="${c}"
                             title="${gradientNames[c]}"></div>
                    `).join('')}
                </div>
            </div>
        `;
    }
};
